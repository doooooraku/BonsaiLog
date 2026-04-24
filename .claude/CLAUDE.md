# Claude Code Rules — {{APP_NAME}}

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

**Project subagents** (installed at `~/.claude/agents/` via `setup.sh`):

| Agent              | Tools                  | Model | When to use                                               |
| ------------------ | ---------------------- | ----- | --------------------------------------------------------- |
| `eas-build-doctor` | Bash, Read, Glob, Grep | haiku | Before any local/remote EAS build — env validation        |
| `commit-helper`    | Bash, Read             | haiku | Drafting Conventional Commits messages with user approval |

> **Note**: Claude Code currently only loads subagents from `~/.claude/agents/` (user scope), not from `<repo>/.claude/agents/`. The template ships master copies under `.claude/agents/` and `setup.sh` installs them with `cp -n` (existing user customizations are preserved). Verified 2026-04-11.

### 3. Self-Improvement Loop

- Record corrections in `docs/reference/tasks/lessons.md`
- Write rules to prevent repeating the same mistakes
- Review lessons at session start

### 4. Discussion Mode

When the user asks to discuss / explore / plan (not implement):

- Use `/discuss` Skill
- Do NOT write code until explicitly approved
- Multiple expert viewpoints + bias removal + simulation

---

## Session Start Checklist

On any new session, Claude Code should:

1. Read `AGENTS.md` (root) for core project rules
2. Read `.claude/CLAUDE.md` (this file) for Claude Code extensions
3. Read recent `docs/reference/tasks/lessons.md` entries for project-specific learnings
4. If Plan mode: read `docs/reference/constraints.md` + relevant ADRs

---

## Claude Code Skills Available

| Skill            | When to use                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `/discuss`       | User wants to discuss / explore / compare options (no code changes) |
| `/plan`          | W-01〜W-05: Turn a problem into a ready-to-implement Issue          |
| `/review-pr`     | W-10.5: Review a PR created by Codex                                |
| `/retro`         | Milestone / release retrospective                                   |
| `/progress`      | 3-axis audit (planning / integration / quality)                     |
| `/store-text`    | Generate App Store / Google Play listing text                       |
| `/release-check` | Pre-release final check                                             |

Skills that belong to **Codex** (don't use these directly from Claude Code):

- `/implement` — W-06〜W-10 implementation
- `/fix-ci` — W-08a CI recovery
- `/i18n-add` — W-06 i18n key addition

---

## Commands

- `pnpm dev` — start Metro
- `pnpm verify` — full check (lint + type-check + format + test + i18n + config)
- `pnpm test` — Jest unit tests
- `pnpm test:e2e` — Maestro E2E
- `pnpm build:android:apk:local` — local APK build (`SKIP_KEYS=1` for first build)
- `pnpm build:android:aab:local` — local AAB build for production
- `pnpm i18n:check` — verify all locale keys are present
- `pnpm metadata:check` — validate `fastlane/metadata/`
