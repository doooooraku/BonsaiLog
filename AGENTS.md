# Project Agent Rules — {{APP_NAME}}

These rules apply to **ALL AI agents** working on this project:

- **Claude Code** (reads `.claude/CLAUDE.md`, which extends this file)
- **Codex** (reads this file directly)
- Any other AI coding agent

> This is the single source of truth for agent behavior. Do not duplicate rules in agent-specific files — extend this file via include/reference.

---

## 1. Core Rules (applies to all agents)

### 1.1 Research Before Acting (most important)

- **Always verify claims against PRIMARY sources**:
  - Official documentation (expo.dev, reactnative.dev, revenuecat.com, etc.)
  - GitHub Issues / Discussions / Release notes
  - Vendor release announcements
- **NEVER rely on blog posts alone** — they are secondary sources that may be outdated or incorrect.
- When referencing Stack Overflow, **always verify with a primary source** before acting.
- Explicitly separate **"fact" vs "hypothesis"** in all analyses:
  - ✅ "Fact: the docs state X (source: URL)"
  - ✅ "Hypothesis: this might be because Y (unverified)"
- If uncertain, **USE WebSearch / WebFetch to verify** before writing code.

### 1.2 Clear Communication

- Explain complex concepts "as if to a middle-school student".
- Avoid jargon unless necessary; when used, add a 1-line definition.
- Show your reasoning step-by-step, not just conclusions.
- Use tables / checklists when comparing options.

### 1.3 Fact-Based Discussion

- Remove bias: "what's actually true" > "what I believe".
- Consider multiple viewpoints (technical / UX / business / user / security).
- Question your own assumptions: "is there a better way?"
- When proposing a solution, also list what's wrong with it.

### 1.4 No Shortcuts

- Find **root causes**, not symptoms.
- No temporary fixes — use ADR (`docs/adr/`) if accepting a workaround.
- "Why did it work?" must be answerable, not just "it works".
- When stuck for >10 minutes, re-plan rather than keep trying.

### 1.5 Minimal Change Surface

- Change only what's needed for the task at hand.
- Don't refactor unrelated code.
- Don't add features beyond the issue scope.
- Don't add error handling for scenarios that can't happen.

### 1.6 Verify Before Done

- Run tests, check logs, diff against main.
- Prove it works before marking a task complete.
- Ask: "Would a senior engineer approve this?"

---

## 2. Project Context

### 2.1 Tech Stack

- Expo SDK 55+, React Native 0.83+, Expo Router v55
- UI: Tamagui v1
- State: Zustand + AsyncStorage (persist)
- DB: expo-sqlite (migrations with `PRAGMA user_version`)
- i18n: 19 languages (see `src/core/i18n/locales/`)
- IAP: RevenueCat (monthly / yearly / lifetime)
- Ads: AdMob + UMP consent
- Testing: Jest + Maestro
- Package manager: **pnpm** (npm is forbidden)

### 2.2 Source of Truth Priority

When in doubt, follow this priority:

1. **Code** (`package.json`, CI workflows, actual behavior)
2. **`docs/reference/constraints.md`** (immutable project rules)
3. **`docs/adr/`** (decisions with rationale)
4. Other specs (may be outdated)

### 2.3 Project Identity

- App name: `{{APP_NAME}}`
- Description: `{{DESCRIPTION}}`
- iOS bundle ID: `{{IOS_BUNDLE_IDENTIFIER}}`
- Android package: `{{ANDROID_PACKAGE}}`

---

## 3. Forbidden Actions

