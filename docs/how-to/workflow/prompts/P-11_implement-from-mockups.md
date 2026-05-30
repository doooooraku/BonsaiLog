# P-11: docs/mockups/v1.0/ から React Native 実装プロンプト(Claude Code に再現させる)

`docs/mockups/v1.0/` の OpenDesign 採用版(HTML / jsx / tokens.css / docs / app.sqlite)を BonsaiLog の React Native + Expo コードに反映するためのプロンプト集。**1 語トリガー**で Claude Code が以下を順次実行する:

1. P-09 / P-11 の判定(差分修正 vs 新規実装)
2. コンテキスト把握(mockups + ADR + recurrence-prevention)
3. 画面選択 + 実装計画(R-17 4 段階)
4. 実装(UI 表現 → mockups / ビジネス仕様 → ADR、R-28 境界判定厳守)
5. verify 全 11 ゲート緑 → push → PR → CI → squash merge

---

## ✨ 使い方(超シンプル、これだけ覚えれば OK)

新規 Claude Code セッションで、最初のメッセージにこれを送るだけ:

```
mockups から「02-Home」を React Native で実装してください
```

`02-Home` の部分を、**実装したい画面 ID** に置き換える(例: `01-Onboarding` / `04-Export` / `05-Monetization` / `bonsai-detail`)。

または同義の表現でも OK:

- 「v1.0 実装着手、最初は <画面名>」
- 「mockups の <画面名> を RN で実装」
- 「docs/how-to/workflow/prompts/P-11_implement-from-mockups.md を読んで <画面名> を実装」

---

## P-09 との使い分け(重要、最初に判断)

| 状況                                       | 使うプロンプト      |
| ------------------------------------------ | ------------------- |
| **既存実装あり、mockup と差分修正したい**  | → **P-09**(UI diff) |
| **未実装画面を mockup から新規作成したい** | → **本 P-11**       |

「実機に画面がない場合は mockup を正として作成」というアプローチも可能。ただし:

- **R-28 境界判定フロー必須**: UI 表現は mockup 採用 OK、**ビジネス仕様(Pro / 課金 / プライバシー / 法令)は ADR 絶対上位**
- 判定に迷う場合は即停止 + ユーザー質問(F-10 撤回事例の再発防止)

---

## 「実機へ比較する画面がない」の判定基準

以下 **すべての条件** を満たす場合、「未実装」とみなして本 P-11 を起動:

1. `app/(tabs)/<screen>` または `app/<screen>` の **実装ファイル無し**(`Glob` / `find` で確認)
2. `maestro/flows/ui-diff/<screen>.yml` の **Maestro flow 無し**
3. `scripts/ui-diff/config.ts` の `SCREEN_PAIRS` に **エントリ無し**

→ **1 つでも該当があれば「既存実装あり」**とみなして **P-09(差分修正)に切替**。

---

## 環境前提(本セッションで構築済)

