# UI 自動改善ループ — 学び集約

> **対象**: ADR-0021 ui-diff pipeline + 自動改善ループ運用 (2026-05-11 セッション学び)
> **役割**: 自動化困難なパターン + 既存スクリプト周知 + 運用上の注意点
> **R-24 遵守**: 200 行以内、新規学びは関連 PR 番号付きで追記
>
> ⚠️ **退役注記 (2026-06-12 Sess103 監査)**: ui-diff 自動改善ループは ADR-0059 で退役済み。`scripts/ui-diff/` / `docs/how-to/ui-diff/` / `scripts/maestro-flow-lint.mjs` は削除済みのため、§2-2 / §2-3 / §3 / §6 のコマンド・リンクは実行不可 (歴史記録として温存)。**§1 Maestro Android 技術制約と §2-1 `i18n:add-key` は現役**。UI 整合の現行標準 = 写経駆動 R-29 + `/device-verify` (ADR-0059)。

---

## 1. Maestro Android 技術制約 (3 種、永続 skip 確定)

本セッションで判明した Maestro Android の限界。これらに該当する flow は **skip 永続化** を即決可能。

### 1-1. inputText 日本語非対応

- **症状**: `inputText: '黒松'` で `UnicodeNotSupportedError`
- **原因**: Maestro Android は `adb shell input text` 経由で文字入力、ASCII のみ対応
- **回避**:
  - 検索系 flow は **tag chip タップ** や **空クエリ + 検索ボタン** で代替 (ただし下の 1-2 に注意)
  - または **scientific name (英語)** を入力 (例: `Pinus thunbergii`)
- **適用**: look-back-search flow (技術制約 skip)

### 1-2. Pressable / TextView 階層タップ問題

- **症状**: `tapOn: text: '@ベランダ'` で TextView を tap → 親 Pressable の onPress 発火しない
- **原因**: Maestro が最 inner element (TextView class=android.widget.TextView, clickable=false) を tap、外殻 Pressable に伝播しないケース
- **回避**:
  - **testID で直接指定** (`tapOn: id: 'e2e_xxx'`) を最優先
  - 座標タップ (`point: 50%,30%`) はさらに脆弱、新規 flow では **使わない** (`scripts/maestro-flow-lint.mjs` で WARN 検出)
- **適用**: look-back-search flow (代替手段なしで永続 skip)

### 1-3. BottomSheet 88% snap 直後の描画ラグ

- **症状**: BulkScheduleDateSheet (snap 88%) 開いた直後、Footer CTA (testID e2e_bulk_schedule_save_cta) が `extendedWaitUntil timeout 8s` で visible にならない
- **原因**: @gorhom/bottom-sheet の sheet snap 直後、 React Native の描画が遅延、Maestro が UI tree から要素を見つけられない
- **回避**: なし (8s timeout でも検出不能、長くしても改善せず)
- **適用**: home-bulk-sched-date flow (技術制約 skip)

---

## 2. 既存スクリプト周知 (新規作成前に確認)

R-9 (既存ドキュメント先読み) 違反防止のため、ui-diff loop で使う既存スクリプトをまとめる。

### 2-1. i18n 19 言語追加

```bash
# 既存スクリプト (NOT 新規作成)
pnpm i18n:add-key <keyName> '<English value>'
pnpm i18n:add-key <keyName> '<English value>' --ja '<日本語>'
```

- ファイル: `scripts/i18n-add-key.mjs`
- 動作: en.ts + 17 言語に英語フォールバック追加、--ja で日本語上書き
- 既に存在する key は skip (idempotent)
- **本セッション学び**: 知らずに `i18n-add.mjs` を新規作成しかけた → 削除済。次回は **先に grep して確認**

### 2-2. ui-diff loop CLI

```bash
node scripts/ui-diff/kill-switch.mjs         # 停止フラグチェック
node scripts/ui-diff/auto-revert.mjs <flow>  # RMSE 悪化検知 + git revert
pnpm exec tsx scripts/ui-diff/run.ts <flow>  # 1 サイクル試走
pnpm exec tsx scripts/ui-diff/summary.ts     # SUMMARY-loop.md 再生成
```

### 2-3. Maestro flow lint

```bash
pnpm verify:maestro                          # maestro-flow-lint 実行
node scripts/maestro-flow-lint.mjs           # 直接実行
```

WARN (Retro-C で追加):

- `ui-diff/` 配下で Continue dismiss step 無し → 警告
- `point: N%,M%` 座標タップ → 警告

