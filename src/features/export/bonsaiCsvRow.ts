/**
 * F-10 盆栽一覧 CSV の 1 行を人間可読セル配列へ変換 (Issue #33 / ADR-0016 Amended)。
 *
 * 列: 名前 / 樹種 / 樹形 / 入手日 / 鉢 / 状態 / 盆栽ID。
 * - 樹形: 標準 5 種は i18n (bonsaiStyle_*)、カスタム樹形は生文字列 (BonsaiBasicForm 表示整合)。
 * - 入手日: UTC ISO の日付部分 (YYYY-MM-DD) のみ (時刻は意味を持たない)。
 * - 鉢: potInfo JSON {widthCm,depthCm,material,description} を簡潔な文字列に整形。
 * - 状態: archivedAt の有無で 現役 / アーカイブ。
 */
import type { TranslationKey } from '@/src/core/i18n/i18n';
import { type Bonsai, BONSAI_STYLES, type BonsaiStyle } from '@/src/db/schema';

type Tfn = (key: TranslationKey) => string;

/** 盆栽一覧 CSV のヘッダ用 i18n キー (列順 = buildBonsaiCsvRow と一致)。 */
export const BONSAI_CSV_HEADER_KEYS: readonly TranslationKey[] = [
  'csvColBonsaiName',
  'csvColBonsaiSpecies',
  'csvColBonsaiStyle',
  'csvColBonsaiAcquiredAt',
  'csvColBonsaiPot',
  'csvColBonsaiStatus',
  'csvColBonsaiId',
];

/** potInfo JSON を安全に parse (DB 層に依存せず自己完結、テスト容易性確保)。 */
function parsePot(potInfoStr: string | null | undefined): Record<string, unknown> | null {
  if (!potInfoStr) return null;
  try {
    const v = JSON.parse(potInfoStr);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 鉢情報 {widthCm,depthCm,material,description} を「18×12cm / 釉薬 / 銘あり」風に整形。 */
function formatPot(potInfoStr: string | null | undefined): string {
  const p = parsePot(potInfoStr);
  if (!p) return '';
  const parts: string[] = [];
  const w = typeof p.widthCm === 'number' ? p.widthCm : null;
  const d = typeof p.depthCm === 'number' ? p.depthCm : null;
  if (w != null || d != null) {
    parts.push(`${[w, d].filter((x) => x != null).join('×')}cm`);
  }
  if (typeof p.material === 'string' && p.material.trim().length > 0) parts.push(p.material.trim());
  if (typeof p.description === 'string' && p.description.trim().length > 0) {
    parts.push(p.description.trim());
  }
  return parts.join(' / ');
}

/** 樹形コード → 表示文字列。標準 5 種は i18n、カスタムは生文字列。 */
function formatStyle(style: string | null | undefined, t: Tfn): string {
  if (!style) return '';
  return BONSAI_STYLES.includes(style as BonsaiStyle)
    ? t(`bonsaiStyle_${style}` as TranslationKey)
    : style;
}

/**
 * 1 件の盆栽を人間可読 CSV セル配列へ。
 * 列: 名前 / 樹種 / 樹形 / 入手日 / 鉢 / 状態 / 盆栽ID
 */
export function buildBonsaiCsvRow(
  b: Bonsai & { speciesCommonName?: string | null },
  t: Tfn,
): string[] {
  return [
    b.name,
    b.speciesCommonName ?? '',
    formatStyle(b.style, t),
    b.acquiredAt ? b.acquiredAt.slice(0, 10) : '',
    formatPot(b.potInfo),
    b.archivedAt ? t('csvBonsaiStatusArchived') : t('csvBonsaiStatusActive'),
    b.id,
  ];
}
