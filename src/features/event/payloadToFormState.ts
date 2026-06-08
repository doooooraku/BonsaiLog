/**
 * payloadToFormState — events.payload_json (DB 保存形式) を WorkLogTypeFormState
 * (form 入力 state) に逆変換する純関数 (ADR-0055 Sess77 PR-2)。
 *
 * `buildWorkLogPayload(type, state)` (WorkLogTypeFormFields.ts) と対称の関数。
 * 編集モード (WorkLogConfirmScreen mode === 'edit') で getEventById から取得した
 * payloadJson を form state に hydration するため使用。
 *
 * 設計方針:
 * - 14 種別 すべて switch + assertNever (Sess64 Issue #934 exhaustive、 R-52 整合)
 * - JSON.parse 失敗 / schema 違反は base (createWorkLogTypeFormInitialState) を返す
 *   (本番で crash させない、 defensive)
 * - Valibot schema (eventPayloadValidator) を safeParse で再利用 (型安全)
 * - 旧 field 名 fallback (validator が両方許容、 pruning の body_part 旧 / parts 新等)
 * - 単位逆変換 (repotting): payload.pot_size_cm (cm canonical) → user 設定単位文字列
 *   (settingsPotUnit、 ADR-0029 D3 整合)
 *
 * 関連: ADR-0055 / R-65 (CRUD カバレッジ、 U 動線整備) /
 *       buildWorkLogPayload (WorkLogTypeFormFields.ts:451-534) /
 *       eventPayloadValidator (src/db/eventPayloadValidator.ts) /
 *       lengthFromCanonical (src/core/util/unitConvert.ts:51)
 */
import { lengthFromCanonical, type LengthUnit } from '@/src/core/util/unitConvert';
import { safeParsePayloadJson } from '@/src/db/eventPayloadValidator';
import type { EventType } from '@/src/db/schema';
import { assertNever } from '@/src/lib/assertNever';

import {
  createWorkLogTypeFormInitialState,
  FERT_KINDS,
  LEAF_AID_SYMPTOMS,
  MOSS_ACTIONS,
  PEST_PURPOSES,
  PRUNE_AMOUNTS,
  PRUNE_PARTS,
  REPOT_ROOT_AMOUNTS,
  TRIM_RANGES,
  UNWIRE_PARTS,
  WATER_AMOUNTS,
  WIRE_PARTS,
  type WorkLogTypeFormState,
} from './WorkLogTypeFormFields';

/**
 * 値が enum const tuple に含まれるか check + 型 narrowing する pure helper。
 * 不一致なら fallback を返す (default 値維持)。
 */
