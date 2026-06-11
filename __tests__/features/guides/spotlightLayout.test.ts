/**
 * computeSpotlightLayout 純関数 unit test (#1178 / ADR-0058)。
 *
 * 暗幕 4 枚 + ring + 吹き出し位置の幾何計算を検証する。
 * 座標系 = measureInWindow の window 絶対座標。
 */
import {
  computeSpotlightLayout,
  SPOTLIGHT_RING_PADDING,
  type TargetRect,
} from '@/src/features/guides/spotlightLayout';

const SCREEN = { width: 400, height: 800 };

describe('computeSpotlightLayout (#1178)', () => {
  test('ring = 対象 + padding (画面中央の対象)', () => {
    const target: TargetRect = { x: 100, y: 300, width: 200, height: 48 };
    const { ring } = computeSpotlightLayout(target, SCREEN);
    expect(ring).toEqual({
      x: 100 - SPOTLIGHT_RING_PADDING,
      y: 300 - SPOTLIGHT_RING_PADDING,
      width: 200 + SPOTLIGHT_RING_PADDING * 2,
      height: 48 + SPOTLIGHT_RING_PADDING * 2,
    });
  });

  test('暗幕 4 枚は ring を除く画面全域を隙間なく覆う (面積検算)', () => {
    const target: TargetRect = { x: 100, y: 300, width: 200, height: 48 };
    const { ring, backdrops } = computeSpotlightLayout(target, SCREEN);
    const backdropArea = backdrops.reduce((sum, b) => sum + b.width * b.height, 0);
    const screenArea = SCREEN.width * SCREEN.height;
    const ringArea = ring.width * ring.height;
    expect(backdropArea).toBe(screenArea - ringArea);
  });

  test('画面下部の対象 (タブバー / BottomCtaBar) → 吹き出しは above', () => {
    const target: TargetRect = { x: 0, y: 740, width: 400, height: 56 };
    expect(computeSpotlightLayout(target, SCREEN).balloonPlacement).toBe('above');
  });

  test('画面上部の対象 (詳細タブ列) → 吹き出しは below', () => {
    const target: TargetRect = { x: 0, y: 120, width: 400, height: 44 };
    expect(computeSpotlightLayout(target, SCREEN).balloonPlacement).toBe('below');
  });

  test('画面端の対象でも ring が画面外に出ない (clamp)', () => {
    const target: TargetRect = { x: 0, y: 760, width: 400, height: 40 }; // 画面最下端
    const { ring } = computeSpotlightLayout(target, SCREEN);
    expect(ring.x).toBeGreaterThanOrEqual(0);
    expect(ring.y).toBeGreaterThanOrEqual(0);
    expect(ring.x + ring.width).toBeLessThanOrEqual(SCREEN.width);
    expect(ring.y + ring.height).toBeLessThanOrEqual(SCREEN.height);
  });

  test('下端ぴったりの対象では下暗幕の height が 0 (負値にならない)', () => {
    const target: TargetRect = { x: 0, y: 760, width: 400, height: 40 };
    const { backdrops } = computeSpotlightLayout(target, SCREEN);
    for (const b of backdrops) {
      expect(b.width).toBeGreaterThanOrEqual(0);
      expect(b.height).toBeGreaterThanOrEqual(0);
    }
  });
});
