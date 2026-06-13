/**
 * useForeground — iOS バックグラウンド復帰時の banner reload 抑制 hook (Sess106 PR-2、 ADR-0010 §58 実装漏れ解消)。
 *
 * 役割:
 *   - AppState listener で `background` → `active` 遷移を検出
 *   - 直前の background 入時刻を記録、復帰時に経過秒数を計算
 *   - 60 秒以内の復帰は「suppress = true」 を返す (= 再 load 不要)
 *   - 60 秒超の復帰は「suppress = false」 を返す (= 再 load 必要、WKWebView suspended state 救済)
 *
 * 背景:
 *   - iOS WKWebView は background suspended state で内部状態が破棄され、復帰時に空 banner になる
 *     ([GitHub Issue #559](https://github.com/invertase/react-native-google-mobile-ads/issues/559))
 *   - ただし短時間 (例: 30 秒) 復帰でも毎回 reload すると imp 水増し + 配信制限リスク (AdMob policy)
 *   - 60 秒の闾値は ADR-0010 §58 で確定済 (functional_spec §19.3.4 / §19.4 境界値テーブル整合)
 *
 * 適用:
 *   - AdBanner.tsx で useForeground() を呼び、`shouldReload` を BannerAd.load() 判定に使う
 *   - Android では AppState 'active' / 'background' 遷移自体は発火するが、WKWebView suspended state
 *     問題はないため `shouldReload` を常時 false とし no-op に近い挙動 (Platform.OS チェック)
 *
 * 関連:
 *   - ADR-0010 §58 (Sess106 Amendment で実装明示化)
 *   - functional_spec §19.3.4 境界値テーブル「iOS バックグラウンド復帰 60 秒以内 = 再ロードしない」
 */
import React from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

const BACKGROUND_RELOAD_THROTTLE_MS = 60_000;

/**
 * iOS バックグラウンド復帰時の banner reload 抑制状態を提供する hook。
 *
 * @returns
 *   - `shouldReload` — true なら BannerAd の再 load が必要 (= 60 秒超 background)、
 *     false なら維持 (= 60 秒以内 or Android / Web)。初回 mount 時は常に false。
 *   - `acknowledge` — 呼出側 (例: AdBanner) が `load()` 実行後に呼び、 `shouldReload` を false に戻す。
 *     次の bg → active 60 秒超遷移まで再 trigger されない。
 */
export function useForeground(): { shouldReload: boolean; acknowledge: () => void } {
  const [shouldReload, setShouldReload] = React.useState(false);
  // background 入時刻を保持 (active 復帰時に経過秒数計算)
  const backgroundAtRef = React.useRef<number | null>(null);
  // 直前の AppState (active / background / inactive) を保持
  // AppState.currentState が undefined になりうる環境 (jest 等) のため 'active' を fallback
  const lastStateRef = React.useRef<AppStateStatus>(AppState.currentState ?? 'active');

  const acknowledge = React.useCallback(() => setShouldReload(false), []);

  React.useEffect(() => {
    // iOS でのみ AppState を監視 (Android は WKWebView suspended state 問題なし)
    if (Platform.OS !== 'ios') return;

    const handleChange = (nextState: AppStateStatus) => {
      const prev = lastStateRef.current;
      lastStateRef.current = nextState;

      if ((prev === 'active' || prev === 'inactive') && nextState === 'background') {
        // active/inactive → background 遷移: 時刻記録
        backgroundAtRef.current = Date.now();
        return;
      }
      if (prev === 'background' && nextState === 'active') {
        // background → active 遷移: 経過時間判定
        const enteredBackgroundAt = backgroundAtRef.current;
        backgroundAtRef.current = null;
        if (enteredBackgroundAt === null) return;
        const elapsed = Date.now() - enteredBackgroundAt;
        if (elapsed >= BACKGROUND_RELOAD_THROTTLE_MS) {
          setShouldReload(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, []);

  return { shouldReload, acknowledge };
}

export const __TEST_ONLY = {
  BACKGROUND_RELOAD_THROTTLE_MS,
};
