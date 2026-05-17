# Sess3 進捗ハンドオフ (2026-05-17)

> **このドキュメントの読み方**: Sess3 (本セッション) で何ができたか、何ができていないかを次のセッション (Sess4) の Claude / 自分が読んで状況を即把握できるようにまとめました。専門用語には「やさしい言い換え」 を併記しています。

---

## 1 行サマリ

Sess3 は **「品質向上 + skip-list 整備」 セッション**に redefine、PR #536 merge。整合済件数は 19 維持 (件数増加なし、品質向上のみ)。MVP 25/39 突破は **Sess4 で R3 (未測定 18 件追加) + R2 (look-back-search 再着手) と組み合わせて達成見込み**。

---

## このプロジェクトのゴール (再確認)

| 名前                 | 意味                         | 値              |
| -------------------- | ---------------------------- | --------------- |
| 最終ゴール           | 全画面 100% 整合             | 39/39 = 100%    |
| MVP (通過点)         | 最低限ストア掲載できるライン | 25/39 = 64%     |
| Sess2 末 (main 反映) | 前セッション最終状態         | 19/39 = 49%     |
| **Sess3 末 (現在)**  | 本セッション末、件数維持     | **19/39 = 49%** |

---

## 進捗バー

```
[████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░] 49% (19/39)
            ↑ 現在地 (Sess2 末から変わらず)
                              ↑ MVP 25/39 = 64% (あと 6 画面)
                                                   ↑ 100%
```

→ MVP まで **あと 6 画面**、本来 Sess4 内で達成見込み (R3 で 6+ 件追加)。

---

## やったこと (Sess3 PR #536、squash commit 334af1f)

### A-1: capture-with-logs.sh 軽量実装 ✅ 完了

**例え話**: ロボット店員が写真撮影する時、**裏で機械の動作音 (= logcat) を全部録音**して、もし撮影失敗したら**店内の見取り図 (= uiautomator dump)** と一緒に「summary レポート」 を自動で作る仕組み。Claude が summary を読むだけで「成功/失敗 + 失敗箇所」 が分かる。

| 項目             | 内容                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ |
| ファイル         | `scripts/ui-diff/capture-with-logs.sh` (新規 78 行)                                        |
| 役割             | `capture-app.sh` の wrapper、Maestro 実行と並行して logcat キャプチャ                      |
| 流用             | `scripts/debug/debug_common.sh` の helper (`run_adb` / `info` / `warn` / `error`)          |
| PoC 結果         | `paywall` flow で動作確認 (summary.md 7 行 / logcat.log 11068 行 / app/paywall.png 104 KB) |
| Sess4 で本格活用 | R-25 評価補助 / R3 未測定 18 件撮影時                                                      |

### R2-a: bonsai-detail-edit-sheet の skip 化 ✅ 完了

**真因**: Issue #439 で **基本情報タブが inline 編集フォームに統合された**結果、「編集ボタン → BonsaiCreateSheet を開く」 設計が廃止された (`e2e_detail_basic_edit_button` 削除、`e2e_detail_basic_save_button` に置換)。`bonsai-detail-basic.yml` (Sess2 で PASS) が同じ画面を撮影しているため**重複**。

**対応**: skip-list.json の `achieved` から削除し `skipped` に移動。Sess4 で SCREEN_PAIRS から削除候補。

### R2-b: look-back-search の skip 化 ✅ 部分対応 (Sess4 で本完成)

**真因**: 検索画面到達 → `@ベランダ` text tag chip tap が Maestro Android で**反応しない** (lessons `maestro-android-limits.md` 既知問題)。

**Sess3 対応**: `e2e_find_recent_tags` の wait 追加 + timeout 15s → 30s に伸長、ただし依然 fail。skip-list `permanent: false` で一旦 skip。

**Sess4 で完成**: testID 経路 (`e2e_find_tag_chip_<id>`) で tap する flow に書き直し。

### R1: home-bulk-sched-work reeval R-25 通過 ✅ 完了

**R-25 構造系 4 項目チェック結果**:

| 項目           | 判定 | 詳細                                                     |
| -------------- | ---- | -------------------------------------------------------- |
| タブ構成       | ✅   | 両方独立 UI、tab なし                                    |
| セクション構成 | ✅   | タイトル + 盆栽 chip + 12 作業 icon grid                 |
| UI 種別        | ✅   | BottomSheet → Screen (ADR-0024 Phase G 意図的変更、許容) |
| スクロール範囲 | ✅   | 両方 scroll 可                                           |

**差分** (許容範囲):

- 盆栽 chip 件数 (mockup 3 / 実機 1、seed data 差)
- 12 作業 icon 文言差 (盆栽業界同義)
- ヘッダー有無 (Screen 化に伴う)

