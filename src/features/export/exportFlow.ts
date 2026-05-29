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
import { buildBonsaiCsvRow, BONSAI_CSV_HEADER_KEYS, formatStyle } from './bonsaiCsvRow';
import { buildBonsaiPdfReport } from './bonsaiPdfReport';
import { buildEventCsvRow, EVENT_CSV_HEADER_KEYS } from './eventCsvRow';
import { buildExportFileName, type ExportKind } from './exportFileName';
import {
  buildBonsaiListPdfHtml,
  type CatalogPhotoEntry,
  type ListPdfTexts,
  type ListReportBlock,
  type ListReportTextsCatalog,
} from './listPdfExport';
import {
  buildCatalogEntries,
  buildListReportBars,
  buildListReportHeatmap,
  buildListReportSummary,
  type CatalogEntry,
  type ListReportBonsaiInput,
  type ListReportEventInput,
  monthAxisFromEvents,
} from './listPdfReport';
import { buildBonsaiPdfHtml, generateListPdfWithFallback, readPhotoAsBase64 } from './pdfExport';
import { getPhotoResizeSpec, type AttemptNumber } from './pdfReliability';
import { buildSpeciesSummaryRows, SPECIES_CSV_HEADER_KEYS } from './speciesSummary';

export type ExportTypeKey = 'bonsai_csv' | 'events_csv' | 'species_csv' | 'list_pdf';
export type ExportPeriod = 'all' | '30d' | '1y' | 'custom';
export type ExportScope = 'all' | 'selected' | 'tag';

export type ExportOptions = {
  type: ExportTypeKey;
  period: ExportPeriod;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  scope: ExportScope;
  selectedBonsaiIds?: readonly string[] | undefined;
  tagId?: string | undefined;
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
): { fromIso?: string | undefined; toIso?: string | undefined } {
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
    // 写真サムネ付きカタログを含むため 3 段階フォールバックで出力 (多本数でも確実生成)。
    const { buildHtmlForAttempt, photoCount, count } = await prepareListPdf(opts, t);
    await generateListPdfWithFallback({
      buildHtmlForAttempt,
      photoCount,
      shareDialogTitle: t('exportListPdfShareTitle'),
    });
    return { kind: opts.type, count };
  }

  const { csv, fileName, count } = await loadCsvForPreview(opts, t);
  await shareExportFile(fileName, csv, t);
  return { kind: opts.type, count };
}

/** 樹種通称を master 優先・無ければ custom (β) で解決。 */
async function resolveSpeciesName(b: ResolvedBonsai): Promise<string | null> {
  if (b.speciesCommonName) return b.speciesCommonName;
  if (b.customSpeciesId) return (await getCustomSpeciesById(b.customSpeciesId))?.name ?? null;
  return null;
}

/** list_pdf の写真以外の全データ (出力フォールバックの attempt 間で共用)。 */
type ListPdfData = {
  count: number;
  /** カバー写真ありの盆栽数 (動的タイムアウト用)。 */
  photoCount: number;
  texts: ListPdfTexts;
  /** report (catalog 以外完成済み、catalog は compose 時に写真注入して付与)。 */
  report: ListReportBlock;
  catalogEntries: CatalogEntry[];
  catalogTexts: ListReportTextsCatalog;
  /** カバー写真の raw file URI (attempt 別 base64 化のため未変換で保持)。 */
  coverUriByBonsai: { bonsaiId: string; uri: string | null }[];
};

/**
 * list_pdf の写真以外データを一括収集 (DB 読み込み 1 回)。
 * 樹種は master + custom を解決し、サマリー/棒/ヒートマップ/カタログ全集計で共有 (母数一致)。
 */
