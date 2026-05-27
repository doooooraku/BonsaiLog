# ADR-0044: AdMob アプリ/広告ユニットの API 自動作成（AdMob API v1beta）(Sess50)

- Status: Accepted
- Date: 2026-05-27
- Deciders: @doooooraku
- Related: ADR-0043（ストア課金商品の API 自動作成 / 本 ADR は「広告側」の対）/ ADR-0010（F-14 AdMob バナー設計）/ ADR-0017（ストア整合 ATT/UMP プライバシー）/ ADR-0002（収益モデル Free=広告 / Pro=広告なし）/ `docs/01_key/`（app-factory 共通鍵ストア、git 管理外）/ 1 次情報 [AdMob API accounts.apps.create](https://developers.google.com/admob/api/reference/rest/v1beta/accounts.apps/create) + [accounts.adUnits](https://developers.google.com/admob/api/reference/rest/v1beta/accounts.adUnits) + [AdMob API authorization](https://developers.google.com/admob/api/v1/how-tos/authorizing)

---

## Context（背景：いま何に困っている？）

ADR-0010 で広告コードは実装済み（`src/services/adService.ts` / `src/features/ads/AdBanner.tsx` / UMP / ATT）。`.env` の `ADMOB_*` 4 キーは空で、残作業は「AdMob 管理画面でアプリ登録 → バナー広告ユニット作成 → 4 つの ID を取得 → `.env` 記入」。

ユーザー要望（Sess50）：**前回 Repolog で手作業（AdMob 管理画面ポチポチ）した広告設定を、課金（ADR-0043）と同様に Claude Code に任せて手間を省きたい。app-factory 量産前提で再利用価値が高い。**

### 調査で判明した事実（1 次情報 + 実地 API で裏取り）

- **AdMob API v1beta（2023-09-05 追加）にアプリ・広告ユニット作成メソッドは存在する**：`accounts.apps.create` / `accounts.adUnits.create`（scope `admob.monetization`）。ただし公式に "limited access. 403 なら account manager へ" の注記あり。
- **本アカウントでは作成 API は 403（limited access）で使えない**：当初 `apps.create` 空ボディ → 400 を「作成可」と誤判定したが、有効ボディで実行すると **403 PERMISSION_DENIED**（後述「実行で判明した事項」）。`accounts.list` / `apps.list` / `adUnits.list` 読み取りは 200 OK（`accounts/pub-4344515384188052`、Repolog と同一 publisher）。
- **AdMob API はサービスアカウント不可**：3-legged OAuth（ブラウザ同意 1 回）→ refresh token を `docs/01_key/admob_token.json` に保存して再利用。ADR-0043 の Google 課金鍵（サービスアカウント）は流用不可。
- **GDPR（欧州規制）/ IDFA メッセージは API が存在しない**：AdMob 管理画面の「プライバシーとメッセージ」でのみ作成可能（Google が同意設定を人間確認に強制する設計思想）。**恒久的に手作業**。
- 作成 body の正解形（実在 Repolog リソースから確認）：App=`{platform, manualAppInfo:{displayName}}`、AdUnit=`{appId, displayName, adFormat:"BANNER", adTypes:["RICH_MEDIA","VIDEO"]}`。

## Decision（決定）

実地検証の結果、作成 API は本アカウントで 403 のため、自動化範囲を次に**改定**する（B 案）。

1. **アプリ・広告ユニットの作成は AdMob 管理画面で手作業**（API 403 のため）。命名は config と一致させる：アプリ=`BonsaiLog` / 広告ユニット=`BonsaiLog_Android_Banner_Home_Bottom`・`BonsaiLog_iOS_Banner_Home_Bottom`。
2. **ID の `.env` 記入は自動化する**：手作業で作成後に `admob_create.py --write-env`（**`--commit` なし=読み取り専用**）を実行。displayName で既存リソースを検出し、4 ID（`~`形式 App ID×2、`/`形式 ad unit ID×2）を `.env` に冪等記入。手作業のタイポ転記を排除。
3. **設定駆動**：`config.bonsailog.admob.json` に 1 アプリ分（displayName・adFormat・envKey）を集約。次アプリは差し替えるだけ。読み取り＋ `.env` 記入部分は量産で再利用可。
4. **認証**：デスクトップ型 OAuth クライアント（`docs/01_key/client_secret_*.json`）+ refresh token（`docs/01_key/admob_token.json`、0600）。秘密は標準出力・ログ・コミットに**一切出さない**（§0）。依存は Python 標準ライブラリのみ。AdMob API はサービスアカウント不可。
5. **`admob_create.py --commit` は残置**（コード上は作成を試みる）。将来 Google から作成権限（allowlist）が付与されれば動作する。それまでは 403 で安全に失敗し、何も作成しない。

## Consequences（結果・影響）

- ✅ ID の `.env` 記入（`ADMOB_ANDROID_APP_ID` / `ADMOB_IOS_APP_ID`＝`~`形式 App ID、app.config の google-mobile-ads plugin が消費 / `ADMOB_ANDROID_BANNER_ID` / `ADMOB_IOS_BANNER_ID`＝`/`形式 ad unit ID、adService が消費）が自動化され、手作業のタイポ転記を排除。量産で再利用可。
- ⚠️ **アプリ・広告ユニット作成は手作業のまま**（API 403）。Repolog 同様、AdMob 管理画面で作成（約10分）。
- ⚠️ **その他も API 範囲外＝手作業**：⑤ GDPR メッセージ / ⑥ IDFA メッセージ（**API 無し**・管理画面のみ）、税務/支払いプロファイル、store listing リンク、app-ads.txt のドメイン紐付け確認。
- ⚠️ token はテスト中 OAuth アプリのため数日で失効しうる（本作業は一度きりなので問題なし。失効時は `admob_auth_check.py` 再実行）。

## 実行で判明した事項（Sess50、実地 API 検証）

- **`apps.create` 有効ボディ実行 → 403 PERMISSION_DENIED**（"The caller does not have permission"）。`account=accounts/pub-4344515384188052`、token は `admob.monetization` スコープ保持。**何も作成されず**（403 は作成前に拒否、`apps.list` で BonsaiLog 不在を確認）。
- **probe（空ボディ→400）は誤判定だった**：Google は ①リクエストボディの schema 検証 → ②limited-access の認可ゲート の順で評価する。空ボディは①で 400（②に未到達）、有効ボディは②に到達して 403。**400 は作成可否の証拠にならない**。
- 教訓：作成権限は有効ボディを実投げするまで確証できない（dry-run フラグ無し）。**403-on-valid-body のみが真の判定**。`admob_auth_check.py --probe-create` の 400 解釈は撤回。
- 出典：[accounts.apps.create](https://developers.google.com/admob/api/reference/rest/v1beta/accounts.apps/create)（"This method has limited access..."）

## スコープ外（次工程）

- AdMob 管理画面での GDPR / IDFA メッセージ作成・公開（手作業、Notion 手順参照）
- 実機でのバナー表示確認（Free 表示 / Pro 非表示）、UMP 同意フロー確認
