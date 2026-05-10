# 開発用スクショ撮影手順 (T1-9)

> **このファイルのロール**: mockup 整合検証 + ストア提出用スクショの撮影手順を統一。R-29 写経駆動開発 Step 4 (RN スクショ撮影) の標準手順。

最終更新: 2026-05-10 (T1-9、Tier 1a 基盤整備)

---

## 目的

R-29 写経駆動開発 5 段階の **Step 4「RN スクショ撮影」** で、撮影品質を統一:

- ExpoGo の Dev Tool 歯車 (Element Inspector トグル) が画面に映り込まない
- 統一サイズ / 解像度 (Pixel 8 1080×2400 / iPhone 15 Pro 1179×2556 等)
- ストア提出用スクショとも整合 (将来の `fastlane/screenshots/` と互換)

---

## 1. mockup スクショ (T1-2 既完了、参考)

mockup 側のスクショは **事前生成済 + git commit 済** (`docs/mockups/v1.0/screenshots/`、26 png)。R-29 Step 2 で参照する。

再生成が必要な場合:

```bash
PATH=/home/doooo/.local/bin:/home/doooo/.nvm/versions/node/v22.22.2/bin:/usr/bin:/bin \
  corepack pnpm exec tsx scripts/ui-diff/generate-mockup-screenshots.ts
```

**コマンド意味**:

- `PATH=...`: Linux 側 Node v22 を使う (Windows v18 回避)
- `corepack pnpm exec tsx`: TypeScript ファイルを直接実行
- `scripts/ui-diff/generate-mockup-screenshots.ts`: Playwright で 26 画面を一括撮影

---

## 2. 実機スクショ (R-29 Step 4)

### 2.1 撮影前に「ExpoGo Dev Tool 歯車」を hide する手順 (T1-9 重点)

ExpoGo / Expo Dev Client は画面に floating button (浮遊歯車) を表示する。これは Element Inspector / Performance Monitor のトグルで、**ストアスクショに映ると審査リスク** + **mockup 整合の視覚比較で邪魔**。

#### 案 A: ExpoGo Dev Menu から hide する (毎回手動、推奨)

1. **実機を Shake** (デバイスを物理的に振る) or **3 本指タップ** で Dev Menu を開く
2. Menu の「**Hide Inspector**」or「**Hide Performance Monitor**」をタップ
3. 画面から歯車が消える
4. スクショ撮影 (音量↓ + 電源 同時押し / Power+Volume Down)

#### 案 B: 起動時 disable (Expo SDK の機能、要検証)

`app/_layout.tsx` 起動時に:

```ts
import { DevSettings } from 'react-native';

if (__DEV__) {
  // Element Inspector を disable 試行 (Expo SDK 50+ で動作するか要検証)
  // 注: Expo Dev Menu の標準制御 API は未公開、本案は実証実験段階
}
```

→ **本格 disable は次 Issue で検証**。現状は **案 A (手動 hide)** が確実。

#### 案 C: EAS Build (本番ビルド) で撮影

EAS Build (production / preview) では Dev Menu 自体が **存在しない**。歯車 0% 表示 = 完璧。

ただし EAS Build は:

- ビルド時間 5-15 分 (cloud or local)
- 頻繁な撮影には不向き
- ストア提出用スクショは EAS Build 推奨

→ **開発中は案 A、ストア提出は案 C**。

### 2.2 実機スクショ撮影手順 (Android Pixel)

```bash
# 前提: 実機 USB 接続 + USB デバッグ承認
# Metro server 起動済 (pnpm dev、別 ターミナル)
# adb reverse tcp:8081 tcp:8081 実行済

# Step 1: 実機で ExpoGo を起動、対象画面を表示
# Step 2: 上記 2.1 案 A で歯車 hide
# Step 3: 実機 Power + Volume Down で物理スクショ
# Step 4: PC に転送
adb pull /sdcard/Pictures/Screenshots/<file.png> ./
```

**コマンド意味**:

- `adb pull <実機パス> <ローカルパス>`: 実機からファイル取得

### 2.3 実機スクショ撮影手順 (iOS、将来)

iOS 実機の場合:

- Side ボタン + Volume Up 同時押しで物理スクショ
- AirDrop / iCloud で PC に転送

---

## 3. R-29 Step 4-5 への参照

PR で「実機/Web スクショを撮影」した後:

- アタッチメント or リンクで PR 本文に貼る
- mockup スクショ (`docs/mockups/v1.0/screenshots/<id>.png`) と並べて Read で目視比較
- 整合性レベル明記 (`docs/reference/integration-criteria.md` 参照)

---

## 4. ストア提出用スクショ (将来、EAS Build で撮影)

将来の `fastlane/screenshots/` 構成:

```
fastlane/screenshots/
├─ ja-JP/  (iOS / Android で各 5-10 枚)
│   ├─ 1_home.png
│   ├─ 2_detail.png
│   └─ ...
├─ en-US/
└─ ... (4 言語)
```

- iPhone 6.7" (1290×2796) / iPhone 5.5" (1242×2208) / Android Phone (1080×1920)
- EAS Build で撮影 (Dev Menu 表示 0)
- Maestro flow で自動化検討 (`maestro/flows/screenshots/`)

---

## 関連

- T1-1 (PR #352) `integration-criteria.md` (整合性レベル定義)
- T1-2 (PR #353) `mockup-screenshots/` (mockup スクショ)
- T1-3 (PR #354) PR テンプレ §7.5 (R-29 5 段階)
- T1-9 (本 PR): 撮影手順統一
- 将来: ストア提出用スクショ自動化 (Maestro + EAS Build)
