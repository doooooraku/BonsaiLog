/**
 * Toast (snackbar) コンポーネント (Sess12 PR-B+C、 一括予定/記録追加完了通知)。
 *
 * Sess25 PR-ζ-2-④ (ADR-0036 D5 / R-44): action button slot 拡張。 「予定 N 件を削除しました [元に戻す]」
 * のような destructive 操作 Undo Snackbar に対応 (Material 3 Snackbar 整合、 default 4s)。
 *
 * 設計: Zustand store でメッセージ + action 管理、 root layout にマウント。
 * 既存 callsite (action 未指定) は完全後方互換 (pointerEvents="none" の挙動維持)。
 *
 * 呼び出し:
 * - シンプル: `useToastStore.getState().show('message')` (default 3000ms、 action なし)
 * - 期間指定: `useToastStore.getState().show('message', { durationMs: 5000 })`
 * - Undo: `showUndoToast(message, actionLabel, undoFn)` helper (4000ms 固定、 Material 3 default)
 *
 * Why custom (vs react-native-toast-message): 新規依存を追加せず、
 * 既存パターン (Pressable + Animated + Zustand) で完結。
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { ThemedText } from '@/components/themed-text';
import { BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';

export type ToastAction = {
  label: string;
  /** tap で実行 + Toast dismiss */
  onPress: () => void | Promise<void>;
};

export type ToastShowOptions = {
  /** default 3000ms (既存)、 Undo は 4000ms 推奨 (Material 3 Snackbar) */
  durationMs?: number;
  /** 任意、 指定時 [label] button を表示、 tap で onPress 実行 + dismiss */
  action?: ToastAction;
};

type ToastState = {
  message: string | null;
  action: ToastAction | null;
  /**
   * Toast を表示する。
   * - 旧 signature (string, number?) 後方互換: show('msg', 5000) ← 数値 = durationMs
   * - 新 signature: show('msg', { durationMs, action })
   */
  show: (message: string, opts?: number | ToastShowOptions) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    message: null,
    action: null,
    show: (message, opts) => {
      if (timer) clearTimeout(timer);
      // 後方互換: opts が number なら durationMs として扱う
      const normalized: ToastShowOptions =
        typeof opts === 'number' ? { durationMs: opts } : (opts ?? {});
      const duration = normalized.durationMs ?? 3000;
      const action = normalized.action ?? null;
      set({ message, action });
      timer = setTimeout(() => {
        set({ message: null, action: null });
        timer = null;
      }, duration);
    },
    hide: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      set({ message: null, action: null });
    },
  };
});

/**
 * ADR-0036 D5 / R-44: 破壊的操作 (削除等) 後の Undo Snackbar helper。
 * 4 秒間「{message} [{actionLabel}]」 を表示、 [actionLabel] tap で undoFn 実行 + dismiss。
 * actionLabel は呼出側で `t('undoSnackbarAction')` 等の i18n 文字列を渡す (ADR-0033 D2 整合)。
 */
export function showUndoToast(
  message: string,
  actionLabel: string,
  undoFn: () => void | Promise<void>,
): void {
  useToastStore.getState().show(message, {
    durationMs: 4000,
    action: { label: actionLabel, onPress: undoFn },
  });
}

export function Toast() {
  const message = useToastStore((s) => s.message);
  const action = useToastStore((s) => s.action);
  const hide = useToastStore((s) => s.hide);
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  if (!message) return null;

  const handleActionPress = async () => {
    if (!action) return;
    await action.onPress();
    hide();
  };

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      // action あり = button tap 受ける、 なし = 旧挙動 (背景透過)
      pointerEvents={action ? 'box-none' : 'none'}
      testID="e2e_toast"
    >
      <View style={styles.box}>
        <ThemedText style={styles.text}>{message}</ThemedText>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.actionButton}
            onPress={handleActionPress}
            testID="e2e_toast_action"
          >
            <ThemedText style={styles.actionText}>{action.label}</ThemedText>
          </Pressable>
        ) : null}
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
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: { color: ON_BRAND, fontSize: 14, fontWeight: '500' },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    color: ON_BRAND,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
