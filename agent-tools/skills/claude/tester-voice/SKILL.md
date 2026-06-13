---
name: tester-voice
description: テスター意見を平易翻訳 + R-55 横断調査 + 改善提案 3-in-1。 `/tester-voice "意見原文" [SS path]` で起動。
user-invocable: true
argument-hint: '["<テスター意見原文>" [<SS path>]]'
---

# /tester-voice — テスター意見の翻訳 + 横断調査 + 改善提案 Skill

テスターからの未整形フィードバックを、 平易な翻訳 → R-55 横断調査 → 改善提案 3 方向 までを 1 コマンドで橋渡しする Skill。
Notion 215 prompts 分析 (Sess108) で「テスターより〜という意見が来ました。 何を言っているのか僕は全く理解できません」 起点の prompt は約 12% (= 26 件)。
平均 300-500 字のテンプレ冒頭文 (= 意見コピペ + 解釈依頼 + R-55 起動指示 + 提案依頼) を 1 行 + optional SS path に圧縮し、
**翻訳 (自信度判定 + 反対 2 案) → R-55 横断調査 → 改善提案 3 方向 (Pro/Free/説明文)** までを定型化する。

## このスキルが呼ばれる条件

- `/tester-voice "テスター意見原文" /mnt/c/.../foo.png` のように引数で起動
- user が「テスターより〜という意見が来ました。 何を言っているのか僕は全く理解できません」 と言ったとき
- フィードバック intake (W-00) の自動化
- テスター発言の解釈 + 影響範囲調査 + 改善案ブレストを一括で求められたとき

## やってはいけないこと

- **テスター意見を直接 ADR / 仕様に反映** (= R-26 ペルソナ評価 + R-77 ドメイン適合性チェック必須)
- **単独提案で進める** (= R-11 複数案 + 推薦根拠、 必ず 3 方向提案)
- **テスター意見をそのまま実装ゴールにする** (= バイアス混入、 まず解釈合意が先)
- **AskUserQuestion を 2 回以上呼ばない** (1 回で解釈確認、 解釈合意後は /discuss or /plan に引き渡す)
- **R-55 横断調査を skip する** (= 同パターンの他箇所を見落とし、 user 再修正リクエストの構造原因)

---

## ワークフロー

### Step 1: 引数解析 + 入力検証

引数を 2 パーツに分解:

- **テスター意見原文**: `"..."` で囲まれた最初のトークン (必須)
- **SS path**: 拡張子が `.png/.jpg/.jpeg/.webp` のトークン (optional、 案 1 hook で path 正規化済の想定)

path 正規化 (Windows → WSL2):

- `C:\Users\foo\bar.png` → `/mnt/c/Users/foo/bar.png` (案 1 hook が PreToolUse で自動正規化済)
- 案 1 hook 未配線でも fallback で `C:\\` → `/mnt/c/` の置換を施す
- SS 指定時は Read tool で順次 Read (= Claude の目で見る、 推測禁止)

引数欠落時の挙動:

- 意見原文 0 件 → user に **AskUserQuestion** で「テスター意見の原文を貼ってください」 (推測で進めない)
- SS path は optional のため、 欠落しても続行 (= 多くの意見は SS 添付なしで来る)

### Step 2: 平易翻訳 (推薦 1 案 + 自信度 < 0.7 で 3 案強制)

テスター意見の言葉から「何を言いたいのか」 を **平易な日本語 1 文** に翻訳。
専門用語は初出で「= 〜の意味」 を併記、 略語はフルスペル + 和訳 (= user 恒常指示 Sess108)。

自信度判定 (= 0.0〜1.0 の確率):

- **0.9 以上**: 専門用語ゼロ + ambiguity ゼロ (例: 「水やりボタンが押せない」)
- **0.7〜0.89**: 専門用語あり or ambiguity 軽微 (例: 「同期できない」 = 何の同期?)
- **0.7 未満**: 専門用語多 or ambiguity 大 (例: 「動きが変」 = どの画面? どの操作?)

出力ロジック:

- 自信度 **≥ 0.7**: 推薦案 1 件のみ提示
- 自信度 **< 0.7**: 推薦案 1 + 反対案 2 件 (= 別解釈 2 つ) を強制提示
  - 反対案 1: 別画面 / 別操作の解釈
  - 反対案 2: バグ報告 vs 仕様改善要望 の解釈分岐

### Step 3: R-55 強制横断調査

翻訳した意見から関連キーワード (= 機能名 / 画面名 / UI 要素名) を抽出し、 grep で横断調査:

```bash
# 例: 「タグ追加 → 戻ると先頭にスクロール」 という意見の場合
grep -rln "tag.*add\|TagManage" app/ src/features/ --include='*.tsx' | head -10
grep -rln "scrollPosition\|scrollRestoration" app/ src/ --include='*.tsx' | head -10
```

同パターン違反の inventory:

- 関連箇所が 3+ 件ヒットしたら、 「同パターンの他箇所も影響範囲」 として PR 範囲拡張を user に提示 (= R-55 セルフチェック ⑤)
- Maestro screencap sweep の案内 (実行は user に委ねる)

