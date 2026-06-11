/**
 * GuideSpotlight — 文脈内ガイドのスポットライト表示 (#1178 / ADR-0058)。
 *
 * 画面全体をうっすら暗くし、本物の UI 要素 (タブ / ボタン) だけを明るく枠で囲み、
 * 吹き出しで 1 つだけ操作を案内する。新規ライブラリなし (ADR-0018 バンドル増ゼロ方針踏襲)。
 *
 * 使い方 (呼出側の責務):
 * 1. 対象の wrapper View に ref を張り、measureInWindow で TargetRect を取得して渡す
 *    (Fabric では measureLayout の relativeTo に数値ハンドル不可のため measureInWindow 一択 —
 *     lessons: rn-fabric-measurelayout)
 * 2. onDismiss / onTargetPress の双方で guidesStore.markSeen を呼ぶ (生涯 1 回)
 *
 * tap 透過は採用しない: 強調領域 tap は onTargetPress で「本物の操作を代行」する
 * (Modal 越しの touch passthrough は platform 差異が大きく、代行が決定的で teste可能)。
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/src/core/theme/useColors';

import { computeSpotlightLayout, type TargetRect } from './spotlightLayout';

type GuideSpotlightProps = {
  visible: boolean;
  /** measureInWindow で得た対象の絶対座標。null の間は何も描画しない (計測完了待ち)。 */
  targetRect: TargetRect | null;
  /** 吹き出しタイトル (省略可 — g1 のお祝い行など)。 */
  title?: string;
  /** 吹き出し本文 (1 ガイド 1 メッセージ、ADR-0058 原則)。 */
  body: string;
  /** 閉じるボタンのラベル (例: 「あとで」「OK」 — i18n 済み文字列を渡す)。 */
  dismissLabel: string;
  onDismiss: () => void;
  /** 強調領域 tap 時に本物の操作を代行する (例: g1 = 記録タブへ遷移)。未指定なら tap = dismiss。 */
  onTargetPress?: () => void;
  testID?: string;
};

export function GuideSpotlight({
  visible,
  targetRect,
  title,
  body,
  dismissLabel,
  onDismiss,
  onTargetPress,
  testID = 'e2e_guide_spotlight',
}: GuideSpotlightProps) {
  const c = useColors();
  const { width, height } = useWindowDimensions();

  if (!visible || targetRect === null) return null;

  const layout = computeSpotlightLayout(targetRect, { width, height });
  const balloonStyle =
    layout.balloonPlacement === 'above'
      ? { bottom: height - layout.ring.y + 12 }
      : { top: layout.ring.y + layout.ring.height + 12 };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root} accessibilityViewIsModal testID={testID}>
        {/* 暗幕 4 枚 (上下左右) — tap で dismiss (ConfirmDialog backdrop 整合) */}
        {layout.backdrops.map((b, i) =>
          b.width > 0 && b.height > 0 ? (
            <Pressable
              key={i}
              style={[styles.backdrop, { left: b.x, top: b.y, width: b.width, height: b.height }]}
              onPress={onDismiss}
              accessibilityLabel={dismissLabel}
            />
          ) : null,
        )}

        {/* 強調リング — tap で本物の操作を代行 (なければ dismiss) */}
        <Pressable
          style={[
            styles.ring,
            {
              left: layout.ring.x,
              top: layout.ring.y,
              width: layout.ring.width,
              height: layout.ring.height,
              borderColor: c.tint,
            },
          ]}
          onPress={onTargetPress ?? onDismiss}
          accessibilityRole="button"
          accessibilityLabel={body}
          testID={`${testID}_target`}
        />

        {/* 吹き出し (ring の上 or 下、横は中央寄せ) */}
        <View
          style={[
            styles.balloon,
            balloonStyle,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
          accessibilityRole="alert"
        >
          {title ? (
            <ThemedText style={[styles.balloonTitle, { color: c.text }]}>{title}</ThemedText>
          ) : null}
          <ThemedText style={[styles.balloonBody, { color: c.textSecondary }]}>{body}</ThemedText>
          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
            style={styles.dismissButton}
            testID={`${testID}_dismiss`}
          >
            <ThemedText style={[styles.dismissLabel, { color: c.tint }]}>{dismissLabel}</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)', // ConfirmDialog backdrop と同値 (ADR-0036 整合)
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 12,
  },
  balloon: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    // 影は theme 非依存の黒 (Toast / Card と同系の浮き表現)
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  balloonTitle: { fontSize: 16, fontWeight: '600' },
  balloonBody: { fontSize: 14, lineHeight: 20 },
  dismissButton: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8 },
  dismissLabel: { fontSize: 14, fontWeight: '600' },
});
