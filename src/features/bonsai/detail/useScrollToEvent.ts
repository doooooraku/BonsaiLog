import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { InteractionManager, type ScrollView, type View } from 'react-native';

/**
 * 検索結果タップ → 該当作業へジャンプ + 一時ハイライト (R7)。
 * Phase 4 A1-7 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 *
 * event.id をキーに row の wrapper View ref を登録 (`registerRow`)、`scrollToEvent` で
 * measureLayout により対象行の実 Y を測ってスクロール + 2.5 秒ハイライト。
 * 展開アニメ・写真の非同期 fetch でレイアウトが後から伸びるため ref 未取得時はリトライ(最大8回)。
 *
 * Fabric 対応: measureLayout の relativeTo は数値ハンドル不可・ホスト View ref が必須
 * (既知 lesson rn-fabric-measurelayout-gotcha)。机上テスト不可のため実機目視で担保。
 *
 * `scrollRef`/`scrollContentRef` は index.tsx 作成 (ScrollView と content wrapper) を注入。
 */
export function useScrollToEvent({
  scrollRef,
  scrollContentRef,
}: {
  scrollRef: RefObject<ScrollView | null>;
  scrollContentRef: RefObject<View | null>;
}) {
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, View>>(new Map());
  const registerRow = useCallback((eventId: string, node: View | null) => {
    if (node) rowRefs.current.set(eventId, node);
    else rowRefs.current.delete(eventId);
  }, []);
  // Sess108 PR-E (React Compiler 整合): self-recursive callback の宣言前アクセス
  // (react-hooks/immutability) を ref 経由参照で解消。 callback inner からは
  // ref.current?.(...) で間接呼出 → 「callback 宣言前アクセス」 を消す。
  // ref.current は useEffect で最新 callback を反映 (毎 render 更新)。
  const scrollToEventRef = useRef<((eventId: string, attempt?: number) => void) | null>(null);
  // 対象行を ScrollView 内の実 Y 座標 (measureLayout) までスクロール。
  const scrollToEvent = useCallback(
    (eventId: string, attempt = 0) => {
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          const node = rowRefs.current.get(eventId);
          const scroll = scrollRef.current;
          const content = scrollContentRef.current;
          if ((!node || !scroll || !content) && attempt < 8) {
            setTimeout(() => scrollToEventRef.current?.(eventId, attempt + 1), 120);
            return;
          }
          if (!node || !scroll || !content) return;
          // Fabric 対応: relativeTo は数値ハンドル不可、ホスト View の ref (content wrapper) を渡す。
          // 対象行の content 内 Y を実測 → ヘッダ余白 80px 分上にオフセットしてスクロール。
          node.measureLayout(
            content as never,
            (_x: number, y: number) => {
              scroll.scrollTo({ y: Math.max(0, y - 80), animated: true });
              setHighlightedEventId(eventId);
              setTimeout(
                () => setHighlightedEventId((cur) => (cur === eventId ? null : cur)),
                2500,
              );
            },
            () => {},
          );
        });
      });
    },
    [scrollRef, scrollContentRef],
  );
  // ref に最新 callback を反映 (再 render で deps 変化時)。
  useEffect(() => {
    scrollToEventRef.current = scrollToEvent;
  }, [scrollToEvent]);
  return { highlightedEventId, registerRow, scrollToEvent };
}
