---
name: notion-intake
description: 未着手 Notion 依頼を取込 — notion-search で「未着手 + 担当 = Claude」 抽出 → notion-fetch で本文 + 添付画像取得 → docs/inbound/ 配置 → notion-update-page でステータス「着手中」 → TaskCreate 展開。 Sess108 案 7 (Notion 双方向同期 Stage C)。
user-invocable: true
argument-hint: '[<Notion ページ URL or DB 名>]'
---

# /notion-intake — Notion 依頼取込 Skill

Notion 上の「Claude 担当 / 未着手」 依頼を 1 コマンドで取込み、 添付画像を `docs/inbound/` に展開、 TaskCreate で展開し、 Notion ページのステータスを「着手中」 に更新する Skill。

## 設計理由 (Sess108 案 7、 Notion 215 prompts 由来)

- **Notion 215 prompts pattern**: 「Inbox → Triage → Active → Done」 の 4 段階キュー管理 (= 未消化が visible になる仕組み)
- **Sess108 で課題化**: user → Claude の依頼が散在 (Slack / Notion / 口頭) で取りこぼし発生。 1 つの入口に統一すれば Claude 側で「未消化件数」 が自動 visible になる
- **既存 mirror**: `.claude/skills/session-end/SKILL.md` の Phase 構造 (AUDIT → PROPOSE → EXECUTE) を踏襲

## このスキルが呼ばれる条件

- 「Notion の依頼取り込んで」「未着手の Notion 案件確認」「intake」 をユーザー発言に検出
- `/notion-intake` の明示呼び出し
- SessionStart hook (session-start-notion-review.mjs) が「未消化 N 件」 を通知した直後

## ENV flag による全 off ロジック

冒頭で `BONSAI_NOTION_SYNC` を確認:

```
if (process.env.BONSAI_NOTION_SYNC === 'off') {
  // 全 step skip、 ユーザーに案内のみ
  return '[notion-intake] BONSAI_NOTION_SYNC=off のため全 step スキップしました。 有効化するには ENV を unset するか on に設定してください。';
}
```

ENV flag の用途:

- Notion MCP 未認証環境
- network 不調 / Notion 障害時
- 議論モード等で外部 API 呼出を抑止したい場合

## やってはいけないこと (重要)

- **ユーザー承認なしに `notion-update-page` でステータス変更しない** (Phase 2 で必ず提案)
- **`docs/inbound/` 以外に画像を配置しない** (R-25 構造系の routing 違反防止)
- **取込済の依頼を 2 重取込しない** (Phase 1.3 で idempotency check)
- **TaskCreate で 1 依頼 1 task を守る** (粒度違反でカオス化を防ぐ)

---

## ワークフロー: 5 Step 設計

```
Step 1: SEARCH (notion-search)
  └→ Step 2: FETCH (notion-fetch + 添付 URL 抽出)
       └→ Step 3: DOWNLOAD (WebFetch + docs/inbound/ 配置)
            └→ Step 4: PROPOSE (★ユーザー承認ポイント)
                 └→ Step 5: EXECUTE (notion-update-page + TaskCreate)
```

---

### Step 1: SEARCH — 未着手依頼を抽出

`mcp__notion__notion-search` を呼び出す:

```
query: '未着手 担当 Claude' (FTS5 スペース区切り)
filter: { property: 'Status', value: '未着手' }
sort: { property: 'Created', direction: 'descending' }
```

該当 0 件なら「未消化なし、終了」 と表示して exit。

該当ありなら各エントリの { title, url, page_id, created } を一覧表示。

### Step 2: FETCH — 本文 + 添付取得

各エントリに対して `mcp__notion__notion-fetch` を呼び出す:

```
input: { id: page_id }
output: { title, content (markdown), children (添付 file URLs)、 properties }
```

添付画像 URL は `children[].file.url` から抽出 (= Notion 一時 URL、 期限あり)。

### Step 3: DOWNLOAD — docs/inbound/ 配置

各添付画像を WebFetch (画像直 URL) → `/tmp/<sha256>.<ext>` 経由で `docs/inbound/<YYYY-MM-DD>/<safe-title>-<n>.<ext>` に配置:

