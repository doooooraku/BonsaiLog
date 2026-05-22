/**
 * Toast (snackbar) コンポーネント (Sess12 PR-B+C、 一括予定/記録追加完了通知)。
 *
 * Sess27 PR-2 (ADR-0036 D5/D6 撤回、 R-44 緩和): action button slot + showUndoToast 削除。
 * 実機検証で Undo button hit area WCAG 違反 + pointerEvents 貫通 bug 判明、
 * user 真意「Undo 不要、 通知 Toast のみ」 に従い action 関連 機能を全削除。
 * 既存 Toast.show callsite (action 未指定) は完全後方互換。
 *
 * 設計: Zustand store でメッセージ管理、 root layout にマウント。
 *
 * 呼び出し:
 * - シンプル: `useToastStore.getState().show('message')` (default 3000ms)
 * - 期間指定: `useToastStore.getState().show('message', { durationMs: 5000 })`
 */
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { ThemedText } from '@/components/themed-text';
import { BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';

export type ToastShowOptions = {
  /** default 3000ms (Material 3 Snackbar 整合) */
  durationMs?: number;
};

type ToastState = {
  message: string | null;
  /**
   * Toast を表示する。
   * - 旧 signature (string, number?) 後方互換: show('msg', 5000) ← 数値 = durationMs
   * - 新 signature: show('msg', { durationMs })
   */
  show: (message: string, opts?: number | ToastShowOptions) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    message: null,
    show: (message, opts) => {
      if (timer) clearTimeout(timer);
      const normalized: ToastShowOptions =
        typeof opts === 'number' ? { durationMs: opts } : (opts ?? {});
      const duration = normalized.durationMs ?? 3000;
      set({ message });
      timer = setTimeout(() => {
        set({ message: null });
        timer = null;
      }, duration);
    },
    hide: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      set({ message: null });
    },
  };
});

/**
 * @deprecated Sess27 PR-2 で Undo 動線撤回 (ADR-0036 D5 撤回、 R-44 緩和)。
 * 段階的廃止のため stub として残置 (内部は Toast.show、 actionLabel/undoFn は無視)。
 * PR-3 (PlanScreen) + PR-4 (bonsai-detail) で `Toast.show` へ置換 → PR-7 で完全削除予定。
 */
export function showUndoToast(
  message: string,
  _actionLabel: string,
  _undoFn: () => void | Promise<void>,
): void {
  useToastStore.getState().show(message, { durationMs: 4000 });
}

export function Toast() {
  const message = useToastStore((s) => s.message);
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none" testID="e2e_toast">
      <View style={styles.box}>
        <ThemedText style={styles.text}>{message}</ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  box: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: { color: ON_BRAND, fontSize: 14, fontWeight: '500' },
});
