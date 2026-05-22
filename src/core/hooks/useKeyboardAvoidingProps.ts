/**
 * `KeyboardAvoidingView` の Platform 別 props を一元管理する共通 hook (ADR-0037 D1 / R-46)。
 *
 * Sess15 PR-TT で BonsaiCreateScreen に `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`
 * パターンを採用したが、 Android で behavior=undefined = KAV 機能無効 → modal 末尾 multiline
 * input でキーボード被り (Sess28 user 報告) → 構造的再発防止のため hook 化。
 *
 * @example
 * ```tsx
 * import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
 *
 * const kavProps = useKeyboardAvoidingProps();
 *
 * return (
 *   <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
 *     <ScrollView ...>...</ScrollView>
 *   </KeyboardAvoidingView>
 * );
 * ```
 *
 * 戻り値:
 * - iOS: `{ behavior: 'padding', keyboardVerticalOffset: <Stack header 高さ> }`
 *   (`@react-navigation/elements` の `useHeaderHeight()` で動的取得、 header 無し画面は 0)
 * - Android: `{ behavior: 'height', keyboardVerticalOffset: 0 }`
 *   (windowSoftInputMode=adjustResize と協調、 modal presentation の adjustResize 効きにくさを補強)
 *
 * 利用ルール (R-46):
 * - 全 modal / screen で本 hook を必須利用、 `KeyboardAvoidingView` の直接設定 (Platform.OS 分岐 +
 *   behavior=undefined) は禁止
 * - 戻り値の `style` は含まない (呼出側が `flex:1` 等を自由に決められるよう分離)
 *
 * @see docs/adr/ADR-0037-hero-badge-kav-unification.md D1
 * @see .claude/recurrence-prevention/specialized.md R-46
 * @see docs/reference/design_system.md §21 KeyboardAvoidingView 統一 pattern
 */
import { useHeaderHeight } from '@react-navigation/elements';
import { Platform, type KeyboardAvoidingViewProps } from 'react-native';

export type UseKeyboardAvoidingPropsResult = Pick<
  KeyboardAvoidingViewProps,
  'behavior' | 'keyboardVerticalOffset'
>;

/**
 * `KeyboardAvoidingView` に spread する props を返す。 Stack header 高さは
 * `useHeaderHeight()` で動的取得、 header 無し screen (tabs 配下 root 等) は 0 を返す。
 */
export function useKeyboardAvoidingProps(): UseKeyboardAvoidingPropsResult {
  // useHeaderHeight() は Stack 配下で header 高さ (header 非表示 / 無 header は 0) を返す。
  // 本 hook は Stack 配下の screen / modal でのみ呼ばれる前提 (rules of hooks 遵守、 try-catch 不可)。
  const headerHeight = useHeaderHeight();

  if (Platform.OS === 'ios') {
    return {
      behavior: 'padding',
      keyboardVerticalOffset: headerHeight,
    };
  }
  // Android: windowSoftInputMode=adjustResize と協調しつつ、 modal presentation で
  // adjustResize の効きが弱い既知挙動を behavior='height' で補強。 offset=0 で十分。
  return {
    behavior: 'height',
    keyboardVerticalOffset: 0,
  };
}
