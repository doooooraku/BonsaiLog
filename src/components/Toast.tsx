/**
 * Toast (snackbar) コンポーネント (Sess12 PR-B+C、 一括予定/記録追加完了通知)。
 *
 * 設計: Zustand store でメッセージ管理、 root layout にマウント。
 * 呼び出し: `useToastStore.getState().show('message', 3000)` で表示開始 + 自動消去。
 *
 * Why custom (vs react-native-toast-message): 新規依存を追加せず、
 * 既存パターン (Pressable + Animated + Zustand) で完結。
 */
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { ThemedText } from '@/components/themed-text';
import { BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';

type ToastState = {
  message: string | null;
  /** Toast を表示する。 duration ms 後に自動で消える。 default 3000ms。 */
  show: (message: string, duration?: number) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    message: null,
    show: (message, duration = 3000) => {
      if (timer) clearTimeout(timer);
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: { color: ON_BRAND, fontSize: 14, fontWeight: '500' },
});
