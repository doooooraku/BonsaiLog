---
name: ui-fix
description: UI 修正依頼の一気通貫 — path 正規化 + screen-id 同定 + mockup 取込 + ASCII 図差分 + 写経 5 段階 + /device-verify 連結。 画像 path + 1 行意図で起動。
user-invocable: true
argument-hint: '[<画像 path 1+件> "<1 行意図>"]'
---

# /ui-fix — UI 修正依頼の一気通貫 Skill

UI の崩れ・寄せ・改善を「実機 SS 1+ 枚 + 1 行の意図」だけで実装に橋渡しする Skill。
Notion 215 prompts 分析 (Sess108) で UI 修正 + 画像添付は全 prompt の 43% (= 93 件、最頻パターン)。
平均 200-400 字のテンプレ冒頭文 (= path 提示・screen 説明・mockup 参照宣言) を 1 行に圧縮し、
**screen-id 同定 → mockup 取込 → ASCII 差分 → 写経 5 段階 (R-29) → /device-verify** までを定型化する。

## このスキルが呼ばれる条件

- `/ui-fix /mnt/c/.../foo.png "タグ画面の余白を狭めて"` のように引数で起動
- user が「この画面の見た目を寄せて」「mockup に合わせて」「SS 添付 + 1 行依頼」した時
- UI 崩れ・mockup 整合・design token ずれ・配置ずれの指摘 (画像 path 添付あり)

## やってはいけないこと

- **この Skill 自身ではコードを書かない** (実装は /implement、検証は /device-verify が担当)
- **AskUserQuestion を 2 回以上呼ばない** (1 回で解釈確認、解釈合意後は自走)
- **mockup を雰囲気で読まない** (R-29 段階 1 = wireframe 全文 Read、段階 2 = mockup スクショ Read 必須)
- **画像 path 未指定で起動を許さない** (画像なしは /discuss か /plan に誘導)
- **screen-id 推測を 1 案で済ませない** (推薦 1 + 反対 2 案で hallucination を可視化)

---

## ワークフロー

### Step 1: 引数解析 + path 正規化

引数を 2 パーツに分解:

- **SS 画像 path 1+ 件**: 拡張子が `.png/.jpg/.jpeg/.webp` のトークン全部
- **1 行意図**: `"..."` で囲まれた最後のトークン (= 修正したい内容、自然文)

path 正規化 (Windows → WSL2):

- `C:\Users\foo\bar.png` → `/mnt/c/Users/foo/bar.png` (案 1 hook が PreToolUse で自動正規化済)
- 案 1 hook 未配線でも fallback で `C:\\` → `/mnt/c/` の置換を施す
- 正規化後に Read tool で全画像を順次 Read (= Claude の目で見る、ログだけ判定禁止)

引数欠落時の挙動:

- 画像 path 0 件 → user に **AskUserQuestion** で「画像を添付してください」 (画像なしの UI 修正は受けない)
- 意図文 0 件 → 「修正したい内容を 1 行で教えてください」 (推測で進めない)

### Step 2: screen-id 同定

`docs/mockups/v1.0/wireframes/` の wireframe 索引から候補を推定:

```bash
ls docs/mockups/v1.0/wireframes/   # 01-Onboarding.html / 02-Home.html / *-screens.jsx ...
```

命名規則:

- `XX-screen-name.html` (= 主要 5 画面の HTML mockup)
- `<feature>-screens.jsx` (= feature 単位の React component mockup)

推定ロジック:

1. SS 画像から見える文字列 (画面タイトル / セクション名 / ボタン文言) を抽出
2. 1 行意図に含まれる feature 名 (例: 「タグ」「定期予定」「カード」) を抽出
3. wireframe 索引の命名と照合し candidate を 1-3 件絞る

**推薦案 + 反対 2 案セットで提示** (Sess108 thinking pattern: hallucination 可視化):

- (a) 推薦: `<id>` — 根拠 (画面文言一致 / feature 名一致)
- (b) 反対 1: `<id>` — 「もし<別解釈>なら」
- (c) 反対 2: `<id>` — 「もし<別画面>なら」

### Step 3: mockup-pull

確定した screen-id の wireframe を Read で全文取り込み:

```bash
# 例
Read docs/mockups/v1.0/wireframes/02-Home.html
Read docs/mockups/v1.0/wireframes/care-screens.jsx
# 該当画面のスクショも (R-29 段階 2)
Read docs/mockups/v1.0/screenshots/<id>-01.png
```

デザイントークン抽出:

- **色**: CSS variable (`--brand-green`) / hex (`#7AA66B`) → `design_system.md` の対応 token 名
- **余白**: `margin` / `padding` の px 値 → `Spacing.md` `Spacing.lg` 等
- **typography**: `font-size` / `line-height` → `Typography.body` `Typography.title` 等

トークン正規化規則:

- `design_system.md` の token 名と一致しない値は **直 hex** として PR で `useColors()` 経由化を要請
- ADR-0059 D3 (mockup 側 token 直結) の方針確認

### Step 4: ASCII 差分図

**現状 SS の見え方** (= 実機画像、Read で確認した状態) を ASCII で 5-10 行に圧縮:

