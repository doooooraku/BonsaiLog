/**
 * F-10 エクスポート オーケストレーション (Issue #33 / ADR-0016)。
 *
 * Options Sheet で選んだ条件 (期間 / 対象 / アーカイブ) を
 *   DB クエリ → 既存ロジック関数 (csvExport / listPdfExport) → ファイル書き出し → 共有
 * へつなぐグルー層。リスト系 4 種 (bonsai_csv / events_csv / species_csv / list_pdf) を扱う。
 *
 * bonsai_pdf は「1 本ずつの 1 ページレポート」で per-bonsai 選択が本質のため、
 * 専用 picker (app/export/pdf.tsx) 側で処理する (本 flow の対象外)。
 *
 * Pro 判定・ストレージ事前チェックは呼出側 (Hub / Sheet) の責務。
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { nowUtc } from '@/src/core/datetime/clock';
import type { TranslationKey } from '@/src/core/i18n/i18n';
import {
  getAllActiveBonsai,
  getAllActiveBonsaiWithSpecies,
  getAllArchivedBonsai,
  getBonsaiByTag,
  getBonsaiWithSpecies,
} from '@/src/db/bonsaiRepository';
import { getCustomSpeciesById } from '@/src/db/bonsaiSpeciesCustomRepository';
import { getActiveEventsByBonsai, getEventsInRange } from '@/src/db/eventRepository';
import { getCoverPhoto, getPhotosByBonsai } from '@/src/db/photoRepository';
import type { Bonsai } from '@/src/db/schema';
import { getSpeciesById } from '@/src/db/speciesRepository';
import { getTagsByBonsai } from '@/src/db/tagRepository';
import { cellsToCsvString } from './csvExport';
import { buildBonsaiCsvRow, BONSAI_CSV_HEADER_KEYS } from './bonsaiCsvRow';
import { buildBonsaiPdfReport } from './bonsaiPdfReport';
import { buildEventCsvRow, EVENT_CSV_HEADER_KEYS } from './eventCsvRow';
import { buildExportFileName, type ExportKind } from './exportFileName';
import { type BonsaiListRow, buildBonsaiListPdfHtml, type ListPdfStats } from './listPdfExport';
import { buildBonsaiPdfHtml, generateAndShareListPdf, readPhotoAsBase64 } from './pdfExport';
import { buildSpeciesSummaryRows, SPECIES_CSV_HEADER_KEYS } from './speciesSummary';

export type ExportTypeKey = 'bonsai_csv' | 'events_csv' | 'species_csv' | 'list_pdf';
export type ExportPeriod = 'all' | '30d' | '1y' | 'custom';
export type ExportScope = 'all' | 'selected' | 'tag';

export type ExportOptions = {
  type: ExportTypeKey;
  period: ExportPeriod;
  dateFrom?: string;
  dateTo?: string;
  scope: ExportScope;
  selectedBonsaiIds?: readonly string[];
  tagId?: string;
  includeArchived: boolean;
  lang: string;
};

export type ExportResult = { kind: ExportTypeKey; count: number };

type Tfn = (key: TranslationKey) => string;

const KIND_MAP: Record<ExportTypeKey, ExportKind> = {
  bonsai_csv: 'bonsai-csv',
  events_csv: 'events-csv',
  species_csv: 'species-csv',
  list_pdf: 'list-pdf',
};

/** どの種類でどのオプションが意味を持つか (Sheet の表示制御 + flow の整合に共用)。 */
export const OPTION_APPLIES = {
  period: new Set<ExportTypeKey>(['events_csv', 'list_pdf']),
  scope: new Set<ExportTypeKey>(['bonsai_csv', 'events_csv', 'list_pdf']),
  includeArchived: new Set<ExportTypeKey>(['bonsai_csv', 'events_csv', 'list_pdf']),
};

/**
 * period → occurred_at_utc の ISO 範囲。custom は dateFrom 00:00 / dateTo 23:59 を UTC で。
 * occurred_at_utc は UTC ISO 文字列なので文字列比較で範囲フィルタできる。
 */
