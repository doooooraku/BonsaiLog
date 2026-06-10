/**
 * レビュー依頼 orchestrator (ADR-0006 Sess98 Amendment)。
 *
 * D1: 作業記録の保存成功直後 (WorkLogConfirmScreen 新規/変換 + BulkLogConfirmScreen log mode)
 * から fire-and-forget で呼ぶ。 保存・遷移をブロックせず、 失敗は warn のみ (副次機能)。
 * D5: 自前の回数 cap なし — 頻度制御は OS quota (Google Play time-bound / iOS 年 3 回) に任せる。
 *
 * 検証注意: ダイアログは Play Store からインストールされたビルドのみ表示される
 * (Dev Build / ローカル APK は無反応、 Maestro E2E 不可)。 判定境界は reviewPolicy の Jest で担保。
 */
import * as StoreReview from 'expo-store-review';

import { nowUtc } from '@/src/core/datetime';
import { countLoggedEvents } from '@/src/db/eventRepository';
import { useReviewStore } from '@/src/stores/reviewStore';

import { shouldRequestReview } from './reviewPolicy';

export async function maybeRequestReview(): Promise<void> {
  try {
    // hydration 前は永続済みの試行履歴が見えない (初期値で誤発火しうる) ため評価しない
    if (!useReviewStore.persist.hasHydrated()) return;
    const totalLoggedCount = await countLoggedEvents();
    const { firstLaunchAtUtc, requestCount, lastRequestAtUtc, lastMilestone } =
      useReviewStore.getState();
    const { request, milestone } = shouldRequestReview({
      totalLoggedCount,
      requestCount,
      lastRequestAtUtc,
      firstLaunchAtUtc,
      lastMilestone,
      nowUtc: nowUtc() as string,
    });
    if (!request || milestone == null) return;
    // Play Store 不在端末等では呼ばない。 マイルストーンは消費しない (次回保存で再評価)
    if (!(await StoreReview.isAvailableAsync())) return;
    // requestReview の前に記録 (D5: 呼び出した = 試行。 throw しても二重発火させない)
    useReviewStore.getState().markRequested(milestone);
    await StoreReview.requestReview();
  } catch (err) {
    console.warn('[review] maybeRequestReview failed', err);
  }
}