→ `needsReeval: false`、`reevalPassedAt: 2026-05-17T13:25:00Z` 更新

---

## できていないこと (Sess4 で対応)

### MVP 25/39 突破 → Sess4 R3 で達成見込み

Sess3 R1 単独では新規 achieved 化できる flow が 0 件と判明 (= 件数変わらず)。MVP 通過には **未測定 18 件 (R3)** の追加が必須。

未測定 18 件 (mockup あるが SCREEN_PAIRS 未登録):

| 種別            | 件数 | flow 名                                                                                  |
| --------------- | ---- | ---------------------------------------------------------------------------------------- |
| Bonsai 系       | 6    | bonsai-tag-add / bonsai-empty / bonsai-detail-add-action / -add-date / -menu / -pdf-lock |
| Export 系       | 6    | export-hub / -options / -progress / -share / -pdf-single / -pdf-list                     |
| Monetization 系 | 4    | monetization-backup / -archive / -archive-delete / home-ads                              |
| その他          | 2    | (要 audit)                                                                               |

各 flow 撮影 + R-25 評価で **+6 件以上**達成すれば MVP 25/39 通過。

### look-back-search の本完成

Sess4 で `e2e_find_tag_chip_<id>` testID 経路で tap する flow に書き直し。

### Sess4 R3 着手前提

R3 着手前に **B-1 + C-1 で Dev Build + ホットリロード環境**を整える必要 (= 18 flow 新規作成時の開発効率向上)。

---

## Sess4 でやること (順序付き、合計 約 4-5 時間想定)

### Step 1: B-1 環境整備 (Node 22 恒久化) — 30 分

```bash
# user: apt 削除 (sudo 必要)
sudo apt purge nodejs nodejs-doc libnode72

# Claude: nvm default 切替
nvm alias default 22.22.2
sed -i 's/nvm use 20/nvm use 22.22.2/' ~/.bashrc

# 検証
hash -r; which node; node --version  # → /home/doooo/.local/bin/node, v22.22.2
```

**意味**:

- `sudo apt purge nodejs`: Ubuntu 標準の Node 18 (= `/usr/bin/node`) を完全削除
- `nvm alias default 22.22.2`: nvm 起動時のデフォルト Node を v22.22.2 に
- `.bashrc` 修正: ターミナル起動時に Node 22 を選ぶように変更
- `hash -r`: shell の path cache をクリア

### Step 2: C-1 Dev Build 復活 (ホットリロード) — 60-90 分

```bash
# Claude:
# 1. plugins/withCmakeArgs.js 新規作成 (lld 強制)
# 2. eas.json development profile に env: { EXPO_PUBLIC_USE_LLD: "1" } 追加
# 3. app.config.ts で withCmakeArgs を chain
# 4. expo prebuild --platform android --clean
# 5. SKIP_KEYS=1 corepack pnpm <new build:android:dev:local> # 新 script
# 6. APK install (uninstall 経由)
# 7. bash scripts/dev-start.sh で Metro 起動
# 8. ホットリロード動作確認 (テキスト変更 → 1-3 秒で反映)
```

### Step 3: R3 未測定 18 件 SCREEN_PAIRS 追加 + 撮影 + R-25 評価 — 90-120 分

優先度高い 6-8 件から (MVP 突破に必要な分):

- bonsai-empty (盆栽 0 件)
- bonsai-tag-add (タグ追加)
- export-hub (書き出しハブ)
- export-options (書き出し設定)
- monetization-backup (バックアップ)
- monetization-archive (アーカイブ)

各 flow:

1. `scripts/ui-diff/config.ts` の SCREEN_PAIRS に entry 追加
2. `maestro/flows/ui-diff/<flow>.yml` 新規 (\_template.yml 準拠)
3. capture-with-logs.sh で撮影
4. Claude Read R-25 評価
5. skip-list achieved 追記

### Step 4: R2 look-back-search 本完成 — 15-30 分

testID 経路 tap (`e2e_find_tag_chip_<id>`) で flow 書き直し → PASS → skip-list achieved 化。

### Step 5: A-3 capture-with-logs.sh フル版 — 30-45 分

- 起動 verify (APK install 後の自動 boot check)
- R-25 評価補助 (uiautomator dump → 構造系 4 項目を text 比較)
- performance regression 検出 (meminfo / gfxinfo)

### Step 6: R4 R-31 強化 lint — 60 分

`scripts/check-orphan-testid.mjs` 新規:

- 各 Maestro flow file の `id:` 値を抽出
- 実装 (`app/` `src/`) に存在するか確認
- 存在しなければ error 化、`pnpm verify:flow-testid` 組み込み

### Step 7: R5 ADR-0021 Notes Amended — 30 分

