/**
 * GuideBanner — ガイド系のお祝い/案内バナー (#1178 / ADR-0058、Sess102 user 指摘で新設)。
 *
 * 旧実装は g5 を既存 Toast (深緑) で代用していたが、スポットライトの吹き出し (washi surface)
 * と背景色が不統一だった (user 指摘)。**ガイドの視覚言語は吹き出しと同一系** (surface +
 * border + radius 16 + 同シャドウ) に統一し、アプリ標準 Toast (深緑) とは役割を分離する:
 * - Toast = 操作結果の通知 (保存しました 等)
 * - GuideBanner = ガイド文脈の案内 (お祝い / 道しるべ)
 *
 * Toast と同じ構造 (揮発 zustand store + root mount) — 保存直後の画面遷移をまたいで表示。
 * tap で即 dismiss 可 (pointerEvents 有効、Toast との差分)。
 */
import React from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { create } from 'zustand';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/src/core/theme/useColors';

type GuideBannerState = {
  message: string | null;
  show: (message: string, opts?: { durationMs?: number }) => void;
  hide: () => void;
};

export const useGuideBannerStore = create<GuideBannerState>((set) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    message: null,
    show: (message, opts) => {
      if (timer) clearTimeout(timer);
      const duration = opts?.durationMs ?? 6000;
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

export function GuideBanner() {
  const message = useGuideBannerStore((s) => s.message);
  const hide = useGuideBannerStore((s) => s.hide);
  const c = useColors();
  // Sess108 PR-E (React Compiler 整合): Animated.Value 初期化は useState lazy init で 1 回固定。
  // 旧 `useRef(...).current` は render 中の ref read が react-hooks/refs 違反。
  const [opacity] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} testID="e2e_guide_banner">
      <Pressable
        accessibilityRole="alert"
        onPress={hide}
        style={[styles.box, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <ThemedText style={[styles.text, { color: c.text }]}>{message}</ThemedText>
      </Pressable>
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
  },
  // GuideSpotlight の吹き出し (balloon) と同一系の意匠 — ガイド視覚言語の統一
  box: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  text: { fontSize: 14, lineHeight: 20 },
});