async function gatherListPdfData(opts: ExportOptions, t: Tfn): Promise<ListPdfData> {
  const bonsai = await resolveBonsaiSet(opts);
  const { fromIso, toIso } = resolvePeriodRange(opts);
  const bonsaiIds = bonsai.map((b) => b.id);
  const allEventsRaw =
    bonsaiIds.length > 0 ? await getEventsInRange({ bonsaiIds, fromIso, toIso }) : [];
  // 統計・グラフは実施済 (logged) のみを母数にする (planned/未来分は除外、species_csv と整合)。
  const loggedEvents = allEventsRaw.filter((e) => e.status === 'logged');

  // 樹種名 (master + custom) を 1 回解決し全集計で共有。
  const speciesNameById = new Map<string, string | null>();
  for (const b of bonsai) speciesNameById.set(b.id, await resolveSpeciesName(b));

  const reportBonsai: ListReportBonsaiInput[] = bonsai.map((b) => ({
    id: b.id,
    name: b.name,
    speciesName: speciesNameById.get(b.id) ?? null,
    style: b.style,
    acquiredAt: b.acquiredAt,
  }));
  const reportEvents: ListReportEventInput[] = loggedEvents.map((e) => ({
    bonsaiId: e.bonsaiId,
    type: e.type,
    occurredAtUtc: e.occurredAtUtc,
    tzOffsetMin: e.tzOffsetMin,
  }));
  const months = monthAxisFromEvents(reportEvents);
  const summary = buildListReportSummary(reportBonsai, reportEvents);
  const bars = buildListReportBars(reportBonsai, reportEvents, {
    topBonsai: 15,
    months,
    othersLabelTemplate: t('exportListPdfChartOthers'),
  });
  const heatmap = buildListReportHeatmap(reportBonsai, reportEvents, months);
  const catalogEntries = buildCatalogEntries(reportBonsai, reportEvents, {
    typeLabelOf: (type) => t(`eventType_${type}` as TranslationKey),
    styleLabelOf: (style) => formatStyle(style, t),
  });

  // カバー写真の raw URI (attempt 別に base64 化するため未変換で保持)。
  const coverUriByBonsai = await Promise.all(
    bonsai.map(async (b) => ({
      bonsaiId: b.id,
      uri: (await getCoverPhoto(b.id))?.absoluteUri ?? null,
    })),
  );
  const photoCount = coverUriByBonsai.filter((c) => c.uri).length;

  const generatedAt = (nowUtc() as string).slice(0, 16).replace('T', ' ');
  const texts: ListPdfTexts = {
    coverTitle: t('exportListPdfCoverTitle'),
    coverSubtitleTemplate: t('exportListPdfCoverSubtitle'),
    generatedAtValue: generatedAt,
    footerNote: t('exportListPdfFooter'),
  };
  const report: ListReportBlock = {
    summary,
    bars,
    texts: {
      summaryBonsaiCount: t('exportListPdfSummaryBonsaiCount'),
      summarySpeciesCount: t('exportListPdfSummarySpeciesCount'),
      summaryStyleCount: t('exportListPdfSummaryStyleCount'),
      summaryTotalRecords: t('exportListPdfSummaryTotalRecords'),
      chartPerBonsai: t('exportListPdfChartPerBonsai'),
      chartSpecies: t('exportListPdfChartSpecies'),
      chartPerMonth: t('exportListPdfChartPerMonth'),
    },
    heatmap: {
      data: heatmap,
      texts: {
        title: t('exportListPdfHeatmapTitle'),
        legend: t('exportListPdfHeatmapLegend'),
        legendLess: t('exportListPdfHeatmapLegendLess'),
        legendMore: t('exportListPdfHeatmapLegendMore'),
        monthTotal: t('exportListPdfHeatmapMonthTotal'),
        topMonths: t('exportListPdfHeatmapTopMonths'),
        noData: t('exportListPdfHeatmapNoData'),
      },
    },
  };
  const catalogTexts: ListReportTextsCatalog = {
    title: t('exportListPdfCatalogTitle'),
    totalRecords: t('exportListPdfCatalogTotalRecords'),
    acquired: t('exportListPdfCatalogAcquired'),
  };

  return {
    count: bonsai.length,
    photoCount,
    texts,
    report,
    catalogEntries,
    catalogTexts,
    coverUriByBonsai,
  };
}

/** 収集済みデータ + (attempt 別) カバー写真 base64 マップ → 最終 HTML。 */
function composeListPdfHtml(data: ListPdfData, coverData: Map<string, string | null>): string {
  const entries: CatalogPhotoEntry[] = data.catalogEntries.map((e) => ({
    ...e,
    coverPhotoUri: coverData.get(e.bonsaiId) ?? null,
  }));
  return buildBonsaiListPdfHtml({
    texts: data.texts,
    report: { ...data.report, catalog: { entries, texts: data.catalogTexts } },
  });
}

