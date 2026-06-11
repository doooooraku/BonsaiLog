# Claude Code Rules — BonsaiLog

> **Primary source**: Read `AGENTS.md` at the repository root first.
> This file extends `AGENTS.md` with Claude Code-specific behavior.

## Extends

- `AGENTS.md` (core project rules for all agents)
- `docs/reference/constraints.md` (immutable project rules)
- `docs/how-to/development/coding_rules.md` (coding conventions)
- `docs/reference/doc-routing.md` (Code→Docs ルーティング原本 — 該当 path の Read 時に `.claude/rules/routing/*` が自動注入される)

---

## Claude Code Specific Behavior

### 1. Plan Mode First

- Tasks with 3+ steps or architectural impact MUST start in Plan mode
- If stuck, stop and re-plan immediately
- Write detailed specs before implementation
- Skills to prefer: `/discuss` (議論), `/plan` (W-01〜W-05)

### 2. Sub-Agent Strategy

- Keep main context window clean — delegate research to sub-agents
- 1 sub-agent = 1 task / 独立 query は並列 (up to 5 concurrent)
- **Plan agent の critical claim は実装前に 1 次資料を Read で確認** (Sess90 PR-A 教訓): framework 挙動 (cascade/inherit)・型制限・API 挙動の主張は agent の学習データ依存で陳腐化リスクあり。確認先 = framework docs / `node_modules/<lib>` の型定義 / 既存実装の grep。事例詳細: `docs/reference/tasks/lessons/retro.md` の [2026-06-10] Sess90 エントリ

| Agent              | Tools                  | Model | When to use                                               |
| ------------------ | ---------------------- | ----- | --------------------------------------------------------- |
| `eas-build-doctor` | Bash, Read, Glob, Grep | haiku | Before any local/remote EAS build — env validation        |
| `commit-helper`    | Bash, Read             | haiku | Drafting Conventional Commits messages with user approval |

<!-- 人間向け注記: Claude Code は subagents を ~/.claude/agents/ (user scope) から load する。
     master copy は .claude/agents/ に保管。再 install: cp -n .claude/agents/*.md ~/.claude/agents/
     (Verified 2026-04-11) -->

### 3. Self-Improvement Loop

- Record corrections in `docs/reference/tasks/lessons/` (領域索引は `lessons/README.md` が唯一の正)
- Write rules to prevent repeating the same mistakes
- Review lessons at session start

### 4. 議論・編集・記憶の必須チェック (正本 pointer)

重複記載しない (多重コピーは drift 源)。正本と注入経路:

- **議論モード checklist (R-7/8/10/13/14/16/17/20)**: hooks が毎セッション自動注入 (SessionStart + UserPromptSubmit)。正本は `.claude/recurrence-prevention.md` + `.claude/recurrence-prevention/specialized.md`
- **Edit/Write 前 Read (R-18)**: `.claude/hooks/check-read-before-edit.mjs` が PreToolUse で block
- **一括編集後 lint (R-1)**: PostToolUse hook が自動実行 + 機械修正後は full diff + Read 目視 (grep 検算だけは禁止)
- **Engram 制約 (R-19 content ≤1KB / R-15 30 秒無応答はハング報告)**: SessionStart hook が注入

---

## Session Start Checklist

On any new session, Claude Code should:

1. Read `AGENTS.md` (root) for core project rules
2. Read `.claude/CLAUDE.md` (this file) for Claude Code extensions
3. Read `docs/reference/tasks/lessons/README.md` (領域索引) — 必要な領域のみ `lessons/<domain>.md` を Read
4. **Read `.claude/recurrence-prevention.md`** (汎用 R + 専門 R の索引、最新の R 番号は同ファイルが正) — 必読、行動 lesson。詳細は `.claude/recurrence-prevention/specialized.md`。**3 回再発で hook / ESLint / CI に昇華必須** (user global CLAUDE.md §9)。行数上限・索引 parity は `scripts/docs-lint.mjs` が機械検出 (チェック一覧は script 冒頭 doc が正)
5. **Read `docs/reference/personas.md` if exists** — 議論時にペルソナ評価で使用
6. If Plan mode: read `docs/reference/constraints.md` + relevant ADRs

---

## Claude Code Skills Available

| Skill            | When to use                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `/discuss`       | User wants to discuss / explore / compare options (no code changes) |
| `/plan`          | W-01〜W-05: Turn a problem into a ready-to-implement Issue          |
| `/review-pr`     | W-10.5: Review a PR (self-review or another Claude Code session)    |
| `/retro`         | Milestone / release retrospective                                   |
| `/progress`      | 3-axis audit (planning / integration / quality)                     |
| `/store-text`    | Generate App Store / Google Play listing text                       |
| `/release-check` | Pre-release final check                                             |

Implementation Skills (Claude Code 単独運用、2026-05-01 から両系統 Skill を Claude Code が使う):

- `/implement` — W-06〜W-10 implementation
- `/fix-ci` — W-08a CI recovery
- `/i18n-add` — W-06 i18n key addition

---

## Commands

- `pnpm dev` — start Metro
- `pnpm verify` — full check chain (構成は `package.json` の `verify` script が正)
- `pnpm test` — Jest unit tests / `pnpm test:e2e` — Maestro E2E
- `pnpm build:android:apk:local` — local APK build (`SKIP_KEYS=1` for first build)
- `pnpm build:android:aab:local` — local AAB build for production
- `pnpm i18n:check` — verify all locale keys are present
- `pnpm docs:lint` — docs 整合 lint (チェック一覧は `scripts/docs-lint.mjs` 冒頭 doc が正)
- `pnpm metadata:check` — validate `fastlane/metadata/`
- `pnpm gen:doc-routing` — `doc-routing.md` → `.claude/rules/routing/*` 再生成 (drift は `verify:doc-routing` が検出)

---

## UI 整合 (mockup 寄せ) の標準

写経駆動 (R-29 5 段階) + `/device-verify` が標準 (ADR-0059)。旧「UI Diff 自動改善ループ」は退役済み — 「ループ開始」指示が来たら ADR-0059 の標準フローを案内すること。
