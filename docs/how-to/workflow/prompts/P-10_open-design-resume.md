# P-10: open-design 再開プロンプト(Claude Code に再現させる)

`nexu-io/open-design` (`~/04_app-factory/open-design`) で BonsaiLog の UI 試作を再開するためのプロンプト集。**1 語トリガー**で Claude Code が以下を順次実行する:

1. 安定タグ更新確認(新タグあれば「更新しますか?」と質問)
2. daemon + web の起動状態確認
3. idle なら起動 → URL 報告
4. 設定リマインダ(Skill / DS / CLI)

---

## ✨ 使い方(超シンプル、これだけ覚えれば OK)

新規 Claude Code セッションで、最初のメッセージにこれを送るだけ:

```
open-design 再開
```

または同義の表現でも OK:

- `open-design`
- `opdesign 再開`
- `docs/how-to/workflow/prompts/P-10_open-design-resume.md を読んで再開して`

---

## 環境前提(初回構築済み、変更時のみ参照)

| 項目                   | 値                                                     |
| ---------------------- | ------------------------------------------------------ |
| クローン先             | `~/04_app-factory/open-design`                         |
| Node バージョン        | **24.x.x**(`~/.nvm/versions/node/v24.15.0/bin`)        |
| pnpm バージョン        | 10.33.2(corepack 経由で自動選択)                       |
| 安定タグ               | `open-design-v0.4.1`(新安定タグ出たら更新)             |
| 認証                   | Claude Code MAX プラン(Local CLI モード)               |
| 既定 Skill / DS        | Skill = `mobile-app` / Design system = `expo`          |
| 安定タグ更新スクリプト | `~/.local/bin/check-open-design.sh`                    |
| daemon の build 必要性 | 初回 `pnpm install` 後 1 回必須(以後は restart で十分) |

---

## 3 つの版の使い分け

| 版               | サイズ   | 使うシーン                                     |
| ---------------- | -------- | ---------------------------------------------- |
| **A. 1 行版**    | 1 行     | 慣れた後、毎回これで OK                        |
| **B. 標準版** ⭐ | 約 30 行 | 標準的な再開、ルールも込みで再認識したい時     |
| **C. 完全版**    | 約 70 行 | 久しぶり / 別 PC / チーム共有 / トラブル発生時 |

---

## A. 1 行版

```
open-design 再開
```

これだけで Claude Code が以下の Step 1〜3 を実行する。

---

## B. 標準版 ⭐(おすすめ、毎回これで OK)

```
あなたは BonsaiLog の UI 試作を補助する Claude Code です。
以下の Step 1〜3 を順次実行して、open-design の Web UI を再開可能な状態にしてください。

# Step 1: 安定タグ更新確認
~/.local/bin/check-open-design.sh
- exit 0(up-to-date OK): Step 2 へ
- exit 1(新タグあり): ユーザーに「v0.4.X が出ています、更新しますか?」と質問
  承認なら以下を順次実行:
    cd ~/04_app-factory/open-design
    git fetch --tags
    git checkout <new-tag>
    PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH bash -c 'cd ~/04_app-factory/open-design && pnpm install && pnpm --filter @open-design/daemon build && pnpm tools-dev restart'

# Step 2: 起動状態確認 + 起動
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH bash -c 'cd ~/04_app-factory/open-design && pnpm tools-dev status --json'
- daemon/web 両方 running → そのまま Step 3 へ
- いずれか idle → 起動:
  PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH bash -c 'cd ~/04_app-factory/open-design && pnpm tools-dev start web'

# Step 3: URL 報告
status の web.url(例: http://127.0.0.1:46589)をユーザーに提示:

「ブラウザで {URL} を開いてください。前回の続きから作業できます。
 設定: Skill = mobile-app / Design system = expo / CLI = クロード・コード(MAX プラン使用)
 終了は『open-design stop』で pnpm tools-dev stop を実行します」

# 進め方ルール
- (R-14) 専門用語にはやさしい言い換えを併記
- (R-17) 4 段階厳守、ただし本テンプレは「環境再開」のみで実装ではないので Step 1〜3 は連続実行 OK
- 失敗時は即停止 + ユーザーに状況報告(自分で深追いしない)

スタートしてください。
```