function asEnum<T extends string>(value: unknown, members: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (members as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

/**
 * 文字列を trim、 空文字なら fallback を返す pure helper。
 */
function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return fallback;
}

/**
 * 数値を文字列化、 NaN/null/非数値なら fallback を返す pure helper。
 */
function asNumberString(value: unknown, fallback: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

/**
 * payload を WorkLogTypeFormState に逆変換する純関数。
 *
 * @param type EventType (14 種別、 schema.ts EVENT_TYPES 整合)
 * @param payloadJson DB 保存形式の payload_json (string | null、 null は events.payload_json IS NULL)
 * @param settingsPotUnit 鉢サイズ表示単位 (settingsStore.potUnit、 ADR-0029 D3)
 * @returns WorkLogTypeFormState (form 入力 state、 base に上書きされた値)
 *
 * @example
 *   const state = payloadToFormState(
 *     'watering',
 *     '{"amount":"plenty"}',
 *     'cm',
 *   );
 *   // state.waterAmount === 'plenty', 他は base default
 */
export function payloadToFormState(
  type: EventType,
  payloadJson: string | null,
  settingsPotUnit: LengthUnit,
): WorkLogTypeFormState {
  const base = createWorkLogTypeFormInitialState(settingsPotUnit);

  // payload_json が null or 空 → base 返却 (新規記録と同じ defaults)
  if (!payloadJson) return base;

  // Valibot schema で safeParse、 fail (不正 JSON / schema 違反) なら base 返却 (defensive)
  const parsed = safeParsePayloadJson(type, payloadJson);
  if (parsed === null || typeof parsed !== 'object') return base;
  const p = parsed as Record<string, unknown>;

  switch (type) {
    case 'watering': {
      base.waterAmount = asEnum(p.amount, WATER_AMOUNTS, base.waterAmount);
      return base;
    }
    case 'pruning': {
      // 新 field 'parts' (array) を優先、 旧 field 'body_part' (string) は単要素 array に変換
      if (Array.isArray(p.parts)) {
        const validParts = p.parts.filter(
          (v): v is (typeof PRUNE_PARTS)[number] =>
            typeof v === 'string' && (PRUNE_PARTS as readonly string[]).includes(v),
        );
        if (validParts.length > 0) base.pruneParts = validParts;
      } else if (typeof p.body_part === 'string') {
        const v = p.body_part;
        if ((PRUNE_PARTS as readonly string[]).includes(v)) {
          base.pruneParts = [v as (typeof PRUNE_PARTS)[number]];
        }
      }
      base.pruneAmount = asEnum(p.amount, PRUNE_AMOUNTS, base.pruneAmount);
      return base;
    }
    case 'wiring': {
      // wire_size_mm (number) → 'Xmm' 文字列。 WIRE_GAUGES preset と一致しなくても
      // LabeledNumberSegmentOrFree が「その他」 自由入力として保持する。
      if (typeof p.wire_size_mm === 'number' && Number.isFinite(p.wire_size_mm)) {
        base.wireGauge = `${p.wire_size_mm}mm`;
      }
      base.wireParts = asEnum(p.body_part, WIRE_PARTS, base.wireParts);
      // scheduled_unwire_at は ISO 8601 (例: '2026-06-15T00:00:00.000Z')、 dateKey YYYY-MM-DD を抽出
      if (typeof p.scheduled_unwire_at === 'string' && p.scheduled_unwire_at.length >= 10) {
        base.wireUnwireDate = p.scheduled_unwire_at.slice(0, 10);
      }
      return base;
    }
    case 'unwiring': {
      base.unwireParts = asEnum(p.body_part, UNWIRE_PARTS, base.unwireParts);
      return base;
    }
    case 'repotting': {
      // pot_size_cm (cm canonical) → user 設定単位の文字列に変換
      // settingsPotUnit を base.repotPotSizeUnit に保持 (DB に unit 情報なし、 settings から取る = ADR-0029 D3)
      if (typeof p.pot_size_cm === 'number' && Number.isFinite(p.pot_size_cm)) {
        const sizeStr = lengthFromCanonical(p.pot_size_cm, settingsPotUnit);
        if (sizeStr != null) base.repotPotSize = sizeStr;
      }
      base.repotPotSizeUnit = settingsPotUnit;
      base.repotSoilMix = asString(p.soil_mix, base.repotSoilMix);
      base.repotRootAmount = asEnum(p.root_pruning, REPOT_ROOT_AMOUNTS, base.repotRootAmount);
      return base;
    }
    case 'fertilizing': {
      base.fertKind = asEnum(p.kind, FERT_KINDS, base.fertKind);
      base.fertProduct = asString(p.amount, base.fertProduct);
      return base;
    }
    case 'pest_control': {
      base.pestPurpose = asEnum(p.target, PEST_PURPOSES, base.pestPurpose);
      base.pestAgent = asString(p.agent, base.pestAgent);
      base.pestDilution = asNumberString(p.dilution_ratio, base.pestDilution);
      return base;
    }
    case 'leaf_trimming':
    case 'defoliation':
    case 'deshoot': {
      base.trimRange = asEnum(p.body_part, TRIM_RANGES, base.trimRange);
      return base;
    }
    case 'candle_cut': {
      base.trimRange = asEnum(p.body_part, TRIM_RANGES, base.trimRange);
      base.candleCount = asNumberString(p.count, base.candleCount);
      return base;
    }
    case 'moss_care': {
      base.mossAction = asEnum(p.action, MOSS_ACTIONS, base.mossAction);
      return base;
    }
    case 'position_change': {
      base.positionTo = asString(p.to, base.positionTo);
      return base;
    }
    case 'leaf_first_aid': {
      base.leafAidSymptom = asEnum(p.symptom, LEAF_AID_SYMPTOMS, base.leafAidSymptom);
      base.leafAidTreatment = asString(p.treatment, base.leafAidTreatment);
      return base;
    }
    default:
      // exhaustive check (Sess64 Issue #934、 R-52 整合): 新規 EventType 追加時に compile error
      assertNever(type);
  }
}