- ❌ Hardcode API keys, package IDs, or ad unit IDs in `src/` files
- ❌ `git push --force` without explicit user approval
- ❌ Bypass git hooks with `--no-verify`
- ❌ Delete `.env.example` (it's the template for new installs)
- ❌ Commit `.env` files (they're in `.gitignore`)
- ❌ Use `npm install` (use `pnpm` instead)
- ❌ Skip tests to make things "pass quickly"
- ❌ Mark a task complete without running `pnpm verify`

---

## 4. Agent Role Split (W-flow)

This project uses a hybrid Claude Code + Codex workflow. Each agent has a specific role in the W-flow (see `docs/how-to/workflow/whole_workflow.md`):

### Claude Code responsibilities

| W step | Name             | Purpose                                        |
| ------ | ---------------- | ---------------------------------------------- |
| W-00   | Feedback intake  | Turn store reviews / user reports into Issues  |
| W-01   | Identify problem | Decide value and boundary                      |
| W-02   | Create Issue     | Fill required fields in Issue Forms            |
| W-03   | Prioritize       | Impact × Effort × Risk                         |
| W-04   | Branch setup     | Create `feat/N-desc` from main                 |
| W-05   | Finalize spec    | Update constraints / ADR / glossary, define AC |
| W-05.5 | Handoff to Codex | Add `## Context for Codex` section to Issue    |
| W-10.5 | Review PR        | Verify AC + ADR compliance + impact scope      |
| W-11   | Merge            | Approve or request changes                     |
| W-11.5 | Spec audit       | Only at milestone / release                    |

Claude Code uses **"thinking" skills**: `/discuss`, `/plan`, `/review-pr`, `/retro`.

### Codex responsibilities

| W step | Name                | Purpose                        |
| ------ | ------------------- | ------------------------------ |
| W-06   | Implement           | Write the code (small commits) |
| W-07   | Write tests         | AC → Jest / Maestro            |
| W-08   | Local verify        | `pnpm verify` (5 gates)        |
| W-08a  | CI fix (if failure) | Auto-retry, then escalate      |
| W-09   | Commit + push       | Conventional commits           |
| W-10   | Create PR           | Fill PR template               |

Codex uses **"doing" skills**: `/implement`, `/fix-ci`, `/i18n-add`.

### Shared skills (either agent can use)

- `/progress` — 3-axis audit
- `/store-text` — generate store listing text
- `/release-check` — pre-release final check
- `/session-end` — end-of-session handoff (audit tasks, save memory, propose commit+push)

### Third-party auto-triggered skills (no explicit call needed)

Bundled from official upstreams. These trigger automatically when the conversation matches their description — you do not need to type `/xxx`.

| Skill                         | Source                                                                                      | When it triggers                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `skill-creator`               | [anthropics/skills](https://github.com/anthropics/skills) (official)                        | When creating, editing, or evaluating a new Skill                |
| `react-native-best-practices` | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) (MIT) | RN performance tasks (FPS, TTI, bundle size, memory, re-renders) |
| `upgrading-react-native`      | Callstack (same repo)                                                                       | RN / Expo SDK version upgrade (rn-diff-purge, CocoaPods, Gradle) |

**Supply-chain policy**: Only bundle third-party skills from **verified official publishers** (Anthropic, Callstack, Vercel, Cloudflare, Expo). Review each `SKILL.md` for hidden prompts before adding. Do not add skills based on popularity alone.

---

## 5. File Reference

- **Skills**:
  - Claude Code: `.claude/skills/`
  - Codex: `.codex/skills/` (or symlink to same directory)
- **Coding rules**: `docs/how-to/development/coding_rules.md`
- **Git workflow**: `docs/how-to/workflow/git_workflow.md`
- **Whole workflow (W-flow)**: `docs/how-to/workflow/whole_workflow.md`
- **Lessons learned**: `docs/reference/tasks/lessons.md`
- **Constraints**: `docs/reference/constraints.md`
- **Architecture decisions**: `docs/adr/`

---

## 6. How to Extend

When you learn a new rule that should apply across sessions:

1. Add it to this file (or propose via PR)
2. Document the why in `docs/reference/tasks/lessons.md`
3. If it's project-specific, use `docs/adr/` for the decision record
4. Cross-reference from `.claude/CLAUDE.md` or `.codex/` config