export function resolvePeriodRange(
  opts: Pick<ExportOptions, 'period' | 'dateFrom' | 'dateTo'>,
  now: Date = new Date(nowUtc() as string),
): { fromIso?: string; toIso?: string } {
  switch (opts.period) {
    case 'all':
      return {};
    case '30d':
      return { fromIso: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() };
    case '1y': {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      return { fromIso: from.toISOString() };
    }
    case 'custom':
      return {
        fromIso: opts.dateFrom ? `${opts.dateFrom}T00:00:00.000Z` : undefined,
        toIso: opts.dateTo ? `${opts.dateTo}T23:59:59.999Z` : undefined,
      };
  }
}

type ResolvedBonsai = Bonsai & { speciesCommonName: string | null };

/** scope (all / selected / tag) + includeArchived から対象盆栽を解決し、樹種通称を付与。 */
async function resolveBonsaiSet(opts: ExportOptions): Promise<ResolvedBonsai[]> {
  let base: Bonsai[];
  if (opts.scope === 'selected' && opts.selectedBonsaiIds && opts.selectedBonsaiIds.length > 0) {
    const pool = [
      ...(await getAllActiveBonsai()),
      ...(opts.includeArchived ? await getAllArchivedBonsai() : []),
    ];
    const idSet = new Set(opts.selectedBonsaiIds);
    base = pool.filter((b) => idSet.has(b.id));
  } else if (opts.scope === 'tag' && opts.tagId) {
    base = await getBonsaiByTag(opts.tagId);
  } else {
    base = [
      ...(await getAllActiveBonsai()),
      ...(opts.includeArchived ? await getAllArchivedBonsai() : []),
    ];
  }

  const resolved: ResolvedBonsai[] = [];
  for (const b of base) {
    const sp = b.speciesId ? await getSpeciesById(b.speciesId, opts.lang) : null;
    resolved.push({ ...b, speciesCommonName: sp?.commonName ?? null });
  }
  return resolved;
}

/** CSV/テキストを cacheDirectory に書き出し → Share Sheet (preview 画面からも利用)。 */
export async function shareExportFile(fileName: string, content: string, t: Tfn): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    throw new ExportShareUnavailableError();
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: t('exportCsvShareTitle'),
    UTI: 'public.comma-separated-values-text',
  });
}

/** Share Sheet が使えない端末 (まれ) 用エラー。 */
export class ExportShareUnavailableError extends Error {
  constructor() {
    super('share-unavailable');
    this.name = 'ExportShareUnavailableError';
  }
}

/**
 * CSV 種類の CSV 文字列 + ファイル名 + 件数を生成 (csv-preview と runExport で共用)。
 * 共有はしない。list_pdf には使わない (CSV 3 種専用)。
 */
export async function loadCsvForPreview(
  opts: ExportOptions,
  t: Tfn,
): Promise<{ csv: string; fileName: string; count: number }> {
  const fileName = buildExportFileName({
    kind: KIND_MAP[opts.type],
    ext: 'csv',
    date: new Date(nowUtc() as string),
  });

  if (opts.type === 'species_csv') {
    // 保有樹種ごとの集計 (保有数 + 種別別最終作業日)。対象は active 盆栽。
    const withSpecies = await getAllActiveBonsaiWithSpecies(opts.lang);
    const summaryBonsai = withSpecies.map((b) => ({
      id: b.id,
      speciesName: b.species?.commonName ?? null,
    }));
    // 「最終◯◯」は実施済 (logged) のみ。予定 (planned、未来日) は最終作業日に含めない。
    const events = (await getEventsInRange({ bonsaiIds: summaryBonsai.map((b) => b.id) })).filter(
      (e) => e.status === 'logged',
    );
    const dataRows = buildSpeciesSummaryRows(summaryBonsai, events, t, t('csvSpeciesUnset'));
    const header = SPECIES_CSV_HEADER_KEYS.map((k) => t(k));
    return { csv: cellsToCsvString([header, ...dataRows]), fileName, count: dataRows.length };
  }

  const bonsai = await resolveBonsaiSet(opts);

  if (opts.type === 'bonsai_csv') {
    const header = BONSAI_CSV_HEADER_KEYS.map((k) => t(k));
    const dataRows = bonsai.map((b) => buildBonsaiCsvRow(b, t));
    return { csv: cellsToCsvString([header, ...dataRows]), fileName, count: bonsai.length };
  }

  // events_csv — 人間可読 (盆栽名 / 作業 / 状態 / 日時 / 部位 / 詳細 / メモ / 盆栽ID / 作業ID)
  const { fromIso, toIso } = resolvePeriodRange(opts);
  const bonsaiIds = opts.scope === 'all' ? undefined : bonsai.map((b) => b.id);
  const events = await getEventsInRange({ bonsaiIds, fromIso, toIso });
  const nameMap = await buildBonsaiNameMap();
  const header = EVENT_CSV_HEADER_KEYS.map((k) => t(k));
  const dataRows = events.map((e) => buildEventCsvRow(e, nameMap[e.bonsaiId] ?? '', t));
  return { csv: cellsToCsvString([header, ...dataRows]), fileName, count: events.length };
}

