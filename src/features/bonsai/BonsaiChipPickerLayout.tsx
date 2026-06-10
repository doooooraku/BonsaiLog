/**
 * BonsaiChipPickerLayout = 盆栽 multi-select cue 共通画面 layout SoT (Sess92 PR-3 follow-up)。
 *
 * 役割:
 *   - ScrollView で全体 wrap (= chip 数十件で body が圧迫されないように、 user 苦情由来)
 *   - 上部に BonsaiChipList (= header + chips + 区切り線 + isSingle CheckIcon + autoSelectedHintRow)
 *   - children = 各画面固有の body (= 作業 grid / form / picker など)
 *   - bottomPadding prop で BottomCtaBar 等の 画面下端 fixed element 分の余白を確保
 *
 * 使用箇所:
 *   - src/features/event/BulkWorkPickerScreen.tsx (= 作業 grid、 bottomPadding default 16)
 *   - src/features/recurrence/RecurrenceFormScreen.tsx
 *     (= summaryRow + RecurrencePicker、 bottomPadding 96 = BottomCtaBar 分)
 *
 * 背景:
 *   Sess92 PR-3 で BonsaiChipList を 抽出した直後 user 指摘「画面上部の chips が 数十件あると
 *   作業選択画面が埋もれちゃう、 全体画面としてスクロールできるように」。 旧 BulkWorkPicker は
 *   chip 領域固定 + grid のみ ScrollView で chip 多寡時に grid を圧迫していた。 chip 領域だけ
 *   component 化しても、 画面構造 (= ScrollView wrap + padding + body) 自体は SoT 化しておらず
 *   2 画面に重複していた → layout SoT 化で 構造防御 2 段目を完成。 Sess91 R-76 (= 機能領域
 *   managerScreenStyles SoT) の cross-feature 拡張系譜。
 *
 * 参照:
 *   - docs/adr/ADR-0056-recurring-schedule.md §Notes Amended (Sess92 PR-3 follow-up)
 *   - src/features/bonsai/BonsaiChipList.tsx (= 下位 chip 領域 SoT)
 */
import React, { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BonsaiChipList, type BonsaiChipListProps } from './BonsaiChipList';

export type BonsaiChipPickerLayoutProps = BonsaiChipListProps & {
  /** 画面下端 BottomCtaBar 等 fixed element 分の余白 (default 16、 CTA あり画面は 96) */
  bottomPadding?: number;
  children: ReactNode;
};

export function BonsaiChipPickerLayout({
  bottomPadding = 16,
  children,
  ...chipProps
}: BonsaiChipPickerLayoutProps) {
  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}>
      <BonsaiChipList {...chipProps} />
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 16 },
  body: { padding: 16, gap: 16 },
});
