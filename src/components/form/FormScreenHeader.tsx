/**
 * フォーム画面用 sticky header (Sess33 PR-1 新規、 ADR-0039 起票予定)。
 *
 * 役割: フォーム画面で Stack header を廃止 (headerShown: false) し、 戻るボタンだけを
 * 画面上部 sticky に配置する。 タイトル / chips / フォーム本体は ScrollView 内に統合する
 * ことで、 IME 起動時にも画面全体を自由にスクロールできる (full-screen scroll) UX を実現。
 *
 * 設計判断 (ステップ 4 アプローチ A):
 * - 戻るボタンは必ず画面左上に常時可視 (エンドユーザー代表意見「絶対譲れない」)
 * - タイトル prop は optional、 P0 (BulkLogConfirm) では渡さず戻るボタンのみ表示
 * - 高さ = 56 + insets.top (SearchHeader と同じ、 design_system §22 整合)
 * - 背景 BG_PRIMARY (Stack header と視覚的に同等)、 border-bottom 1px
 *
 * 適用先 (P1 で順次):
 * - BulkLogConfirmScreen (P0、 本 PR)
 * - BonsaiCreateScreen (P1)
 * - WorkLogConfirmScreen (P1)
 * - bonsai-detail 基本情報タブ (P1、 Tab View 親 header 維持で例外扱い検討)
 *
 * @see docs/adr/ADR-0039-form-screen-scroll-unification.md (P2 で起票予定)
 * @see docs/reference/design_system.md §22 (CTA Button、 hitSlop 44x44 整合)
 * @see src/features/bonsai/SearchHeader.tsx (同種 pattern、 タブ用 Header)
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BackIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess66 PR6b: BORDER_DEFAULT / TEXT_PRIMARY を撤去、 全 inline c.* で動的指定 (既に JSX 側で対応済)。
import { useColors } from '@/src/core/theme/useColors';

type Props = {
  /** タイトル (省略時は戻るボタンのみ表示、 P0 では未指定推奨) */
  title?: string;
  /** 戻る handler (省略時は router.back()) */
  onBack?: () => void;
  /** testID prefix (例: 'e2e_bulk_log_form_header' → backButton は `${testID}_back`) */
  testID?: string;
};

const HEADER_BASE_HEIGHT = 56;

export function FormScreenHeader({ title, onBack, testID = 'e2e_form_screen_header' }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      accessibilityRole="header"
      style={[
        styles.container,
        {
          backgroundColor: c.background,
          borderBottomColor: c.border,
          paddingTop: insets.top,
          height: HEADER_BASE_HEIGHT + insets.top,
        },
      ]}
      testID={testID}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        hitSlop={8}
        onPress={handleBack}
        style={styles.iconBtn}
        testID={`${testID}_back`}
      >
        <BackIcon size={24} color={c.text} />
      </Pressable>
      {title != null && (
        <ThemedText
          style={[styles.title, { color: c.text }]}
          numberOfLines={1}
          testID={`${testID}_title`}
        >
          {title}
        </ThemedText>
      )}
      {/* 右端 spacer (タイトル中央寄せ用、 タイトル非表示時は左寄せのまま) */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Sess66 PR6b: borderBottomColor / title color は inline c.* (JSX 側で c.border / c.text 指定済)。
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: {
    flex: 1,
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 18,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
