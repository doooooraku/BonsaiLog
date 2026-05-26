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
  getAllArchivedBonsai,
  getBonsaiByTag,
  getBonsaiWithSpecies,
} from '@/src/db/bonsaiRepository';
import { getActiveEventsByBonsai, getEventsInRange } from '@/src/db/eventRepository';
import { getPhotosByBonsai } from '@/src/db/photoRepository';
import type { Bonsai } from '@/src/db/schema';
import { getAllSpecies, getSpeciesById } from '@/src/db/speciesRepository';
import {
  type BonsaiForCsv,
  bonsaiToCsvString,
  eventsToCsvString,
  type SpeciesForCsv,
  speciesToCsvString,
} from './csvExport';
import { buildExportFileName, type ExportKind } from './exportFileName';
import { type BonsaiListRow, buildBonsaiListPdfHtml, type ListPdfStats } from './listPdfExport';
import { buildBonsaiPdfHtml, generateAndShareListPdf, readPhotoAsBase64 } from './pdfExport';

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

/** CSV/テキストを cacheDirectory に書き出し → Share Sheet。 */
async function writeAndShareText(fileName: string, content: string, t: Tfn): Promise<void> {
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
 * Options に基づき 1 種類をエクスポート (生成 → 共有)。
 * @returns 出力件数 (Sheet が成功 Alert に件数表示)
 */
export async function runExport(opts: ExportOptions, t: Tfn): Promise<ExportResult> {
  const ext = opts.type === 'list_pdf' ? 'pdf' : 'csv';
  const fileName = buildExportFileName({
    kind: KIND_MAP[opts.type],
    ext,
    date: new Date(nowUtc() as string),
  });

  if (opts.type === 'species_csv') {
    const species = await getAllSpecies(opts.lang);
    const rows: SpeciesForCsv[] = species.map((s) => ({ ...s, commonName: s.commonName ?? '' }));
    await writeAndShareText(fileName, speciesToCsvString(rows), t);
    return { kind: opts.type, count: rows.length };
  }

  const bonsai = await resolveBonsaiSet(opts);

  if (opts.type === 'bonsai_csv') {
    const rows: BonsaiForCsv[] = bonsai.map((b) => ({
      ...b,
      speciesName: b.speciesCommonName ?? '',
    }));
    await writeAndShareText(fileName, bonsaiToCsvString(rows), t);
    return { kind: opts.type, count: rows.length };
  }

  const { fromIso, toIso } = resolvePeriodRange(opts);

  if (opts.type === 'events_csv') {
    const bonsaiIds = opts.scope === 'all' ? undefined : bonsai.map((b) => b.id);
    const events = await getEventsInRange({ bonsaiIds, fromIso, toIso });
    await writeAndShareText(fileName, eventsToCsvString(events), t);
    return { kind: opts.type, count: events.length };
  }

  // list_pdf — プレビューと共用の HTML を生成して共有
  const { html, count } = await loadListPdfHtml(opts, t);
  await generateAndShareListPdf(html, t('exportListPdfShareTitle'));
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
  const photoDataUris = (
    await Promise.all(photos.map((p) => readPhotoAsBase64(p.absoluteUri)))
  ).filter((uri): uri is string => uri !== null);
  const name = detail?.name ?? '';
  const html = buildBonsaiPdfHtml({
    bonsai: { name, style: detail?.style ?? null, acquiredAt: detail?.acquiredAt ?? null },
    speciesCommonName: detail?.species?.commonName ?? null,
    events,
    photoDataUris,
    labelPhotosTitle: t('bonsaiFieldPhotos'),
    title: t('exportPdfTitle'),
    labelSpecies: t('bonsaiFieldSpecies'),
    labelStyle: t('bonsaiFieldStyle'),
    labelAcquiredAt: t('bonsaiFieldAcquiredAt'),
    labelEventsTitle: t('eventsTitle'),
    labelEventDate: t('exportPdfHeaderDate'),
    labelEventType: t('exportPdfHeaderType'),
    labelEventNote: t('exportPdfHeaderNote'),
    footerNote: t('exportPdfFooterNote'),
  });
  return { html, photoCount: photoDataUris.length, name };
}