---

## C. 完全版(初回・別 PC・チーム展開時)

```
あなたは BonsaiLog の UI 試作を補助する Claude Code です。
nexu-io/open-design を使って BonsaiLog の UI を継続的に試作するため、環境を再開可能な状態にしてください。

# 既存資産(これらは触らず流用)
| 場所 | 役割 |
|---|---|
| ~/04_app-factory/open-design | open-design リポジトリ(v0.4.1+ 想定) |
| ~/.local/bin/check-open-design.sh | 安定タグ更新確認スクリプト(exit 0 = up-to-date / exit 1 = 新タグあり) |
| ~/.nvm/versions/node/v24.15.0/bin | Node 24.x 実行環境(BonsaiLog 用 Node 20/22 とは別) |
| docs/adr/ADR-0021-ui-diff-pipeline.md | 視覚比較パイプライン ADR |
| docs/adr/ADR-0020-claude-design-full-adoption.md | 画面マッピング表(open-design 出力との突合に流用) |
| .claude/recurrence-prevention.md | 行動ルール R-1〜R-27 |

# 環境前提
- Node 24.x.x、pnpm 10.33.2(corepack 経由)、安定タグ open-design-v0.4.1+
- 認証: Claude Code MAX プラン(Local CLI モード)、~/.claude/ 認証情報を共有
- daemon と web は tools-dev で管理、ポートは start 時に動的割当
- daemon の cli.js は postinstall でビルドされない → 初回または依存変化時に手動 build 必要

# 進め方ルール
1. R-14: 専門用語にはやさしい言い換えを併記
2. R-17: 4 段階厳守、ただし本テンプレは環境再開のみ → Step 1〜3 連続実行可
3. 失敗時は即停止 + ユーザーに状況報告(自分で深追いしない)
4. 破壊的コマンド(rm -rf / git reset --hard / push --force / --no-verify)禁止
5. Node 24 系は ~/.nvm/versions/node/v24.15.0/bin/ 固定、PATH prepend で運用
6. BonsaiLog 用ターミナル(Node 20/22)を壊さないよう、PATH prepend は subshell 単位

# Step 1: 安定タグ更新確認
~/.local/bin/check-open-design.sh
- exit 0(up-to-date): Step 2 へ
- exit 1(新タグあり): ユーザーに「v0.4.X が出ています、更新しますか?」と質問
  承認なら以下を順次実行:
    cd ~/04_app-factory/open-design && git fetch --tags && git checkout <new-tag>
    PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH bash -c 'cd ~/04_app-factory/open-design && pnpm install && pnpm --filter @open-design/daemon build && pnpm tools-dev restart'

# Step 2: 起動状態確認 + 起動
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH bash -c 'cd ~/04_app-factory/open-design && pnpm tools-dev status --json'
- daemon/web 両方 running → Step 3
- いずれか idle → 起動:
  PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH bash -c 'cd ~/04_app-factory/open-design && pnpm tools-dev start web'

# Step 3: URL 報告
status の web.url を抽出してフォーマットでユーザーに提示:

「ブラウザで {URL} を開いてください。前回の続きから作業できます。
 設定: Skill = mobile-app / Design system = expo / CLI = クロード・コード(MAX プラン使用)
 終了は『open-design stop』と言えば pnpm tools-dev stop を実行します」

# トラブルシューティング
- ポート衝突: --daemon-port 7457 --web-port 5175 等でずらす
- daemon cli.js 欠落: PATH=...node24... pnpm --filter @open-design/daemon build を実行
- WSL2 で localhost つながらない: 127.0.0.1 直指定、または ip addr show eth0 | grep 'inet ' で WSL IP
- daemon が 500 を返す: PATH=...node24... pnpm tools-dev logs --json で原因確認
- pnpm install で gyp ERR: sudo apt install -y build-essential python3
- engines.node 不整合: nvm use 24 でターミナルの Node 切替確認

# 確認したいこと(セッション開始時に教えてください、ただし任意)
- 続けたい画面(例:「盆栽詳細」「Paywall」)
- プロンプトの好み(新規生成 / 既存 .od/artifacts/ から引き継ぎ)

スタートしてください。
```

