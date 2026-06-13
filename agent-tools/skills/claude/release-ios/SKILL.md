---
name: release-ios
description: BonsaiLog iOS TestFlight 配信用 IPA ビルド + ASC への TestFlight 自動 Submit (道 A = ubuntu + EAS Cloud --auto-submit、Xcode 26.4 は EAS サーバー保有、user 手作業 0)。ADR-0050 Sess107 Amendment 準拠。
user-invocable: true
argument-hint: '[--skip-verify / --skip-watch]'
---

# /release-ios — iOS TestFlight 自動 Submit (Sess107 Amendment 版、 道 A 採用)

ユーザーが「iOS リリース」「TestFlight に上げて」「App Store Connect にビルド送って」 と言ったらこの手順に従う。 ADR-0050 Sess107 Amendment 準拠 (道 A: `ubuntu-latest` + `eas build --auto-submit` on EAS Cloud)。

## 重要方針 (Sess107 Amendment で確立)

- **IPA build は EAS Cloud で実行** (= Expo サーバー側で Xcode 26.4 保有、 Expo SDK 56 公式対応)。
- **GitHub Actions runner は `ubuntu-latest`** (= 指示を出すだけ、 Public repo は完全無料)。 macos runner + `--local` は **不可** (= Xcode 26 不在、 Sess106 5 試走で実証、 ADR-0050 Sess106 Amendment 参照)。
- **`--auto-submit` で build success → 自動で TestFlight 送信** (eas.json `submit.production.ios` プロファイル経由)。
- **credentials は EAS サーバー側管理** (ASC API Key 経由で初回自動取得、 年次更新も自動、 user 手作業 0)。
- **EAS Free 月 30 ビルド上限** (= 実 release 月 5-10 回想定で許容、 超過時は Expo Pro $19/月 検討)。
- 緊急時 (= EAS Cloud 障害) は Mac 環境がある場合のみローカル `eas build --local` fallback、 無ければ user 待機。

## 起動条件

- ローカル WSL2 + main branch + working tree clean
- `gh auth status` で GitHub CLI 認証済 (`gh auth login`)
- `.env` に iOS 必須キー (`REVENUECAT_IOS_API_KEY` / `ADMOB_IOS_APP_ID` / `ADMOB_IOS_BANNER_ID` / `IOS_BUNDLE_IDENTIFIER`) が埋まっている
- `docs/01_key/01_AppStore/App Store Connect API/AuthKey_6768KZU85A.p8` が存在 (= ASC API Key)
- GitHub Secrets 6 個登録済 (`ASC_API_KEY_P8_BASE64` / `ASC_API_KEY_ID` / `ASC_API_KEY_ISSUER_ID` / `ADMOB_IOS_APP_ID` / `ADMOB_IOS_BANNER_ID` / `REVENUECAT_IOS_API_KEY`) + `EXPO_TOKEN` (Android workflow と共用、登録済)
- GitHub Variables 2 個登録済 (`APPLE_TEAM_ID=HSH4HJ72Y8` / `APPLE_TEAM_TYPE=INDIVIDUAL`) + `IOS_BUNDLE_IDENTIFIER` (登録済)
- `eas.json` `submit.production.ios` 4 フィールド配線済 (Sess106 Amendment で完了)
- App Store Connect 側 BonsaiLog アプリ登録済 (`ascAppId=6763495229`、`bundleId=com.dooooraku.bonsailog`) ← Sess47-48 で完了
- **本番 (production) 昇格時**: 先に `docs/how-to/release/production-promotion-checklist.md` を実行 (= AdMob banner ID 本番戻し + `RELEASE_STAGE=production`、Sess95 PR-6 段階ゲート対応)。closed-testing 中は不要

## 8 Phase (Sess106 Amendment)

### Phase 0 — 開始確認

「これから GitHub Actions の macos-15 runner で iOS IPA を build + App Store Connect TestFlight に Submit します。 cloud build 約 25-35 分 + submit/processing 約 10-15 分 = 合計約 40-50 分。 PC 負荷は cloud 任せでほぼゼロ、Apple ID + 2FA すら不要 (ASC API Key で完全自動)。 EAS Cloud quota は --local で消費しません。 よろしいですか？」 を user に提示し、Yes で進行。

