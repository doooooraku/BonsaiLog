# ADR-0021: UI 差分検出パイプライン (実機 vs ClaudeDesign)

- Status: Accepted (**Initial — 初期版、実機 PoC の結果で方式変更ありうる**)
- Date: 2026-05-06
- Deciders: @doooooraku
- Related: ADR-0020 (Claude Design 全面採用 / 比較ペア定義の出典) / ADR-0019 (Superseded by ADR-0020) / ADR-0011 (記録のみ哲学、UI 差分検出には関与せず) / `scripts/store-screenshots/` (Playwright 思想の前例) / ClaudeDesign 正本 `C:\Users\doooo\Downloads\BonsaiLog_template\`

---

## Context（背景：いま何に困っている？）

- **現状**: ADR-0020 で Claude Design を 100% 全面採用 (Phase 0-12、10 PR #228-#238) したが、**実装と デザインの差分検出は人手のみ**。ユーザーが実機 (SH_M25 / Android 14) で SS を確認 → 「テンプレ残骸」「文字見にくい」「ヒートマップ違う」等を指摘 → Claude Code が修正、というループが Phase 0-12 を通じて繰り返された。
- **困りごと**:
  - ユーザーが毎回実機チェックする手間が大きい
  - Claude Code に「目」がないため、自分で実装結果を確認できず、ユーザー指摘を待つ非対称性
  - 視覚回帰の**客観的記録が無い** (どの PR で見た目がどう変わったか追跡不能)
- **制約/前提**:
  - ClaudeDesign 正本 = `C:\Users\doooo\Downloads\BonsaiLog_template\` (HTML 6 + JSX 9 + `tokens.css`、WSL から `/mnt/c/...` で直接アクセス可)
  - 既存 `scripts/store-screenshots/` に Playwright + Maestro でスクショを撮る思想のコードが既存 (ストア掲載合成用、未インストール状態)
  - `maestro/flows/` 21 flow 既存 (smoke / bonsai-list / paywall-to-purchase 等) だが `takeScreenshot` 命令は **どの flow でも未使用**
  - adb は WSL2 経由で Windows ホストの adb.exe をラッパ参照 (`/usr/local/bin/adb`)、実機 1 台 (`SX3LHMA362304722`) authorized 接続中
  - ImageMagick `compare` (`/usr/bin/compare`) 利用可
  - chromium / Chrome は WSL に未インストール
  - Node v22.22.2 は `/home/doooo/.local/bin/node` に symlink 既存 (PATH 先頭に置けば引ける、`pnpm verify:config` 既知制約)
- **発見**: ADR-0020 §Decision §3-§10 に **「実装画面 ⟷ ClaudeDesign 正本」のマッピング表が明記済**。これがそのまま比較ペア定義に使える。

---

## Decision（決めたこと：結論）

- **決定**:
  1. **`scripts/ui-diff/` に独立した差分検出パイプラインを構築** (`scripts/store-screenshots/` とは目的が違うため別ディレクトリ)
  2. **実機側スクショ取得 = Maestro flow + adb pull** (`maestro/flows/ui-diff/<screen>.yml` で `takeScreenshot` 命令 + 画面遷移、Maestro CLI は `/home/doooo/.maestro/bin/maestro` 既存)
  3. **デザイン側スクショ取得 = Playwright + chromium-headless** で `C:\Users\doooo\Downloads\BonsaiLog_template\` の HTML をレンダリング (`scripts/store-screenshots/generate.ts` と同様の Playwright 起動コードを流用)
  4. **比較 = ImageMagick `compare`** で diff 画像 + 数値出力、加えて Claude Code が Read で読める **Markdown レポート** に集約
  5. **出力 = `scripts/ui-diff/out/YYYYMMDD-HHMM/`** に保存、`.gitignore` 追記で git に入れない (毎回大量に画像が生成されるため)
  6. **比較ペア = ADR-0020 §Decision §3-§10 マッピング表** (9 画面、`scripts/ui-diff/config.ts` に集約)
  7. **PoC は盆栽タブから** (`app/(tabs)/bonsai/` ⟷ `home-screens.jsx HomeScreen`)
  8. **段階的拡張**: 1 画面 PoC 動作確認 → ユーザーと相談して次の対象画面と順序を決定 → 1 画面ずつ追加 (**まとめて全画面拡張はしない**)
  9. **CI 組み込みは当面なし** (実機が必要、まず手元で安定させる、慣れたら検討)
  10. 進め方は **R-17 4 段階厳守** (TaskCreate → 計画提示 → 承認 → 実行)、**Step ごとにユーザー確認を入れる**
- **適用範囲**: 開発手元のみ (CI / ストア提出物 / リリースビルドには影響なし)、Free / Pro 両方、Android 実機優先 (iOS / Web は将来検討)

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1**: **ユーザーの実機チェック手間を最小化** — Phase 0-12 で繰り返されたループのコストを下げる
- **Driver 2**: **既存資産の活用** — Maestro flow 21 本、ADR-0020 マッピング表、`scripts/store-screenshots/` の Playwright 思想
- **Driver 3**: **道具追加を最小に** — 追加は `playwright` + `sharp` + `tsx` の 3 つだけ + chromium 本体 150MB
- **Driver 4**: **段階的に動かして安定させる** — CLAUDE.md §5「3 ステップ以上のタスクは計画を立てて確認」、R-17 4 段階厳守
- **Driver 5**: **初期段階で変更前提** — 本 ADR は最初の試行。実機 PoC で問題が見つかれば方式は変える。固定化しない

---

## Alternatives considered（他の案と却下理由）

### Option A (採用): Maestro + Playwright + ImageMagick

- **概要**: 上記 Decision §1-§10 の通り
- **良い点**: 既存資産最大活用、追加道具最小、Claude Code が両画像を Read で見られる
- **悪い点**: chromium 150MB DL、Native と Web レンダリングの差が完全には埋まらない (Skia / native list / status bar は Web 側で再現できない)

### Option B: 既存 `scripts/debug/debug_session.sh` を活用 (人が手動操作)

- **概要**: ユーザーが実機を手動操作している間に before.png / after.png を取得、デザイン側は別途
- **良い点**: 既存スクリプトそのまま、追加道具ゼロ
- **悪い点**: 自動化されない、ユーザーの手間が減らない (本 ADR の主目的に反する)
- **却下理由**: 「Claude Code が自分で目を持つ」というゴールに到達しない

### Option C: adb 直書きスクリプト (`am start` + `screencap` を for ループ)

- **概要**: Maestro を使わず、adb 単独で各画面を開いてスクショ
- **良い点**: 軽量、依存最小
- **悪い点**: 画面遷移ロジック (タップ / 待機 / 条件分岐) を全部自前で書く必要、Maestro 21 flow の testID 資産が使えない
- **却下理由**: Maestro 既存資産を捨てる合理性が無い

### Option D: Windows 側 Chrome を `--headless` で叩く (Playwright 不採用)

- **概要**: Windows に既存の Chrome を WSL から `/mnt/c/...` 経由で起動
- **良い点**: 150MB DL 不要
- **悪い点**: WSL→Windows のパス変換問題、Chrome バージョン非固定 (将来更新で動かなくなるリスク)、`scripts/store-screenshots/` の Playwright 想定と二重メンテ
- **却下理由**: `scripts/store-screenshots/` で既に Playwright 前提のコードがあり、二重投資を避ける

### Option E: react-native-web を Playwright で開く (Web 版を比較対象に)

- **概要**: `pnpm web` で起動した Web 版を Playwright でスクショ、デザイン HTML と並べる
- **良い点**: 実機不要
- **悪い点**: Native 専用 UI (Skia ヒートマップ / native list / status bar / safe-area) が Web 版で再現されないため、比較対象として不適切
- **却下理由**: 本 ADR の目的 (実機の見た目とデザインを比べる) を達成できない

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- Claude Code が自律的にデザイン差分を検出 → 自分で修正のループが回せる
- ユーザーの実機チェック頻度が下がる (完成時 / 重要マイルストーン時のみ)
- 視覚回帰の客観的記録 (Markdown レポート + diff 画像) が PR ごとに残る
- ADR-0020 マッピング表との整合検証が半自動化される
- 将来的に CI に組み込めば PR 時の視覚回帰を自動検出できる (本 ADR 範囲外、要追加 ADR)

### Negative（辛い/副作用）

- パッケージ追加 3 つ (`playwright` / `sharp` / `tsx`) + chromium 150MB DL
- 実機 USB 接続が必須 (オフラインや出先では使えない)
- Native と Web レンダリングの差は完全には埋まらない (Skia / native list / status bar / safe-area)
- ImageMagick `compare` は色管理 (sRGB ICC) やサブピクセル差に敏感、閾値調整が必要
- Maestro flow を画面ごとに追加するメンテコスト

### Initial / Subject to Revision（初期版・変更前提）

本 ADR は **最初の試行版** であり、以下の状況で方式変更ありうる:

- **PoC で動作不安定**: Maestro → adb 直叩き、Playwright → Windows Chrome 等の代替案を再検討
- **比較精度が不足**: ImageMagick `compare` → odiff / pixelmatch / LLM Vision 主体への切り替え
- **出力フォーマットが Claude Code に読みづらい**: Markdown → JSON + 構造化スキーマへ変更
- **実機 1 台では不足**: Android Studio Windows emulator 併用、ADR 改訂で対応

### Follow-ups（後でやる宿題）

- [ ] **Step 2**: `pnpm add -D playwright sharp tsx` (約 150MB DL 含む、ユーザー OK 取得済 2026-05-06)
- [ ] **Step 2**: `npx playwright install chromium`
- [ ] **Step 3**: `scripts/ui-diff/` にスクリプト群作成 (config / capture-app / capture-design / compare / report / run)
- [ ] **Step 3**: `maestro/flows/ui-diff/bonsai-tab.yml` 作成 (盆栽タブ用 takeScreenshot flow)
- [ ] **Step 3**: `.gitignore` に `scripts/ui-diff/out/` 追加
- [ ] **Step 4**: 盆栽タブ 1 画面 PoC (`pnpm ui:diff bonsai-tab` 等) 動作確認、Markdown レポート手動レビュー
- [ ] **Step 5 (条件付き、PoC 安定後)**: ユーザーと相談して次画面拡張順序決定、1 画面ずつ追加
- [ ] **Step 5 完了後**: `docs/reference/lessons/` または `docs/how-to/development/` に運用 lesson 追記
- [ ] **将来検討 (本 ADR 範囲外)**: CI 組み込み、iOS 対応、emulator 併用、odiff / LLM Vision 移行

---

## Acceptance / Tests（合否：テストに寄せる）

- **正 (自動テスト)**: なし — 視覚回帰は半自動 (機械的に diff を生成、最終判定は Claude Code + ユーザー)
- **手動チェック (PoC 完了の合否基準)**:
  - **手順**:
    1. Android 実機を USB 接続、`adb devices` で `device` (authorized) を確認
    2. `pnpm ui:diff bonsai-tab` (もしくは同等コマンド) を実行
    3. 出力 `scripts/ui-diff/out/<timestamp>/` を確認
  - **期待結果**:
    - `app/bonsai-tab.png` (実機スクショ) が生成される
    - `design/bonsai-tab.png` (ClaudeDesign スクショ) が生成される
    - `diff/bonsai-tab.png` (差分可視化画像) が生成される
    - `report.md` に画像 3 枚へのリンク + 数値差分 + Claude Code の文章所見が含まれる
    - Claude Code が `Read` で `report.md` と画像を参照して「ここの色が違う」「ここのフォントが違う」等を文章化できる

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**: なし (開発手元のみ、ストア提出物 / リリースビルドに含まれない)
- **ロールバック方針**:
  - `scripts/ui-diff/` ディレクトリ削除
  - `maestro/flows/ui-diff/` ディレクトリ削除
  - `package.json` から `playwright` / `sharp` / `tsx` を削除 → `pnpm install`
  - `.gitignore` から `scripts/ui-diff/out/` 削除
  - 本 ADR を Status: Rejected に変更、理由を Notes に追記
- **検知方法**: PoC で「Maestro が起動しない」「Playwright が chromium を起動できない」「diff 画像が生成されない」等を観測、ユーザーが「使えない」と判定したら ADR 改訂 → 別案へ移行

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` (関連: §1-4 記録のみ哲学、§ パッケージマネージャ pnpm 必須)
- reference:
  - `docs/reference/design_system.md` §2 (tokens / Noto / 角丸 = ClaudeDesign `tokens.css` の正)
  - `docs/adr/ADR-0020-claude-design-full-adoption.md` §Decision §3-§10 (マッピング表)
