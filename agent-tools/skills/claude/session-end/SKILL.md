---
name: session-end
description: End-of-session handoff — audit tasks, save Engram session summary, update Auto memory (MEMORY.md), and propose commit+push. Use when the user wants to close the current session, wrap up work, save progress to long-term memory, prepare for next session handoff, or runs "/session-end".
user-invocable: true
argument-hint: '[--dry-run | --auto] (任意)'
---

# /session-end — セッション終了ハンドオフ

ユーザーが「セッション閉じる」「終わりにする」「次に引き継ぐ」と言った時に呼ばれる、**次セッションへの引き継ぎを 1 コマンドで完結させる Skill**。

## このスキルが呼ばれる条件

以下のいずれかがユーザー発言に含まれる:

- 「セッション閉じる」「セッション終了」「終わりにする」「wrap up」
- 「次に引き継ぐ」「引き継ぎして」「ハンドオフ」
- 「今日はここまで」「一区切りつける」
- `/session-end` の明示呼び出し

## やってはいけないこと（重要）

- **ユーザー承認なしに commit / push しない**（Phase 2 で必ず提案を提示）
- **`.env` `*.key` `credentials.*` を memory や commit に含めない**（プライバシー禁則ハードガード）
- **長すぎる Engram サマリを保存しない**（What / Why / Where / Learned の構造で簡潔に）
- **memory 更新を毎回しない**（重要な学びが無いセッションではスキップ判断）
- **他の Skill を暴走起動しない**（`/retro` は別目的なので呼ばない）

---

## ワークフロー: 3 フェーズ設計

```
Phase 1: AUDIT (read-only, 完全自動)
  └→ Phase 2: PROPOSE (★ユーザー承認ポイント)
       └→ Phase 3: EXECUTE (承認後並列実行)
```

---

### Phase 1: AUDIT（完全自動、read-only）

以下を **並列で** 実行し、セッション状態を把握する:

#### 1.1 タスク状態確認

```
TaskList を呼び出し、以下を分類:
- completed: 何個
- in_progress: 何個 (ある場合は警告)
- pending: 何個 (ある場合は警告)
```

#### 1.2 Git 状態確認

```bash
PATH=/usr/bin:/bin:$PATH git status --short
PATH=/usr/bin:/bin:$PATH git log --oneline -5
PATH=/usr/bin:/bin:$PATH git branch --show-current
PATH=/usr/bin:/bin:$PATH git diff --stat
```

> **WSL2注意**: `PATH=/usr/bin:/bin:$PATH` を必ず prepend する (literal `${PATH}` 問題回避)

以下を抽出:

- **uncommitted 変更**: modified / untracked の一覧
- **現在のブランチ**: main か feature branch か
- **直近 commit**: 今セッションで作ったものか既存か
- **branch protection**: main の場合は要注意フラグ

#### 1.3 会話ログから重要な学び・決定を抽出

本セッションの会話全体を振り返り、以下を拾う:

- **決定事項**: ユーザーが「OK」「進めて」「採用」と言ったもの
- **発見**: デバッグで判明した root cause, 外部ドキュメントで確認した仕様
- **フィードバック**: ユーザーが訂正した点、明示的に褒めた点
- **ハマりポイント**: 同じミスを繰り返さないために記録すべきもの

これらは後で Engram 保存内容と MEMORY.md 更新候補として使う。

#### 1.4 Auto memory の状態確認

```bash
PATH=/usr/bin:/bin:$PATH ls ~/.claude/projects/*/memory/MEMORY.md 2>/dev/null
```

現プロジェクトの MEMORY.md パスを特定し、既存内容と重複しないか確認する。

#### 1.5 🛑 プライバシー禁則ハードガード

**以下を検出したら即停止し、ユーザーに警告する**:

- staged or modified ファイルに `.env` `.envrc` `*.pem` `*.key` `credentials.json` `~/.secrets.d/*`
- 会話ログ内にトークン・API key・パスワードが平文で含まれている疑い
- 氏名・メールアドレス・電話番号がセッション要約に入ろうとしている

検出時は **Phase 2 に進まず**、ユーザーに該当箇所を明示して判断を仰ぐ。

---

### Phase 2: PROPOSE（★ユーザー承認ポイント）

Audit 結果を整形して **1 画面にまとめて提示**し、ユーザーに「OK」or「修正」の判断を求める。

提示フォーマット (必ずこの構造):

```markdown
## 📋 セッション終了チェック

### タスク状態

- ✅ completed: N 個
- ⚠️ pending / in_progress: M 個 (← 残ってる場合のみ表示)

### Git 状態

- ブランチ: `branch-name`
- uncommitted 変更:
  - M path/to/file1 (短い説明)
  - ?? path/to/file2 (短い説明、commit 対象 or 除外)
- 今セッション commit: N 件 (`hash` 〜 `hash`)

### 💾 Engram に保存するサマリ草案

\`\`\`

## Goal

[1 行]

## Instructions

[ユーザー preference があれば]

## Discoveries

- [発見1]
- [発見2]

## Accomplished

- ✅ [完了1]
- 🔲 [次セッション候補]

## Relevant Files

- path/to/file — 説明
  \`\`\`

### 📚 MEMORY.md 更新提案

[新規セクション草案 or "更新なし (重要学習なし判定)"]

### 🚀 commit + push 提案

[含める場合のみ]

- コミット対象: [ファイル一覧]
- 除外: [ファイル一覧と理由]
- コミットメッセージ草案:
  \`\`\`
  <type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
\`\`\`

- push 先: `origin/<branch>`

---

**この内容で進めてよろしいですか?**

- `OK` → Phase 3 実行
- `修正: xxx` → 該当箇所を修正して再提示
- `スキップ: git` → git 関連だけスキップして Engram/memory のみ実行
```

