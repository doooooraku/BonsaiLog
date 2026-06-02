# BonsaiLog Override — skill-creator

> **目的**: upstream Anthropic の `SKILL.md` は無改変のまま、BonsaiLog 固有の skill 開発・改善の文脈をここに追補する (ADR-0051 D-6)。本ファイルは `pnpm ai:sync` で `agent-tools/skills/claude/skill-creator/` → `.claude/skills/skill-creator/` に自動コピーされる。
> **使い方**: Claude Code が `skill-creator` skill を発火した時、SKILL.md 本体と併せて本ファイルを Read し、 BonsaiLog の skill 命名規約 / 配置 / 評価手順を踏まえて作業する。

---

## 1. BonsaiLog の skill 構造 (SoT は `agent-tools/skills/` + ADR-0012)

### 1-1. ディレクトリレイアウト

```
agent-tools/skills/
├── shared/    # Claude Code + Codex 共用 (現在 Codex は不採用、 AGENTS.md L6 参照)
├── claude/    # Claude Code 専用 → .claude/skills/ に sync
└── codex/     # Codex 専用 → .codex/skills/ に sync (現在は実質未使用)
```

`pnpm ai:sync` で `.claude/skills/` / `.codex/skills/` に **完全コピー** (`cp -r`、 rm -rf 後の再生成、 sync-agent-tools.mjs L255-256)。**直接 `.claude/skills/` を編集しないこと** (次回 ai:sync で削除される)。

### 1-2. 命名規約

| skill 種別 | 命名 pattern | 配置 group | 例 |
| --- | --- | --- | --- |
| W-flow 連動 (議論/実装/レビュー等) | kebab-case | `agent-tools/skills/claude/` | `discuss`, `plan`, `review-pr`, `implement` |
| ドメイン特化 (release / store text 等) | kebab-case + ドメイン suffix | `agent-tools/skills/claude/` | `release-android`, `release-check`, `store-text` |
| Third-party auto-trigger (Callstack / Anthropic 上流から bundle) | kebab-case (upstream 準拠) | `agent-tools/skills/claude/` | `react-native-best-practices`, `upgrading-react-native`, `skill-creator` |

### 1-3. 必須ファイル

```
agent-tools/skills/claude/<skill-name>/
├── SKILL.md              # frontmatter (name / description) + 本文 (必須)
├── BONSAI-OVERRIDE.md    # BonsaiLog 文脈追補 (任意、 third-party skill で推奨)
├── scripts/              # 同梱スクリプト (任意)
├── references/           # 参照資料 (任意)
└── assets/               # 静的資産 (任意)
```

---

## 2. skill-creator 同梱スクリプトの BonsaiLog 適用

skill-creator は `.claude/skills/skill-creator/scripts/` に以下を同梱:

- `improve_description.py` — description の triggering 率最適化 (Anthropic API key 必要、 ADR-0047 「追加課金ゼロ」 抵触の可能性あり)
- `run_eval.py` — skill 単体評価 (test prompts に対する発火率測定)
- `aggregate_benchmark.py` — 複数 skill のベンチマーク統合
- `quick_validate.py` — SKILL.md frontmatter / syntax 検証 (API key 不要、 ローカル静的解析)
- `package_skill.py` — skill をパッケージ化
- `generate_report.py` — eval 結果のレポート生成 (Markdown 出力)

### 2-1. 追加課金ゼロ厳守の運用 (ADR-0047 / ADR-0051 D-2)

- `improve_description.py` / `run_eval.py` / `aggregate_benchmark.py` は **Anthropic API トークン消費** する可能性が高い → BonsaiLog 単独運用では **原則実行しない**
- 例外: ADR で「skill triggering 改善のため X 回まで実行可」 を SoT 化した上で、 月額上限を明文化した場合のみ
- 代替: `quick_validate.py` (API 不要) + 手動 prompt テスト (新規セッションで該当キーワードを投げて発火確認)

### 2-2. quick_validate.py 推奨用法

新規 skill 追加 PR の前に必ず実行:

```bash
python .claude/skills/skill-creator/scripts/quick_validate.py \
  .claude/skills/<new-skill>/SKILL.md
```

期待出力: frontmatter (name / description) の syntax 緑、 本文の見出し階層緑。

---

## 3. BonsaiLog 既存 12 skill の triggering 評価サンプル (Sess63 audit より)

