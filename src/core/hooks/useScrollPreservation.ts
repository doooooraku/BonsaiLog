/**
 * useScrollPreservation — form 画面で「子画面に push 遷移して戻る」 と
 * ScrollView の contentOffset が 0 にリセットされてしまう問題への構造的修正 hook。
 *
 * Sess72 PR-1 (Issue #XXX TBD): テスター苦情「タグ追加画面から基本情報画面に戻ると
 * 必ず画面の先頭に戻ってしまう」 への hook 化。 ADR-0040 (form scroll 構造統一) の
 * Future Work 「scroll 位置保持」 を埋める。
 *
 * 真因: useFocusEffect 内の 2 連 setState で TagSection の layout pattern が
 *       「empty 縦」 → 「wrap row 横」 に変化し、 ScrollView 子要素の高さ変動で
 *       contentOffset が暗黙的に 0 にリセットされる (RN ScrollView の実装挙動)。
 *
 * 仕様:
 * - `onScroll` callback で scroll するたびに最新 contentOffset.y を ref に保存
 * - `useFocusEffect` で画面フォーカス時 (push から戻ってきた時など) に
 *   `requestAnimationFrame` で setState commit 後の描画タイミングで `scrollTo` 復元
 * - 初回フォーカス時は lastOffset=0 で scrollTo(0)、 これは現状と同じ挙動 (no-op)
 * - cleanup で `cancelAnimationFrame` (race 防止: focus 後すぐ別画面に行った場合)
 *
 * 制約:
 * - 子要素の構造が著しく変化する場合 (高さ 1000px → 100px 等) は復元位置が無効になる
 *   可能性あり。 復元前に高さ越えていないかチェックする等の防御は将来検討
 * - タブ切替時の blur/focus でも本 hook の useFocusEffect は発火する。 各タブで
 *   最後に居た scroll 位置に戻る挙動は自然なので、 タブ切替を skip するロジックは
 *   入れていない (シンプル維持、 実機で問題があれば option 追加)
 *
 * 使用例:
 * ```tsx
 * const scrollRef = useRef<ScrollView>(null);
 * const { onScroll, scrollEventThrottle } = useScrollPreservation(scrollRef);
 *
 * return (
 *   <ScrollView
 *     ref={scrollRef}
 *     onScroll={onScroll}
 *     scrollEventThrottle={scrollEventThrottle}
 *   >
 *     ...
 *   </ScrollView>
 * );
 * ```
 *
 * @see docs/adr/ADR-0040-form-screen-scroll-unification.md (D5 Amendment 予定)
 * @see .claude/recurrence-prevention.md (R-62 新規起票予定)
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

export type UseScrollPreservationResult = {
  /** ScrollView の onScroll prop に渡す (contentOffset.y を内部 ref に保存) */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** ScrollView の scrollEventThrottle prop に渡す (16ms = ~60fps、 jank 回避) */
  scrollEventThrottle: number;
};

export function useScrollPreservation(
  scrollRef: React.RefObject<ScrollView | null>,
): UseScrollPreservationResult {
  // 最新の scroll 位置を保持 (state ではなく ref なので、 値変更で rerender されない)
  const lastOffsetRef = useRef(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  useFocusEffect(
    useCallback(() => {
      // requestAnimationFrame で setState commit 後の描画タイミングまで遅延。
      // useFocusEffect 内で同期的に scrollTo すると、 直後の setState (例:
      // tagAddResult consume の setRecentTags) で再 layout が走り offset が
      // 再リセットされる race を回避。
      const handle = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: lastOffsetRef.current, animated: false });
      });
      return () => cancelAnimationFrame(handle);
    }, [scrollRef]),
  );

  return { onScroll, scrollEventThrottle: 16 };
}
