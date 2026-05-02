/**
 * React Query invalidator ヘルパー集約 (P2-03 PR-A、ADR-0008 §invalidator パターン)。
 *
 * Related:
 * - Issue #17 F-02 AC7-3/AC7-4 (qc.invalidateQueries 直接呼出禁止、ヘルパー経由)
 * - ADR-0013 (F-04 ヒートマップ) で invalidateHeatmap 拡張予定
 * - ADR-0014 (F-16 通知) で invalidateBonsaiNotifications 拡張予定
 *
 * 目的:
 * - 各機能の invalidate 対象 queryKey を 1 ヶ所に集約
 * - 個別画面が `qc.invalidateQueries({ queryKey: [...] })` を直接呼ぶのを禁止
 * - ESLint で `no-restricted-syntax` ルールにより外部からの直接呼出を防止 (将来導入)
 *
 * 仕様:
 * - 各 invalidator は `(qc: QueryClient, ...args) => void`
 * - F-02 events 完成時に `invalidateBonsaiEvents` 等を追加
 */
import type { QueryClient } from '@tanstack/react-query';

/**
 * 盆栽一覧 / 詳細を invalidate (新規登録 / 更新 / アーカイブ時)。
 */
export function invalidateBonsai(qc: QueryClient, bonsaiId?: string): void {
  void qc.invalidateQueries({ queryKey: ['bonsai', 'list'] });
  if (bonsaiId) {
    void qc.invalidateQueries({ queryKey: ['bonsai', 'detail', bonsaiId] });
  }
}

/**
 * 盆栽の写真を invalidate (写真追加 / 削除 / カバー変更時)。
 * F-08 の年次タイムライン + 一覧サムネに影響。
 */
export function invalidatePhotos(qc: QueryClient, bonsaiId: string): void {
  void qc.invalidateQueries({ queryKey: ['photos', bonsaiId] });
  void qc.invalidateQueries({ queryKey: ['photos', 'cover', bonsaiId] });
}

/**
 * 樹種マスタを invalidate (通常は seed 後 1 回のみ、locale 切替時にも呼ぶ)。
 */
export function invalidateSpecies(qc: QueryClient, locale?: string): void {
  void qc.invalidateQueries({ queryKey: ['species', 'list', locale ?? null] });
}

// ---------------------------------------------------------------------------
// 拡張予定 (将来の PR で追加)
// ---------------------------------------------------------------------------

// F-02 events (#17 P2-03 PR-B/C):
// export function invalidateEvents(qc: QueryClient, bonsaiId: string): void { ... }

// F-04 ヒートマップ (ADR-0013、Issue #29):
// export function invalidateHeatmap(qc: QueryClient, bonsaiId: string, year: number): void { ... }

// F-16 通知 (ADR-0014、Issue #30):
// export function invalidateBonsaiNotifications(qc: QueryClient, bonsaiId: string): void { ... }
