/**
 * Event payload → 表示用 chip[] への変換純関数 (Issue #296 Phase 2)。
 *
 * display-schema.md v1.3 §「14 作業の表示テンプレート」 整合。type ごとの
 * payload field を読み取り、chip[] を生成する。chip = { labelKey | text }
 * の最小形式。UI は Phase 3 で配線。
 *
 * 現状の payload schema (payloadValidator.ts) は mockup v1.0 より単純化されており、
 * 取得可能な field のみ chip 化:
 * - watering: amount_ml / weather
 * - pruning / leaf_trimming / defoliation / deshoot / candle_cut: body_part
 * - wiring: wire_size_mm / body_part / scheduled_unwire_at
 * - unwiring: body_part
 * - repotting: pot_id / soil_mix
 * - fertilizing: kind / amount
 * - pest_control: agent / target
 * - moss_care: action
 * - position_change: from / to
 *
 * 残作業 (Phase 3 以降): mockup の 30 fields (amount=normal/plenty/light、
 * parts[]=eda/ha 等の構造化 enum) は payload schema 拡張が必要。本 PR は
 * 現実装に合わせた中間実装。
 *
 * @see docs/mockups/v1.0/docs/display-schema.md v1.3
 */
import type { TranslationKey } from '@/src/core/i18n/i18n';

import { getPayloadValueLabelKey } from './payloadLabels';

/**
 * Chip の表現。labelKey (i18n) または text (生文字列、自由テキストや日付用) の
 * いずれか 1 つを持つ。
 */
export type HistoryChip = {
  /** i18n key を解決して表示 (固定 enum 値用)。 */
  labelKey?: TranslationKey;
  /** 生文字列をそのまま表示 (自由テキスト / 数値 / 日付用)。 */
  text?: string;
};

type EventLike = {
  type: string;
  /** JSON 文字列 (DB の payload_json 列)、null 可。 */
  payloadJson?: string | null;
};

/**
 * payload_json を安全にパース。失敗時は空オブジェクト。
 */
function parsePayload(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * value から chip を生成 (i18n key 解決 or 生 text fallback)。
 */
function valueChip(value: unknown): HistoryChip | null {
  if (value == null) return null;
  const str = typeof value === 'string' ? value : String(value);
  if (str.length === 0) return null;
  const key = getPayloadValueLabelKey(str);
  return key ? { labelKey: key } : { text: str };
}

/**
 * Event の payload から chip[] を生成。
 * type ごとに表示順を fixed (display-schema.md §「チップ順序は入力フォームの上から下」)。
 */
export function buildHistoryChips(event: EventLike): HistoryChip[] {
  const payload = parsePayload(event.payloadJson);
  const chips: HistoryChip[] = [];

  const pushChip = (chip: HistoryChip | null) => {
    if (chip) chips.push(chip);
  };

  switch (event.type) {
    case 'watering': {
      // amount_ml は数値、weather は string
      if (typeof payload.amount_ml === 'number') {
        chips.push({ text: `${payload.amount_ml}ml` });
      }
      pushChip(valueChip(payload.weather));
      break;
    }
    case 'pruning':
    case 'leaf_trimming':
    case 'defoliation':
    case 'deshoot':
    case 'candle_cut':
      pushChip(valueChip(payload.body_part));
      break;
    case 'wiring': {
      if (typeof payload.wire_size_mm === 'number') {
        chips.push({ text: `${payload.wire_size_mm}mm` });
      }
      pushChip(valueChip(payload.body_part));
      if (typeof payload.scheduled_unwire_at === 'string') {
        // ISO 日付の先頭 10 文字 (YYYY-MM-DD) を表示
        chips.push({ text: payload.scheduled_unwire_at.slice(0, 10) });
      }
      break;
    }
    case 'unwiring':
      pushChip(valueChip(payload.body_part));
      break;
    case 'repotting': {
      pushChip(valueChip(payload.pot_id));
      pushChip(valueChip(payload.soil_mix));
      break;
    }
    case 'fertilizing': {
      pushChip(valueChip(payload.kind));
      pushChip(valueChip(payload.amount));
      break;
    }
    case 'pest_control': {
      pushChip(valueChip(payload.agent));
      pushChip(valueChip(payload.target));
      break;
    }
    case 'moss_care':
      pushChip(valueChip(payload.action));
      break;
    case 'position_change': {
      if (typeof payload.to === 'string' && payload.to.length > 0) {
        // mockup の「→ ベランダ南」 整合
        chips.push({ text: `→ ${payload.to}` });
      } else {
        pushChip(valueChip(payload.from));
      }
      break;
    }
    default:
      break;
  }

  return chips;
}
