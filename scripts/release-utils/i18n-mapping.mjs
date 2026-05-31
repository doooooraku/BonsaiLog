/**
 * i18n-mapping.mjs — fastlane と Publisher API の言語コード mapping (Sess61 PR6)
 *
 * fastlane は App Store 由来の言語コード (例: ja, en-US) を使う。
 * Google Play Publisher API は BCP-47 形式 (例: ja-JP, en-US) を要求する。
 * このマッピングテーブルで両者を変換する。
 *
 * 参考: ADR-0033 i18n translation policy / ADR-0050 D5
 *       https://support.google.com/googleplay/android-developer/table/4419860 (Play 言語一覧)
 */

/**
 * fastlane code (in fastlane/metadata/<code>/) → Play Console BCP-47 code
 *
 * 将来 18 言語へ展開する場合はここに追加 (ADR-0033 のロケール一覧と整合)。
 */
export const FASTLANE_TO_PLAY = Object.freeze({
  ja: 'ja-JP',
  'en-US': 'en-US',
});

/**
 * 逆引き (Play BCP-47 → fastlane code)
 */
export const PLAY_TO_FASTLANE = Object.freeze(
  Object.fromEntries(Object.entries(FASTLANE_TO_PLAY).map(([f, p]) => [p, f])),
);

/**
 * fastlane code が mapping table に含まれているか
 */
export function isSupportedFastlaneCode(code) {
  return Object.prototype.hasOwnProperty.call(FASTLANE_TO_PLAY, code);
}

/**
 * Play BCP-47 code が mapping table に含まれているか
 */
export function isSupportedPlayCode(code) {
  return Object.prototype.hasOwnProperty.call(PLAY_TO_FASTLANE, code);
}

/**
 * 全 mapping pair をリスト形式で返す (preflight 検査等で使用)
 */
export function getAllMappings() {
  return Object.entries(FASTLANE_TO_PLAY).map(([fastlane, play]) => ({ fastlane, play }));
}