- **配置先固定**: `docs/inbound/<日付>/` (R-25 routing 違反防止)
- **ファイル名**: `<page title slug>-<連番>.<拡張子>` (alphanumeric + `-` のみ)
- **idempotency**: 同 sha256 が既に存在したら skip

### Step 4: PROPOSE (★ユーザー承認ポイント)

取込結果を 1 画面にまとめて提示:

```markdown
## Notion intake 結果 (3 件発見)

### 1. [Notion ページタイトル] (page_id: xxx)
- 添付: 2 枚 (docs/inbound/2026-06-14/screenshot-1.png, ...)
- 本文要約: [1-2 行]
- 次の一手: [user の依頼内容を Claude 用 task に変換した 1 行]

### 2. ...

### 3. ...

---

この内容で進めてよろしいですか?

- `OK` → Step 5 実行 (notion-update-page + TaskCreate)
- `修正: xxx` → 該当箇所を修正して再提示
- `スキップ: 2` → 2 番だけ除外して残りを実行
```

### Step 5: EXECUTE — Notion 更新 + TaskCreate

承認後、 各依頼に対して並列実行:

1. `mcp__notion__notion-update-page` でステータスを「着手中」 に変更
2. `TaskCreate` で「[Notion 依頼] <title>」 を pending タスクとして登録
3. `mem_save` で「Notion 依頼取込: <title> / page_id / Claude assign」 を learning として記録 (R-19 1KB 制約遵守)

実行完了後、 最終レポート:

```markdown
## Notion intake 完了

| 項目                | 結果                              |
| ------------------- | --------------------------------- |
| 取込件数            | 3 件                              |
| 添付ダウンロード    | 5 枚 → docs/inbound/2026-06-14/   |
| Notion ステータス   | 「着手中」 に更新済                |
| TaskCreate          | 3 task pending 登録               |
| Engram 保存         | 3 件 learning 保存                |
```

---

## モード

### `/notion-intake` (標準)

Step 1 → Step 2 → Step 3 → Step 4 (承認待ち) → Step 5。 上記フロー通り。

### `/notion-intake --dry-run`

Step 1 → Step 4 で提案を提示するだけ。 Step 5 は実行しない。 「こういう依頼があります」 の確認用途。

### `/notion-intake --filter <DB 名>`

特定の Notion DB / ページ配下のみを対象に絞り込み。

---

## エッジケース対応

| ケース                              | 挙動                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| Notion MCP 未認証                   | エラー時 silent skip、 「Notion MCP 認証してください」 案内    |
| BONSAI_NOTION_SYNC=off              | 全 step skip、 ユーザーに案内のみ                              |
| 添付 URL 期限切れ                   | WebFetch で 4xx → skip + 警告ログ                              |
| docs/inbound/ に同名ファイル        | sha256 一致なら skip、 不一致なら `-2` 連番 suffix             |
| Notion ステータス update 失敗       | TaskCreate は実行、 Notion 更新のみ retry 候補にして警告        |
| 依頼が 20 件超                      | ⚠️ 警告 + 「全件取込で良いか再確認」 (粒度違反防止)            |

---

## 他の Skill との棲み分け

| Skill           | 目的                                                | 使うタイミング                   |
| --------------- | --------------------------------------------------- | -------------------------------- |
| `/notion-intake`| **未着手依頼の取込**                                | セッション開始時 / 定期確認時    |
| `/notion-report`| **完了 PR/Issue を Notion に投稿** (出口側)         | /session-end の末尾で自動連結    |
| `/plan`         | 取込んだ依頼を ADR + Issue + Context に展開         | intake 後の構造化フェーズ        |

`/notion-intake` は入口側、 `/notion-report` は出口側で双方向同期を完成させる (Sess108 案 7 Stage C)。

---

## 最重要原則

1. **BONSAI_NOTION_SYNC=off のとき全 step skip** (env 失敗時の safety net)
2. **ユーザー承認なしに Notion ステータス変更しない** (Step 4 必須)
3. **添付配置先は `docs/inbound/<日付>/` 固定** (R-25 routing 違反防止)
4. **1 依頼 = 1 task の粒度を守る** (TaskCreate 暴走防止)
5. **idempotency**: 同じ session で 2 回 `/notion-intake` しても 2 重取込しない
