# ADR-0012: Claude Code / Codex Skills と MCP の一元管理方針

- Status: Accepted
- Date: 2026-04-29
- Deciders: @doooooraku
- Related:
  - `agent-tools/README.md`
  - `agent-tools/mcp/README.md`
  - `AGENTS.md` §4（Agent Role Split）
  - `agent-tools/scripts/sync-agent-tools.mjs`
  - `agent-tools/scripts/check-agent-tools.mjs`
  - `package.json` scripts: `ai:sync`, `ai:doctor`

---

## Context（背景：いま何に困っている？）

- 現状：
  - BonsaiLog は Claude Code と Codex を併用する W-flow を採用している。
  - Skills はツールごとに配置先が分かれる。
    - Claude Code: `.claude/skills/`
    - Codex（現運用）: `.codex/skills/`
    - Codex 公式候補: `.agents/skills/`
  - 2026-04-29 時点のローカル実態では `.codex/skills/` は存在し、`.agents/skills/` は存在しない。
  - `agent-tools/skills/` を共通正本の置き場として導入する。
- 困りごと：
  1. **同じ Skill を複数ディレクトリで手編集するとズレる**。
  2. **Codex 公式の `.agents/skills/` へ即移行すると、現運用の `.codex/skills/` 互換を壊す可能性がある**。
  3. **MCP 設定は秘密情報・個人環境・OAuth 状態を含みやすく、repo で実設定を共有すると危険**。
  4. **Claude 側の Notion/Gmail/Drive などを Codex へ無差別に移植すると、権限面・保守面の負荷が増える**。
- 制約/前提：
  - `AGENTS.md` のプライバシー禁則により、API キー・トークン・パスワード・`.env` 等の中身は記録しない。
  - 公式仕様は変わり得るため、変わりやすい詳細は Links の一次情報へ寄せる。

---

## Decision（決めたこと：結論）

- 決定：Claude Code / Codex Skills と MCP は、次の方針で一元管理する。

1. **Skills の正本は `agent-tools/skills/` とする**。
   - 新規追加・修正・削除は正本側で行う。
   - 正本から各ツールのネイティブ配置へ生成する。

2. **`.claude/skills/` と `.codex/skills/` は生成先とする**。
   - 生成先は手編集しない。
   - 生成先の差分が必要になった場合は、正本または生成ロジックを修正する。

3. **Codex 公式候補の `.agents/skills/` は将来検証候補に留める**。
   - 当面は現運用の `.codex/skills/` を維持する。
   - `.agents/skills/` へ切り替える場合は、ローカル Codex CLI / IDE / CI で読み込み確認を行い、別 ADR または本 ADR の更新で扱う。

4. **MCP は Codex 側では Engram だけ維持する**。
   - Codex で必要な長期記憶は Engram で足りるため、Notion / Gmail / Drive などは現時点では移植しない。
   - 外部サービス MCP が必要になった場合は、ユースケース・権限・秘密情報の扱いを別途判断する。

5. **MCP の実設定は共有しない**。
   - repo には秘密情報なしの README / テンプレートだけを置く。
   - 実際の `~/.codex/config.toml`、Claude のローカル設定、OAuth トークン、API キー、端末固有パスは各開発者のローカルで管理する。

- 適用範囲：BonsaiLog repo 内の agent tools（Skills / MCP 文書 / 将来の生成スクリプト）。

---

## Decision Drivers（判断の軸：何を大事にした？）

- Driver 1: **ドリフト防止** — 正本を 1 箇所にして、同じ Skill の二重管理を避ける。
- Driver 2: **現運用の安定性** — `.codex/skills/` を維持し、未検証の公式候補へ急に寄せない。
- Driver 3: **ツール互換性** — Claude Code / Codex それぞれが読みやすいネイティブ配置を残す。
- Driver 4: **セキュリティ** — MCP 実設定・秘密情報・OAuth 状態を repo に入れない。
- Driver 5: **最小変更** — project Skills を正本へ移し、生成・検査コマンドを最小導入する。

---

## Alternatives considered（他の案と却下理由）

### Option A: `.claude/skills/` と `.codex/skills/` をそれぞれ手編集する

- 概要：各ツールの配置先をそのまま正本として扱う。
- 良い点：生成スクリプトが不要で、短期的には分かりやすい。
- 悪い点：同じ Skill の差分がすぐにズレる。どちらが正か分からなくなる。
- 却下理由：一元管理の目的に反する。

### Option B: Codex 公式候補の `.agents/skills/` へ即移行する

