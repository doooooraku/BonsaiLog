/**
 * GuideSpotlight の対象計測 hook (#1178 / ADR-0058)。
 *
 * 使い方:
 * 1. 強調したい UI の wrapper `<View ref={targetRef} collapsable={false} onLayout={measure}>`
 *    — Android では collapsable={false} 必須 (native 層で View が畳まれると計測不能)
 * 2. measureInWindow の window 絶対座標が `rect` に入る (GuideSpotlight の targetRect へ)
 *
 * measureInWindow 一択の理由: Fabric では measureLayout の relativeTo に数値ハンドル不可
 * (lessons: rn-fabric-measurelayout)。jest 環境では measureInWindow が呼ばれず rect は
 * null のまま (GuideSpotlight は null 中なにも描画しない契約なので安全)。
 */
import { useCallback, useRef, useState } from 'react';
import { Platform, StatusBar, type View } from 'react-native';

import type { TargetRect } from './spotlightLayout';

export function useSpotlightTarget() {
  const targetRef = useRef<View>(null);
  const [rect, setRect] = useState<TargetRect | null>(null);

  const measure = useCallback(() => {
    targetRef.current?.measureInWindow((x, y, width, height) => {
      // 計測がまだ確定しない frame (width/height 0) は捨てる — 0 矩形の spotlight 誤描画防止
      if (width > 0 && height > 0) {
        // Android: measureInWindow の原点は status bar の下 — GuideSpotlight の全画面 Modal
        // (statusBarTranslucent) は画面最上端原点のため、status bar 高さを加算して画面座標に
        // 揃える (Sess102 実機実測: 補正なしだとリングが ~status bar 分だけ上に伸びる)。
        const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
        setRect({ x, y: y + statusBarOffset, width, height });
      }
    });
  }, []);

  return { targetRef, rect, measure };
}
