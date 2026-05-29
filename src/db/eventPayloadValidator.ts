/**
 * 16 種別 events payload バリデーション (P2-03 PR-B、ADR-0008 §payload Valibot)。
 *
 * Related:
 * - Issue #17 F-02 AC3-1〜AC3-3 (Valibot Discriminated Union、16 種別)
 * - schema.ts EVENT_TYPES (13 種別)
 *
 * 設計方針:
 * - Discriminated Union で type ごとに payload schema を切替
 * - 不正な type は parse 時に拒否
 * - Repository (PR-C) で INSERT 前にバリデーション
 * - 種別固有 fields は payload_json (string TEXT) に JSON.stringify して保存
 *
 * 13 種別と payload (basic_spec.md §F-02 + ADR-0011):
 * - watering: amount_ml? / weather?
 * - pruning: body_part?
 * - wiring: wire_size_mm? / body_part? / scheduled_unwire_at?
 * - unwiring: body_part?
 * - repotting: pot_id? / soil_mix?
 * - fertilizing: kind? / amount?
 * - pest_control: agent? / target?
 * - leaf_trimming: body_part?
 * - defoliation: body_part?
 * - deshoot: body_part?
 * - candle_cut: body_part? (松類限定、UI 側で species 制約)
 * - moss_care: action?
 * - position_change: from? / to?
 *
 * 全 payload は optional fields のみ (UI 強制ではなく、ユーザー任意入力)。
 */
import * as v from 'valibot';

import { EVENT_TYPES, type EventType } from '@/src/db/schema';

// ---------------------------------------------------------------------------
// 各種別 payload schema (各 field optional)
// ---------------------------------------------------------------------------

// Sess34 ADR-0041 Phase θ PR-Q-fix: 14 種別 schema を form 実保存 (buildWorkLogPayload) 整合に拡張。
// 旧 schema は古い field 名 (Sess16 PR-E 前) で、 valibot v.object が unknown props を default discard
// するため、 buildWorkLogPayload で保存する新 field がすべて strip → chip 表示ゼロ silent bug。
// ADR-0027 §Implementation の「v.object 非 strict、 追加 prop 通過」 は valibot 挙動誤解の訂正。
// 旧 field 名も併記 (forward-only 思想、 旧 SEED data の互換維持)。

const WateringPayload = v.object({
  amount: v.optional(v.string()), // Sess16+ form 保存 ('normal' | 'plenty' | 'light')
  amount_ml: v.optional(v.number()), // 旧 field、 互換維持
  weather: v.optional(v.string()),
});

const PruningPayload = v.object({
  parts: v.optional(v.array(v.string())), // Sess16+ form 保存 (multi: 'eda'/'ha'/'shinme'/'ne')
  amount: v.optional(v.string()), // Sess16+ form 保存 ('few' | 'some' | 'lot')
  body_part: v.optional(v.string()), // 旧 field、 互換維持
});

const WiringPayload = v.object({
  wire_size_mm: v.optional(v.number()),
  body_part: v.optional(v.string()),
  scheduled_unwire_at: v.optional(v.string()), // ISO 8601 UTC
});

const UnwiringPayload = v.object({
  body_part: v.optional(v.string()),
});

const RepottingPayload = v.object({
  pot_size_cm: v.optional(v.number()), // Sess16+ form 保存 (cm canonical、 mm/inch は lengthToCanonical で変換)
  root_pruning: v.optional(v.string()), // Sess16+ form 保存 ('none' | 'light' | 'third' | 'half')
  soil_mix: v.optional(v.string()),
  pot_id: v.optional(v.string()), // 旧 field、 互換維持
});

const FertilizingPayload = v.object({
  kind: v.optional(v.string()),
  amount: v.optional(v.string()), // form 保存は product 銘柄 (free text)
});

const PestControlPayload = v.object({
  agent: v.optional(v.string()),
  target: v.optional(v.string()),
  dilution_ratio: v.optional(v.number()), // Sess16+ form 保存
});

const LeafTrimmingPayload = v.object({
  body_part: v.optional(v.string()),
});

const DefoliationPayload = v.object({
  body_part: v.optional(v.string()),
});

const DeshootPayload = v.object({
  body_part: v.optional(v.string()),
});

const CandleCutPayload = v.object({
  body_part: v.optional(v.string()),
  count: v.optional(v.number()), // Sess16+ form 保存 (本数)
});

const MossCarePayload = v.object({
  action: v.optional(v.string()),
});

const PositionChangePayload = v.object({
  from: v.optional(v.string()),
  to: v.optional(v.string()),
});

// Sess16 PR-E: 葉の手当 (mockup 135145.png 整合、 症状 + 処置)。
const LeafFirstAidPayload = v.object({
  symptom: v.optional(v.string()),
  treatment: v.optional(v.string()),
});

// ---------------------------------------------------------------------------
// 種別 → schema マッピング
// ---------------------------------------------------------------------------

const PAYLOAD_SCHEMAS: Record<EventType, v.GenericSchema> = {
  watering: WateringPayload,
  pruning: PruningPayload,
  wiring: WiringPayload,
  unwiring: UnwiringPayload,
  repotting: RepottingPayload,
  fertilizing: FertilizingPayload,
  pest_control: PestControlPayload,
  leaf_trimming: LeafTrimmingPayload,
  defoliation: DefoliationPayload,
  deshoot: DeshootPayload,
  candle_cut: CandleCutPayload,
  moss_care: MossCarePayload,
  position_change: PositionChangePayload,
  leaf_first_aid: LeafFirstAidPayload,
};

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

/**
 * type が EventType (13 種別) に含まれるか確認 (型ガード)。
 */
export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * payload を type に応じてバリデート。
 * @returns valid な payload (parsed) を返却。invalid なら例外。
 */
export function validateEventPayload(type: string, payload: unknown): unknown {
  if (!isEventType(type)) {
    throw new Error(`Unknown event type: ${type}`);
  }
  const schema = PAYLOAD_SCHEMAS[type];
  return v.parse(schema, payload ?? {});
}

/**
 * Repository から JSON 文字列で受け取って parse (DB 読み出し時の hydration 用)。
 * 失敗時は null を返却 (UI で fallback 表示可能)。
 */
export function safeParsePayloadJson(type: string, payloadJson: string | null): unknown | null {
  if (!payloadJson) return null;
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (!isEventType(type)) return null;
    const schema = PAYLOAD_SCHEMAS[type];
    return v.parse(schema, parsed);
  } catch {
    return null;
  }
}

/**
 * payload を JSON 文字列に serialize (Repository INSERT/UPDATE 時)。
 * 不正な payload は例外。
 */
export function serializeEventPayload(type: string, payload: unknown): string | null {
  const valid = validateEventPayload(type, payload);
  // 空オブジェクトは null に正規化 (DB 容量節約)
  if (valid && typeof valid === 'object' && Object.keys(valid).length === 0) {
    return null;
  }
  return JSON.stringify(valid);
}
