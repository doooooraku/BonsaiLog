---
name: now-here-next
description: 引数ゼロで「目的→現在地→残→次手」 を ASCII 図で 1 コマンド出力。 進捗監査の即答テンプレ。
user-invocable: true
argument-hint: '(引数なし)'
---

# /now-here-next — 目的→現在地→残→次の一手 Skill

「いまどこ?」 「次なに?」 を 1 コマンドで即答するための最小テンプレ。
`/progress` (3 軸監査) の **超簡略版** + `/session-end` (次セッション引き継ぎ) の **超軽量版** という位置付け。

## 設計理由

- **Sess108 案 6 (Notion 215 prompts 由来 — "目的・現在地・残・次手の 4 点セット")**:
  user が「進捗どう?」 と聞いた時に、 `/progress` だと 3 軸全部出して長文になり、
  即答性が失われる。 4 点セットだけに絞れば 1 画面で完了し、 起動コマンド付きで
  次の 1 手も即出せる。
- **Sess101 既存指示 (= 「複数案 + メリデメ + 推薦根拠の 3 点セット」)** との直交性:
  あちらは「提案」 のフォーマット、 こちらは「現状把握」 のフォーマット。 用途が違う。
- **Sess103 アドリブ成功レンズ** との直交性: あちらは「振り返り」、 こちらは「進行中」 確認。
- **ASCII 図必須** (user 恒常指示 Sess108 = 平易な言葉 + ASCII 図): フェーズ図で
  現在地を ★ marker で示す。 1 行で位置関係が伝わる。

## このスキルが呼ばれる条件

以下のいずれかが user 発言に含まれる:

- 「いまどこ?」 「現在地?」 「進捗どう?」 「いまの状態?」
- 「次なにする?」 「次の 1 手?」 「次やること?」
- 「目的なんだっけ?」 「ゴール何だっけ?」
- `/now-here-next` の明示呼び出し

**起動条件の差別化**:

| Skill | 目的 | 起動 cue |
| --- | --- | --- |
| `/now-here-next` | **即答** (1 画面、 30 秒で済む) | 「いまどこ?」 「次なに?」 |
| `/progress` | **3 軸監査** (planning / integration / quality 詳細) | 「進捗監査して」 「リリースまでの残?」 |
| `/session-end` | **引き継ぎ** (Engram + MEMORY + commit) | 「セッション閉じる」 |
| `/retro` | **振り返り** (KPT + 5-why + timeline) | 「マイルストーン振り返り」 |

## やってはいけないこと

- **推測ベースで書かない** (必ず Engram / gh / Notion から実データ取得)
- **冗長な説明を入れない** (1 画面で完結、 詳細は `/progress` に委譲)
- **書き込み操作をしない** (read-only。 Issue 作成 / PR merge / commit はしない)
- **古い情報をキャッシュしない** (毎回 fan-out で再取得)
- **3 つ以上の Skill を勝手に連鎖起動しない** (これは即答 Skill、 重い操作は呼ばない)

---

## ワークフロー

### Step 1: 並列情報取得 (fan-out)

以下を **並列で** 取得し、 最新状態を把握する。 30 秒以内が目標。

#### 1.1 Engram から直近セッションサマリ

```
mem_context() を呼ぶ
→ 直近 1-3 セッションのサマリ取得
→ 目的 / 完了 / 残 / 次手 の手がかり
```

#### 1.2 GitHub から PR / Issue 状態

```bash
# 完了 PR (直近 merged)
PATH=/usr/bin:/bin:$PATH gh pr list --state merged --limit 10 \
  --json number,title,mergedAt

# 未完 PR (Open)
PATH=/usr/bin:/bin:$PATH gh pr list --state open \
  --json number,title,isDraft,headRefName

# 今 sprint の未完 Issue
PATH=/usr/bin:/bin:$PATH gh issue list --state open \
  --label "sprint/sess<最新>" --json number,title,labels

# 親 Epic / 進行中マイルストーン
PATH=/usr/bin:/bin:$PATH gh issue list --state open \
  --label "epic" --json number,title
```

> **WSL2 注意**: `PATH=/usr/bin:/bin:$PATH` を必ず prepend する (literal `${PATH}` 問題回避)

#### 1.3 Notion 同期配線後 (案 7 完了後)

```
mcp__notion__notion-search で
  - Epic DB から進行中 Epic
  - Sprint DB から今 sprint の DoD
を取得
```

> 案 7 未完なら 1.3 はスキップして 1.1 + 1.2 のみで構成する (graceful degrade)。

#### 1.4 CI 状態 (簡易、 詳細は /progress)

```bash
PATH=/usr/bin:/bin:$PATH gh run list --limit 3 \
  --json status,conclusion,name,headBranch
```

直近 3 件のうち失敗が 1 件でもあれば「現在地」 を `[CI 修復中]` にする。

---

### Step 2: 目的 1 文 (Engram mem_context + sprint label 逆算)

- Engram の直近サマリから「Goal」 行を抽出
- sprint label (`sprint/sess<N>`) の Issue title から逆算
- 取得できなければ「(目的不明 — Epic Issue を確認してください)」

**例**:

- `Sess108 = harness 改善 (Notion 215 prompts + 案 6 採用)`
- `iOS TestFlight 自動化 (道 A、 Xcode 26.4 + EAS Cloud)`

### Step 3: 現在地 ASCII マップ (★ で現在位置)