- preview-local-apk + seed unlock pattern 明文化
- ホットリロード復活 (Dev Build + preview Build 2 種類使い分け運用)

### Step 8: pnpm verify + commit + PR + merge + Engram — 30 分

---

## ルール厳守 (Sess4 Claude 必読)

| ルール | 内容                                                                   |
| ------ | ---------------------------------------------------------------------- |
| R-13   | /discuss 起動時に質問数 + ラウンド数を冒頭予告                         |
| R-14   | user 「わからない」 発言で専門用語に「やさしい言い換え」 併記          |
| R-17   | 包括承認後も TaskCreate → 計画提示 → 承認 → 実行 の 4 段階             |
| R-19   | mem_save content ≤ 1KB、長文は ADR / Issue 本文                        |
| R-22   | background pnpm verify は EXIT=$? 末尾追記 + grep -E '^EXIT=' で確認   |
| R-25   | 構造系 4 項目評価は Claude Read 主導 (機械判定のみで「達成」 判定禁止) |
| R-31   | 新規 Maestro flow は \_template.yml 準拠 + testID 事前 grep            |

## 半自走モード継続条件 (Sess2/Sess3 と同じ)

- 各 Step 前: 1 文計画提示 + 10 秒待機 (`/tmp/claude-stop.flag` 確認)
- user 「stop」 / 「待って」 で即停止
- scope 大幅変更時は user 再承認待ち
- B-1 の apt purge は user 操作必要 (sudo 必要)

---

## 環境状態 (Sess4 開始時の前提)

| 項目          | 状態                                                                           |
| ------------- | ------------------------------------------------------------------------------ |
| 現在の branch | `main` (Sess3 PR-5 merge 済)                                                   |
| 最新 commit   | `334af1f` Sess3 PR-5 (#536)                                                    |
| 実機          | SX3LHMA362304722 接続済                                                        |
| installed APK | `dist/bonsailog-preview-local.apk` (Sess2 で build、preview-local-apk profile) |
| Metro         | 未起動 (Sess4 Step 2 で dev-start.sh 起動)                                     |
| Node version  | nvm v20.19.6 default (Sess4 Step 1 で 22.22.2 に変更)                          |

---

## 関連 file / Issue / ADR

### Sess3 で改訂した skip-list (Sess4 で参照)

- `scripts/ui-diff/skip-list.json`: skipped 3 件 (look-back-watering-history + bonsai-detail-edit-sheet + look-back-search) / achieved 19 件 (home-bulk-sched-work reeval 通過 + edit-sheet 削除)

### 残 Issue (Sess4-7 で対応)

- Issue #443 (R-25 全 flow 再評価) → Sess3 で 1 件 + 1 件 skip 化、残り Sess4-5
- Issue #510 (bonsai-detail 他タブ R-25) → Sess3 で edit-sheet skip 化対応、残り `bonsai-detail-basic` / `bonsai-detail-timeline` の Stack header 整合
- Issue #502 (look-back-watering-history mockup HTML 不在) → user 領域
- Issue #528 (retro 仕組み化 R-32/R-33 等) → Sess5+

### Sess3 で確認した重大事実

1. **Sess2 撮影 19 件は全部既 achieved (新規 0 件)** → MVP 通過には未測定 18 件追加 (R3) が必須
2. **bonsai-detail-edit-sheet は基本情報タブと統合済、UI 重複** → Sess4 で SCREEN_PAIRS 削除
3. **look-back-search の `@ベランダ` text chip tap は Maestro Android で flake** → testID 経路に変更
4. **home-bulk-sched-work は BottomSheet → Screen 化 (ADR-0024 Phase G)** → R-25 で「意図的変更」 として通過判定

---

## まとめ (Sess2 → Sess3 → Sess4 への流れ)

```
Sess2 (preview-local-apk + seed unlock + 19 SS 撮影)
├ PR #535 merge (Sess1 PR-3 + PR-4 合流)
└ 整合済 10 → 19 (PR-3 合流効果)
   ↓
Sess3 (品質向上 + skip-list 整備、本セッション)
├ PR #536 merge (capture-with-logs.sh + skip-list)
└ 整合済 19 (件数変わらず、品質向上のみ)
   ↓
Sess4 (環境整備 + MVP 突破、次セッション)
├ B-1 Node 22 恒久化
├ C-1 Dev Build 復活 + ホットリロード
├ R3 未測定 18 件追加 (+6 件以上で MVP 25/39 突破)
├ R2 look-back-search 本完成
├ A-3 capture-with-logs.sh フル版
├ R4 R-31 強化 lint
└ R5 ADR-0021 Notes Amended

Sess5+ (残課題)
└ R3 残 12 件 → 100% (39/39) 到達見込み
```

🤖 Sess3 担当: Claude Opus 4.7 (1M context、effort xhigh)