/** 全盆栽 (active + archived) の id → name マップ (events CSV の盆栽名解決用)。 */
async function buildBonsaiNameMap(): Promise<Record<string, string>> {
  const all = [...(await getAllActiveBonsai()), ...(await getAllArchivedBonsai())];
  return Object.fromEntries(all.map((b) => [b.id, b.name]));
}

/**
 * Options に基づき 1 種類をエクスポート (生成 → 共有)。
 * @returns 出力件数 (Sheet が成功 Alert に件数表示)
 */
export async function runExport(opts: ExportOptions, t: Tfn): Promise<ExportResult> {
  if (opts.type === 'list_pdf') {
    const { html, count } = await loadListPdfHtml(opts, t);
    await generateAndShareListPdf(html, t('exportListPdfShareTitle'));
    return { kind: opts.type, count };
  }

  const { csv, fileName, count } = await loadCsvForPreview(opts, t);
  await shareExportFile(fileName, csv, t);
  return { kind: opts.type, count };
}

/**
 * list_pdf の HTML + 件数を生成 (list-preview 画面と runExport で共用)。
 * 共有はしない (呼出側が generateAndShareListPdf する)。
 */
export async function loadListPdfHtml(
  opts: ExportOptions,
  t: Tfn,
): Promise<{ html: string; count: number }> {
  const bonsai = await resolveBonsaiSet(opts);
  const { fromIso, toIso } = resolvePeriodRange(opts);
  const eventsByBonsai = await Promise.all(
    bonsai.map((b) => getEventsInRange({ bonsaiIds: [b.id], fromIso, toIso })),
  );
  const rows: BonsaiListRow[] = bonsai.map((b, i) => ({
    id: b.id,
    name: b.name,
    speciesName: b.speciesCommonName,
    acquiredAt: b.acquiredAt,
    eventCount: eventsByBonsai[i].length,
  }));
  const allEvents = eventsByBonsai.flat();
  const typeBreakdown = allEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});
  const speciesBreakdown = bonsai.reduce<Record<string, number>>((acc, b) => {
    if (b.speciesCommonName) acc[b.speciesCommonName] = (acc[b.speciesCommonName] ?? 0) + 1;
    return acc;
  }, {});
  const stats: ListPdfStats = { totalEvents: allEvents.length, typeBreakdown, speciesBreakdown };
  const generatedAt = (nowUtc() as string).slice(0, 16).replace('T', ' ');
  const html = buildBonsaiListPdfHtml({
    bonsaiList: rows,
    stats,
    texts: {
      coverTitle: t('exportListPdfCoverTitle'),
      coverSubtitleTemplate: t('exportListPdfCoverSubtitle'),
      generatedAtLabel: t('exportListPdfGeneratedAt'),
      generatedAtValue: generatedAt,
      listSectionTitle: t('exportListPdfListSection'),
      listColumnName: t('bonsaiFieldName'),
      listColumnSpecies: t('bonsaiFieldSpecies'),
      listColumnAcquiredAt: t('bonsaiFieldAcquiredAt'),
      listColumnEventCount: t('exportListPdfRecordCount'),
      statsSectionTitle: t('exportListPdfStatsSection'),
      statsTotalLabel: t('exportListPdfTotal'),
      statsTypeBreakdownTitle: t('exportListPdfTypeBreakdown'),
      statsSpeciesBreakdownTitle: t('exportListPdfSpeciesBreakdown'),
      footerNote: t('exportListPdfFooter'),
    },
  });
  return { html, count: rows.length };
}

