/**
 * GuideSpotlight のレイアウト計算 純関数 (#1178 / ADR-0058)。
 *
 * 暗幕は「穴あき 1 枚」ではなく、強調領域 (ring) の上下左右 4 枚の矩形で構成する
 * (RN に矩形マスクの標準手段がなく、4 分割が最も単純で計測テスト可能なため)。
 *
 * 座標系: measureInWindow が返す window 絶対座標 (x, y, width, height)。
 */

export type TargetRect = { x: number; y: number; width: number; height: number };
export type ScreenSize = { width: number; height: number };

export type SpotlightLayout = {
  /** 強調リング (対象 + padding)。border 描画と tap 透過代行 (onTargetPress) の領域。 */
  ring: TargetRect;
  /** 暗幕 4 枚 (上 / 下 / 左 / 右)。width or height が 0 の矩形は描画不要。 */
  backdrops: readonly TargetRect[];
  /** 吹き出しを ring の上に出すか下に出すか (画面中央より下の対象 → 上に出す)。 */
  balloonPlacement: 'above' | 'below';
};

/** ring の余白 (対象ボタンの輪郭が暗幕に食われない見え方の最小値)。 */
export const SPOTLIGHT_RING_PADDING = 6;

export function computeSpotlightLayout(
  target: TargetRect,
  screen: ScreenSize,
  padding: number = SPOTLIGHT_RING_PADDING,
): SpotlightLayout {
  // ring は画面内に clamp (タブバー端の対象などで画面外に食み出さないように)
  const ringX = Math.max(0, target.x - padding);
  const ringY = Math.max(0, target.y - padding);
  const ring: TargetRect = {
    x: ringX,
    y: ringY,
    width: Math.min(screen.width - ringX, target.width + padding * 2),
    height: Math.min(screen.height - ringY, target.height + padding * 2),
  };

  const backdrops: TargetRect[] = [
    // 上: 画面全幅
    { x: 0, y: 0, width: screen.width, height: ring.y },
    // 下: 画面全幅
    {
      x: 0,
      y: ring.y + ring.height,
      width: screen.width,
      height: Math.max(0, screen.height - (ring.y + ring.height)),
    },
    // 左: ring の高さ分のみ
    { x: 0, y: ring.y, width: ring.x, height: ring.height },
    // 右: ring の高さ分のみ
    {
      x: ring.x + ring.width,
      y: ring.y,
      width: Math.max(0, screen.width - (ring.x + ring.width)),
      height: ring.height,
    },
  ];

  const targetCenterY = target.y + target.height / 2;
  const balloonPlacement: 'above' | 'below' = targetCenterY > screen.height / 2 ? 'above' : 'below';

  return { ring, backdrops, balloonPlacement };
}