### Phase 0.5 — git clean + branch check

```bash
git status --porcelain  # 空であること
git branch --show-current  # main であること
```

dirty なら abort、「commit/stash してから再実行」 と user に案内。

### Phase 1 — pnpm verify ゲート (任意、 user 自己確認用)

```bash
pnpm verify     # 21 項目 (lint+type+test+i18n+config+docs+metadata 等)
```

`--skip-verify` 指定時は skip。 CI でも同じ verify が再実行されるので、 急ぐ場合は skip 可。 落ちたら abort + 該当 verify サブコマンドを user に提示。

### Phase 2 — Preflight 検査

```bash
# 必須キー / Privacy Manifest 生成可否を local で確認
node scripts/prebuild-env-check.mjs ios
```

不足項目があれば user に説明 + 修復可否を提示。 GitHub Secrets 欠落の場合は `gh secret set` の代行手順を提示 (user 承認のもと実行)。

### Phase 3 — Cloud build + submit (GitHub Actions workflow_dispatch)

```bash
gh workflow run build-ios-testflight.yml --ref main
sleep 5
RUN_ID=$(gh run list --workflow=build-ios-testflight.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "${RUN_ID}" --exit-status    # 完了まで監視 (約 25-35 分、 Claude が口頭中継)
```

`--skip-watch` 指定時は watch スキップして RUN_ID 表示で終了。

cloud で実行される 12 steps (build-ios-testflight.yml Sess106 Amendment 版):

1. checkout (actions/checkout@v6)
2. Setup pnpm (action-setup@v6.0.5)
3. Setup Node.js (.nvmrc = 22.x)
4. Install EAS CLI (`npm install -g eas-cli`)
5. Install dependencies (`pnpm install --frozen-lockfile`)
6. `.env` 生成 (Secrets/Variables から)
7. AdMob banner ID stage gate (production / closed-testing 整合検証)
8. Setup ASC API Key (`base64 -d → secrets/AuthKey.p8`、chmod 600)
9. Prebuild env check (`node scripts/prebuild-env-check.mjs ios`)
10. Verify code quality (`pnpm verify:lint && verify:type-check && verify:test`)
11. Expo SDK alignment check (continue-on-error)
12. Build iOS IPA (`eas build --platform ios --profile production --local --non-interactive --output=dist/app.ipa`) — Apple Team ID / Type は env 経由、初回は EAS が ASC API Key で Provisioning Profile 自動生成
13. Verify Privacy Manifest inclusion (`unzip -l dist/app.ipa | grep PrivacyInfo.xcprivacy` ≥1)
14. Submit to TestFlight (`eas submit --platform ios --path dist/app.ipa --profile production --non-interactive --wait`)
15. Cleanup ASC API Key (rm -f secrets/AuthKey.p8)
16. Upload IPA artifact (if: failure only、debug 用)
17. Post build summary

### Phase 4 — TestFlight 反映確認 (ASC API ポーリング)

```bash
# ASC API で Pre-Release Versions / Builds が増えたか確認
python3 << 'PY'
import sys
sys.path.insert(0, 'scripts/store-automation')
from _common import asc_token, http, ASC_BASE, load_config

cfg = load_config('scripts/store-automation/config.bonsailog.json')
token = asc_token(cfg['apple'])
app_id = cfg['apple']['appId']

builds = http('GET', f'{ASC_BASE}/v1/builds?filter[app]={app_id}&limit=1&sort=-uploadedDate', token=token)
for b in builds.get('data', [])[:1]:
    a = b['attributes']
    print(f"Latest build: {a.get('version')} ({a.get('processingState')}, uploaded={a.get('uploadedDate')})")
PY
```

processingState の遷移を確認:
- `PROCESSING` → `VALID` (10-15 分で完了)
- `INVALID` → エラー詳細を取得、user に報告

### Phase 5 — Release notes + Whats New (= TestFlight 内部テスター向け説明文、任意)