---

## 3. skip-list 判定の精度管理 (Retro-A/D/E)

### 3-1. status フィールド運用

- `provisional`: 初回試走で skip (再評価対象)
- `confirmed`: 3 回試走後 skip (永続)
- 省略時: `permanent` から推定 (後方互換)
- 自動更新: `run.ts` の main().catch() で fail_count 加算、3 回到達で confirmed 昇格

### 3-2. 誤判定の再評価フロー

本セッションで「skipped → 実は achievable」が複数発生 (bonsai-detail / home-bulk-sched-work)。
再評価手順:

1. SUMMARY-loop.md で `provisional` 件数を確認
2. 該当 flow の実装を Explore agent で精査 (R-27)
3. 必要なら flow 改修 (scrollUntilVisible / text マッチ等)
4. 再キャプチャ → achievable なら skip-list.achieved へ移行

---

## 4. 半自走モードの実用知識

### 4-1. 「ループ開始」の意味と再開タイミング

- ユーザーが `ループ開始` と入力 = ScheduleWakeup が動かない場合の手動再開
- background task 完了通知 (task-notification) は自動届く、ScheduleWakeup は不確実
- **推奨**: 長い処理は `run_in_background: true` で task 化、完了通知主体

### 4-2. 10 秒承認モード

- 各 PR 前に 1 文計画 + `sleep 10` で待機 → ユーザー応答なし = 暗黙承認
- ユーザー「stop」「待って」で即停止 (CLAUDE.md UI Diff 自動改善ループ運用ルール参照)

---

## 5. Sess5 学び 4 件 (2026-05-17、 PR #538 + #539)

### 5-1. pairing-report v2 構造 bug 4 件 (PR #538 で一括修正)

1. **`achieved.artifact` 固定参照 bug**: reeval 後の最新 SS が表示されない、 整合済 19 件全件影響。修正: `reevalArtifact \|\| artifact` 優先順位
2. **`<artifact>/app/<id>.png` subdir 探索不足**: `capture-app.sh` 新形式 (subdir 保存) 対応漏れ。修正: `app/` subdir も探索
3. **CSS `max-height: 600px` 縦長画像圧縮 bug**: 720x3600 が横幅 120px に圧縮。修正: max-height 撤廃
4. **R-1 verification 漏れ事故 2 回**: 「✅ 生成完了」 のみで Claude 自身が Read で目視せず、 user に二度手間。修正: SS 反映確認 log を生成 script に追加 (構造化防止)

### 5-2. multi-page 撮影 + ImageMagick 連結パターン (PR #538)

- 詳細: `docs/how-to/ui-diff/multipage-capture-pattern.md`
- 720x1520 swipe 値: `360 1280 360 820 800` = 約 4 行 scroll が最適
- ImageMagick crop: Header 350 px + CTA 上端 1280 px が安全 cut

### 5-3. ICON_FALLBACK 脱却パターン (PR #539)

- 🔔 emoji → outline SVG 置換は welcome.tsx LeafIcon パターン踏襲で簡単
- viewBox 64x64 + stroke BRAND_GREEN + strokeWidth 2.5
- meta.icon === 'bell' 分岐で他 icon は ICON_FALLBACK 維持

### 5-4. 文言短縮で改行不自然問題を構造的解消 (PR #539)

- paddingHorizontal / fontSize 調整より文字数調整が現実解 (画面サイズ依存問題回避)
- 例: Title 18→16 文字、 Body 54→18 文字で 720x1520 不自然改行完全解消
- R-3 品の良さ + 4 ペルソナ ✕ なし

---

## 6. 関連

- ADR-0021 (UI 差分検出パイプライン、本ループの母体、 Sess5 Notes Amended あり)
- ADR-0020 §画面マップ (整合判定の比較対象定義)
- `.claude/recurrence-prevention.md` R-1 (Sess5 拡張: pairing-report 等のレポート系も適用) / R-25 / R-27 / R-29
- `docs/reference/integration-criteria.md` (レベル 2 達成基準)
- `docs/how-to/ui-diff/screen-integration-loop.md` (8 step ループ標準手順、 Sess5 PR-3 で新規)
- `docs/how-to/ui-diff/multipage-capture-pattern.md` (multi-page 撮影専用、 Sess5 PR-3 で新規)
- 関連 PR: #391 / #409 / #417 / #418 / #538 (Sess5 PR-1) / #539 (Sess5 PR-2) / #<TBD> (Sess5 PR-3)