```
+--------------------------------+
| [<] タグ管理              [+]  |   <- header (高さ 56)
|                                |
|  [盆栽] [水やり] [肥料]        |   <- chip 行 (gap 12)
|                                |
|  □ 春の作業    (5 件)          |   <- tag row (上下 padding 16)
|  □ 夏の作業    (3 件)          |
|                                |
+--------------------------------+
```

**mockup の目標見え方** (= wireframe / スクショから読み取った状態) を ASCII で 5-10 行:

```
+--------------------------------+
| [<] タグ管理              [+]  |   <- header (高さ 56) ★同じ
|                                |
| [盆栽] [水] [肥]               |   <- chip 行 (gap 8) ★狭い
| □ 春の作業 (5)                 |   <- tag row (上下 padding 8) ★狭い
| □ 夏の作業 (3)                 |
| □ 秋の作業 (2)                 |   ★3 件目まで visible
+--------------------------------+
```

**差分箇所をマーカー (★) + 矢印で強調**:

- 余白: `chip gap 12 → 8` / `row padding 16 → 8`
- 表示件数: `2 件 visible → 3 件 visible`

差分が 3 箇所超えるなら sub-section に分けて 2-3 ブロックで提示。

### Step 5: 写経 5 段階 pre-fill (R-29)

次に走る /implement 用に 5 段階の進捗を pre-fill:

| 段階 | 内容 | 本 Skill 内での状態 |
| --- | --- | --- |
| 1 | mockup の JSX/HTML **全文** Read | Step 3 で完了 ✅ |
| 2 | mockup **スクショ** Read | Step 3 で完了 ✅ |
| 3 | 既存 RN 実装ファイル Read | grep で候補抽出 → /implement で完了 |
| 4 | 実装後の RN スクショ撮影 | /device-verify で実施 (Step 6) |
| 5 | mockup SS と RN SS を並べて Read 目視比較 | /device-verify で実施 |

Step 3 既存実装 grep の例:

```bash
# 1 行意図に含まれる画面名から RN 実装ファイル候補を grep
grep -rln "TagManage\|tag.*screen" app/ src/features/ --include='*.tsx' | head -5
```

抽出した候補ファイル path を PR 本文の「変更予想ファイル」に記載するため、出力に含める。

### Step 6: /device-verify 連結 link

出力末尾に固定 footer として:

```
---
**次のステップ**:
1. 解釈が合っていれば `/implement #<新規 issue>` で写経実装
2. 実装後は `/device-verify <画面名>` で実機 SS + Read 目視 (R-29 段階 4-5)
3. mockup と実機 SS が見た目 80% 一致したら合格 (= integration-criteria.md レベル 2)
```

### Step 7: AskUserQuestion 1 回 (= 解釈確認)

最後に **1 回だけ** 解釈の確認を行う (R-7 議論の論点固定 + AskUserQuestion 必須):

- **質問**: 「screen-id 同定と mockup 解釈は合っていますか?」
- **選択肢**:
  - (a) `<推薦案 screen-id>` で進める (推薦) — 根拠: ...
  - (b) 反対案 1: `<別 screen-id>` — もし「<別解釈>」なら
  - (c) 反対案 2: `<別 screen-id>` — もし「<別画面>」なら
  - (d) 手動指定 — wireframe path を user が直接指定

合意後は /implement に引き渡す。**再質問しない** (= 自走モード)。

---

## 出力フォーマット

```
## /ui-fix 結果

**1 行意図**: <user の意図>
**SS path**: <正規化後 path> (件数)

### Step 2: screen-id 同定
- 推薦: <id> — <根拠>
- 反対 1: <id> — <別解釈>
- 反対 2: <id> — <別画面>

### Step 3: mockup-pull
- wireframe: <path> (Read 済)
- スクショ: <path> (Read 済)
- design token: <抽出した token list>

### Step 4: ASCII 差分
[現状]
<ASCII 5-10 行>

[目標]
<ASCII 5-10 行>

差分: <差分箇所 list>

### Step 5: 写経 5 段階 pre-fill
- 段階 1: ✅ <wireframe path>
- 段階 2: ✅ <mockup SS path>
- 段階 3: 候補 <RN 実装 path>
- 段階 4-5: /device-verify で実施

### 次のステップ
1. /implement #<新規 issue> で写経実装
2. /device-verify <画面名> で実機検証

(AskUserQuestion で解釈確認)
```

---

## 関連 Skill

- `/device-verify` — 実機 SS + Read 目視 (本 Skill の Step 6 連結先、R-29 段階 4-5 を担当)
- `/plan` — Issue 起票 (本 Skill 完了後、UI 修正を Issue 化するなら)
- `/implement` — 写経実装 (本 Skill の Step 5 pre-fill を引き継ぐ)

## 参照

- ADR-0059 (mockup→実装 UI 反映の標準 = 写経駆動 + 実機 SS 目視)
- R-29 (写経駆動開発 5 段階チェックリスト、`.claude/recurrence-prevention/specialized.md`)
- R-25 (構造系 4 項目)
- `docs/reference/integration-criteria.md` (見た目 80% 一致 = レベル 2)
- `docs/reference/design_system.md` (token list)
- Sess108 thinking pattern 分析 (215 prompts 中 UI 修正 + 画像添付 43%)
