/**
 * Event payload → 表示用 chip[] への変換純関数 (Issue #296 Phase 2、 Sess34 ADR-0041 PR-2 リライト)。
 *
 * display-schema.md v1.3 §「14 作業の表示テンプレート」 整合 + ADR-0041 D4 (14 種別フル網羅 +
 * exhaustive switch + leaf_first_aid bug fix + wiring scheduled_unwire chip 削除) 反映。
 *
 * 14 種別 payload (実保存 SoT = src/features/event/WorkLogTypeFormFields.tsx の `buildWorkLogPayload`):
 * - watering: amount ('normal' | 'plenty' | 'light')
 * - pruning: parts (string[])、 amount ('few' | 'some' | 'lot')
 * - wiring: wire_size_mm (number)、 body_part ('all' | 'miki' | 'eda')
 *   ※ scheduled_unwire_at は EventRow の WiringPeriodDisplay 側で表示するため chip 化しない (D9)
 * - unwiring: body_part ('miki' | 'eda' | 'all')
 * - repotting: pot_size_cm (number)、 soil_mix (free text)、 root_pruning ('none' | 'light' | 'third' | 'half')
 * - fertilizing: kind ('solid' | 'liquid' | 'slow_release' | 'other')、 amount (free text、 product 銘柄)
 * - pest_control: target ('prevention' | 'treatment' | 'both')、 agent (free text)、 dilution_ratio (number)
 * - leaf_trimming / defoliation / deshoot: body_part ('tips_only' | 'moderate' | 'heavy')
 * - candle_cut: body_part + count (number)
 * - moss_care: action ('attach' | 'remove' | 'moisten')
 * - position_change: from / to (free text)
 * - leaf_first_aid: symptom ('burn' | 'wither' | 'pest' | 'mold' | 'other')、 treatment (free text)
 *
 * @see docs/adr/ADR-0041-event-row-display-mode.md D4/D9
 * @see src/features/event/WorkLogTypeFormFields.tsx buildWorkLogPayload (実保存 SoT)
 * @see src/db/schema.ts EVENT_TYPES (14 種別 SoT)
 */
import type { TranslationKey } from '@/src/core/i18n/i18n';
import type { EventType } from '@/src/db/schema';

import {
  getFertKindLabelKey,
  getLeafAidSymptomLabelKey,
  getMossActionLabelKey,
  getPayloadValueLabelKey,
  getPestPurposeLabelKey,
  getPruneAmountLabelKey,
  getRepotRootsLabelKey,
  getTrimRangeLabelKey,
} from './payloadLabels';

/**
 * Chip の表現。labelKey (i18n) または text (生文字列、 自由テキストや数値用) の
 * いずれか 1 つを持つ。
 */
export type HistoryChip = {
  /** i18n key を解決して表示 (固定 enum 値用)。 */
  labelKey?: TranslationKey;
  /** 生文字列をそのまま表示 (自由テキスト / 数値 / 単位付き値)。 */
  text?: string;
};

type EventLike = {
  type: string;
  /** JSON 文字列 (DB の payload_json 列)、null 可。 */
  payloadJson?: string | null;
};

/** payload_json を安全にパース。失敗時は空オブジェクト。 */
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
 * 共通 (parts / water amount) field の value から chip を生成。
 * i18n key 解決可なら labelKey、 不可なら生 text fallback、 空文字列は null。
 */
function valueChip(value: unknown): HistoryChip | null {
  if (value == null) return null;
  const str = typeof value === 'string' ? value : String(value);
  if (str.length === 0) return null;
  const key = getPayloadValueLabelKey(str);
  return key ? { labelKey: key } : { text: str };
}

/**
 * 任意の context-specific resolver で chip を生成。
 * resolver が null を返した場合は生 text fallback、 空文字列は null。
 */
function contextChip(
  value: unknown,
  resolver: (v: string) => TranslationKey | null,
): HistoryChip | null {
  if (value == null) return null;
  const str = typeof value === 'string' ? value : String(value);
  if (str.length === 0) return null;
  const key = resolver(str);
  return key ? { labelKey: key } : { text: str };
}

/**
 * Free text (soil_mix / agent / fert product / leaf treatment / position to) を chip 化。
 * 空文字列は null。
 */
function freeTextChip(value: unknown): HistoryChip | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return { text: trimmed };
}