i18n / design token 影響範囲:

- 翻訳キー grep (`pnpm i18n:check` or `grep -rn "tagAdd\|tagManage" locales/`)
- design token grep (`useColors` `Spacing.lg` 等が関連するか)

### Step 4: 改善提案 3 件 (3 方向)

R-11 (= 複数案 + メリデメ + 推薦根拠) 必須。 必ず以下の 3 方向で 1 案ずつ:

| 案 | 方向 | 説明 |
| --- | --- | --- |
| (a) | Pro 機能化 | 既存 Free 機能を Pro 移行 or Pro 専用機能として新規追加 |
| (b) | Free 機能 | Free に新規追加 or 既存 Free 機能を拡張 |
| (c) | 説明文追加 | コードは変えず、 既存機能の説明 / Tooltip / Empty state を改善 |

各案の必須項目:

- **工数目安**: X-Y 分 (= 議論 + 実装 + 検証 + PR 作成 までの合計)
- **影響範囲**: 変更ファイル数 / 画面数 / i18n キー数 (概算)
- **メリット**: user / business / dev の 3 軸で 1 文ずつ
- **デメリット**: 後悔ポイント / 技術負債 / UX 副作用
- **推薦度**: S / A / B / C (= S が最推薦、 C が非推薦だが選択肢として明示)

### Step 5: AskUserQuestion (= 解釈確認 1 回のみ)

最後に **1 回だけ** AskUserQuestion を呼んで解釈合意:

- **質問**: 「テスター意見の解釈 + 改善方向は合っていますか?」
- **選択肢** (Sess105 user 指示: 推薦を 1 番目、 「(推薦)」 を option 1 番目に付与):
  - (a) **(推薦)** 解釈: <推薦解釈>、 改善: <推薦度 S の案>
  - (b) 解釈: <推薦解釈>、 改善: <推薦度 A の別案>
  - (c) 反対解釈 1 で進める: <別解釈> (自信度低時のみ表示)
  - (d) 反対解釈 2 で進める: <別解釈> (自信度低時のみ表示)
  - (e) 手動指定: user が直接コメントで補足

合意後は /discuss or /plan に引き渡す。 **再質問しない** (= 自走モード)。

### Step 6: 確定後の next-step 提示

出力末尾に固定 footer として:

```
---
**次のステップ**:
1. 解釈合意 + 改善方向が確定したら `/discuss` で議論深化 (推薦: 影響範囲が広い / Pro 機能化の場合)
2. 議論不要なら `/plan` で W-01〜W-05 直行 (推薦: 説明文追加 / 軽微な Free 機能追加の場合)
3. Issue 起票後は `/implement #<新規 issue>` で実装フェーズに進む
```

---

## 出力フォーマット

```
# テスター意見 解釈 + 改善提案 (= /tester-voice, <timestamp>)

**原文**: <意見原文>
**SS**: <正規化後 path> (Read 済 / なし)
**推薦解釈**: <1 文> (自信度: X%)
**反対解釈** (自信度低時のみ):
- 別案 1: <解釈>
- 別案 2: <解釈>

**R-55 横断調査**:
- 関連箇所: <grep hit N 件>
- 同パターン違反: <inventory list>
- i18n / token 影響: <影響キー / token list>

**改善提案**:
| 案 | 方向 | 工数 | 推薦度 | メリット | デメリット |
| --- | --- | --- | --- | --- | --- |
| (a) | Pro 機能化 | X 分 | A | <merit> | <demerit> |
| (b) | Free 機能 | Y 分 | S | <merit> | <demerit> |
| (c) | 説明文追加 | Z 分 | C | <merit> | <demerit> |

**次の一手**: <推薦 + 起動コマンド>

(AskUserQuestion で解釈確認)
```

---

## 関連 Skill

- `/discuss` — 議論深化 (本 Skill 完了後、 影響範囲が広い場合の next-step)
- `/plan` — W-01〜W-05 Issue 起票 (本 Skill 完了後、 議論不要な軽微改善の next-step)
- `/ui-fix` — UI 修正 (テスター意見が UI 崩れ起点なら本 Skill 不要、 /ui-fix 直行)
- `/device-verify` — 実機検証 (R-55 横断調査の Maestro sweep を user が実行する場合)

## 参照

- R-11 (複数案 + メリデメ + 推薦根拠、 `.claude/recurrence-prevention.md`)
- R-26 (ペルソナ評価必須、 `docs/reference/personas.md`)
- R-55 (関連項目網羅調査、 user global CLAUDE.md §2)
- R-77 (ドメイン適合性チェック、 `.claude/recurrence-prevention/specialized.md`)
- Sess105 user 指示 (AskUserQuestion 利用、 option 1 番目に「(推薦)」 付与)
- Sess108 user 恒常指示 (説明・提案は平易な言葉 + ASCII 図 + 背景/メリデメ/所要時間)
- Sess108 thinking pattern 分析 (215 prompts 中 テスター意見起点 12%)
