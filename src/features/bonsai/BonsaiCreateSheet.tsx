/**
 * 盆栽 新規登録 / 編集 BottomSheet (mockup `create-screens.jsx CreateBonsaiScreen` 整合)。
 *
 * Issue #439: フォーム本体は `BonsaiBasicForm.tsx` の `useBonsaiBasicForm` フック +
 * `BonsaiBasicFormFields` コンポーネントに抽出。本ファイルは BottomSheet ラッパ + footer 保存
 * ボタンに専念する (詳細画面の基本情報タブも同じ form 部品を inline で使用)。
 *
 * Props:
 * - bottomSheetRef: 親が snapToIndex / close を制御する ref
 * - onCreated: 新規登録成功後のコールバック
 * - onUpdated?: 編集モードでの更新成功後のコールバック
 * - editingBonsai?: 編集対象 (null/undefined なら新規モード)
 * - onClose?: Sheet が閉じた時のコールバック
 */
import BottomSheet, {
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DISABLED_BG,
  ON_BRAND,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { type Bonsai } from '@/src/db/schema';

import {
  BonsaiBasicFormFields,
  BonsaiBasicFormPickerSheets,
  useBonsaiBasicForm,
} from './BonsaiBasicForm';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  /** 新規登録成功後のコールバック (親が router.push などを実行)。 */
  onCreated: (bonsaiId: string) => void;
  /** 編集モードでの更新成功後のコールバック (親が reload 等)。 */
  onUpdated?: (bonsaiId: string) => void;
  /** 編集対象。null/undefined なら新規モード (mockup CreateBonsaiScreen の prefill prop 整合)。 */
  editingBonsai?: Bonsai | null;
  /** Sheet が閉じた時のコールバック (親が state リセット等)。 */
  onClose?: () => void;
};

export function BonsaiCreateSheet({
  bottomSheetRef,
  onCreated,
  onUpdated,
  editingBonsai,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const snapPoints = useMemo(() => ['90%'], []);

  const form = useBonsaiBasicForm({
    editingBonsai,
    onCreated,
    onUpdated,
    onAfterSubmit: () => bottomSheetRef.current?.close(),
  });

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        form.resetToInitial();
        onClose?.();
      }
    },
    [form, onClose],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('save')}
            accessibilityState={{ disabled: !form.canSubmit }}
            style={[styles.footerButton, !form.canSubmit && styles.footerButtonDisabled]}
            onPress={() => void form.handleSubmit()}
            disabled={!form.canSubmit}
            testID="e2e_bonsai_create_submit"
          >
            <ThemedText style={styles.footerButtonText}>{t('save')}</ThemedText>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    [form, t],
  );

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: c.background }}
        handleIndicatorStyle={{ backgroundColor: c.border }}
        footerComponent={renderFooter}
      >
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          <BonsaiBasicFormFields form={form} showPhotos />
        </BottomSheetScrollView>
      </BottomSheet>
      {/* Picker BottomSheet は親 BottomSheet の sibling (root) に置く。BottomSheetScrollView
          の内側に nest すると closed (index=-1) でも inline 表示で leak するため。 */}
      <BonsaiBasicFormPickerSheets form={form} />
    </>
  );
}

const styles = StyleSheet.create({
  // Footer 高 (ボタン 56 + 上下 padding 12*2) + 余白 = 約 96。
  scrollContent: { padding: 16, gap: 16, paddingBottom: 96 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  footerButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonDisabled: { backgroundColor: DISABLED_BG },
  footerButtonText: { color: ON_BRAND, fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