- ClaudeDesign 正本: `C:\Users\doooo\Downloads\BonsaiLog_template\` (WSL から `/mnt/c/Users/doooo/Downloads/BonsaiLog_template/`)
  - HTML 6: Care / Export / Home and Management / Monetization / Onboarding / standalone
  - JSX 9: care-screens / care-screens-v2 / create-screens / detail-screens / export-screens / home-screens / ios-frame / monetization-screens / screens
  - CSS: tokens.css
- 既存基盤: `scripts/store-screenshots/` (`generate.ts` の Playwright 起動部分を流用予定)
- Maestro: `maestro/flows/` 21 flow (`smoke.yml` 等、testID 資産流用予定)
- adb wrapper: `/usr/local/bin/adb` (Windows ADB 経由)
- Maestro CLI: `/home/doooo/.maestro/bin/maestro` (PATH 未追加、絶対パス起動)
- Node v22: `/home/doooo/.local/bin/node` → `/home/doooo/.nvm/versions/node/v22.22.2/bin/node`
- package.json: 追加予定 → `playwright` / `sharp` / `tsx`

---

## Notes（メモ：任意）

### ファイル配置案 (Step 3 で確定)

```
scripts/ui-diff/
  README.md                  # 使い方 (簡潔版)
  config.ts                  # 比較ペア定義 (ADR-0020 マッピング表)
  capture-app.sh             # Maestro flow 実行 + adb pull
  capture-design.ts          # Playwright で HTML レンダリング → スクショ
  compare.ts                 # ImageMagick compare
  report.ts                  # Markdown レポート生成
  run.ts                     # CLI エントリ
  out/                       # スクショ + diff + レポート (.gitignore)
    YYYYMMDD-HHMM/
      app/<screen>.png
      design/<screen>.png
      diff/<screen>.png
      report.md

