# Claude Code Rules — BonsaiLog

> **Primary source**: Read `AGENTS.md` at the repository root first.
> This file extends `AGENTS.md` with Claude Code-specific behavior.

## Extends

- `AGENTS.md` (core project rules for all agents)
- `docs/reference/constraints.md` (immutable project rules)
- `docs/how-to/development/coding_rules.md` (coding conventions)

---

## Claude Code Specific Behavior

### 1. Plan Mode First

- Tasks with 3+ steps or architectural impact MUST start in Plan mode
- If stuck, stop and re-plan immediately
- Write detailed specs before implementation
- Skills to prefer: `/discuss` (議論), `/plan` (W-01〜W-05)

### 2. Sub-Agent Strategy

- Keep main context window clean — delegate research to sub-agents
- 1 sub-agent = 1 task
- Use parallel sub-agents for independent queries (up to 5 concurrent)

**Project subagents** (installed at `~/.claude/agents/`):

| Agent              | Tools                  | Model | When to use                                               |
| ------------------ | ---------------------- | ----- | --------------------------------------------------------- |
| `eas-build-doctor` | Bash, Read, Glob, Grep | haiku | Before any local/remote EAS build — env validation        |
| `commit-helper`    | Bash, Read             | haiku | Drafting Conventional Commits messages with user approval |

> **Note**: Claude Code currently only loads subagents from `~/.claude/agents/` (user scope), not from `<repo>/.claude/agents/`. Master copies are kept under `.claude/agents/` for reference; copy them with `cp -n .claude/agents/*.md ~/.claude/agents/` if you need to (re)install. Verified 2026-04-11.

**Plan agent の critical claim は実装前に 1 次資料で Read 確認 (Sess90 PR-A 教訓)**:

Plan agent / cross-check agent からの出力で **framework specific な挙動主張** (= 「root → nested で cascade される」「type X は Y を受け入れる」「API Z は idempotent」 等) は agent の学習データに依存するため陳腐化リスクあり。 実装前に以下を Read で 1 次確認:

- **cascade / inherit 主張** → 該当 framework の docs or 既存 nested 実装 file (例: Expo Router なら `app/<group>/_layout.tsx` の screenOptions 設定状況を grep)
- **型制限 主張** → `@types/<lib>` or `node_modules/<lib>/types/` の type definition (例: `headerTitleStyle` の型は `node_modules/@react-navigation/native-stack/lib/typescript/...`)
- **API 挙動 主張** → SDK changelog or 既存呼び出し file での実装パターン (例: 「Expo deep link は (tabs) group route を受け入れる?」 → 既存 (modals) route の呼び出し方を grep)

確認漏れの代表例: Sess90 PR-A で Plan agent が「Expo Router root `<Stack screenOptions>` は nested に cascade」 と出力 → 実装中に nested で font 未適用発覚 → 4 nested layout 追加修正 (+10 分の手戻り)。 1 次資料 Read で 1 分の事前確認すれば回避可能だった。

### 3. Self-Improvement Loop

- Record corrections in `docs/reference/tasks/lessons.md`
- Write rules to prevent repeating the same mistakes
- Review lessons at session start

### 4. Discussion Mode (議論モード必須チェックリスト)

When the user asks to discuss / explore / plan (not implement):

- Use `/discuss` Skill
- Do NOT write code until explicitly approved
- Multiple expert viewpoints + bias removal + simulation

**議論開始前の必須チェック (R-13/R-14/R-16/R-17/R-20)**:

- [ ] **(R-13)** 議論冒頭で「本議論で **N 件質問**します、想定 **M ラウンド** です」を予告
- [ ] **(R-14)** ユーザーが「わからない」「専門用語多い」と発言したら、以降の応答で専門用語に「やさしい言い換え」併記強制
- [ ] **(R-16)** Design / モックアップ参照時は「Design は下書き、ADR が正」を冒頭明示
- [ ] **(R-20)** 「念のため」「再検証」「再議論」プロンプト時は議論開始前に既存 ADR / functional_spec の該当セクションを必ず Read
- [ ] **(R-7)** 議論深さ 3 ラウンド以上、(R-8) フラット視点専門家 1 名以上、(R-10) 4 ペルソナ評価必須
- [ ] **(R-17)** 「全部推薦で OK」回答受領しても即時実行禁止、TaskCreate → 計画提示 → 承認 → 実行 の 4 段階強制

