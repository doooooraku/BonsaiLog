import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LabeledNumberInput } from '@/src/components/form/LabeledNumberInput';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import type { BonsaiBasicFormState } from '@/src/features/bonsai/BonsaiBasicForm';

/**
 * 盆栽基本情報フォーム「鉢情報」セクション (presentational)。
 * mockup 174029.png 整合の card group: expander + 幅/深さ/材質 + cm/mm/inch 単位 segmented。
 *
 * Phase 4 A2-3 で BonsaiBasicFormFields から抽出 (挙動不変)。単位 segmented は一時切替で
 * settingsStore を touch しない。displayPotUnit 変更時の入力値再変換は useBonsaiBasicForm の
 * effect が担う (本コンポーネントは setDisplayPotUnit を呼ぶだけ)。
 * 注: field/fieldLabelRow/optionalLabel は他セクションと共有のため WET 複製。
 */
export function BonsaiPotInfoSection({ form }: { form: BonsaiBasicFormState }) {
  const { t } = useTranslation();
  const {
    potWidth,
    setPotWidth,
    potDepth,
    setPotDepth,
    potMaterial,
    setPotMaterial,
    potExpanded,
    setPotExpanded,
    displayPotUnit,
    setDisplayPotUnit,
  } = form;

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <ThemedText type="defaultSemiBold">{t('bonsaiFieldPotInfo')}</ThemedText>
        <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
      </View>
      <View style={styles.potCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiFieldPotInfoExpand')}
          style={styles.potExpander}
          onPress={() => setPotExpanded((p) => !p)}
          testID="e2e_bonsai_create_pot_expander"
        >
          <ThemedText style={styles.pickerPlaceholder}>
            {potExpanded ? '▲ ' : '▼ '}
            {t('bonsaiFieldPotInfoExpand')}
          </ThemedText>
        </Pressable>
        {potExpanded && (
          <View style={styles.potExpanded}>
            {/* Sess15 PR-BB: 単位 segmented control (一時切替、 settingsStore は touch しない)。 */}
            <View style={styles.potUnitSegmented}>
              {(['cm', 'mm', 'inch'] as const).map((u) => {
                const active = displayPotUnit === u;
                return (
                  <Pressable
                    key={u}
                    accessibilityRole="button"
                    accessibilityLabel={`unit ${u}`}
                    accessibilityState={{ selected: active }}
                    style={[styles.potUnitSegment, active && styles.potUnitSegmentActive]}
                    onPress={() => setDisplayPotUnit(u)}
                    testID={`e2e_bonsai_create_pot_unit_${u}`}
                  >
                    <ThemedText
                      style={active ? styles.potUnitSegmentTextActive : styles.potUnitSegmentText}
                    >
                      {u}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {/* Sess15 PR-JJ: label="" → 「幅」「深さ」「材質」 を明示 (user 真意「何の項目か分からない」 解消)。 */}
            <LabeledNumberInput
              label={t('bonsaiFieldPotWidth')}
              value={potWidth}
              onChangeText={setPotWidth}
              placeholder={t('bonsaiFieldPotWidthPlaceholder').replace(' ({unit})', '')}
              suffix={displayPotUnit}
              maxLength={6}
              accessibilityLabel={t('bonsaiFieldPotWidth')}
              testID="e2e_bonsai_create_pot_width"
            />
            <LabeledNumberInput
              label={t('bonsaiFieldPotDepth')}
              value={potDepth}
              onChangeText={setPotDepth}
              placeholder={t('bonsaiFieldPotDepthPlaceholder').replace(' ({unit})', '')}
              suffix={displayPotUnit}
              maxLength={6}
              accessibilityLabel={t('bonsaiFieldPotDepth')}
              testID="e2e_bonsai_create_pot_depth"
            />
            <LabeledTextInput
              label={t('bonsaiFieldPotMaterial')}
              value={potMaterial}
              onChangeText={setPotMaterial}
              placeholder={t('bonsaiFieldPotMaterialPlaceholder')}
              maxLength={100}
              showCounter
              overlimitText={t('inputOverLimit')}
              accessibilityLabel={t('bonsaiFieldPotMaterial')}
              testID="e2e_bonsai_create_pot_material"
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  pickerPlaceholder: { color: TEXT_MUTED },
  potExpanded: { gap: 10, marginTop: 8 },
  // Sess15 PR-BB: mockup 174029.png 整合の card group (border 内に expander + 3 input + segmented を集約)。
  potCard: {
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    padding: 12,
    gap: 8,
  },
  potExpander: {
    minHeight: 40,
    justifyContent: 'center',
  },
  potUnitSegmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  potUnitSegment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  potUnitSegmentActive: { backgroundColor: BRAND_GREEN },
  potUnitSegmentText: { fontSize: 13, color: TEXT_SECONDARY },
  potUnitSegmentTextActive: { fontSize: 13, color: ON_BRAND, fontWeight: '600' },
});
