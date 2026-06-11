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
import type { View } from 'react-native';

import type { TargetRect } from './spotlightLayout';

export function useSpotlightTarget() {
  const targetRef = useRef<View>(null);
  const [rect, setRect] = useState<TargetRect | null>(null);

  const measure = useCallback(() => {
    targetRef.current?.measureInWindow((x, y, width, height) => {
      // 計測がまだ確定しない frame (width/height 0) は捨てる — 0 矩形の spotlight 誤描画防止
      if (width > 0 && height > 0) {
        setRect({ x, y, width, height });
      }
    });
  }, []);

  return { targetRef, rect, measure };
}
