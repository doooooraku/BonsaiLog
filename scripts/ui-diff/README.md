# scripts/ui-diff/ — UI 差分検出パイプライン

実機 (Android) のアプリ画面と mockups v1.0 (OpenDesign) のお手本 HTML を並べて比較し、
Claude Code が差分を文章化できるようにする。
ADR-0021 Notes Amended (PR #267) で OpenDesign 出力 = `docs/mockups/v1.0/wireframes/` を
Source of Reference として参照する形に切替済。

ADR: [ADR-0021](../../docs/adr/ADR-0021-ui-diff-pipeline.md)

## 前提条件

- WSL2 Ubuntu 24.04 / Node v22.22.2 (`/home/doooo/.local/bin/node` symlink、PATH 先頭に置く)
- pnpm 10.23+ / playwright 1.59+ / sharp 0.34+ / tsx 4.21+
- Maestro CLI: `/home/doooo/.maestro/bin/maestro`
- ADB: `/usr/local/bin/adb` (Windows ADB ラッパー)
- Android 実機 USB 接続 + 認証済 (`adb devices` で `device` 表示)
- ImageMagick `compare` (`/usr/bin/compare`)
- mockups v1.0 (OpenDesign) 正本: `docs/mockups/v1.0/wireframes/` (PR #269 取り込み、凍結保管)

## 使い方

```bash
# 1 画面のみ (PoC は bonsai-tab だけ)
PATH=/home/doooo/.local/bin:$PATH pnpm exec tsx scripts/ui-diff/run.ts bonsai-tab

# 出力確認
ls scripts/ui-diff/out/
cat scripts/ui-diff/out/<latest>/report.md
```

`pnpm ui:diff` のショートカットを `package.json#scripts` に登録するのは PoC 安定後。

## 出力

```
scripts/ui-diff/out/YYYYMMDD-HHMM/
  app/
    <screen>.png             # 実機スクショ (raw)
    <screen>-resized.png     # デザインサイズに合わせたもの
  design/
    <screen>.png             # mockups v1.0 (OpenDesign) HTML を Playwright でレンダリング
  diff/
    <screen>.png                  # ImageMagick compare の差分画像
    <screen>-side-by-side.png     # 設計 | 実機 | 差分 を並べた合成画像
  report.md                  # Markdown レポート (Claude Code が Read で読む)
```

## 4 ステップ

1. **capture-app** (`capture-app.sh`)
   - Maestro flow で対象画面を表示
   - `adb exec-out screencap -p` で実機スクショ取得
2. **capture-design** (`capture-design.ts`)
   - Playwright で chromium-headless 起動 (`--allow-file-access-from-files` 付き)
   - `file://` 経由で対象 HTML を開く (Babel standalone が JSX をブラウザ内コンパイル)
   - `[data-screen-label="01 Home"]` 等のセレクタで該当画面ノードのみスクショ
3. **compare** (`compare.ts`)
   - 実機スクショをデザインサイズにリサイズ (アスペクト保持、washi 色の余白)
   - ImageMagick `compare -metric RMSE` で差分画像 + 数値
   - sharp で side-by-side 合成
4. **report** (`report.ts`)
   - Markdown レポート生成 (画像 5 枚 + 数値 + Claude Code 所見プレースホルダ)

## トラブルシューティング

- **`adb devices` で `unauthorized`**: 実機画面で「USB デバッグを許可」を承認
- **chromium が起動しない**: `pnpm exec playwright install chromium` を再実行
- **Babel が JSX を取得できない (CORS)**: `capture-design.ts` の launch args に
  `--allow-file-access-from-files --disable-web-security` 設定済
- **`compare` が exit code 2**: 画像サイズ不一致。`compare.ts` で sharp のリサイズが効いているか確認
- **Node v18 が引かれて pnpm が文句**: `PATH=/home/doooo/.local/bin:$PATH` を prepend
- **Maestro flow タイムアウト**: `assertVisible` の `timeout` を伸ばす、
  もしくは `waitForAnimationToEnd` を追加

## 比較ペアの追加

`scripts/ui-diff/config.ts` の `SCREEN_PAIRS` に追加 + `maestro/flows/ui-diff/<id>.yml` を新規作成。

ADR-0020 §Decision §3-§10 のマッピング表が候補プール:

- 盆栽詳細 (`detail-screens.jsx Detail*`)
- 予定タブ (`care-screens.jsx CalendarScreen + WiringListScreen`)
- 探すタブ (`care-screens.jsx SearchScreen`)
- 設定タブ (`monetization-screens.jsx Settings*`)
- Paywall (`monetization-screens.jsx PaywallScreen`)
- Onboarding (`screens.jsx`)
- 個別ヒートマップ (`care-screens-v2.jsx HeatmapScreen`)
- 作業記録シート (`care-screens.jsx WorkLogConfirmSheet`)

PoC 安定後にユーザーと相談して 1 画面ずつ追加する (まとめて全画面はしない、
ADR-0021 §Decision §8 / §Initial・変更前提)。
