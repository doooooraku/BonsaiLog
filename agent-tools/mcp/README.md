# agent-tools/mcp

MCP（Model Context Protocol）の方針と、secret なしテンプレートを置く場所です。

結論：**Codex 側の MCP は Engram-only で維持します。**  
Notion / Gmail / Drive などの MCP は、今は Codex へ移植しません。

---

## このディレクトリに置いてよいもの

- README
- secret なしのテンプレート
  - 例：`*.example.*`
  - 値は `<PLACEHOLDER>` にする
- セットアップ時の注意事項

## 置いてはいけないもの

- API キー、トークン、パスワード、シークレット
- OAuth の認証済み情報
- `.env` / `.envrc` / `*.pem` / `*.key` / `credentials.json` の中身
- 個人情報（氏名、メールアドレス、電話番号）
- 顧客名、社内サービス URL
- 端末固有の絶対パスを含む実設定

---

## Codex 方針: Engram-only

Codex で維持する MCP は Engram だけです。

Engram は、AI エージェント用の長期記憶 MCP です。過去の判断・学び・セッション要約を保存し、次回以降の作業で思い出せるようにします。

理由：

1. Codex に必要な長期記憶は Engram で足りる。
2. Notion / Gmail / Drive は権限が強く、誤操作や秘密情報流出のリスクが上がる。
3. 実装・保守・認証の負荷を増やさず、最小構成を保つ。

もし Codex で外部サービス MCP が必要になった場合は、次を確認してから別途判断します。

- 何の作業に必要か
- 読み取り専用で足りるか
- 秘密情報や個人情報が流れないか
- Claude Code 側で代替できないか
- ADR が必要な変更か

---

## 実設定は共有しない

実際の MCP 設定は各開発者のローカル環境で管理します。

例：

- Codex のユーザー設定（例：`~/.codex/config.toml`）
- Claude Code のローカル設定
- OAuth 認証状態
- 端末ごとの実行パス

この repo には、接続済みの実設定を置きません。必要なら secret なしテンプレートだけを追加します。

---

## テンプレートを書くときのルール

テンプレートには本物の値を入れないでください。

良い例：

```toml
[mcp_servers.engram]
command = "<PATH_TO_ENGRAM_COMMAND>"
args = ["<ARG_IF_NEEDED>"]
```

悪い例：

```toml
[mcp_servers.some-service]
url = "<REAL_INTERNAL_URL_SHOULD_NOT_BE_COMMITTED>"
token = "<REAL_TOKEN_SHOULD_NOT_BE_COMMITTED>"
```

---

## 関連ADR

- `docs/adr/ADR-0012-agent-tools-unified-management.md`
