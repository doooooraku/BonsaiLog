# BonsaiLog Override — upgrading-react-native

> **目的**: upstream Callstack の `SKILL.md` は無改変のまま、BonsaiLog 固有の Expo / RN upgrade 文脈をここに追補する (ADR-0051 D-6)。本ファイルは `pnpm ai:sync` で `agent-tools/skills/claude/upgrading-react-native/` → `.claude/skills/upgrading-react-native/` に自動コピーされる。
> **使い方**: Claude Code が `upgrading-react-native` skill を発火した時、SKILL.md 本体と併せて本ファイルを Read し、 BonsaiLog の現状スタックと制約を踏まえて upgrade 計画する。

---

## 1. BonsaiLog の現状スタック (2026-06 時点、 SoT は `package.json`)

- **Expo SDK**: 55.0.26 (`expo` dep)
- **React Native**: 0.83.6
- **React**: 19.2.0
- **Hermes**: enabled (Expo SDK 55 default、 New Arch 状況は別途確認)
- **重要な native dep**:
  - `react-native-purchases ^10.0.1` (RevenueCat、 ADR-0009)
  - `react-native-google-mobile-ads ^16.3.3` (AdMob、 ADR-0010)
  - `react-native-reanimated ~4.2.1`
  - `react-native-worklets 0.7.4`
  - `react-native-zip-archive 7.0.2` (pnpm.overrides 固定、 F-11 お引っ越し)
  - `expo-sqlite ^55.0.16`
- **Package Manager**: pnpm@10.23.0 (npm 禁止、 AGENTS.md §3)
- **Node**: >=22.0.0 (engines)
- **Custom Expo plugin**:
  - `plugins/withAsyncStorageRepo.js`
  - `plugins/withCmakeArgs.js` (NDK 27 + lld + no-LTO 強制、 lessons/ndk27-cmake-args-plugin)

---

## 2. Expo SDK 55 → 56 (将来想定) のチェックポイント

> SDK 56 はまだ stable リリース前 (2026-06 時点)。本セクションは「リリースされたらこの順で見る」 メモ。

### 2-1. 事前リサーチ (必須、 ADR-0009 ADR-0050 整合)

1. **公式 Release Notes**: https://expo.dev/changelog (SDK 56 リリース時)
2. **Breaking Changes**: `expo` blog で「SDK XX breaking」 記事を WebFetch
3. **Hermes / New Arch ステータス**:
   - SDK 56 で Hermes V1 → V2 移行があれば Intl カバレッジ改善期待 (BonsaiLog 19 言語 RangeError 課題 = react-native-best-practices BONSAI-OVERRIDE 1-1 参照)
   - New Arch (Fabric / TurboModules) default ON か opt-in か確認

### 2-2. 依存整合性 (Sess61-62 学び)

各 native dep の Expo SDK 56 サポート確認:

| dep | 公式 SDK 56 サポート確認方法 |
| --- | --- |
| react-native-purchases | RevenueCat docs + GitHub Issues |
| react-native-google-mobile-ads | invertase/react-native-google-mobile-ads release |
| react-native-reanimated | software-mansion/react-native-reanimated release |
| react-native-worklets | 同上 (Reanimated と peer dep) |
| react-native-zip-archive | mockingbot/react-native-zip-archive (pnpm.overrides 固定なので慎重) |
| expo-sqlite | Expo monorepo |

**Sess62 教訓 (lessons/ndk27-cmake-args-plugin)**: 1 個でも SDK mismatch があると AAB 起動即クラッシュ (`expo.modules.kotlin.types.AnyTypeCache` 等の NoClassDefFoundError)。**全 expo-* dep を同 minor に揃える**。

### 2-3. Hermes Intl 19 言語 カバレッジ実機検証

