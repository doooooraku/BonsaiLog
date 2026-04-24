# Codex Agent Configuration

This directory contains Codex-specific configuration and Skills.

## Role Split

Codex handles **W-06〜W-11 CI** of the W-flow (see `docs/how-to/workflow/whole_workflow.md`):

- W-06: Implementation
- W-07: Test writing
- W-08: Local verification (`pnpm verify`)
- W-08a: CI fix on failure (auto-retry once, then escalate)
- W-09: Commit + push
- W-10: PR creation

Claude Code handles everything else. See `AGENTS.md` (root) for full rules.

## Skills

| Skill        | W step     | Purpose                                                                         |
| ------------ | ---------- | ------------------------------------------------------------------------------- |
| `/implement` | W-06〜W-10 | Execute the implementation plan from the Issue's `## Context for Codex` section |
| `/fix-ci`    | W-08a      | CI failure recovery                                                             |
| `/i18n-add`  | W-06 i18n  | Add a key to all 19 locale files                                                |

## How to use

Codex reads `AGENTS.md` (root) as the primary rules source.
This directory is for Codex-specific extensions only.

### Entry point

When the user writes `/implement #123` to Codex:

1. Codex reads `AGENTS.md`
2. Codex reads `.codex/skills/implement.md` (this Skill)
3. Codex reads the GitHub Issue #123 (including `## Context for Codex`)
4. Codex executes W-06〜W-10

## Priority

**Codex integration is low priority** (per user decision 2026-04-11).
First, operate with Claude Code-only for 2 weeks using `/plan` + `/review-pr`.
If implementation parallelism is needed, activate Codex.
