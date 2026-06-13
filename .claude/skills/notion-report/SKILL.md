---
name: notion-report
description: 完了 PR/Issue を Notion ページにコメント投稿 — gh CLI + Engram から完了サマリ抽出 → notion-create-comment で対応ページに投稿 → Sess<N>-summary を Notion 子ページに作成。 /session-end --auto-from-session-end で自動連結。 Sess108 案 7 (Notion 双方向同期 Stage C)。
user-invocable: true
argument-hint: '[--auto-from-session-end]'
---

# /notion-report — Notion 完了報告 Skill

直近セッションで完了した PR/Issue を、 対応する Notion 依頼ページに「完了報告」 として投稿し、 Sess<N>-summary 子ページを作成する出口側 Skill。

## 設計理由 (Sess108 案 7、 Notion 215 prompts 由来)

- **Notion 215 prompts pattern**: 「Done」 ステージで「何が解決したか + 次の一手」 を残すと、 user 側の確認コストが激減
- **Sess108 で課題化**: Claude 側で完了しても user 側の Notion に反映されず「で、 結局どうなったの?」 質問が頻発
- **`/notion-intake` の対**: 入口 (intake) と出口 (report) を揃えて双方向同期を完成させる
- **既存 mirror**: `.claude/skills/session-end/SKILL.md` の Phase 構造を踏襲、 末尾セクションから自動連結

## このスキルが呼ばれる条件

- 「Notion に完了報告」「Notion 投稿」「report to Notion」 をユーザー発言に検出
- `/notion-report` の明示呼び出し
- `/session-end --auto-from-session-end` から自動連結 (= session-end Skill 末尾で実行)

## ENV flag による全 off ロジック

冒頭で `BONSAI_NOTION_SYNC` を確認:

```
if (process.env.BONSAI_NOTION_SYNC === 'off') {
  // 全 step skip、 ユーザーに案内のみ
  return '[notion-report] BONSAI_NOTION_SYNC=off のため全 step スキップしました。 有効化するには ENV を unset するか on に設定してください。';
}
```

## やってはいけないこと (重要)

- **ユーザー承認なしに Notion ページの状態 (Status / Stage) を変更しない** (report は comment + 子ページのみ)
- **長すぎる report を投稿しない** (R-19 1KB 制約と同等、 1 report 2KB 以内目安)
- **個人情報 / 秘密情報を Notion に投稿しない** (プライバシー禁則ハードガード、 user global CLAUDE.md §0)
- **同じ PR/Issue を 2 回 report しない** (idempotency check 必須)

---

## ワークフロー: 4 Step 設計

```
Step 1: EXTRACT (gh CLI + Engram から完了 PR/Issue 抽出)
  └→ Step 2: STRUCTURE (タイトル / PR# / 解決内容 / 次の一手)
       └→ Step 3: COMMENT (notion-create-comment で投稿)
            └→ Step 4: CHILD-PAGE (Sess<N>-summary 子ページ作成)
```

---

### Step 1: EXTRACT — 完了 PR/Issue 抽出

#### 1.1 gh CLI で今セッション完了 PR を取得

```bash
gh pr list --author '@me' --state merged --search 'merged:>=<セッション開始時刻>' --json number,title,body,mergedAt
gh issue list --search 'closed:>=<セッション開始時刻> author:@me' --state closed --json number,title,body,closedAt
```

#### 1.2 Engram から「Notion 依頼取込」 履歴を query

```
mem_search:
  query: 'Notion 依頼取込 Claude assign'
  project: <current>
  type: learning
```

各エントリの `page_id` を抽出 (= /notion-intake で記録した依頼との対応付け)。

#### 1.3 PR 本文の `Closes #N` から Issue → Notion 依頼の対応付け

