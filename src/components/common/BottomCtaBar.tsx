/**
 * Bottom CTA Bar (ADR-0054 D2 / Sess72 PR-2 新設、 旧 FAB を置換)。
 *
 * 全 5 画面 (盆栽 list / bonsai-detail 履歴 / bonsai-detail 予定 / 予定 tab / 記録 tab)
 * で共通使用。 SoT は本 component + design_system.md §BottomCtaBar (PR-5 で改訂)。
 *
 * 設計判断 (ADR-0054 D2):
 * - **inline 配置**: position: absolute ではなく flex 内に inline 配置で、 画面下端に常時固定。
 *   FlatList / ScrollView は flex:1 で本 component の上で自然に終わる → 「FAB が最終項目に
 *   重なる」 問題が **構造的に発生不可** (paddingBottom 計算不要、 ADR-0042 D3 / Sess36 の
 *   Layout Contract 漏れを構造解消、 R-62 起票根拠)
 * - **height 72dp + paddingHorizontal 16**: 既存 homeEmptyCta (盆栽 list 空状態) と
 *   完全に同じ visual を踏襲、 アプリ内 CTA pattern 一貫化
 * - **borderRadius 14**: 既存 emptyCta と同じ pill 寄りの角丸
 * - **theme-aware**: `useColors()` の `c.tint` / `c.onTint` 経由 (R-58 dark theme cascade
 *   構造禁止に整合、 ADR-0052 / Sess69 PR-A で確立した brand 色 scheme-aware 化準拠)
 * - **icon + label**: `<PlusIcon size={20} color={c.onTint} />` + ラベルテキスト、
 *   アイコンのみの旧 FAB と異なり **文字併記で発見性向上** (WCAG 2.4.6 / 3.2.4 / シニア
 *   ペルソナ高橋 62 配慮、 R-14 整合)
 *
 * 使い分け:
 * - 盆栽 list の **空状態** = 既存 emptyCta pattern を維持 (画面中央付近に full size 配置)
 * - 盆栽 list の **list 表示時** = 本 BottomCtaBar (画面下端 inline)
 * - bonsai-detail 履歴 / 予定 tab = 本 BottomCtaBar (tab content の下端)
 * - 予定 / 記録 tab (CalendarTabScreen) = 本 BottomCtaBar
 *
 * Migration note (旧 FAB との差分):
 * - 旧 `<FAB />` (ADR-0042 D3) は absolute 配置 + 56×56 円形 + アイコンのみ
 * - 新 `<BottomCtaBar />` は inline 配置 + height 72 全幅 + アイコン + 文字
 * - showAdBanner / disabled props は引き続きサポート (CalendarTabScreen plan mode の過去日
 *   選択時 disabled 等の既存挙動互換)
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlusIcon } from '@/src/components/icons';
import { useColors } from '@/src/core/theme/useColors';

export type BottomCtaBarProps = {
  /** ボタンに表示する文字列 (例: '+ 盆栽を登録')。 i18n key 解決後の文字列を渡す。 */
  label: string;
  /** tap 時 callback。 */
  onPress: () => void;
  /**
   * A11y label。 省略時は `label` を fallback として使用 (WCAG 2.4.6 整合、
   * テキスト = ラベル の一貫識別)。
   */
  accessibilityLabel?: string;
  /** Maestro E2E 用 testID。 全 BottomCtaBar 必須 (testID 規約: `e2e_bottom_cta_*`)。 */
  testID: string;
  /**
   * 先頭アイコン。 default は `<PlusIcon size={20} color={c.onTint} />`。
   * カスタムアイコン渡す時は呼び出し側で color を c.onTint に揃えること。
   */
  icon?: React.ReactNode;
  /**
   * disabled state (CalendarTabScreen plan mode の過去日選択時など)。
   * default false。 true 時は opacity 0.5 + 半透明 bg。
   */
  disabled?: boolean;
};

export function BottomCtaBar({
  label,
  onPress,
  accessibilityLabel,
  testID,
  icon,
  disabled = false,
}: BottomCtaBarProps) {
  const c = useColors();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={[
          styles.bar,
          {
            backgroundColor: disabled ? c.disabledBg : c.tint,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        testID={testID}
      >
        {icon ?? <PlusIcon size={20} color={c.onTint} />}
        <ThemedText style={[styles.label, { color: c.onTint }]}>{label}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  bar: {
    height: 72,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontSize: 20, fontWeight: '500', letterSpacing: 0.8 },
});