/**
 * bonsai_pdf の HTML を生成 (pdf-preview 画面と共有で共用)。
 * 写真は base64 inline (iOS WKWebView 制約、ADR-0016)。
 */
export async function loadBonsaiPdfHtml(
  bonsaiId: string,
  lang: string,
  t: Tfn,
): Promise<{ html: string; photoCount: number; name: string }> {
  const detail = await getBonsaiWithSpecies(bonsaiId, lang);
  const events = await getActiveEventsByBonsai(bonsaiId);
  const photos = await getPhotosByBonsai(bonsaiId);
  const coverPhoto = await getCoverPhoto(bonsaiId);
  const tags = await getTagsByBonsai(bonsaiId);
  const name = detail?.name ?? '';

  // 樹種名: master 優先、無ければカスタム樹種 (β、getBonsaiWithSpecies は未解決のため別途)。
  let speciesName = detail?.species?.commonName ?? null;
  if (!speciesName && detail?.customSpeciesId) {
    speciesName = (await getCustomSpeciesById(detail.customSpeciesId))?.name ?? null;
  }

  // 写真を base64 化し cover / event 紐付き / その他 (gallery) に振り分け。
  const coverId = coverPhoto?.id ?? null;
  const coverPhotoUri = coverPhoto ? await readPhotoAsBase64(coverPhoto.absoluteUri) : null;
  const photoUrisByEventId: Record<string, string[]> = {};
  const galleryUris: string[] = [];
  for (const p of photos) {
    if (p.id === coverId) continue; // cover は個票で表示済
    const uri = await readPhotoAsBase64(p.absoluteUri);
    if (!uri) continue;
    if (p.eventId) {
      (photoUrisByEventId[p.eventId] ??= []).push(uri);
    } else {
      galleryUris.push(uri);
    }
  }

  const report = buildBonsaiPdfReport({
    bonsai: {
      name,
      style: detail?.style ?? null,
      acquiredAt: detail?.acquiredAt ?? null,
      estimatedAge: detail?.estimatedAge ?? null,
      estimatedAgeUnknown: detail?.estimatedAgeUnknown ?? 0,
      memo: detail?.memo ?? null,
      acquiredFrom: detail?.acquiredFrom ?? null,
      potInfo: detail?.potInfo ?? null,
    },
    speciesName,
    events,
    coverPhotoUri,
    coverPhotoTakenAt: coverPhoto?.takenAt ?? null,
    photoUrisByEventId,
    galleryUris,
    tags: tags.map((tg) => tg.name),
    t,
  });

  const html = buildBonsaiPdfHtml(report, {
    title: t('exportPdfTitle'),
    labelSpecies: t('bonsaiFieldSpecies'),
    labelStyle: t('bonsaiFieldStyle'),
    labelAge: t('bonsaiFieldEstimatedAge'),
    labelAcquiredAt: t('bonsaiFieldAcquiredAt'),
    labelAcquiredFrom: t('bonsaiFieldAcquiredFrom'),
    labelPot: t('bonsaiFieldPotInfo'),
    labelTags: t('bonsaiFieldTags'),
    memoTitle: t('bonsaiFieldMemo'),
    pestSectionTitle: t('exportPdfPestSection'),
    pestColDate: t('exportPdfHeaderDate'),
    pestColSymptom: t('exportPdfPestColSymptom'),
    pestColNote: t('exportPdfHeaderNote'),
    worklogTitle: t('eventsTitle'),
    worklogEmpty: '―',
    photosTitle: t('bonsaiFieldPhotos'),
  });

  const photoCount =
    (coverPhotoUri ? 1 : 0) +
    Object.values(photoUrisByEventId).reduce((n, arr) => n + arr.length, 0) +
    galleryUris.length;
  return { html, photoCount, name };
}