- 概要：Codex 側の生成先を `.codex/skills/` から `.agents/skills/` へ置き換える。
- 良い点：公式ドキュメント上の方向性に寄せやすい。
- 悪い点：現ローカル実態では `.codex/skills/` が使われており、CLI / IDE / CI での読み込み確認がまだ不足している。
- 却下理由：未検証の移行で Codex Skill 読み込みを壊すリスクがある。当面は `.codex/skills/` を維持する。

### Option C: シンボリックリンクで配置先を共通化する

- 概要：`.claude/skills/` や `.codex/skills/` を `agent-tools/skills/` への symlink にする。
- 良い点：コピー生成よりズレにくい。
- 悪い点：ツールローダー互換、OS 差、Git 上の扱い、将来の plugin / marketplace 連携で不確実性がある。
- 却下理由：安定性優先。生成コピー方式のほうがツールごとの期待配置を保ちやすい。

### Option D: MCP の実設定を repo で共有する

- 概要：`.mcp.json` や Codex config の実体を repo に置く。
- 良い点：セットアップが速い。
- 悪い点：API キー、OAuth トークン、個人パス、社内 URL などが混入しやすい。
- 却下理由：プライバシー禁則とセキュリティに反する。README / secret なしテンプレートに限定する。

### Option E: Claude 側の Notion / Gmail / Drive MCP も Codex へ移植する

- 概要：Claude Code で使える MCP 群を Codex にも全面展開する。
- 良い点：Codex から扱える外部コンテキストが増える。
- 悪い点：認可・秘密情報・誤操作・保守範囲が増える。現時点の Codex 主要用途には過剰。
- 却下理由：Codex 側は Engram-only で十分。必要になった時に個別検討する。

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- Skill の編集場所が `agent-tools/skills/` に固定され、初心者でも迷いにくい。
- `.claude/skills/` と `.codex/skills/` は生成物として安全に上書きできる。
- Codex 側は既存の `.codex/skills/` を維持するため、現在の作業フローを壊しにくい。
- MCP 秘密情報を repo に置かないため、情報漏えいリスクを下げられる。

### Negative（辛い/副作用）

- 生成スクリプト / 検証コマンドが整うまでは、正本と生成先の同期確認が手動になる。
- `.agents/skills/` への追従は後回しになるため、公式仕様が変わった場合は再検証が必要。
- Codex から Notion / Gmail / Drive に直接アクセスするユースケースは、当面は対象外になる。

### Follow-ups（後でやる宿題）

- [x] 生成スクリプトと `package.json` scripts を最小導入する。
- [x] project Skills を `agent-tools/skills/` に置き、生成対象にする。
- [ ] `.agents/skills/` を Codex CLI / IDE / CI で検証し、採用可否を判断する。
- [ ] MCP テンプレートが必要になった場合は、secret なしの `*.example.*` と README のみ追加する。
- [ ] 生成先に「手編集禁止」マーカーを入れるかを検討する。

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - `pnpm ai:sync -- --check`
  - `pnpm ai:doctor`
  - `pnpm exec prettier --check agent-tools docs/adr/ADR-0012-agent-tools-unified-management.md package.json`
- 手動チェック：
  - 手順：
    1. `git diff -- docs/adr/ADR-0012-agent-tools-unified-management.md agent-tools package.json .codex/README.md AGENTS.md .claude/skills .codex/skills` を確認する。
    2. 変更が agent-tools / ADR / package scripts / 生成対象 Skill に限定されていることを確認する。
    3. ADR に以下が明記されていることを確認する。
       - `agent-tools/skills/` が正本
       - `.claude/skills/` と `.codex/skills/` が生成先
       - `.agents/skills/` は将来検証候補、当面 `.codex/skills/` 維持
       - Codex MCP は Engram-only
       - MCP 実設定は共有せず secret なしテンプレート / README で管理
  - 期待結果：上記を満たし、無関係な docs 変更に触れていない。

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - 生成スクリプト実装後は、Skill 変更時に「正本編集 → 生成 → diff 確認」を必須運用にする。
- ロールバック方針：
  - 本方針を取り消す場合は、この ADR を Superseded にし、正本ディレクトリと生成先の扱いを新 ADR で明確化する。
- 検知方法：
  - `.claude/skills/` または `.codex/skills/` に正本へ反映されていない手編集差分が出たら運用違反として検知する。

---

## Links（関連リンク：正へ寄せる）

- operation: `agent-tools/README.md`
- MCP policy: `agent-tools/mcp/README.md`
- agent rules: `AGENTS.md`
- External docs:
  - [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills)
  - [OpenAI Codex MCP](https://developers.openai.com/codex/mcp)
  - [Anthropic Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)

---

## Notes（メモ：任意）

この ADR は project Skills の正本化を起点にする。`.agents/skills/` 採用は、別途検証してから段階的に進める。