---

### Phase 3: EXECUTE（承認後、可能な限り並列実行）

ユーザーが「OK」と言ったら、以下を **並列で** 実行:

#### 3.1 Engram 保存（必須、ほぼ毎回実行）

```
mem_session_summary を呼び出す:
- project: 現プロジェクト名 (pwd から推論)
- content: Phase 2 で提示したサマリ本文
```

空セッション（会話が 5 メッセージ以下 or 重要な決定なし）の場合は**スキップ可**。

#### 3.2 MEMORY.md 更新（該当時のみ）

重要な学びがある場合のみ Edit ツールで追記:

- 既存セクションの末尾 or 新規セクション追加
- フォーマットは既存スタイルに合わせる (プロジェクトごとに異なる場合あり)

#### 3.3 Git commit + push（承認時のみ）

```bash
PATH=/usr/bin:/bin:$PATH git add <specific files>  # -A は禁止
PATH=/usr/bin:/bin:$PATH git commit -m "$(cat <<'EOF'
<message>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
PATH=/usr/bin:/bin:$PATH git push origin <branch>
```

**main ブランチ + branch protection あり** の場合は:

- 単独コミット → 一時 relax で push (Repolog の既存運用に合わせる)
- または「PR 作成しますか?」と再確認

#### 3.4 最終レポート

実行完了後、以下のチェックリストをユーザーに提示:

```markdown
## ✅ セッション終了完了

| 項目                     | 結果                                     |
| ------------------------ | ---------------------------------------- |
| タスクリスト             | N/N completed                            |
| Engram サマリ保存        | ✅ project: xxx                          |
| MEMORY.md 更新           | ✅ / ⏭ skipped (理由)                   |
| commit + push            | ✅ `hash` → `origin/branch` / ⏭ skipped |
| プライバシー禁則チェック | ✅ clean                                 |

**次セッション開始時の復旧ポイント**:

- `mem_context` で今回のサマリが復旧可能
- MEMORY.md に追加された内容: [1 行要約]
- 次セッションの候補タスク: [あれば 1-2 行]

お疲れさまでした。
```

---

## モード

### `/session-end`（標準）

Phase 1 → Phase 2（承認待ち）→ Phase 3。上記フロー通り。

### `/session-end --dry-run`

Phase 1 → Phase 2 で **提案を提示するだけ**。Phase 3 は実行しない。
「こういう内容で保存します」の確認用途。

### `/session-end --auto`

Phase 2 の承認をスキップして Phase 1 → Phase 3 を直実行。
**非推奨デフォルト**。慣れた後、重要な commit が無いセッション向け。
プライバシー禁則ハードガードは --auto でも動作する。

---

## エッジケース対応

| ケース                                   | 挙動                                                           |
| ---------------------------------------- | -------------------------------------------------------------- |
| タスクに pending が残ってる              | ⚠️ 警告 + "強制終了しますか? / タスク完了を待ちますか?"        |
| uncommitted が 20 ファイル超             | ⚠️ "多すぎます。全部 commit で良いか再確認"                    |
| branch が main + protection あり         | ⚠️ 一時 relax で push か PR 作成か確認                         |
| 会話が短い (5 メッセージ以下)            | Engram 保存スキップ (価値なし判定)                             |
| `.env` `*.key` `credentials.*` が staged | 🛑 **即停止**。プライバシー禁則、ユーザー判断待ち              |
| push 失敗 (network)                      | Engram/MEMORY は保存済みでそのまま終了、ローカルに commit 残る |
| Engram MCP 接続エラー                    | MEMORY.md と commit は実行、Engram のみスキップして警告        |
| 既に MEMORY.md に同じ内容                | 重複判定で更新スキップ                                         |

---

## 他の Skill との棲み分け

| Skill            | 目的                                                    | 使うタイミング              |
| ---------------- | ------------------------------------------------------- | --------------------------- |
| `/session-end`   | **毎セッション** の終了手続き                           | 毎回のセッション終わり      |
| `/retro`         | マイルストーン振り返り (KPT + 5-why + 次アプリ handoff) | リリース / 大きな機能完了時 |
| `/progress`      | 3 軸進捗監査                                            | 定期チェック (週次等)       |
| `/memory-review` | memory システムの 2 週間メンテナンス                    | 腐敗チェック / 昇華候補抽出 |

**重なり注意**: `/retro` は今回のセッションだけでなく期間全体を扱う。`/session-end` は今回のセッションに閉じた範囲のみ扱う。

---

## プロジェクト非依存の設計

この Skill は **全プロジェクトで共通使用** することを前提とする:

- Engram project 名: `pwd` から basename で推論 (`Repolog`, `app_template`, etc.)
- MEMORY.md パス: `~/.claude/projects/<hash>/memory/MEMORY.md` を glob で検索
- commit message スタイル: 既存 `git log` から推論 (Conventional Commits か否か)
- branch protection: `gh api repos/:owner/:repo/branches/:branch/protection` で判定

プロジェクト固有の設定が必要になったら、将来的に `~/.claude/skills/session-end/config.yaml` でプロジェクト別設定を持たせる (現状は不要)。

---

## 最重要原則

1. **プライバシー禁則は例外なく守る** (`.env` / API key / 個人情報)
2. **ユーザー承認なしに外部影響のある操作をしない** (push / 共有リソース変更)
3. **Engram と MEMORY.md の使い分けを守る**:
   - Engram: 時系列のセッションサマリ (`mem_context` で復旧用)
   - MEMORY.md: 永続ルール・設定・長期パターン (index 型)
4. **冪等性**: 同じセッションで 2 回 `/session-end` しても壊れない
5. **失敗時はグレースフル**: 部分失敗でも他のフェーズは完了させる