PR 本文を grep して `Closes #1234` 形式の Issue 番号を抽出し、 Engram の「Notion 依頼取込」 履歴 (= Issue # と page_id の対応表) と join する。

### Step 2: STRUCTURE — report 構造化

各完了 PR/Issue に対して以下を生成:

```markdown
## ✅ 完了報告

- **PR**: #<N> [title]
- **Issue**: #<M> [title] (Closes)
- **何が解決したか**: [1-3 行]
- **どう実装したか**: [技術的な短い説明、 1-2 行]
- **次の一手**: [follow-up Issue # / 「なし」 / user 側で必要なアクション]
- **検証結果**: [CI: pass / 実機: GO / pending]
- **session**: Sess<N>
- **PR URL**: <url>
```

合計 2KB 以内に収める (長くなったら子ページに退避)。

### Step 3: COMMENT — Notion 投稿

`/notion-intake` で記録した page_id がある PR/Issue について `mcp__notion__notion-create-comment` で完了報告 comment を投稿:

```
mcp__notion__notion-create-comment:
  page_id: <intake で記録した page_id>
  rich_text: [Step 2 で構造化したテキスト]
```

page_id がない (= /notion-intake 経由ではない user 依頼) 場合は、 Step 4 の子ページ作成のみ実行 + 「対応 Notion ページが見つかりませんでした、 手動で関連付けてください」 を user に提示。

### Step 4: CHILD-PAGE — Sess<N>-summary 作成

`mcp__notion__notion-create-pages` で今セッション全体の summary 子ページを作成:

```
mcp__notion__notion-create-pages:
  parent_page_id: <BonsaiLog Project root page>
  title: 'Sess<N> Summary (<YYYY-MM-DD>)'
  content:
    - '## このセッションで完了した PR'
    - [PR 一覧、 1 行ずつ]
    - '## 主要な学び (Engram より)'
    - [mem_search の上位 5 件]
    - '## 次セッションに引き継ぐ事項'
    - [deferred scope / follow-up Issue]
```

idempotency: 同じ Sess<N>-summary が既に存在したら update (notion-update-page) に切り替える。

---

## モード

### `/notion-report` (標準)

Step 1 → Step 2 → Step 4 (PROPOSE) → 承認後 Step 3 + 子ページ作成。

### `/notion-report --auto-from-session-end`

`/session-end` Skill の Phase 3.4 (最終レポート) 後に **自動連結** で実行されるモード。

- 承認は session-end の Phase 2 で既に取得済 → Step 4 PROPOSE を skip して Step 3 + 子ページ作成を直実行
- session-end の最終レポートに「✅ Notion report 投稿済」 行が追加される
- BONSAI_NOTION_SYNC=off の場合は silent skip + session-end レポートに「⏭ Notion report skipped (env off)」

### `/notion-report --dry-run`

Step 1 → Step 2 で構造化結果を提示するだけ。 Step 3 / Step 4 は実行しない。 「こういう内容を投稿します」 の確認用途。

---

## エッジケース対応

| ケース                            | 挙動                                                                |
| --------------------------------- | ------------------------------------------------------------------- |
| Notion MCP 未認証                 | エラー時 silent skip、 「Notion MCP 認証してください」 案内         |
| BONSAI_NOTION_SYNC=off            | 全 step skip、 ユーザーに案内のみ                                    |
| 完了 PR が 0 件                   | 「完了 PR なし、 終了」 と表示して exit                              |
| Engram に page_id 履歴なし        | 子ページ作成のみ、 page_id 対応付けは手動依頼                        |
| Sess<N>-summary が既に存在         | update に切り替え (idempotency)                                     |
| report が 2KB 超                  | 本文は要約に切詰め、 詳細は子ページ本文に退避                        |
| user 個人情報を検出               | 🛑 即停止、 該当箇所を user に提示して判断待ち (プライバシー禁則)   |

---

## /session-end からの自動連結

`/session-end` の Phase 3 (EXECUTE) の最後に追加する手順:

```
Phase 3.5: Notion 完了報告 (自動連結、 Sess108 案 7)
  - BONSAI_NOTION_SYNC=off なら skip
  - /notion-report --auto-from-session-end を実行
  - 結果を Phase 3.4 最終レポートに「✅ Notion report 投稿済」 として追記
```

これにより user は `/session-end` 1 コマンドで:

1. Engram 保存
2. MEMORY.md 更新
3. commit + push
4. **Notion 完了報告 (新規)**

の 4 つを一気通貫で完了できる (Sess108 案 7 Stage C 完成形)。

---

## 他の Skill との棲み分け

| Skill              | 目的                                                       | 使うタイミング                  |
| ------------------ | ---------------------------------------------------------- | ------------------------------- |
| `/notion-intake`   | **未着手依頼の取込** (入口)                                | セッション開始時 / 定期確認時   |
| `/notion-report`   | **完了 PR/Issue を Notion に投稿** (出口)                  | /session-end 末尾で自動連結     |
| `/session-end`     | セッション全体のハンドオフ (notion-report を呼出)         | 毎回のセッション終わり          |
| `/retro`           | マイルストーン振り返り (期間横断)                          | リリース / 大きな機能完了時     |

---

## 最重要原則

1. **BONSAI_NOTION_SYNC=off のとき全 step skip** (env 失敗時の safety net)
2. **report は comment + 子ページのみ、 Status / Stage は変更しない** (副作用最小化)
3. **2KB 以内に収める、 超過分は子ページに退避** (R-19 1KB と同等の節度)
4. **個人情報 / 秘密情報は投稿しない** (プライバシー禁則ハードガード)
5. **同 PR/Issue を 2 回 report しない** (idempotency check 必須)