maestro/flows/ui-diff/
  bonsai-tab.yml             # 盆栽タブ巡回 + takeScreenshot
  (将来) bonsai-detail.yml, plan-tab.yml, find-tab.yml, settings-tab.yml,
        paywall.yml, onboarding-welcome.yml, watering-heatmap.yml,
        work-log-confirm.yml
```

### 想定使用方法 (Step 3 で確定)

```bash
# 全画面 (将来)
pnpm ui:diff

# 1 画面のみ (PoC)
pnpm ui:diff bonsai-tab

# 出力確認
ls scripts/ui-diff/out/   # YYYYMMDD-HHMM/ ディレクトリ
cat scripts/ui-diff/out/<timestamp>/report.md
```

### 本 ADR の位置づけ

- **これは初期版**。ADR-0020 が「Claude Design 全面採用」の意思決定だったのに対し、本 ADR-0021 は「その採用が正しく実装できているかをセルフチェックする仕組み」の意思決定。
- 内容は実装が進むに従って変える。固定化しない。
- 大きな方針変更が起きたら ADR-0021 を Status: Superseded by ADR-XXXX に変更し、別 ADR を起票する (ADR-0019 → 0020 と同じ作法)。

### Notes Amended (2026-05-08)

#### OpenDesign 出力を視覚比較入力に切替可能化

- 2026-05-07 議論 (R-16 改訂 / R-28 新設 / ADR-0020 Notes Amended) により、視覚比較パイプラインの入力 (デザイン側) を以下から選択可能とする:
  - **(a) ClaudeDesign 正本** (`C:\Users\doooo\Downloads\BonsaiLog_template\` = 既存) — v1.0 整合点の保全
  - **(b) OpenDesign 採用版** (`docs/mockups/v1.0/<screen>/index.html` = 新規) — UI 進化追従
- `scripts/ui-diff/config.ts` の `DESIGN_ROOT` を環境変数 `BONSAI_DESIGN_SOURCE=claudedesign|opendesign` で切替可能化 (将来実装、本 ADR 範囲外)
- `docs/mockups/v1.0/` 運用:
  - OpenDesign で生成した HTML を採用判定後にコピー保管 (`~/04_app-factory/open-design/.od/artifacts/<ts>/index.html` → `docs/mockups/v1.0/<screen>/index.html`)
  - README で「v1.0 採用版の凍結保管」「以後の差分は git log で追跡」を明記
  - 画面ごとに 1 ディレクトリ (`bonsai-detail/` / `paywall/` 等)
- 関連: R-16 改訂 / R-28 新設 (PR #266) / ADR-0020 Notes Amended (PR #267) / `docs/mockups/v1.0/README.md` (本 PR で新規)
