/**
 * useUnsavedChangesGuard — form 画面で未保存 changes ありの状態で
 * navigation back が発生した時に「変更を破棄しますか?」 確認 dialog を表示する hook。
 *
 * Sess39 PR-1 (issue #822) で新規追加。 ADR-0036 R-44 の scope 拡張版:
 * - 旧 R-44: 「破壊的操作」 (削除 / アーカイブ等) で ConfirmDialog 必須
 * - 新 R-44: 「画面離脱による入力消失」 も同 ConfirmDialog pattern で防止
 *
 * 仕様:
 * - React Navigation の `beforeRemove` event を hook (Android 物理戻る + iOS swipe back + プログラム back すべて hook 可能)
 * - isDirty=true 時に navigation 試行 → preventDefault + dialog 表示
 * - isDirty=false or bypass=true 時はそのまま navigation 許可 (例: submit 中)
 * - dialog 表示 logic は caller 側で ConfirmDialog component を render (本 hook は visibility + handler のみ提供)
 *
 * 使用例:
 * ```tsx
 * const initialState = useRef({ name: '', memo: '' });
 * const isDirty = useMemo(() => name !== initialState.current.name || memo !== initialState.current.memo, [name, memo]);
 *
 * const { guardVisible, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard({
 *   isDirty,
 *   bypass: isSubmitting,
 * });
 *
 * return (
 *   <>
 *     <form>...</form>
 *     <ConfirmDialog
 *       visible={guardVisible}
 *       title={t('discardChanges')}
 *       description={t('discardChangesDesc')}
 *       confirmLabel={t('discard')}
 *       cancelLabel={t('keepEditing')}
 *       destructive
 *       onConfirm={confirmDiscard}
 *       onCancel={cancelDiscard}
 *     />
 *   </>
 * );
 * ```
 *
 * @see docs/adr/ADR-0036-destructive-action-pattern.md (R-44 拡張)
 * @see issue #822
 */
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

export type UseUnsavedChangesGuardProps = {
  /** form に未保存 changes があるか (true で dialog 表示) */
  isDirty: boolean;
  /** dialog skip フラグ (例: isSubmitting 中は dialog 出さず通常 back) */
  bypass?: boolean;
};

export type UseUnsavedChangesGuardResult = {
  /** dialog 表示 visibility (ConfirmDialog の visible prop に渡す) */
  guardVisible: boolean;
  /** dialog 「破棄」 button onPress (pending navigation を実行) */
  confirmDiscard: () => void;
  /** dialog 「編集を続ける」 button onPress (dialog 閉じる、 form 残留) */
  cancelDiscard: () => void;
  /**
   * Sess42 バグ2 fix: 保存成功 → 画面遷移する **直前に同期的に** 呼ぶと、以降の navigation を
   * 無条件で許可する (dialog を出さない)。`bypass: submitting` は React state 反映 (再レンダ +
   * effect 再購読) のタイミングに依存し、保存処理が速い / カメラ Activity 再生成が絡む場合に
   * `router.back()` が「bypass=true 反映前」に発火して dialog が出てしまう競合があった。
   * 本関数は ref を同期更新するため、closure の bypass 値に関係なく確実に bypass できる。
   */
  allowNavigation: () => void;
};

export function useUnsavedChangesGuard({
  isDirty,
  bypass = false,
}: UseUnsavedChangesGuardProps): UseUnsavedChangesGuardResult {
  const navigation = useNavigation();
  const [guardVisible, setGuardVisible] = useState(false);
  // beforeRemove event の pending action を保持 (confirm 時に dispatch)
  // 型: NavigationAction (React Navigation の navigation.dispatch に渡せる object)
  const pendingActionRef = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  // Sess42 バグ2 fix: allowNavigation() で同期 ON にする無条件許可フラグ。
  // ref なので listener closure が古い render の値でも常に最新を読める (競合回避)。
  const forceAllowRef = useRef(false);

  useEffect(() => {
    // beforeRemove は React Navigation 経由の **全 navigation back** を hook:
    // - Android 物理戻るボタン (hardware back)
    // - iOS swipe back gesture
    // - router.back() / navigation.goBack() 等プログラム navigation
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (forceAllowRef.current || bypass || !isDirty) {
        // 無条件許可 (保存後) or 未変更 or bypass: そのまま navigation 許可 (preventDefault 呼ばない)
        return;
      }
      // 未保存 changes あり: preventDefault で navigation 阻止 + dialog 表示
      e.preventDefault();
      pendingActionRef.current = e.data.action;
      setGuardVisible(true);
    });
    return unsubscribe;
  }, [isDirty, bypass, navigation]);

  const allowNavigation = useCallback(() => {
    forceAllowRef.current = true;
  }, []);

  const confirmDiscard = useCallback(() => {
    setGuardVisible(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      // pending action を dispatch (元の navigation 完遂)
      navigation.dispatch(action);
    }
  }, [navigation]);

  const cancelDiscard = useCallback(() => {
    // dialog 閉じる、 form 残留 (pending action 破棄)
    setGuardVisible(false);
    pendingActionRef.current = null;
  }, []);

  return { guardVisible, confirmDiscard, cancelDiscard, allowNavigation };
}
