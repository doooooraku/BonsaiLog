# docs/how-to/testing.md

# Testing（CIと同じようにテストして、落ちたら直す）

この文書は **How-to（やり方）** です。  
「なぜこのテストが必要か」は Explanation / ADR 側に寄せます。  
ここでは **“どうやってテストを回して合否を見るか”** だけを扱います。

---

## 0. この文書はいつ使う？

- PRを出す前（最低限ここに書いてあるテストを通す）
- CIが落ちたとき（どこを見て、どう再現するか）
- 受け入れ条件を「実行できる仕様」に寄せたいとき（テストを追加したいとき）

---

## 1. まず「どこが正（source of truth）か」を固定する

### 1.1 正（source of truth）

- **CIで実行される順番**：`.github/workflows/ci.yml`
- **実行コマンドの定義**：`package.json` → `scripts`

scripts（例）：

- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`（Maestro smoke）
  ※ 型チェックを使う場合は `type-check` を scripts に追加する

> How-to は「コマンド暗記」より  
> **“ここを見れば最新版”** を固定してリンクする方がズレません。

---

## 2. 最短ルート：まずは「CIと同じ3つ」

PR前に最低限これを通します（CIでも必ず走る）。

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
```

（型チェックを運用している場合）

```bash
pnpm type-check
```

> もし「まだテストが1本も無い」状態なら  
> まずは **最低限のテストを1本追加**するのが本筋。  
> どうしても今は難しい場合だけ、**一時措置として**  
> `pnpm test -- --passWithNoTests` を使う（CIも同様）。  
> ※ テストが追加されたら **必ず元に戻す**

### コマンドの意味（初心者向け）

- `pnpm install --frozen-lockfile`
  - 依存関係（ライブラリ）を入れる
  - `--frozen-lockfile` は「lockfileと矛盾したら失敗する」安全モード
    → CIと同じ状態になりやすい

- `pnpm lint`
  - ESLintで「書き方のルール違反」を見つける（早い・安い）

- `pnpm type-check`（scriptsにある場合）
  - TypeScriptの型チェック（実行しなくてもバグを見つける）

- `pnpm test`
  - Jestで自動テスト（仕様の合否を機械が判定）

---

## 3. E2E（必要なときだけ）：Maestro smoke

このテンプレートには E2E の入口として `test:e2e` が用意されています。

```bash
pnpm test:e2e
```

### 3.1 何が起きる？

- Maestro が `maestro/flows/smoke.yml` を実行
- アプリを起動して、最低限の操作ができるかを確認する（スモークテスト）

### 3.1.1 セットアップ後の確認

- `maestro/flows/smoke.yml` の `appId` は BonsaiLog の bundle ID（`com.dooooraku.bonsailog`）に置換済み
- E2Eで使う `testID` が実装側にあるか確認する（無ければ追加）

### 3.2 ここが注意（詰まりやすい）

- 端末/エミュレータが必要
- 初回は Maestro のインストールが必要になることがある
- CIでは条件付きで走る設定になっている場合がある（SecretsやAPKの有無）

---

## 4. CIが落ちたときの「調査の順番」

落ちたら、焦らずこの順番で見ると速いです。

### 4.1 まず GitHub Actions のログを見る

- どのジョブが落ちた？（Lint / Type Check / Test / E2E）
- どのステップで落ちた？

### 4.2 ローカルで同じコマンドを叩いて再現

CIが落ちたステップだけを、まずローカルで叩く：

- Lintで落ちた → `pnpm lint`
- 型で落ちた → `pnpm type-check`（運用している場合）
- Jestで落ちた → `pnpm test`
- E2Eで落ちた → `pnpm test:e2e`

---

## 5. 典型パターン別：直し方（超実用）

### 5.1 Lint（eslint）で落ちる

- よくある原因
  - unused 変数
  - import順
  - hooksの依存配列

- 対処
  1. エラー行を見る
  2. ルールに合わせて直す
  3. もう一回 `pnpm lint`

---

### 5.2 type-check（tsc）で落ちる（運用している場合）

- よくある原因
  - 型が合ってない
  - null/undefined を考慮してない
  - import先が間違ってる

- 対処

1.  最初のエラーから直す（連鎖するから）
2.  直したら `pnpm type-check`（運用している場合）

---

### 5.3 Jest（pnpm test）で落ちる

- よくある原因
  - 期待値が変わった（仕様変更）
  - モック不足（依存が多い）
  - 非同期処理の待ち不足

- 対処
  1. 失敗しているテスト名を見る
  2. “何が期待で、実際は何だったか” を読む
  3. 仕様が正しいならテストを直す / 仕様が違うならコードを直す
  4. `pnpm test` 再実行

---

## 6. 「テスト仕様を実行できる仕様に近づける」と整合が保たれる理由（超かみ砕き）

※ここだけ少し Explanation っぽいけど、理解に必須なので最小限で。

### 6.1 たとえ話

- 仕様書が「ノート」だと、書き忘れる（更新漏れする）
- テストが「自動採点機」だと、間違うと必ず赤点（CIが落ちる）