ASC API の `betaBuildLocalizations` エンドポイントで build に対する What's New を多言語 PATCH。 これは Sess106 では未実装、 PR-2 で別途配線予定。 PR-1 段階では skip。

### Phase 6 — User Report

submit 完了後、 以下を user に提示:

```markdown
## iOS TestFlight 反映完了

- **Build ID**: <ASC API 取得>
- **Version**: <CFBundleShortVersionString>
- **Build Number**: <CFBundleVersion>
- **Processing State**: VALID
- **TestFlight URL**: https://appstoreconnect.apple.com/teams/<TeamID>/apps/6763495229/testflight

### 次にやること
1. (内部テスト) App Store Connect → TestFlight → 内部テスト → 内部グループ → ビルド追加
2. (外部テスト) Beta App Review 申請 (= Apple 審査 1-2 日)
3. テスター招待 (max 10000 名)
```

### Phase 7 — Engram 記録 + cleanup

```bash
# Engram に release 記録
# (Skill 内では Claude が mem_save 呼び出し)
```

Engram に title=`Sess<N> iOS TestFlight release <version>` で保存。

cleanup:
- worktree 内の `dist/app.ipa` (もし local fallback で生成されていれば削除)
- `secrets/AuthKey.p8` (もし local fallback で展開されていれば削除)

## ローカル fallback (緊急時のみ、Mac 環境必須)

GitHub Actions 障害時、Mac 環境がある場合のみ:

```bash
# 1. .p8 を secrets/ に配置
mkdir -p secrets
cp '/path/to/docs/01_key/01_AppStore/App Store Connect API/AuthKey_6768KZU85A.p8' secrets/AuthKey.p8
chmod 600 secrets/AuthKey.p8

# 2. local build
EXPO_APPLE_TEAM_ID=HSH4HJ72Y8 \
EXPO_APPLE_TEAM_TYPE=INDIVIDUAL \
EXPO_ASC_API_KEY_PATH=$(pwd)/secrets/AuthKey.p8 \
EXPO_ASC_KEY_ID=6768KZU85A \
EXPO_ASC_ISSUER_ID=1f21bf99-fe11-4f44-9827-5b0bfbc3390e \
  eas build --platform ios --profile production --local --non-interactive --output=dist/app.ipa

# 3. submit
eas submit --platform ios --path dist/app.ipa --profile production --non-interactive --wait

# 4. cleanup
rm -f secrets/AuthKey.p8
```

## トラブルシュート

- **build fail: "Provisioning Profile not found"**: 初回は EAS が ASC API Key で自動生成、5 分程度 retry 後に再 build。`EXPO_APPLE_TEAM_ID` / `EXPO_APPLE_TEAM_TYPE` env が正しく渡っているか確認。
- **submit fail: "Missing Compliance"**: `app.config.ts` の `ios.config.usesNonExemptEncryption=false` 確認 (ADR-0005)。
- **submit fail: "Missing Privacy Manifest"**: workflow yml の Privacy Manifest 検証 step が pass しているか確認、`app.config.ts` の `ios.privacyManifests` 配列を確認 (ADR-0017 §⑤)。
- **processing fail: "Invalid Binary"**: Apple Store Connect の Activity ログを ASC API で取得、 user に詳細を提示。
- **ビルド時間超過 (> 60 min)**: macos runner cold start + CocoaPods + Xcode archive で稀に発生。 timeout-minutes: 90 に拡大済。

## 関連 ADR / Doc

- `docs/adr/ADR-0050-android-release-automation.md` Sess106 Amendment (本 Skill の SoT)
- `docs/adr/ADR-0005-ios-encryption-compliance.md` (`usesNonExemptEncryption: false`)
- `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md` §⑤ (Privacy Manifest)
- `docs/adr/ADR-0043-store-product-api-automation.md` (= 課金商品作成自動化、ASC API Key の出所)
- `docs/how-to/release/ios_release.md` (= 本 Skill のトラブルシュート + 用語集)
- `docs/how-to/development/ios-privacy-manifest-validation.md` (= 実機 Privacy Report 確認手順)