- 検証対象ロケール (高リスク): `hi`、 `th`、 `ja`、 `zh-Hans`、 `zh-Hant`、 `ar` (※ ar は v1.x 非対応だが Intl 周りで影響あり)
- 検証手順: Dev Build + 言語切替 + 月名 / 曜日名 / 数値フォーマット表示 + logcat で `RangeError` 確認
- 失敗時の選択肢:
  - (A) `@formatjs/intl-*` polyfill 採用 (bundle size +1MB 程度)
  - (B) 該当言語の月名を i18n 文字列で手書き上書き (i18n key 追加で対応)
  - (C) SDK upgrade を延期して Hermes V2 安定を待つ

### 2-4. Sess62 で確立した cloud-first 検証手順

ローカル EAS build は撤廃済 (Sess62 PR #927-#931、 ADR-0050)。検証は以下:

```bash
# 1. preflight (ローカル、 静的解析)
pnpm preflight:android
# 2. cloud build trigger (GitHub Actions workflow_dispatch)
gh workflow run build-android-play.yml -f profile=preview
# 3. snapshot before/after 比較
# (workflow 内で自動、 PR #931 で 2 段組化)
# 4. release notes diff
# (workflow 内で自動)
```

ローカル EAS build (`build:android:apk:local` 等) は **dev 用途のみ**、 production 検証は cloud。

### 2-5. Custom plugin の SDK 互換性

- `plugins/withAsyncStorageRepo.js`: Maven repository 注入、 RN core で吸収される可能性あり (SDK 56 で要再確認)
- `plugins/withCmakeArgs.js`: NDK 27 lld + no-LTO 強制、 SDK 56 が NDK 28 default になれば再検証

---

## 3. RN 0.83 → 0.84+ (将来想定) のチェックポイント

- React 19.x 互換性: React 19.2 採用済、 19.3 RC 出れば fan-out 確認
- `experiments.reactCompiler: true` (app.json) 影響: 0.84 で behavior 変化があれば要 ADR
- Reanimated 4 → 5 peer dep: worklets と同期更新が必須

---

## 4. 「本来発火すべきだったのに発火していない」 想定機会

過去 3 ヶ月で SDK upgrade 関連の議論は実質ゼロ (Sess63 audit より)、 真に機会なしだった。 今後 3 ヶ月で発生する想定:

- **2026-Q3**: Expo SDK 56 stable リリース時の upgrade 計画議論
- **2026-Q3**: Hermes V1 → V2 移行検討
- **2026-Q4 以降**: RN 0.84 / 0.85 への upgrade 検討

`.claude/hooks/check-rn-upgrade-hint.mjs` で以下キーワードを検知 → 本 skill 参照リマインダー注入: `Expo SDK 5[6-9]` / `SDK 6` / `SDK upgrade` / `rn-diff-purge` / `RN 0\.8[4-9]` / `RN 0\.9` / `breaking change` / `CocoaPods.*update` / `Gradle.*update` / `native.*migration`

---

## 5. 適用時のチェックリスト

1. **package.json + lockfile diff を Claude が Read** (R-18 Edit 前 Read 必須)
2. **全 expo-* dep の同 minor 一致確認** (Sess62 教訓、 NoClassDefFoundError 防止)
3. **custom plugin の SDK 互換性確認** (withAsyncStorageRepo / withCmakeArgs)
4. **Hermes Intl 19 言語実機検証** (上記 2-3)
5. **cloud-first 検証**: ローカル EAS は dev のみ、 production は GitHub Actions
6. **ADR 起票**: SDK upgrade は ADR で SoT 化 (BonsaiLog R-25 spec-code drift 防止)

---

## 6. 参照リンク (BonsaiLog 内)

- `package.json` (現状 SoT)
- `docs/adr/ADR-0009` (RevenueCat 課金) / ADR-0010 (AdMob) / ADR-0050 (Android release automation)
- `docs/reference/tasks/lessons/ndk27-cmake-args-plugin.md` (NDK 27 + lld 強制)
- `docs/reference/tasks/lessons.md` 索引 (sess61-62 リリース learning)
- `.github/workflows/build-android-play.yml` (Sess62 cloud build workflow)
- `plugins/withAsyncStorageRepo.js` / `plugins/withCmakeArgs.js`