/**
 * list_pdf 出力準備 (Sess51 Phase 3)。DB 読み込みは 1 回だけ行い、attempt 別にカバー写真を
 * 再縮小 (thumb spec) して HTML を組み立てる async ファクトリを返す。bonsai_pdf の
 * prepareBonsaiPdf と同設計 (写真導入で 3 段階フォールバックが必須になったため)。
 */
export async function prepareListPdf(
  opts: ExportOptions,
  t: Tfn,
): Promise<{
  count: number;
  photoCount: number;
  buildHtmlForAttempt: (attempt: AttemptNumber) => Promise<string>;
}> {
  const data = await gatherListPdfData(opts, t);
  const buildHtmlForAttempt = async (attempt: AttemptNumber): Promise<string> => {
    const spec = getPhotoResizeSpec('thumb', attempt);
    const coverData = new Map<string, string | null>();
    for (const { bonsaiId, uri } of data.coverUriByBonsai) {
      coverData.set(bonsaiId, uri ? await readPhotoAsBase64(uri, spec) : null);
    }
    return composeListPdfHtml(data, coverData);
  };
  return { count: data.count, photoCount: data.photoCount, buildHtmlForAttempt };
}

/**
 * bonsai_pdf の生成準備 (Sess50)。DB 読み込みは 1 回だけ行い、attempt 別に写真を再縮小して
 * HTML を組み立てる async ファクトリ `buildHtmlForAttempt` を返す。
 *
 * 旧 loadBonsaiPdfHtml (完成 HTML 文字列を 1 本返し WebView/出力で共用) を廃止 (Sess50):
 * - WebView プレビューは tile memory 上限で多写真時に真っ白 → 画面を廃止し OS 共有に一本化。
 * - 出力は 3 段階フォールバック (generateBonsaiPdfWithFallback) で attempt 別画質を再生成するため、
 *   完成済み文字列ではなく「attempt → HTML」のファクトリが必要。
 *
 * 写真は base64 inline (iOS WKWebView 制約、ADR-0016)。作業ログのインライン写真 (56px 表示) は
 * thumb spec で強く縮小、ギャラリー/カバーは photo spec。これが payload 削減の主役。
 *
 * @returns name / photoCount (タイムアウト用) / coverUri (確認画面のサムネ表示用 raw file URI) /
 *          buildHtmlForAttempt (attempt 別画質で写真 inline 済み HTML を返す)
 */
export async function prepareBonsaiPdf(
  bonsaiId: string,
  lang: string,
  t: Tfn,
): Promise<{
  name: string;
  photoCount: number;
  coverUri: string | null;
  buildHtmlForAttempt: (attempt: AttemptNumber) => Promise<string>;
}> {
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

  const coverId = coverPhoto?.id ?? null;
  const nonCoverPhotos = photos.filter((p) => p.id !== coverId); // cover は個票で表示済
  const photoCount = (coverPhoto ? 1 : 0) + nonCoverPhotos.length;

  // ラベル群は attempt 非依存なので 1 回だけ確定。
  const texts = {
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
  };

  const buildHtmlForAttempt = async (attempt: AttemptNumber): Promise<string> => {
    const photoSpec = getPhotoResizeSpec('photo', attempt);
    const thumbSpec = getPhotoResizeSpec('thumb', attempt);

    // 写真を attempt 別画質で base64 化し cover / event 紐付き (thumb) / その他 gallery に振り分け。
    const coverPhotoUri = coverPhoto
      ? await readPhotoAsBase64(coverPhoto.absoluteUri, photoSpec)
      : null;
    const photoUrisByEventId: Record<string, string[]> = {};
    const galleryUris: string[] = [];
    for (const p of nonCoverPhotos) {
      const uri = await readPhotoAsBase64(p.absoluteUri, p.eventId ? thumbSpec : photoSpec);
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

    return buildBonsaiPdfHtml(report, texts);
  };

  return { name, photoCount, coverUri: coverPhoto?.absoluteUri ?? null, buildHtmlForAttempt };
}