フェーズ図を 1 行で描く。 ★ で現在位置を示す:

```
[計画] ━━━ [実装] ━━━ ★[CI 待ち] ━━━ [merge] ━━━ [計測]
```

**判定 logic**:

| 観測 | 現在地 |
| --- | --- |
| Epic Issue なし、 議論中 | `★[計画]` |
| `gh pr list --state open` あり、 CI 走行中 | `[計画] ━━━ ★[実装]` (worktree あれば実装中) |
| CI failure 検出 (Step 1.4) | `[計画] ━━━ ★[CI 修復中]` |
| Open PR が draft 解除済 + CI green | `[計画] ━━━ [実装] ━━━ ★[CI 待ち]` |
| 直近 merged PR あり、 user 確認待ち | `[実装] ━━━ [merge] ━━━ ★[実機検証]` |
| 全 merge 済、 Engram に retro 記録なし | `[merge] ━━━ ★[計測 / retro 待ち]` |

**fallback**: 判定できない場合は `★[不明 — Engram mem_context で確認]` と書く。

### Step 4: 完了チェック ✅ (3-5 件、 直近 merged PR / closed Issue)

```
直近 merged PR / closed Issue から 3-5 件抽出
- 件数は 5 件まで (それ以上は /progress に委譲)
- title は 50 字で truncate
- 番号 + title の形式
```

**例**:

```
✅ #1271 feat(release): iOS TestFlight 自動化 道 A
✅ #1270 feat(deps): Expo SDK 55 → 56
✅ #1267 docs(retro): Sess106 retro
```

### Step 5: 残タスク

**優先度別 (P0 / P1 / P2)** で並列表示。 各タスクに:

- **所要時間目安**: `X 〜 Y 分` のレンジ (中央値ではなくレンジ)
- **依存**: 「← #N 待ち」 で明示
- **起動 cue**: 必要なら「(`/implement` で着手)」

**例**:

```
P0: #1290 案 6 /now-here-next Skill (45-60 分) ← Sess108 P5 worktree 完了待ち
P1: #1291 案 7 Notion 同期配線 (90-120 分)
P2: #1280 cleanup (15-30 分)
```

**取得元の優先順位**:

1. sprint label が付いた Open Issue (今 sprint の DoD)
2. Epic Issue の checklist 未完項目
3. Engram mem_context の「Accomplished の 🔲 (= 次セッション候補)」

### Step 6: 次の 1 手 (1 行 + 起動コマンド)

最優先 (P0 の 1 番目) を 1 行で書き、 起動コマンドを併記。

**例**:

```
次の 1 手: 案 6 worktree 6 個並列実装 (`/implement` で sess108-p6 から着手)
```

**判定 logic**:

- P0 の 1 番目をそのまま転記
- 依存待ちなら「← #N の merge 待ち」 と但し書き
- 起動コマンドは Skill 名 or pnpm script 名

---

## 出力フォーマット

```markdown
# 進捗 (= /now-here-next, YYYY-MM-DD HH:MM)

**目的**: <1 文>
**現在地**: [計画] ━━━ ★[実装中] ━━━ [CI] ━━━ [merge]
**完了** ✅:
- #1271 <title>
- #1270 <title>
- #1267 <title>
**残**:
- P0: <task> (X-Y 分) ← 依存があれば
- P1: <task> (X-Y 分)
- P2: <task> (X-Y 分)
**次の 1 手**: <1 行> (`<起動コマンド>`)
```

**長さ制約**: 全体で **15 行以内** (出力フォーマット含む)。 超えたら詳細は `/progress` に委譲する旨を末尾に書く。

---

## エッジケース対応

| ケース | 挙動 |
| --- | --- |
| Engram MCP 接続エラー | gh のみで構成、 「目的」 は sprint label から推論 |
| sprint label なし | `gh issue list --label epic` で代替 |
| Open PR 0 件、 Open Issue 0 件 | 「全完了。 retro / session-end 推奨」 と表示 |
| CI 全 fail (3/3) | 「現在地」 を `[CI 全滅]` にし、 次の 1 手を `/fix-ci` に固定 |
| 取得 timeout (30 秒超) | 取得できた範囲で出力 + 末尾に「(取得遅延、 詳細は /progress)」 |
| user が `/now-here-next foo` と引数付きで呼んだ | 引数は無視 (この Skill は引数ゼロ設計、 末尾に注意 1 行) |

---

## 関連 Skill

| Skill | 関係 |
| --- | --- |
| `/progress` | 3 軸監査の詳細版。 `/now-here-next` の出力で不足ならこちらに委譲 |
| `/session-end` | セッション終了の引き継ぎ。 `/now-here-next` 出力を Engram に保存する |
| `/retro` | マイルストーン振り返り。 `/now-here-next` を時系列で並べた拡張版 |
| `/plan` | 「次の 1 手」 が「計画必要」 になった時に呼ぶ |
| `/implement` | 「次の 1 手」 が「実装着手」 になった時に呼ぶ |

---

## 最重要原則

1. **即答性 > 網羅性** (15 行以内、 30 秒以内)
2. **ASCII 図必須** (現在地を ★ で 1 行表現)
3. **推測ゼロ** (実データ取得できなかった項目は「不明」 と書く)
4. **read-only** (書き込み操作は別 Skill に委譲)
5. **graceful degrade** (Engram / Notion / gh いずれかが落ちても残りで構成)