/**
 * Event の payload から chip[] を生成。
 * type ごとに表示順を fixed (display-schema.md §「チップ順序は入力フォームの上から下」 整合)。
 *
 * exhaustive switch (`assertNever`) で新規 EventType 追加時に build error 化、
 * silent fallthrough (旧 leaf_first_aid 欠落 bug 等) を構造防止。
 */
export function buildHistoryChips(event: EventLike): HistoryChip[] {
  const payload = parsePayload(event.payloadJson);
  const chips: HistoryChip[] = [];

  const pushChip = (chip: HistoryChip | null) => {
    if (chip) chips.push(chip);
  };

  // type は string (DB row 由来) だが EVENT_TYPES に validate 済の値が来ることが期待される。
  // 不正な type は default で chip 空配列を返す (graceful degradation)。
  const type = event.type as EventType;

  switch (type) {
    case 'watering': {
      // payload.amount = 'normal' | 'plenty' | 'light'
      pushChip(valueChip(payload.amount));
      break;
    }
    case 'pruning': {
      // payload.parts = string[] (multi)、 payload.amount = 'few' | 'some' | 'lot'
      if (Array.isArray(payload.parts)) {
        for (const p of payload.parts) pushChip(valueChip(p));
      }
      pushChip(contextChip(payload.amount, getPruneAmountLabelKey));
      break;
    }
    case 'wiring': {
      // payload.wire_size_mm (number)、 body_part ('all' | 'miki' | 'eda')
      // ADR-0041 D9: scheduled_unwire_at は WiringPeriodDisplay 側で表示するため chip 化しない
      if (typeof payload.wire_size_mm === 'number') {
        chips.push({ text: `${payload.wire_size_mm}mm` });
      }
      pushChip(valueChip(payload.body_part));
      break;
    }
    case 'unwiring': {
      // payload.body_part = 'miki' | 'eda' | 'all'
      pushChip(valueChip(payload.body_part));
      break;
    }
    case 'repotting': {
      // payload.pot_size_cm (number、 cm canonical)、 soil_mix (free)、 root_pruning ('none' | 'light' | 'third' | 'half')
      if (typeof payload.pot_size_cm === 'number') {
        chips.push({ text: `${payload.pot_size_cm}cm` });
      }
      pushChip(contextChip(payload.root_pruning, getRepotRootsLabelKey));
      pushChip(freeTextChip(payload.soil_mix));
      break;
    }
    case 'fertilizing': {
      // payload.kind = 'solid' | 'liquid' | 'slow_release' | 'other'、 amount (free、 product 銘柄)
      pushChip(contextChip(payload.kind, getFertKindLabelKey));
      pushChip(freeTextChip(payload.amount));
      break;
    }
    case 'pest_control': {
      // payload.target = 'prevention' | 'treatment' | 'both'、 agent (free)、 dilution_ratio (number)
      pushChip(contextChip(payload.target, getPestPurposeLabelKey));
      pushChip(freeTextChip(payload.agent));
      if (typeof payload.dilution_ratio === 'number') {
        chips.push({ text: `×${payload.dilution_ratio}` });
      }
      break;
    }
    case 'leaf_trimming':
    case 'defoliation':
    case 'deshoot': {
      // payload.body_part = 'tips_only' | 'moderate' | 'heavy'
      pushChip(contextChip(payload.body_part, getTrimRangeLabelKey));
      break;
    }
    case 'candle_cut': {
      // payload.body_part + count (number)
      pushChip(contextChip(payload.body_part, getTrimRangeLabelKey));
      if (typeof payload.count === 'number') {
        chips.push({ text: `×${payload.count}` });
      }
      break;
    }
    case 'moss_care': {
      // payload.action = 'attach' | 'remove' | 'moisten'
      pushChip(contextChip(payload.action, getMossActionLabelKey));
      break;
    }
    case 'position_change': {
      // payload.from / to (free)、 to があれば「→ N」 形式で表示
      if (typeof payload.to === 'string' && payload.to.trim().length > 0) {
        chips.push({ text: `→ ${payload.to.trim()}` });
      } else {
        pushChip(freeTextChip(payload.from));
      }
      break;
    }
    case 'leaf_first_aid': {
      // payload.symptom = 'burn' | 'wither' | 'pest' | 'mold' | 'other'、 treatment (free)
      pushChip(contextChip(payload.symptom, getLeafAidSymptomLabelKey));
      pushChip(freeTextChip(payload.treatment));
      break;
    }
    default: {
      // exhaustive check: 新規 EventType 追加時に compile error
      const _exhaustive: never = type;
      void _exhaustive;
      break;
    }
  }

  return chips;
}