| 項目                          | 値                                                        |
| ----------------------------- | --------------------------------------------------------- |
| 採用版モックアップ            | `docs/mockups/v1.0/`(PR #269 で取り込み済)                |
| 設計ドキュメント              | `docs/mockups/v1.0/docs/{principles,display-schema}.md`   |
| チャット履歴 DB(ローカル参照) | `docs/mockups/v1.0/app.sqlite`(sqlite3 / Read で参照可能) |
| 領域別 SoT                    | R-16(PR #266)                                             |
| 境界判定フロー                | R-28(PR #266)                                             |
| ADR-0020                      | UI 整合点(画面マップ)                                     |
| ADR-0021                      | 視覚比較パイプライン(将来 mockups を入力切替)             |

---

## 3 つの版の使い分け

| 版               | サイズ    | 使うシーン                    |
| ---------------- | --------- | ----------------------------- |
| **A. 1 行版**    | 1 行      | 慣れた後、毎回これで OK       |
| **B. 標準版** ⭐ | 約 40 行  | 標準的な実装                  |
| **C. 完全版**    | 約 100 行 | 久しぶり / 大規模画面 / 別 PC |

---

## A. 1 行版

```
docs/mockups/v1.0/wireframes/02-Home.html を React Native で実装。R-17 4 段階厳守、R-28 境界判定 (UI → mockups / ビジネス → ADR) で分離、verify 全 11 ゲート緑 → squash merge まで完遂。
```

`02-Home.html` の部分を実装したい画面に置き換える。

---

## B. 標準版 ⭐(おすすめ、毎回これで OK)

```
あなたは BonsaiLog のシニアモバイル UI エンジニアです。
docs/mockups/v1.0/ の採用版を React Native + Expo で実装してください。
最初に実装する画面: 「02-Home.html」(対応表は ADR-0020 §Notes §画面マップ)

# Step 1: 判定 — P-09 で差分修正 or 本 P-11 で新規実装?
- app/(tabs)/<screen> 実装ファイル無し AND maestro flow 無し AND ui-diff config 無し → 本 P-11 (新規実装)
- いずれかあり → P-09 (差分修正) に切替

# Step 2: コンテキスト把握 (Read 必須)
- docs/mockups/v1.0/README.md
- docs/mockups/v1.0/docs/principles.md
- docs/mockups/v1.0/docs/display-schema.md
- 該当画面: docs/mockups/v1.0/wireframes/02-Home.html (+ 関連 jsx)
- docs/mockups/v1.0/wireframes/tokens.css
- docs/adr/ADR-0020 §Notes §画面マップ (実装側ルート確認)
- docs/adr/ADR-0021 (視覚比較、将来比較対象)
- docs/adr/ADR-0009 (RevenueCat 課金、絶対上位)
- docs/adr/ADR-0010 (AdMob、絶対上位)
- docs/adr/ADR-0011 (記録のみ哲学、絶対上位)
- docs/adr/ADR-0017 (Privacy/ATT/UMP、絶対上位)
- .claude/recurrence-prevention.md R-16 / R-28

# Step 3: ユーザー文脈把握 (任意、深掘り時)
- sqlite3 docs/mockups/v1.0/app.sqlite "SELECT content FROM messages WHERE conversation_id='<id>' ORDER BY position LIMIT 20"

# Step 4: R-17 4 段階厳守
1. TaskCreate で実装タスク分割 (jsx → RN 変換 / i18n 追加 / Maestro 更新 / verify)
2. 計画提示 (変更ファイル / 新規ファイル / 影響範囲)
3. ユーザー承認待ち
4. 実行

# Step 5: 実装中の判定 (R-28 境界判定フロー)
- UI 表現 (見た目/レイアウト/コピー/コンポーネント形状): **mockups の最新表現を採用**
- ビジネス仕様 (機能有無/Pro 限定/課金/プライバシー/データ送信/法令): **ADR が絶対上位**、mockups と矛盾しても ADR 採用
- 矛盾発生時は即停止、ユーザーに「mockups の X と ADR-XXXX の Y が矛盾、どちらを採用?」と質問

# Step 6: 実装フロー
1. bash scripts/git/start-pr.sh feat/<screen>-from-mockups
2. jsx → React Native 変換 (StyleSheet / Themed components / i18n key)
3. tokens.css → constants/colors.ts へ反映 (R-25 drift 検出)
4. i18n キー追加 (19 言語、英語フォールバック許可)
5. Maestro flow 更新 (verify:maestro 緑、Maestro 2.0 構文厳守)
6. pnpm verify 全 11 ゲート緑
7. git push -u + gh pr create
8. bash scripts/ci/wait-for-pr.sh <PR>
9. gh pr merge --squash --delete-branch
10. bash scripts/git/end-pr.sh <branch>

# 禁止事項
- docs/mockups/v1.0/ 直接編集 (凍結保管、PR #269 で確定)
- mockups の jsx をそのまま import (React.js Web 向け、RN 非互換)
- tokens.css の値を hardcode (constants/ に必ず通す)
- ADR-0009 / ADR-0010 / ADR-0011 / ADR-0017 の仕様変更 (mockups で表現されていても採用しない)
- 破壊的コマンド (rm -rf / git reset --hard / push --force / --no-verify)

# 期待アウトプット
1. 1 画面ごとに 1-3 PR (UI / i18n / Maestro)
2. ADR-0020 §Notes §画面マップ更新 (実装側ルートを mockups と紐付け)
3. 実機検証 SS と mockups HTML の比較メモ (Issue or PR comment)
4. 新しい罠が見つかったら別 PR で仕組化 (R-24)

スタートしてください。
```

`02-Home.html` を対応表の希望画面に置き換える。

---

## C. 完全版(初回・大規模画面・別 PC)

```
あなたは BonsaiLog のシニアモバイル UI エンジニアです。
docs/mockups/v1.0/ の採用版を React Native + Expo で実装してください。

# 既存資産(これらは触らず流用)
| 場所 | 役割 |
|---|---|
| docs/mockups/v1.0/ | OpenDesign 採用版モックアップ (PR #269、凍結保管) |
| docs/mockups/v1.0/README.md | 運用ルール |
| docs/mockups/v1.0/docs/principles.md | 設計原則 |
| docs/mockups/v1.0/docs/display-schema.md | 表示スキーマ |
| docs/mockups/v1.0/wireframes/ | HTML 4 + jsx 9 + tokens.css |
| docs/mockups/v1.0/app.sqlite | OpenDesign チャット履歴 (.gitignore 除外、sqlite3 で参照) |
| docs/adr/ADR-0020 | 画面マップ (実装側ルート ↔ mockup 画面) |
| docs/adr/ADR-0021 | UI 差分検出パイプライン |
| docs/adr/ADR-0009 | RevenueCat 課金 (ビジネス仕様、絶対上位) |
| docs/adr/ADR-0010 | AdMob (ビジネス仕様、絶対上位) |
| docs/adr/ADR-0011 | 記録のみ哲学 (ビジネス仕様、絶対上位) |
| docs/adr/ADR-0017 | Privacy / ATT / UMP (ビジネス仕様、絶対上位) |
| docs/reference/design_system.md | tokens / フォント / 角丸 (ADR-0015 確定済) |
| .claude/recurrence-prevention.md | 行動ルール R-1〜R-28 |
| scripts/git/start-pr.sh + end-pr.sh | 他者 M 自動 stash/pop |
| scripts/ci/wait-for-pr.sh | CI polling + flake 自動 rerun |

# 進め方ルール
1. R-17 4 段階厳守: 議論 → TaskCreate → 計画提示 → 承認 → 実行
2. R-28 境界判定: UI 表現 → mockups / ビジネス仕様 → ADR
3. R-16 領域別 SoT: 矛盾時は ADR 絶対上位 (F-10 撤回事例の再発防止)
4. R-25 drift 検出: tokens.css と design_system.md の整合確認
5. R-18 Read 前 Edit 厳守
6. 都度報告モード: 各 Step 完了で 1〜3 行報告
7. R-14: 専門用語にやさしい言い換え併記
8. verify 全 11 ゲート緑後に push
9. git flow: feature branch → 1 コミット → push → PR → CI → squash merge → main 同期
10. CI 監視: bash scripts/ci/wait-for-pr.sh <PR>
11. PR 開始/終了: bash scripts/git/{start,end}-pr.sh で他者 M 自動退避

# Step 1: 判定 — P-09 で差分修正 or 本 P-11 で新規実装?
以下すべて満たす → 本 P-11 (新規実装):
- app/(tabs)/<screen> 実装ファイル無し
- maestro/flows/ui-diff/<screen>.yml 無し
- scripts/ui-diff/config.ts SCREEN_PAIRS エントリ無し
いずれか 1 つでもあり → P-09 (差分修正) に切替

# Step 2: コンテキスト Read (必須)
- docs/mockups/v1.0/README.md + docs/{principles,display-schema}.md
- 該当画面 HTML: docs/mockups/v1.0/wireframes/<screen>.html
- 関連 jsx: docs/mockups/v1.0/wireframes/<related>-screens.jsx
- tokens.css: docs/mockups/v1.0/wireframes/tokens.css
- ADR: 0020 §Notes §画面マップ / 0021 / 0009 / 0010 / 0011 / 0017 / 0015
- recurrence-prevention.md: R-16 / R-28 / R-25

# Step 3: ユーザー文脈把握 (任意、深掘り時)
- sqlite3 docs/mockups/v1.0/app.sqlite ".tables"
- sqlite3 docs/mockups/v1.0/app.sqlite "SELECT content FROM messages WHERE conversation_id='<id>' ORDER BY position LIMIT 20"
- 198 メッセージ (5 セッション) からユーザー意図を peek

# Step 4: R-17 4 段階
1. TaskCreate で実装タスク分割 (jsx 解析 / RN 変換 / tokens 反映 / i18n / Maestro / verify / PR)
2. 計画提示 (変更ファイル / 新規ファイル / 影響範囲 / リスク)
3. ユーザー承認待ち (「全部推薦で OK」でも 4 段階を踏む)
4. 実行 (各 Step 完了で報告)

# Step 5: R-28 境界判定 (実装中、迷ったら停止 + 質問)
1. 法令 / プライバシー / 利用規約 / ストア審査? → ADR 絶対上位
2. 機能の有無 / Free vs Pro / 課金プラン? → ADR 絶対上位
3. データ送信 / DB 構造 / API 連携? → ADR 絶対上位
4. A11y / WCAG / コントラスト / タップ領域? → ADR + design_system.md (verify:a11y で自動検証)
5. モーション / 触覚 / 効果音 / 通知音? → ADR + design_system.md (mockups 範囲外)
6. タイポグラフィ詳細 (フォント / サイズ / 行間)? → ADR + design_system.md
7. 上記いずれにも該当しない (見た目 / レイアウト / コピー / コンポーネント形状)? → mockups が正

# Step 6: 実装フロー (各画面)
1. bash scripts/git/start-pr.sh feat/<screen>-from-mockups
2. jsx 解析 (元の構造、コンポーネント階層、props、state)
3. React Native 変換:
   - View / Text / TouchableOpacity / FlatList / Image / SafeAreaView
   - StyleSheet.create で書き直し (className → style 変換)
   - tokens.css → constants/colors.ts / typography.ts (R-25 drift 検出)
   - 既存 Themed コンポーネント (ThemedView / ThemedText) 活用
4. i18n キー追加 (19 言語、英語フォールバック許可、scripts/i18n-check.mjs で検証)
5. Maestro flow 更新 (verify:maestro 緑、Maestro 2.0 構文厳守)
6. pnpm verify 全 11 ゲート緑
7. git add + commit (HEREDOC + co-author trailer)
8. git push -u + gh pr create
9. bash scripts/ci/wait-for-pr.sh <PR>
10. gh pr merge <PR> --squash --delete-branch
11. bash scripts/git/end-pr.sh <branch>

# 禁止事項
- docs/mockups/v1.0/ 直接編集 (凍結保管)
- mockups の jsx をそのまま import (React.js Web 向け、RN 非互換)
- tokens.css の値を hardcode (constants/ に必ず通す、R-25)
- ADR-0009/0010/0011/0017 の仕様変更 (mockups で表現されていても採用しない、R-28 ガード)
- 破壊的コマンド (rm -rf / git reset --hard / push --force / --no-verify / git stash drop)
- Maestro 1.x 構文 (steps: / assertVisible.timeout / waitForAnimationToEnd で error)
- 「次は気をつける」で済ます (3 件以上発生したら仕組化、R-24)

# 期待アウトプット
1. 1 画面ごとに 1-3 PR (UI 実装 / i18n / Maestro flow)
2. ADR-0020 §Notes §画面マップ更新 (実装側ルートを mockups と紐付け)
3. 実機検証 SS と mockups HTML の比較メモ (PR comment or Issue)
4. 新しい罠 → 別 PR で仕組化 (scripts/ または lessons § 追加、R-24 整合)
5. セッション終了時に /session-end で Engram session_summary 保存

# 確認したいこと(セッション開始時に教えてください)
- 実装したい画面 (ADR-0020 画面マップ or mockups の HTML から)
- 既存実装の有無 (P-09 切替判定の確認)
- スコープ (1 画面で 1 PR or 関連画面まとめて)
- 進め方の好み (都度確認 / 一定範囲は任せて最後に報告)

スタートしてください。
```

---

## 流れ図(各ステップの役割を可視化)

```
ユーザー: 「mockups の 02-Home を実装」
        ↓
Claude Code が P-11 を Read
        ↓
┌─ Step 1: 判定 ───────────────────────────────────────┐
│ app/(tabs)/<screen> 実装あり? OR maestro flow あり?    │
│ ┌─ あり → P-09 (差分修正) に切替                      │
│ └─ なし AND なし AND ui-diff config なし → 本 P-11 続行 │
└────────────────────────────────────────────────────┘
        ↓
Step 2: コンテキスト Read
  - docs/mockups/v1.0/README + docs/principles.md + display-schema.md
  - 該当 wireframes/<screen>.html + jsx + tokens.css
  - ADR 0020/0021/0009/0010/0011/0017/0015
  - recurrence-prevention.md R-16/R-28/R-25
        ↓
Step 3: (任意) sqlite peek でユーザー意図把握
        ↓
Step 4: R-17 4 段階
  TaskCreate → 計画提示 → 承認待ち → 実行
        ↓
Step 5: R-28 境界判定 (実装中)
  ┌─ 法令/Pro/課金/データ → ADR 絶対上位
  ├─ A11y/モーション/タイポ → ADR + design_system.md
  └─ 見た目/レイアウト/コピー → mockups が正
        ↓
Step 6: 実装フロー
  start-pr.sh → jsx→RN 変換 → tokens.css→constants/ →
  i18n 19 言語 → Maestro 更新 → verify 11 ゲート →
  push → PR → CI → squash merge → end-pr.sh
        ↓
ADR-0020 §Notes 画面マップ更新 (実装側ルート紐付け)
```

---

## Claude Code の力を引き出す 3 つのコツ

1. **既存資産を明示する** — `docs/mockups/v1.0/` や R-28 を書くだけで、Claude Code は重複実装を避け最短経路を選ぶ
2. **R-28 境界判定を必ず通す** — UI 表現か ビジネス仕様かを毎回判定、迷ったら即停止 + ユーザー質問(F-10 撤回事例の再発防止)
3. **報告モードを最初に決める** — 「都度報告」「最後に報告」「Step ごと」のどれかを冒頭で固定

---

## よくある質問

### Q. mockups の jsx をどう React Native に変換する?

A. jsx は React.js Web 向け(HTML / className / inline style)。RN は ネイティブ View / StyleSheet / Themed components。**手作業で構造を写経 + StyleSheet.create で書き直す**。

具体的:

- `<div>` → `<View>`(TouchableOpacity / SafeAreaView 等を場面で選ぶ)
- `<span>` / `<p>` → `<Text>`(ThemedText で colors/typography token 通す)
- `<img>` → `<Image>`(Expo Image 推奨)
- `className="..."` → `style={styles.foo}`(StyleSheet.create)
- inline style `{color: '#1F3A2E'}` → constants/colors.ts の BRAND_GREEN
- map list → FlatList (keyExtractor + 必要に応じ getItemLayout で最適化)
- onClick → onPress

### Q. mockups と ADR が矛盾したらどうする?

A. R-28 境界判定フロー:

- 法令 / 課金 / プライバシー / データ送信 → **ADR 絶対上位**
- 機能の有無 / Pro 限定 → **ADR 絶対上位**
- A11y / モーション / タイポ → **ADR + design_system.md**
- 見た目 / レイアウト / コピー → **mockups が正**
- 判断つかなければ即停止 + ユーザー質問

例: mockup に「Lifetime プラン半額キャンペーン」と書かれていても、ADR-0009 で月額/年額/Lifetime 通常価格と決めているなら、**ADR 採用** + ユーザー確認。

### Q. 1 PR で複数画面いけるか?

A. 推奨は **1 PR = 1 画面**。jsx → RN 変換 + i18n + Maestro で 200-500 行 になり、レビュー困難。複数画面まとめると drift リスク高。

例外: 関連性が極めて強い画面(例: Onboarding 6 画面の遷移)は 1 PR で OK、ただし各画面ごとに commit 分割推奨。

### Q. tokens.css の値が design_system.md と違ったら?

A. **R-25 drift 検出**。ユーザーに「mockups tokens.css と design_system.md が乖離、どちらを正にする?」確認。

design_system.md は ADR-0015(テーマ)で確定済 → 原則 design_system.md が正、mockups 側を更新。ただし、mockups の方が新しい意図を反映している場合は、ADR-0015 改訂を検討(R-17 4 段階で別 PR)。

### Q. Maestro flow 1.x 構文を mockup から書いてしまった

A. `verify:maestro` で error 検出(`scripts/maestro-flow-lint.mjs`)。Maestro 2.0 構文厳守:

- ❌ `steps:` / `assertVisible.timeout` / `waitForAnimationToEnd` プロパティ
- ✅ commands 直書き / `assertVisible: { id: "...", timeout: 5000 }` 形式

詳細は `docs/reference/tasks/lessons/wsl2-mobile.md` §1〜§6 参照。

### Q. 実装中に「実は P-09 で差分修正だった」と判明したら?

A. 即停止 + ユーザー報告。「Step 1 判定で P-11 にしたが、`app/(tabs)/<screen>` を再 Glob したら実装ファイル発見。P-09 に切替えますか?」と質問。

---

## 関連

- 起源: 2026-05-09 セッション(open-design 取り込み + R-16/R-28 改訂完遂後)
- 入力: `docs/mockups/v1.0/`(PR #269)
- 関連 ADR: ADR-0020(画面マップ)/ ADR-0021(視覚比較)/ ADR-0009(RevenueCat)/ ADR-0010(AdMob)/ ADR-0011(記録のみ哲学)/ ADR-0017(Privacy)/ ADR-0015(テーマ)
- ルール: R-16(領域別 SoT)/ R-17(4 段階)/ R-25(drift)/ R-28(境界判定)/ R-14 / R-24
- 関連 P: P-09(UI diff、既存実装の差分修正)/ P-10(open-design 再開)
- 行動ルール: `.claude/recurrence-prevention.md` R-1〜R-28
- 技術 lesson: `docs/reference/tasks/lessons/wsl2-mobile.md` §1〜§6
- セッションサマリ: Engram `mem_context` で `bonsailog` プロジェクト参照