つまり、

- 仕様（合格条件）をテストにすると
  **守れてない瞬間に“必ず止まる”**
  → “勝手に整合が保たれる” の正体はこれです

### 6.2 実務での形

- Issue の受け入れ条件（Acceptance Criteria）
  ↓
- Jest / Maestro のテスト
  ↓
- CI が自動で実行して合否を判定
  ↓
- 落ちたらマージできない（ブランチ保護）

---

## 7. 新しいテストを追加するときの最小ルール

- バグ修正：**再発防止のテスト** を1つ足す
- 機能追加：**受け入れ条件がチェックできるテスト** を足す
- E2E：壊れやすいので「本当に価値があるところ」だけ（スモークから）

---

## 8. 最後のチェックリスト（PR前）

- [ ] `pnpm lint` OK
- [ ] `pnpm type-check` OK（運用している場合）
- [ ] `pnpm test` OK
- [ ] 必要なら `pnpm test:e2e` OK
- [ ] 受け入れ条件が満たされた（PR本文に証拠を書く）

---

## 9. 実機 adb 操作の制約（Claude Code 主導の実機検証）

> Claude Code が adb で実機 (Dev Build) を直接操作して検証するときの既知の制約。
> Doc-Truth Audit P2 (2026-06) で「全セッション通算 687 回 `adb shell input` が使われているのに常設手順が無い」と判明し、memory の知見を本節へ昇格 (出典: bonsailog-adb-verify-constraints / maestro-android-limits)。
> 前提スクリプト: `scripts/dev/reload-app.sh` (Metro 反映) / `scripts/dev/take-ss.sh` (SS 撮影、CRLF 罠回避)。

### 9-1. テキスト入力 (`adb shell input text`)

- **日本語 (非 ASCII) は入力不可**: `input text "黒松"` → NullPointerException。日本語検証は (1) 検索履歴タップ (2) タグ chip (3) `seedTestDataEn()` で英語 seed 投入 + ASCII 入力、で代替する。
- **連続 input は onChangeText を取りこぼす**: 一括投入すると native field だけ進み React state が更新されない (検索が走らない偽バグに見える)。**1 文字ずつ `input text` + 0.5〜0.7s sleep** で確実に発火させる。
- **日本語 IME (あ) モードは小文字ローマ字を「かな」に合成する**: `"morning"` → `"もrに"` に化ける。確実なのは Gboard を **ABC (英字) モードに切替**してから入力。大文字始まり ("Pine") は合成回避される応急策あり。

### 9-2. キー操作

- **BACK (`keyevent 4`) は画面自体を閉じる** (キーボードだけ閉じない)。入力後に押さない。
- tap 座標は SS 目視でなく **`uiautomator dump` で取得** する (BottomCtaBar と TabBar の境界 ±50px で誤 tap 事故例あり)。

### 9-3. Maestro の既知制約 (該当 flow は skip 判断可)

1. **inputText 日本語非対応** (UnicodeNotSupportedError) — adb input text 経由のため
2. **Pressable/TextView 階層 tap 問題** — text 指定 tap は最内 TextView に当たり親 Pressable が発火しない → **testID (`id: 'e2e_xxx'`) 直接指定を最優先**
3. **BottomSheet snap 直後の描画ラグ** — `extendedWaitUntil` timeout を見込む

### 9-4. プロセス再起動の罠

- WSL2 で `pkill` / `kill` が **exit 144** を返しても実害なしのことが多い (継続可)。adb daemon が stuck したら Windows 側を `taskkill /F /IM adb.exe` で殺してから `adb start-server` (詳細: `docs/reference/tasks/lessons/wsl2-mobile.md`)。
- adb 系コマンドは **foreground 直列** で実行する (background 並列は daemon ロックの原因)。

## 10. 実機検証・SS 撮影時のテーマ固定 (Sess95 PR-5 〜)

> **背景**: 2026-06-10 (Sess95 PR-5) で `themeMode` の初期値を `'light'` → `'system'` (OS 追従、テスター要望 + 業界標準) に変更した。OS がダークの端末では **新規 install / clearState 後の初回起動がダークになる**。実機検証や SS 撮影 (mockup 比較・store 用) はライト前提の手順が多いため、以下を必ず実施する。

### 手順 (検証セッション開始時に 1 回)

1. アプリ起動 → 設定タブ → 「テーマ」 row (`e2e_theme_mode_row`) → **「ライト」を明示選択**
   - zustand persist で永続化されるため、以後の再起動・reload でもライト固定が維持される
2. ダークモード検証 (R-60 の dark SS 等) をする時だけ「ダーク」へ切替え、**終了時にライトへ戻す**
3. テーマ起因の表示差を疑う bug 報告を検証する時は、まず現在の実効テーマを SS で記録してから切替える

### 注意

- 既存 install は persist 済みの themeMode が維持される (= この default 変更の影響は新規 install のみ)
- Maestro flow は testID 駆動でテーマ非依存のため対応不要 (色 assert を追加する場合のみ本節を参照)
