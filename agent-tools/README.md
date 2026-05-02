# agent-tools

Claude Code / Codex で使う「エージェント用ツール」の正本置き場です。

初心者向けに言うと、ここは **AI エージェント用の作業手順書を置く棚** です。  
各ツールが読みやすい場所（`.claude/skills/` / `.codex/skills/`）へは、ここから生成します。

---

## 一番大事なルール

### ✅ ここだけ編集する

Skills を追加・修正・削除するときは、正本である次の場所を編集します。

```text
agent-tools/skills/
```

### ❌ 生成先は手編集しない

次のディレクトリは生成先です。直接編集しないでください。

```text
.claude/skills/
.codex/skills/
```

理由：生成先を手で直すと、次の生成で上書きされます。さらに「どれが正しい内容か」が分からなくなります。

現時点では、BonsaiLog の project Skills は `agent-tools/skills/` へ移行済みです。

---

## ディレクトリの役割

```text
agent-tools/
  README.md          # この運用ルール
  skills/            # Skills の正本。ここを編集する
    shared/          # Claude Code / Codex の両方へ生成する Skill
    claude/          # Claude Code だけへ生成する Skill
    codex/           # Codex だけへ生成する Skill
  scripts/           # 生成・検査コマンド
  mcp/               # MCP 方針・secret なしテンプレート用
```

### Skills とは？

AI エージェントに「この作業はこう進める」と教える小さな手順書です。  
例：実装手順、CI 修正手順、PR レビュー手順など。

### MCP とは？

AI エージェントが外部ツールやデータに接続するための仕組みです。  
ただし、MCP は秘密情報を含みやすいため、この repo では実設定を共有しません。

---

## 基本フロー

1. `agent-tools/skills/` を編集する。
2. 生成コマンドを実行する。
   ```bash
   pnpm ai:sync
   ```
3. `.claude/skills/` と `.codex/skills/` の差分を確認する。
4. 生成先に手編集差分が混ざっていないことを確認する。
5. 検査コマンドを実行する。
   ```bash
   pnpm ai:doctor
   ```

> 生成先を直したくなったら、まず「正本か生成ロジックを直せないか？」を確認してください。

---

## コマンド

### `pnpm ai:sync`

正本から生成先へ Skill をコピーします。

```text
agent-tools/skills/shared/* + agent-tools/skills/claude/* -> .claude/skills/
agent-tools/skills/shared/* + agent-tools/skills/codex/*  -> .codex/skills/
```

生成先を全部消すのではなく、正本にある対象 Skill のディレクトリだけを置き換えます。
`--help` は説明を表示するだけで、同期は実行しません。

### `pnpm ai:sync -- --check`

書き込みなしで、正本と生成先が一致しているか確認します。

### `pnpm ai:doctor`

次を検査します。

- `agent-tools/skills/` が存在するか
- `SKILL.md` の `name` / `description` があるか
- folder 名と `name` が一致しているか
- 正本と生成先が同期されているか
- Codex MCP に `engram` があるか
- 正本に `API_KEY=` / `TOKEN=` / `PASSWORD=` / `SECRET=` 形式の secret 代入が混ざっていないか

---

## Codex の `.agents/skills` について

Codex 公式の配置候補として `.agents/skills/` があります。  
ただし BonsaiLog では、当面は現運用の `.codex/skills/` を維持します。

`.agents/skills/` へ切り替える場合は、Codex CLI / IDE / CI で読み込み確認をしてから ADR を更新します。

---

## MCP の扱い

MCP 方針は `agent-tools/mcp/README.md` を見てください。

要点：

- Codex 側は Engram-only。
- Notion / Gmail / Drive などは今は Codex へ移植しない。
- 実設定・API キー・OAuth トークン・個人パスは repo に置かない。
- 共有するのは README と secret なしテンプレートだけ。

---

## 関連ADR

- `docs/adr/ADR-0012-agent-tools-unified-management.md`