**ファイル編集時の必須チェック (R-18 / R-1 自動化)**:

- [ ] **(R-18)** Edit / Write 前に必ず Read。`.claude/hooks/check-read-before-edit.mjs` が PreToolUse で block する
- [ ] **(R-1)** 一括編集後 `pnpm docs:lint` で取り消し線 / Codex 言及 / ADR 連番チェック (PostToolUse hook で自動 grep)

**Engram 保存時の制約 (R-19)**:

- [ ] **(R-19)** mem_save の content は 1KB (1024 文字) 以内、長文は ADR / Issue 本文に書く
- [ ] **(R-15)** mem_save が 30 秒以上応答ない場合はハング扱い、ユーザーに即時報告

---

## Session Start Checklist

On any new session, Claude Code should:

1. Read `AGENTS.md` (root) for core project rules
2. Read `.claude/CLAUDE.md` (this file) for Claude Code extensions
3. Read `docs/reference/tasks/lessons.md` (索引) — 必要な領域のみ `lessons/<domain>.md` を Read
4. **Read `.claude/recurrence-prevention.md` for behavioral rules (R-1〜R-57: 汎用 R-1〜R-12 + 専門 R-13〜R-57 索引)** — 必読、行動 lesson。 専門ルール詳細は `.claude/recurrence-prevention/specialized.md` を参照。 **3 回再発で hook / ESLint / CI に昇華必須** (CLAUDE.md §9 / 記憶の昇華ルール)、`scripts/docs-lint.mjs` で 250 行上限を自動検出
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
- `pnpm verify` — full check (lint + type-check + format + test + i18n + config + **docs:lint**)
- `pnpm test` — Jest unit tests
- `pnpm test:e2e` — Maestro E2E
- `pnpm build:android:apk:local` — local APK build (`SKIP_KEYS=1` for first build)
- `pnpm build:android:aab:local` — local AAB build for production
- `pnpm i18n:check` — verify all locale keys are present
- `pnpm docs:lint` — Codex 言及残存 / ADR 番号歯抜け / 取り消し線 / lessons.md 肥大化チェック
- `pnpm metadata:check` — validate `fastlane/metadata/`

---

## UI Diff 自動改善ループ運用ルール (Phase 0.1〜)

ユーザーが「ループ開始」「auto-improve loop start」と Claude に伝えたら、以下のルールで自動改善ループを実行する。詳細は `docs/how-to/ui-diff/auto-improve-loop.md` 参照。

### スコープ厳守
- ✅ UI 整合性のみ (style / layout / mockup integration)
- ❌ 機能追加 / DB schema 変更 / API 変更 / ADR 変更
- 機能変更が必要な場合は人間に上申 (`needs-human-review` ラベル)

### 承認モード (半自走)
- 各 PR 前に 1 文の計画提示 + 10 秒待機
- ユーザー応答なし = 暗黙承認
- ユーザーが「stop」「待って」で即停止

### 暴走対策 (3 重防御)
1. Kill switch: `/tmp/claude-stop.flag` 存在チェック (`scripts/ui-diff/kill-switch.mjs`)
2. Skip list: 同 flow 同箇所 2 回失敗で永久 skip (`scripts/ui-diff/skip-list.json`)
3. RMSE 悪化検知: latest > prev × 1.1 で `git revert HEAD` (`scripts/ui-diff/auto-revert.mjs`)

### PR テンプレ
- title: `fix(ui-diff-auto): <flow-id> <修正概要>`
- body: 整合度 before/after + diff PNG link + 修正根拠
- 全 PR で `pnpm verify` 緑 + GitHub CI 緑必須

### 終了条件
- 全 41 画面 (4 HTML 内全画面) 整合度レベル 2 (80%) 達成
- ユーザー停止指示
- Kill switch 検知

### 進捗共有
- `scripts/ui-diff/out/SUMMARY-loop.md` 毎サイクル更新
- 5 サイクルごとに Engram session_summary 保存