| Skill | description 1 行 | Engram 言及 (90d) | git log 言及 (90d) | 使用頻度判定 |
| --- | --- | ---: | ---: | --- |
| `plan` | Turn a problem into a ready-to-implement Issue | 6696 | 58 | ✅ ヘビーユース |
| `discuss` | Multi-expert team discussion | 4340 | 20 | ✅ ヘビーユース |
| `session-end` | End-of-session handoff | 3482 | 2 | ✅ ヘビーユース |
| `release-android` | Android クローズドテスト AAB ビルド + Submit | 1501 | 28 | ✅ よく使用 |
| `retro` | KPT + timeline retrospective | 1236 | 6 | ✅ よく使用 |
| `review-pr` | W-10.5 PR review | 602 | 1 | ⚠️ 中程度 |
| `release-check` | Pre-release final check | 294 | 3 | ⚠️ 中程度 |
| `store-text` | App Store / Play listing text | 250 | 6 | ⚠️ 中程度 |
| `progress` | 3-axis project audit | 202 | 2 | ⚠️ 形骸化リスク |
| `upgrading-react-native` | RN upgrade via rn-diff-purge | 84 | 0 | ❌ 低 → 活用強化対象 (ADR-0051 D-6) |
| `skill-creator` | Create / edit / measure skills | 63 | 0 | ❌ 低 → 活用強化対象 (本ファイル対象) |
| `react-native-best-practices` | RN performance guidelines | 17 | 1 | ❌ 低 → 活用強化対象 |

**結論**: 低 triggering 3 skill は **退役不要**、 hook 誘導 + BONSAI-OVERRIDE 分離保持で活用強化 (ADR-0051 D-6)。

---

## 4. 新規 skill 追加時の足す前ゲート (ADR-0046 D-3)

新規 skill 追加 PR の本文に以下 3 自問を 1 行ずつ記載:

- **(a) 構造で防げないか?**: hook / lint / CI で代替可能か (skill = 大型 prompt、 構造で代替できるなら不要)
- **(b) 既存と重複しないか?**: 既存 12 skill description / scripts を grep で確認 (R-9)
- **(c) 1 つ廃止できないか?**: 純増を抑制、 目的を終えた skill を 1 つ Status=Deprecated にできないか

---

## 5. 「本来発火すべきだったのに発火していない」 想定機会

過去 3 ヶ月で skill 編集系の作業は実質ゼロ (Sess63 audit より) だが、 Sess61 の `/release-android` skill 新規作成時には skill-creator が発火する余地があった (= 逸失機会の可能性)。

今後想定:

- 既存 skill の description triggering 率改善検討時 (例: 本 ADR-0051 D-6 自体)
- 新規 skill (例: 「hook 整理 skill」「ADR 棚卸し skill」) 起票検討時
- skill 評価レポート生成時

`.claude/hooks/check-skill-edit-hint.mjs` で以下キーワードを検知 → 本 skill 参照リマインダー注入: `skill.作成` / `skill.改修` / `SKILL\.md` / `\.claude/skills/` / `自動発火` / `skill description` / `hook.追加` / `triggering.率` / `skill.optimize`

---

## 6. 適用時のチェックリスト

1. **R-9 既存スクリプト先読み**: skill-creator/scripts/ + `agent-tools/scripts/` を先に grep (重複防止)
2. **R-18 Edit 前 Read**: 既存 SKILL.md / SKILL frontmatter は Edit 前に必ず Read
3. **upstream 由来 skill は無改変** (本ファイル前提): SKILL.md 直接編集ではなく BONSAI-OVERRIDE.md 追補で対応
4. **追加課金ゼロ厳守**: API 課金スクリプトは原則実行しない、 quick_validate.py で代替
5. **足す前ゲート 3 自問**: 新規 skill 追加 PR で必須記載

---

## 7. 参照リンク (BonsaiLog 内)

- `agent-tools/scripts/sync-agent-tools.mjs` (ai:sync 実装)
- `docs/adr/ADR-0012` (agent-tools 統一管理)
- `docs/adr/ADR-0046` (足す前ゲート + 退役ポリシー)
- `docs/adr/ADR-0047` (追加課金ゼロ厳守)
- `docs/adr/ADR-0051` (本ファイルの起源、 D-6 で活用強化方針確立)
- `AGENTS.md` §4 (skill 命名規約 + W-flow 表)
- `.claude/skills/skill-creator/scripts/` (同梱スクリプト一覧)
