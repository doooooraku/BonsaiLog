/**
 * useScrollPreservation — form 画面で「子画面に push 遷移して戻る」 と
 * ScrollView の contentOffset が 0 にリセットされてしまう問題への構造的修正 hook。
 *
 * Sess72 PR-1: テスター苦情「タグ追加画面から基本情報画面に戻ると
 * 必ず画面の先頭に戻ってしまう」 への hook 化。 ADR-0040 (form scroll 構造統一) の
 * Future Work 「scroll 位置保持」 を埋める。
 *
 * 真因: useFocusEffect 内の 2 連 setState で TagSection の layout pattern が
 *       「empty 縦」 → 「wrap row 横」 に変化し、 ScrollView 子要素の高さ変動で
 *       contentOffset が暗黙的に 0 にリセットされる (RN ScrollView の実装挙動)。
 *
 * Sess95 PR-2 改修 (テスター再報告「維持されず全画面 TOP に戻る」 対応):
 * 旧実装の「focus 後 requestAnimationFrame 1 frame で scrollTo」 は、 復元後に
 * 走る非同期 setState (例: getRecentTags().then(setRecentTags)) の layout 変動に
 * 追い越されて offset 0 に再リセットされる race が残っていた。 さらに暗黙の
 * 0 リセットが onScroll イベントとして発火すると lastOffsetRef 自体が 0 に
 * 上書きされ、 復元先まで失われていた。 本改修で以下の 3 段構えに変更:
 *
 * 1. focus 時に復元目標 y を pendingYRef に確保 (以後の onScroll は追跡停止 =
 *    暗黙 0 リセットで目標を失わない)
 * 2. requestAnimationFrame で即時復元を試行 (layout 変動が無い画面は従来同等)
 * 3. onContentSizeChange のたびに再復元 (= 最後の layout 変動に必ず勝つ)、
 *    focus から 500ms (RESTORE_WINDOW_MS) で追跡終了し通常の onScroll 追跡に復帰
 *
 * 仕様:
 * - `onScroll` callback で scroll するたびに最新 contentOffset.y を ref に保存
 *   (復元 window 中は保存しない)
 * - `useFocusEffect` で画面フォーカス時 (push から戻ってきた時など) に上記 3 段で復元
 * - 初回フォーカス時は lastOffset=0 のため復元は走らない (no-op)
 * - cleanup で cancelAnimationFrame + clearTimeout (race 防止: focus 後すぐ
 *   別画面に行った場合)
 *
 * 制約:
 * - 復元 window (500ms) 中のユーザー手動スクロールは onContentSizeChange 発火時に
 *   復元位置へ戻される可能性がある (実用上 focus 直後 0.5 秒以内の操作のみ)
 * - 子要素の構造が著しく縮む場合 (高さ 1000px → 100px 等) は RN 側で末尾に clamp される
 * - タブ切替時の blur/focus でも本 hook の useFocusEffect は発火する。 各タブで
 *   最後に居た scroll 位置に戻る挙動は自然なので、 タブ切替を skip するロジックは
 *   入れていない (シンプル維持、 実機で問題があれば option 追加)
 *
 * 使用例:
 * ```tsx
 * const scrollRef = useRef<ScrollView>(null);
 * const { onScroll, onContentSizeChange, scrollEventThrottle } =
 *   useScrollPreservation(scrollRef);
 *
 * return (
 *   <ScrollView
 *     ref={scrollRef}
 *     onScroll={onScroll}
 *     onContentSizeChange={onContentSizeChange}
 *     scrollEventThrottle={scrollEventThrottle}
 *   >
 *     ...
 *   </ScrollView>
 * );
 * ```
 *
 * @see docs/adr/ADR-0040-form-screen-scroll-unification.md (D5)
 * @see .claude/recurrence-prevention.md (R-63)
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

export type UseScrollPreservationResult = {
  /** ScrollView の onScroll prop に渡す (contentOffset.y を内部 ref に保存) */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /**
   * ScrollView の onContentSizeChange prop に渡す (復元 window 中の layout 変動の
   * たびに復元を再試行し、 暗黙 0 リセットとの race に構造的に勝つ)
   */
  onContentSizeChange: (contentWidth: number, contentHeight: number) => void;
  /** ScrollView の scrollEventThrottle prop に渡す (16ms = ~60fps、 jank 回避) */
  scrollEventThrottle: number;
};

/**
 * focus 後に layout 変動 (非同期 setState 由来) を追跡して復元し続ける window。
 * getRecentTags 等のローカル SQLite read は数十 ms 級のため 500ms で十分に覆う。
 */
const RESTORE_WINDOW_MS = 500;

export function useScrollPreservation(
  scrollRef: React.RefObject<ScrollView | null>,
): UseScrollPreservationResult {
  // 最新の scroll 位置を保持 (state ではなく ref なので、 値変更で rerender されない)
  const lastOffsetRef = useRef(0);
  // 復元 window 中の目標 y (null = 通常追跡モード)
  const pendingYRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // 復元 window 中は追跡停止: 暗黙 0 リセットの scroll イベントで
    // lastOffsetRef (復元目標) を失わないため。
    if (pendingYRef.current != null) return;
    lastOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onContentSizeChange = useCallback(() => {
    const y = pendingYRef.current;
    if (y == null) return;
    // layout 変動のたびに再復元 → 最後の変動に必ず勝つ (race の構造解)
    scrollRef.current?.scrollTo({ y, animated: false });
  }, [scrollRef]);

  useFocusEffect(
    useCallback(() => {
      const y = lastOffsetRef.current;
      if (y <= 0) return undefined; // 復元対象なし (初回 focus / top のまま)

      pendingYRef.current = y;
      // 即時復元の試行: layout 変動が無い画面では従来 (Sess72) と同等の挙動
      const handle = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
      });
      // 復元 window 終了 → 通常の onScroll 追跡に復帰
      timeoutRef.current = setTimeout(() => {
        pendingYRef.current = null;
        timeoutRef.current = null;
      }, RESTORE_WINDOW_MS);

      return () => {
        cancelAnimationFrame(handle);
        if (timeoutRef.current != null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        pendingYRef.current = null;
      };
    }, [scrollRef]),
  );

  return { onScroll, onContentSizeChange, scrollEventThrottle: 16 };
}
