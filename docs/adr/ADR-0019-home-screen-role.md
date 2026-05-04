# ADR-0019: Home 画面の役割定義 + Claude Design 部分採用方針

- Status: Accepted
- Date: 2026-05-04
- Deciders: @doooooraku
- Related: Issue #29 (本セッション実機検証で発覚) / `docs/reference/design_system.md` / `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` / `docs/adr/ADR-0018-onboarding-flow-integration.md` / `docs/adr/ADR-0015-f15-theme-system.md`

---

## Context（背景：いま何に困っている？）

- **現状**: `app/(tabs)/index.tsx` の Home 画面が **Expo create-expo-app テンプレートの残骸**「BonsaiLog / ここからアプリを作り始めましょう」のまま (line 30-31)。本セッション実機検証 (Android Pixel 7) で発覚 (画像 15215)。
- **困りごと**:
  - ストア審査でリジェクト確実 (テンプレ残骸 + プレースホルダー文言)
  - シニアペルソナ (高橋 62 歳) が「何のアプリか分からない」評価で即離脱
  - F-13 Pro バッジ / F-15 屋外モードトグル / F-14 AdBanner 等の装飾だけが乗った「コンテンツ無し」状態
- **制約/前提**:
  - `docs/reference/constraints.md` §1-1〜§5-2 (UI 文言禁止語、診断/推奨/べき NG)
  - `docs/adr/ADR-0011` 「記録のみ哲学」(ダッシュボード型 = 推奨機能の押し付けは NG)
  - `docs/reference/design_system.md` (Source of Truth、washi `#F7F3E8`、Noto Serif JP、角丸 12)
  - `docs/adr/ADR-0018` (オンボーディング 8 画面構成、システム 3 + 機能 5)
  - 既存タブ構成: Home / 盆栽 / 統計 (3 タブ、F-04 Phase G-2 PR #172 で統計タブ追加済)
- **発見**: Claude Design (`/mnt/c/Users/doooo/Downloads/BonsaiLog_template/`) を取得すると、**4 タブ構成 (盆栽 / 予定 / 探す / 設定)** + **オンボ 6 画面構成** で既存 ADR と矛盾。R-16 ルールで「Design は下書き、ADR が正」のため、Design 100% 採用は不可。

---

## Decision（決めたこと：結論）

- **決定**:
  1. **Home 画面の役割を「アプリ起動時の Welcome / 盆栽サマリー入口」と定義** (ダッシュボード型ではなく、シンプルな Empty State + 盆栽追加導線)
  2. **Claude Design の部分採用** (タブ構成・オンボ画面数は ADR を維持、トークン / SVG アイコン / コピーライティングのみ採用)
  3. v1.0 Home 画面の最小実装内容:
     - 盆栽 0 本時: Empty State (SVG イラスト + 「最初の盆栽を追加しよう」「あなたの一生分の記録が、ここから始まります」+ 「+ 盆栽を登録」CTA → 盆栽タブの新規登録画面へ遷移)
     - 盆栽 1 本以上時: 起動時に **盆栽タブへ自動遷移** (Home はスタブ機能のみ)
     - 既存 F-13 Pro バッジ / F-15 屋外モードトグル / F-14 AdBanner は維持
- **適用範囲**: v1.0、Free/Pro 両方

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1**: ADR-0011「記録のみ哲学」遵守 — Home に推奨機能・診断・煽りを置かない
- **Driver 2**: シニア UX (高橋 62 歳) — 起動直後に「何をすればいいか」が一目で分かる、命令文回避
- **Driver 3**: 既存 ADR (-0011/-0015/-0018) と矛盾しない範囲で Claude Design の品の良さを採用
- **Driver 4**: F-04 (#29) close を維持するためタブ構成 (Home/盆栽/統計) を変更しない
- **Driver 5**: ストア審査 NG リスク回避 (テンプレ残骸ゼロ)

---

## Alternatives considered（他の案と却下理由）

### Option A: Claude Design 100% 採用 (タブ構成も 4 タブに変更)

- 概要: 盆栽 / 予定 / 探す / 設定 の 4 タブ、Home タブと統計タブを廃止、オンボも 6 画面に
- 良い点: Claude Design の品の良さを最大化、SS の見栄えが良い
- 悪い点:
  - F-04 統計タブ (PR #172/#173/#176) 巻き戻しで AC6/AC7 達成困難
  - ADR-0013/-0018 の大量改訂が必要 (4 ペルソナ再評価必須)
  - 「予定」「探す」タブの仕様が未定 → 議論必要
- **却下理由**: F-04 #29 close を維持できない、ADR 改訂コスト過大、本セッション完遂不可能

### Option B: Home 画面を「ダッシュボード」化 (直近活動・統計サマリー・推奨アクション)

- 概要: 直近 7 日の活動カード + 全盆栽水やり集約 + 「次の作業はこちら」推奨カード
- 良い点: 情報密度高い、ヘビーユーザー (Marcus) には刺さる
- 悪い点:
  - **ADR-0011「記録のみ哲学」と真正面から矛盾** (推奨機能 = 押し付け)
  - シニア (高橋) が「何を見ればいい?」で混乱
- **却下理由**: 哲学違反、4 ペルソナで ✕ 出る (R-10 違反)

### Option C: Home 画面廃止 (起動時に盆栽タブへ直接遷移)

- 概要: app/(tabs)/index.tsx を削除、デフォルトタブを盆栽に
- 良い点: 最もシンプル、テンプレ残骸も消える
- 悪い点:
  - F-15 屋外モードトグル / F-13 Pro バッジ / F-14 AdBanner の置き場所喪失
  - タブ構成 (3 タブ) を変更する必要 → ADR-0015/-0010 改訂
- **却下理由**: 既存機能の置き場所喪失、ADR 影響大

### Option D (採用): Home 画面 = Empty State + 盆栽サマリー入口 (Claude Design 部分採用)

- 概要: 上記 Decision の通り
- 良い点:
  - ADR-0011 哲学遵守 (推奨ゼロ、シンプル)
  - 既存タブ構成維持 (F-04 #29 close 維持)
  - Claude Design のコピー / SVG / トークンを採用 (品の良さ)
- 悪い点:
  - 盆栽 1 本以上時に Home がスタブ的 (情報密度低い)
- **採用理由**: 4 ペルソナで ✕ ゼロ、最小コストで最大効果、ADR 改訂不要

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- ストア審査 NG リスクゼロ (テンプレ残骸消滅)
- ADR-0011 哲学遵守、4 ペルソナ全員 ○ 以上
- F-04 #29 close 維持 (統計タブ機能不変)
- Claude Design の品の良さ (washi / Noto / SVG) を段階的に取り込める下地

### Negative（辛い/副作用）

- 盆栽 1 本以上時の Home が「ほぼスタブ」(将来の v1.x で機能追加余地)
- Home 画面の i18n キー追加 (19 言語に新規 4-5 キー、英語フォールバック許可)

### Follow-ups（後でやる宿題）

- [ ] `app/(tabs)/index.tsx` 実装 (Phase 1b、本 ADR の Decision §1-3 通り)
- [ ] `scripts/template-residue-check.mjs` 新規 (Phase 1c)
- [ ] `docs/reference/tasks/lessons/design.md` 新規 (Phase 1c、Claude Design 作成時のワークフロー)
- [ ] `docs/reference/functional_spec.md` Home 画面節を本 ADR に整合 (Phase 2 以降)
- [ ] v1.x で Home 画面のコンテンツ拡充検討 (例: 直近 1 件の作業履歴カード、ただし「推奨」ではなく「事実表示」)

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）:
  - Jest: テンプレ残骸文言「ここからアプリを作り始めましょう」の grep test (`scripts/template-residue-check.mjs` 自己検証)
  - Maestro: `home-empty.yml` (新規、盆栽 0 本で Home → 盆栽追加導線確認)
- 手動チェック:
  - 盆栽 0 本時に Empty State + CTA が見える
  - 盆栽 1 本以上時に起動 → 盆栽タブへ自動遷移
  - Pro 状態で Pro バッジ表示、Free で AdBanner 表示

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響: なし (Home 画面のみの変更、Phase 1c で CI 検査追加)
- ロールバック方針: PR revert で旧 Expo テンプレに戻る (ただし戻したくない、テンプレ残骸復活)
- 検知方法: ストアレビューで「何のアプリか分からない」「起動して空白」のキーワード監視

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` §1-1〜§5-2
- reference: `docs/reference/design_system.md` §1〜§12 (本 ADR の UI 表現の Source of Truth)
- ADR: ADR-0011 (記録のみ哲学) / ADR-0015 (テーマシステム) / ADR-0018 (オンボ 8 画面)
- Issue: #29 (本セッション実機検証で発覚)
- Claude Design: `C:\Users\doooo\Downloads\BonsaiLog_template\` (下書き、本 ADR で部分採用範囲を確定)

---

## Notes（メモ：任意）

### Claude Design 部分採用の R-16 整合確認

| 採用箇所                                       | 現状の ADR と矛盾するか                         | 採用判定                    |
| ---------------------------------------------- | ----------------------------------------------- | --------------------------- |
| `tokens.css` カラートークン                    | design_system.md と完全一致                     | ✅ 採用                     |
| `tokens.css` フォント                          | design_system.md と完全一致                     | ✅ 採用                     |
| SVG アイコン (絵文字代替)                      | design_system.md §5 / アンチパターン整合        | ✅ 採用                     |
| Empty State コピー                             | ADR-0011 哲学整合 (命令文「○○しましょう」回避)  | ✅ 採用                     |
| **タブ構成 4 タブ**                            | F-04 #29 統計タブ (PR #172) と矛盾              | ❌ 不採用 (現状 3 タブ維持) |
| **オンボ 6 画面**                              | ADR-0018 で 8 画面確定済                        | ❌ 不採用 (現状 8 画面維持) |
| Home Header 「盆栽手帳」シリアル + 検索 + 設定 | 現状ヘッダー (Pro バッジ + 屋外トグル) と異なる | △ 部分採用 (v1.x 検討)      |

### 4 ペルソナ評価 (本 ADR Decision)

| 項目                                  | 高橋 62 歳   | Marcus 35 歳   | 盆栽園プロ                    | ライト       | 総合 |
| ------------------------------------- | ------------ | -------------- | ----------------------------- | ------------ | ---- |
| Home Empty State (Claude Design 採用) | ◎ (シンプル) | ○ (情報少なめ) | ○ (起動 → 盆栽タブ即遷移想定) | ◎ (動機付け) | ◎    |
| ADR-0011 哲学遵守 (推奨ゼロ)          | ◎            | ◎              | ◎                             | ◎            | ◎    |
| F-04 統計タブ維持                     | ◎            | ◎              | ◎ (業務影響なし)              | ○            | ◎    |
| Claude Design 部分採用                | ◎ (品の良さ) | ◎              | ◎                             | ◎            | ◎    |

→ 全項目 ○ 以上、✕ ゼロ (R-10 クリア)