---

## 流れ図(各ステップの役割を可視化)

```
ユーザー: 「open-design 再開」
                          ↓
              Claude Code が P-10 を Read
                          ↓
              ~/.local/bin/check-open-design.sh
              (exit 0 = up-to-date / exit 1 = 新タグあり)
                          ↓
       ┌──────────────────┴──────────────────┐
       ↓                                     ↓
   (up-to-date)                          (新タグあり)
       │                                     │
       │                              ユーザーに更新可否質問
       │                                     ↓
       │                              git fetch + checkout +
       │                              pnpm install + daemon build +
       │                              tools-dev restart
       └──────────────────┬──────────────────┘
                          ↓
              pnpm tools-dev status --json
                          ↓
       ┌──────────────────┴──────────────────┐
       ↓                                     ↓
   (running)                              (idle)
       │                                     │
       │                              pnpm tools-dev start web
       └──────────────────┬──────────────────┘
                          ↓
              web.url 抽出 → ユーザーに提示
              (Skill / DS / CLI のリマインダ込み)
                          ↓
              ブラウザで URL を開いて試作再開
```

---

## Claude Code の力を引き出す 3 つのコツ

1. **環境前提を毎回明示しない** — 本ファイルが Source of Truth、Read で参照すれば OK
2. **失敗時は即停止 + 報告** — 自分で深追いせず、ユーザー判断を仰ぐ(R-17 4 段階)
3. **MAX プラン枠を意識** — 大量試作は枠を消費、終了時に `pnpm tools-dev stop` でリソース解放

---

## よくある質問

### Q. 新安定タグはいつ出る?

A. 不定期。`gh release list --repo nexu-io/open-design --exclude-pre-releases --limit 5` で最新確認。`~/.local/bin/check-open-design.sh` を週 1 で実行する習慣推奨。

### Q. URL のポート番号が前回と違う

A. tools-dev は起動毎にポート動的割当。前回の URL は無効、毎回 `pnpm tools-dev status --json` で取得し直す。

### Q. BonsaiLog の Claude Code セッションと同時に動かせる?

A. 可能だが、両方とも MAX プランの 5 時間枠を共有するため、**大量プロンプト時は枠共食いに注意**。同時動作中は片方を控えめに。終了時に `pnpm tools-dev stop` で枠解放推奨。

### Q. BYOK モードに切替えたい

A. ブラウザ UI 上部「BYOK」タブ → Anthropic API キー貼付。MAX プランから切り離されるが、API 別契約コスト発生。

### Q. `~/04_app-factory/open-design` の中身を git で push すべき?

A. **No**。これは外部 OSS のローカルクローン。BonsaiLog リポジトリには含めない。出力物(`.od/artifacts/`)は `.gitignore` 済(open-design 内)。BonsaiLog に持ち帰りたいモックアップは手動で `docs/mockups/` 等にコピー運用。

### Q. Step F のブラウザ操作(Skill/DS 選択 + プロンプト投入)は誰がやる?

A. **ユーザー側**。Claude Code は Step 1〜3 で URL を提示するまで。以後の UI 操作はユーザーが Windows 側 Chrome で行う。

---

## 関連

- 起源: 本セッション議論(2026-05-07)、open-design 試用方針確定
- 試用後判断: ADR-0022 は未起票のまま欠番化 (docs-lint の ADR 歯抜け警告の正体)。open-design は ADR-0059 写経駆動標準の mockup 生成ツールとして運用中
- 関連 ADR: ADR-0020(Claude Design 全面採用)/ ADR-0021(UI 差分検出パイプライン)
- スクリプト: `~/.local/bin/check-open-design.sh`(安定タグ更新確認)
- 行動ルール: `.claude/recurrence-prevention.md` R-1〜R-27
- セッションサマリ: Engram `mem_context` で `bonsailog` プロジェクトを参照
