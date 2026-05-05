/**
 * Root index (ADR-0020 v1.x-1 + fix/249)。
 *
 * ADR-0020 Phase 1 で `app/(tabs)/index.tsx` (Home) を削除した結果、`/` ルートが
 * 未解決となり Expo Router が "Unmatched Route" 画面を表示する問題を解消するため、
 * 本ファイルで `/(tabs)/bonsai` へ即時 redirect する。
 *
 * - app/_layout.tsx の `unstable_settings.anchor = '(tabs)'` は anchor 設定で
 *   タブ root の解決ヒントだが、`/` 直接アクセス時 (deep link / 起動時 fallback) には
 *   index.tsx が必要。
 * - 既存ユーザー (onboarding 完了済) でも初回起動時に黒画面 → Unmatched Route
 *   が出ていたため、最優先の hot fix。
 */
import { Redirect } from 'expo-router';

export default function RootIndex() {
  return <Redirect href="/(tabs)/bonsai" />;
}
