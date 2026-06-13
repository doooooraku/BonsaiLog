/**
 * BonsaiChipList = 盆栽 multi-select cue 共通 UI (Sess92 PR-3 起票、 cross-feature SoT)。
 *
 * 責務:
 *   - 上部 header text (= 「N 件の盆栽に同じ予定を追加」 等、 caller 提供)
 *   - 横並び chip 群 (= flexWrap 左寄せ、 区切り線 borderBottom)
 *   - isSingle 時の CheckIcon (= 単数件 cue 視覚補助)
 *   - showAutoSelectedHint && isSingle 時の 「自動選択」 hint 1 行 (= bulkPickerAutoSelectedHint key)
 *
 * 使用箇所:
 *   - src/features/event/BulkWorkPickerScreen.tsx (= 予定/記録/定期予定 共通 picker、 showAutoSelectedHint=true)
 *   - src/features/recurrence/RecurrenceFormScreen.tsx
 *     - create mode = showAutoSelectedHint={true} (= 新規追加で 1 件自動選択 cue)
 *     - edit mode = showAutoSelectedHint={false} (= user 能動的に編集を選んで来た = 自動 cue 不要)
 *
 * 背景:
 *   Sess89 PR-C で RecurrenceFormScreen に独自 chipsHeader card (= border + 内側 padding、 緑系) を
 *   実装、 「BulkWorkPicker スタイル流用」 と comment 記載しつつ styles 0 から書き起こし → 劣化合成。
 *   user 苦情「全て流用して同じになるように、 アレンジ不要」 (Sess92、 SS 15862/15863 vs 15865) で発覚。
 *   Sess91 managerScreenStyles SoT (R-76、 機能領域 UI 共通 SoT 不在 → 劣化合成) の cross-feature 系譜。
 *
 * 参照:
 *   - docs/adr/ADR-0056-recurring-schedule.md §Notes Amended (Sess92 PR-3)
 *   - docs/adr/ADR-0025-bulk-action.md §7 Notes Amended (Sess92 PR-3)
 *   - Sess83 ADR-0025 §7 (R-71 件数別 UX 表現契約、 CheckIcon + 自動選択 hint)
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import type { BulkBonsaiRef } from '@/src/stores/pickerStore';

export type BonsaiChipListProps = {
  bonsais: readonly BulkBonsaiRef[];
  headerText: string;
  isSingle: boolean;
  showAutoSelectedHint?: boolean;
  /** chip 個別 testID prefix (= `${prefix}_${bonsai.id}` で生成、 既存 E2E 互換維持用) */
  chipTestIdPrefix?: string;
  /** 「自動選択」 hint row の testID (= 既存 Maestro flow `e2e_bulk_work_picker_auto_selected_hint` 互換用) */
  autoSelectedHintTestId?: string;
};

export function BonsaiChipList({
  bonsais,
  headerText,
  isSingle,
  showAutoSelectedHint = false,
  chipTestIdPrefix,
  autoSelectedHintTestId,
}: BonsaiChipListProps) {
  const { t } = useTranslation();
  const c = useColors();

  return (
    <>
      <View style={styles.header}>
        <ThemedText style={[styles.sub, { color: c.text }]}>{headerText}</ThemedText>
      </View>
      <View style={[styles.chipsRow, { borderBottomColor: c.border }]}>
        {bonsais.map((b) => (
          <View
            key={b.id}
            style={[styles.chip, { backgroundColor: c.surface, borderColor: c.border }]}
            {...(chipTestIdPrefix !== undefined ? { testID: `${chipTestIdPrefix}_${b.id}` } : {})}
          >
            {isSingle ? <CheckIcon size={14} color={c.tint} /> : null}
            <ThemedText style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
              {b.name}
            </ThemedText>
          </View>
        ))}
      </View>
      {showAutoSelectedHint && isSingle ? (
        <View
          style={styles.autoSelectedHintRow}
          {...(autoSelectedHintTestId !== undefined ? { testID: autoSelectedHintTestId } : {})}
        >
          <ThemedText
            style={[styles.autoSelectedHintText, { color: c.textSecondary }]}
            accessibilityRole="text"
          >
            {t('bulkPickerAutoSelectedHint')}
          </ThemedText>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // Sess92 PR-3: 旧 BulkWorkPickerScreen.tsx の inline styles を 1:1 移植 (= byte-level 統一保証)。
  header: { paddingTop: 8, paddingBottom: 8, alignItems: 'center' },
  sub: { fontSize: 14 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  chip: {
    // Sess18 PR-11 + Sess83 ADR-0025 §7 由来:
    //   - design_system §4 (spacing 8/12) + §5 (borderRadius 16) 整合
    //   - flexDirection row + gap 4 で isSingle CheckIcon + name 横並び (2 件以上 case でも layout 不変)
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 80,
    maxWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  autoSelectedHintRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: 'center',
  },
  autoSelectedHintText: { fontSize: 12 },
});
