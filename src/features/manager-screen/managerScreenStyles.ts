/**
 * Master/custom 領域 管理画面 (= /tags、 /custom-species、 /custom-styles) の共通 styles SoT
 * (Sess91 PR-1 抽出、 ADR-0036 §Notes Amended Sess91 PR-4 で正典化予定、 R-76 起票)。
 *
 * 抽出元: Sess9 PR-10 (= app/tags.tsx) と Sess89 PR-2/PR-3 (= app/custom-{species,styles}.tsx)
 * の重複した StyleSheet。 3 画面で「ほぼ全て転用したつもりだが全然なっていません」 という
 * Sess91 user 苦情の真因 (= UI 共通 SoT 不在) を構造解消。
 *
 * theme-aware tokens (= c.background / c.surface / c.text 等) は呼出側で
 * `{color: c.text}` を inline 付与する pattern。 ここでは layout / size / static color のみ管理。
 *
 * 含む styles:
 * - container / scroll / desc / addBtn / addBtnText / empty (= 3 画面共通)
 * - row / rowMain / rowMainTextWrap / rowStats / rowStatsUnused (= 横並び row pattern)
 * - kebabButton (= /custom-* 既存、 PR-2 で /tags にも追加予定)
 * - toggleArea / toggleAreaDisabled / chevronWrap (= /tags 既存、 PR-3 で /custom-* にも追加予定)
 * - masterBadge / masterBadgeText (= /tags 専用、 master 表示時のみ)
 * - expandedArea / expandedLoading / moreLink / moreLinkText (= /tags 既存、 PR-3 で /custom-* にも追加予定)
 *
 * @see docs/adr/ADR-0036-destructive-action-pattern.md §Notes Amended Sess91 PR-4 (SoT 明記予定)
 * @see .claude/recurrence-prevention/specialized.md R-76 (起票予定)
 */
import { StyleSheet } from 'react-native';

import { BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';

export const managerScreenStyles = StyleSheet.create({
  /** 画面全体: flex 1 + 背景色は呼出側 inline (= scheme-aware c.background)。 */
  container: { flex: 1 },
  /** ScrollView contentContainerStyle: 余白 16 + row 間 gap 12。 */
  scroll: { padding: 16, gap: 12 },
  /** 画面意図説明 1 行 (= addBtn 直前)。 color は呼出側 inline (= c.textSecondary)。 */
  desc: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  /** 大型 Add button (= BRAND_GREEN 背景 + 白文字)。 */
  addBtn: {
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  /** Add button label。 */
  addBtnText: { color: ON_BRAND, fontSize: 17, fontWeight: '600', letterSpacing: 0.5 },
  /** 空状態 message (item 0 件時)。 color は呼出側 inline (= c.textSecondary)。 */
  empty: { textAlign: 'center', paddingVertical: 24 },
  /**
   * Row 横並び layout: 左 (toggle 44 / 無) + rowMain (name + stats) + 右 (kebab 32 / 無)。
   * 背景色 / 枠色は呼出側 inline (= c.surface / c.border)。
   * /tags = 左 toggle あり + padding 4、 /custom-* = 左 toggle なし + padding 14 で
   * 段階移行 (PR-3 で /custom-* に toggle 追加後、 row padding も統一予定)。
   */
  rowWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingRight: 14,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowWithoutToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  /**
   * Row 主部 (name + stats 横並び space-between)。 /tags と /custom-* で共通化。
   * Sess91 PR-1 で /custom-* を縦並び → 横並びに変更 (= /tags 既存 pattern に統一)。
   * 長文 name (= de/ru) で stats と被らないよう rowMainTextWrap に flexShrink: 1 を持たせる。
   */
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    minHeight: 48,
    gap: 8,
  },
  /** Row 主部 text wrap: name + (option) badge を横並び、 flexShrink で長文対応。 */
  rowMainTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  /** Row 右側 stats (= 「N 件 · 3 日前に使用」)。 color は呼出側 inline (= c.textSecondary)。 */
  rowStats: { fontSize: 12, flexShrink: 0 },
  /** Stats: 未使用 (= count 0) 時の italic 装飾。 */
  rowStatsUnused: { fontStyle: 'italic' },
  /** Row 右側 kebab (⋮) ヒット領域。 ADR-0036 D7 整合、 master/custom 領域は kebab 必須。 */
  kebabButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Row 左側 toggle ▶/▼ ヒット領域。 44×44 シニア UX (Sess9 PR-10)。 */
  toggleArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleAreaDisabled: { opacity: 0.3 },
  chevronWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  /** Master badge (= preset 一致 row の灰 outline、 Sess74 PR-2)。 border/color は呼出側 inline。 */
  masterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  masterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  /** Inline 関連盆栽展開エリア (= /tags Sess9 PR-10、 PR-3 で /custom-* にも横展開予定)。 */
  expandedArea: { gap: 8, paddingLeft: 16, paddingTop: 4 },
  expandedLoading: { textAlign: 'center', paddingVertical: 16 },
  /** 「もっと見る (残り N 件)」 link (= peek limit 超過時)。 */
  moreLink: { paddingVertical: 12, alignItems: 'center' },
  moreLinkText: { color: BRAND_GREEN, fontSize: 14, fontWeight: '500' },
});
