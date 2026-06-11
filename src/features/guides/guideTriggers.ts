/**
 * 文脈内ガイドの発火判定 純関数 (#1178 / ADR-0058)。
 *
 * 副作用なし — 各画面は state を渡して bool を受け取るだけ。表示と markSeen は呼出側の責務。
 *
 * 発火条件の設計 (ADR-0058):
 * - 全ガイド共通: seen でない (生涯 1 回)
 * - g1 / g5 はデータ状態ガード付き — 既存ユーザー (盆栽 2 本以上 / 記録あり) には出さない。
 *   「初めての成功体験」専用ガイドのため、アプリ更新で後から入れた既存ユーザーに出ると誤誘導になる
 * - g2 / g3 / g6 は画面初遭遇のみが条件 (既存ユーザーにも 1 回だけ出る — 機能発見の救済を兼ねる)
 */
import type { GuideId } from '@/src/stores/guidesStore';

type SeenMap = Partial<Record<GuideId, boolean>>;

/** 共通条件: まだ見ていないか。g2 / g3 / g6 はこれ単体で発火判定になる。 */
export function canShowGuide(id: GuideId, seen: SeenMap): boolean {
  return seen[id] !== true;
}

/**
 * g1 (記録タブ誘導): 盆栽がちょうど 1 本のときだけ。
 * - 0 本 = まだ登録前 (Home の empty state が担当)
 * - 2 本以上 = 既存ユーザー or 2 本目以降 → 出さない
 */
export function shouldShowG1RecordTabNudge(bonsaiCount: number, seen: SeenMap): boolean {
  return bonsaiCount === 1 && canShowGuide('g1RecordTabNudge', seen);
}

/**
 * g5 (最初の記録のお祝い): 保存後の logged 総件数がちょうど 1 のときだけ。
 * 呼出側は「記録保存成功直後」に保存後件数を渡す (保存前 0 → 後 1 の判定を 1 引数に集約)。
 */
export function shouldShowG5FirstRecordCelebration(
  loggedEventTotalAfterSave: number,
  seen: SeenMap,
): boolean {
  return loggedEventTotalAfterSave === 1 && canShowGuide('g5FirstRecordCelebrated', seen);
}
