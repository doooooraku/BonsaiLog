/**
 * F-10 個別盆栽 PDF レポートの構造化データ純関数 (Issue #33 / ADR-0016 Sess49)。
 *
 * 役割: DB から読んだ盆栽 + 作業イベント + 写真 + タグ + 樹種名を受け取り、
 * 「事前ローカライズ済の表示用構造化データ」(BonsaiPdfReportData) へ変換する。
 * HTML 組み立て (pdfExport.buildBonsaiPdfHtml) はこの出力を受け取るだけにして純粋に保つ。
 *
 * CSV 側 (eventCsvRow.ts = ローカライズ純関数 / csvExport.ts = 整形) と同じ分離。
 * 作業の中身は履歴 UI / CSV と同じ buildHistoryChips を再利用し「英語生ダンプ」を解消。
 *
 * 適応型 (adaptive): データが無い項目・セクションは出力しない (空欄/「―」だらけ回避)。
 */
import { formatLocal } from '@/src/core/datetime/format';
import type { IsoUtc, TzIana } from '@/src/core/datetime/types';
import type { TranslationKey } from '@/src/core/i18n/i18n';
import { buildHistoryChips, type HistoryChip } from '@/src/features/event/buildHistoryChips';
import type { Bonsai, Event, EventType } from '@/src/db/schema';

import { formatPot, formatStyle } from './bonsaiCsvRow';

type Tfn = (key: TranslationKey) => string;

/**
 * 「病害虫・対処の履歴」セクションに抽出する作業種別 (SoT)。
 * 将来 EventType を追加した際にここを見直す箇所として 1 か所に集約。
 */
export const PEST_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  'pest_control',
  'leaf_first_aid',
]);

/**
 * 作業種別 → バッジの薄い地色 + 文字色 (凡例なし方針、白黒印刷でも文字で識別可)。
 * 色のベースは EventIcons.tsx の種別色 (深緑 / 樹皮 / 緑 / 赤 / 灰) を薄地 tint 化。
 */
const BADGE_COLOR: Record<EventType, { bg: string; fg: string }> = {
  watering: { bg: '#E9F0EC', fg: '#1F3A2E' },
  pruning: { bg: '#EFEAE4', fg: '#5A4637' },
  wiring: { bg: '#EFEAE4', fg: '#5A4637' },
  unwiring: { bg: '#F2EEE9', fg: '#5A4637' },
  repotting: { bg: '#EFEAE4', fg: '#5A4637' },
  fertilizing: { bg: '#EBF0E9', fg: '#3E5C39' },
  pest_control: { bg: '#F3E5E5', fg: '#8B2E2E' },
  leaf_trimming: { bg: '#ECF0E6', fg: '#4F6B2A' },
  defoliation: { bg: '#E9EFE2', fg: '#4F6B2A' },
  deshoot: { bg: '#F0EAE6', fg: '#5A4637' },
  candle_cut: { bg: '#F1E7E2', fg: '#A8523E' },
  moss_care: { bg: '#EAEFEA', fg: '#3E5C39' },
  position_change: { bg: '#ECEBE8', fg: '#5A5248' },
  leaf_first_aid: { bg: '#F2E7E3', fg: '#6B2E2E' },
};

const FALLBACK_BADGE = { bg: '#ECEBE8', fg: '#1A1A1A' };

export type PdfTimelineEntry = {
  /** 端末ローカルの日付 (yyyy-MM-dd)。 */
  date: string;
  /** ローカライズ済み作業種別名 (例「水やり」)。 */
  typeLabel: string;
  badgeBg: string;
  badgeFg: string;
  /** ローカライズ済みの作業別チップ (例「番手: 2mm」「部位: 枝」)。 */
  chips: string[];
  /** 自由メモ。 */
  note?: string;
  /** この作業に紐づくインライン写真 (base64 data URI)。 */
  photoUris: string[];
};

export type PdfPestEntry = {
  date: string;
  /** 症状・部位 (チップを結合した 1 行)。 */
  symptomBodyPart: string;
  note?: string;
};

export type BonsaiPdfReportData = {
  meta: {
    name: string;
    speciesName?: string;
    styleLabel?: string;
    /** 樹齢 (例「35年」 or「不明」)。 */
    ageText?: string;
    /** 取得日 + 保有年数 (例「2020-03-15（6.1年保有）」)。 */
    acquiredText?: string;
    acquiredFrom?: string;
    potText?: string;
    tags: string[];
    memo?: string;
  };
  /** カバー (or 最新) 写真 base64 data URI。 */
  coverPhotoUri?: string;
  /** カバー写真の撮影日キャプション (例「2026-04-22 撮影」)。 */
  coverPhotoCaption?: string;
  pestEvents: PdfPestEntry[];
  timeline: PdfTimelineEntry[];
  /** タイムラインに紐づかない残り写真 (base64 data URI)。 */
  gallery: string[];
};

export type BonsaiPdfReportInput = {
  bonsai: Pick<
    Bonsai,
    | 'name'
    | 'style'
    | 'acquiredAt'
    | 'estimatedAge'
    | 'estimatedAgeUnknown'
    | 'memo'
    | 'acquiredFrom'
    | 'potInfo'
  >;
  /** master / custom どちらか解決済みの樹種通称。 */
  speciesName: string | null;
  /** occurred_at_utc DESC (直近順) の作業イベント。 */
  events: readonly Event[];
  coverPhotoUri?: string | null;
  coverPhotoTakenAt?: string | null;
  /** event_id → base64 data URI[] (インライン写真用)。 */
  photoUrisByEventId: Readonly<Record<string, readonly string[]>>;
  /** タイムラインに紐づかない写真 base64 data URI[]。 */
  galleryUris: readonly string[];
  tags: readonly string[];
  /** 保有年数計算の基準 (現在時刻 ISO UTC)。 */
  nowIso: string;
  t: Tfn;
};

function chipValue(chip: HistoryChip, t: Tfn): string {
  const value = chip.labelKey ? t(chip.labelKey) : (chip.text ?? '');
  const unit = chip.valueUnitKey ? t(chip.valueUnitKey) : '';
  return `${value}${unit}`;
}

/** event の payload → ローカライズ済みチップ文字列配列 (「label: 値」 or 値のみ)。 */
function formatChips(event: Pick<Event, 'type' | 'payloadJson'>, t: Tfn): string[] {
  return buildHistoryChips({ type: event.type, payloadJson: event.payloadJson })
    .map((c) => (c.fieldLabelKey ? `${t(c.fieldLabelKey)}: ${chipValue(c, t)}` : chipValue(c, t)))
    .filter((s) => s.trim().length > 0);
}

/** UTC ISO + tzIana を端末ローカルの 'yyyy-MM-dd' へ。tz 異常時は日付部分のみ fallback。 */
function formatDate(occurredAtUtc: string, tzIana: string): string {
  try {
    return formatLocal(occurredAtUtc as IsoUtc, tzIana as TzIana, 'yyyy-MM-dd');
  } catch {
    return occurredAtUtc.slice(0, 10);
  }
}

/** acquiredAt から now までの保有年数を小数 1 桁で。負値や異常時は null。 */
function calcHoldingYears(acquiredAtUtc: string, nowIso: string): number | null {
  const start = Date.parse(acquiredAtUtc);
  const now = Date.parse(nowIso);
  if (Number.isNaN(start) || Number.isNaN(now) || now < start) return null;
  const years = (now - start) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
}

/** 樹齢の表示文字列。不明フラグ優先、次に推定年数、どちらも無ければ undefined (適応型)。 */
function buildAgeText(
  estimatedAge: number | null | undefined,
  estimatedAgeUnknown: number | null | undefined,
  t: Tfn,
): string | undefined {
  if (estimatedAgeUnknown === 1) return t('bonsaiFieldEstimatedAgeUnknown');
  if (typeof estimatedAge === 'number') {
    return t('elapsedYears').replace('{years}', String(estimatedAge));
  }
  return undefined;
}

/** 取得日 + 保有年数 (例「2020-03-15（6.1年保有）」)。取得日無しなら undefined。 */
function buildAcquiredText(
  acquiredAtUtc: string | null | undefined,
  nowIso: string,
  t: Tfn,
): string | undefined {
  if (!acquiredAtUtc) return undefined;
  const dateStr = acquiredAtUtc.slice(0, 10);
  const years = calcHoldingYears(acquiredAtUtc, nowIso);
  if (years == null) return dateStr;
  const holding = t('exportPdfHoldingYears').replace('{years}', String(years));
  return `${dateStr}（${holding}）`;
}

/**
 * DB から読んだ盆栽データ → PDF レポート用の構造化データ (純関数)。
 * 表示文字列はすべてこの層で確定 (HTML 層はエスケープ + 配置のみ)。
 */
export function buildBonsaiPdfReport(input: BonsaiPdfReportInput): BonsaiPdfReportData {
  const { bonsai, speciesName, events, t, nowIso } = input;

  const meta: BonsaiPdfReportData['meta'] = {
    name: bonsai.name,
    speciesName: speciesName ?? undefined,
    styleLabel: bonsai.style ? formatStyle(bonsai.style, t) : undefined,
    ageText: buildAgeText(bonsai.estimatedAge, bonsai.estimatedAgeUnknown, t),
    acquiredText: buildAcquiredText(bonsai.acquiredAt, nowIso, t),
    acquiredFrom: bonsai.acquiredFrom?.trim() || undefined,
    potText: formatPot(bonsai.potInfo) || undefined,
    tags: [...input.tags],
    memo: bonsai.memo?.trim() || undefined,
  };

  const coverPhotoCaption =
    input.coverPhotoUri && input.coverPhotoTakenAt
      ? t('exportPdfPhotoTakenAt').replace('{date}', input.coverPhotoTakenAt.slice(0, 10))
      : undefined;

  const pestEvents: PdfPestEntry[] = [];
  const timeline: PdfTimelineEntry[] = [];

  for (const e of events) {
    const chips = formatChips(e, t);
    const photoUris = [...(input.photoUrisByEventId[e.id] ?? [])];
    const date = formatDate(e.occurredAtUtc, e.tzIana);
    const note = e.note?.trim() || undefined;

    const badge = BADGE_COLOR[e.type as EventType] ?? FALLBACK_BADGE;
    timeline.push({
      date,
      typeLabel: t(`eventType_${e.type}` as TranslationKey),
      badgeBg: badge.bg,
      badgeFg: badge.fg,
      chips,
      note,
      photoUris,
    });

    if (PEST_EVENT_TYPES.has(e.type as EventType)) {
      pestEvents.push({ date, symptomBodyPart: chips.join(' / '), note });
    }
  }

  return {
    meta,
    coverPhotoUri: input.coverPhotoUri ?? undefined,
    coverPhotoCaption,
    pestEvents,
    timeline,
    gallery: [...input.galleryUris],
  };
}
