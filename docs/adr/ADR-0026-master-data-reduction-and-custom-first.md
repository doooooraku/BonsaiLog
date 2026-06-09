# ADR-0026: 樹種・樹形マスタの 5 種化とカスタム入力主軸への転換

- Status: Accepted
- Date: 2026-05-19
- Deciders: @doooooraku
- Related: Issue #14 (AC2 改訂) / ADR-0020 (Claude Design 全面採用) / Sess13-14 engram (bonsai-create リニューアル PR #577-#597) / `docs/reference/basic_spec.md` §10.1

---

## Context（背景：いま何に困っている？）

- **現状**: Sess13-14 (PR #577-#597) で bonsai-create 画面を 21 PR かけてリニューアル完遂。 ただしマスタデータ (樹種 50 種 / 樹形 10 種) は Issue #14 AC2「50 種以上の樹種が seed されている」 を満たすため、 user 真意とは別軸で「件数確保」 が optimization 目標になっていた。
- **困りごと**:
  - user 議論で「マスタデータは 5 種類だけで十分、 ユーザーのカスタム入力が主軸」 が明確化 (Sess15 議論、 2026-05-19)
  - 樹種 picker (`SpeciesPickerScreen`) で 50 種一覧を render するため初回表示に **数秒遅延** が発生 (DB query 完了まで空白)
  - 樹形 (`BONSAI_STYLES` 10 種) は静的配列で即時表示だが、 user は「半懸崖 / 文人木 / 吹き流し / 双幹 / 石付き」 等のマニアック樹形を必要とせず、 むしろ自分のカスタム命名を望む
  - ペルソナ全 4 名 (高橋 62 歳 / Marcus 35 歳 / 盆栽園プロ / ライト) の評価で「5 種で十分、 残りはカスタム」 が一致
- **制約/前提**:
  - `docs/reference/constraints.md` §1-4 (AI 非搭載 / 記録のみ哲学) → マスタ削減と整合 (AI 提案ではなく user 入力主軸)
  - `src/db/bonsaiSpeciesCustomRepository.ts` + `bonsaiStylesCustomRepository.ts` が Sess13 PR-G/H で既に整備済、 カスタム入力 infrastructure は完成
  - 過去ユーザー数 = 0 (まだアプリ作成中、 ストア未公開)、 破壊的変更 OK
- **発見**: 「マスタ件数 = 画面表示件数」 という暗黙の結合があり、 過去 AC2 (件数下限) が UX 目標と乖離していた。 Sess15 議論で「マスタ削減」 と「画面表示制御」 を分離する選択肢 (案 β: 内部 50 維持 + UI 5 pin) も検討したが、 user は「物理削減で十分、 過去 user なし前提で OK」 を明示。

---

## Decision（決めたこと：結論）

- **決定**:
  1. **樹種マスタを 50 → 5 種に物理削減** (黒松 / モミジ / イチョウ / 梅 / 真柏)。 残りはユーザーのカスタム入力で増えていく
  2. **樹形マスタを 10 → 5 種に物理削減** (直幹 / 模様木 / 斜幹 / 懸崖 / 株立ち)。 残りはユーザーのカスタム入力で増えていく
  3. **`seedSpecies.ts` の build-time check を `SPECIES_SEED_COUNT !== 5`** に変更 (Issue #14 AC2 改訂)
  4. **樹形 picker に検索バー追加** (Species picker と pattern 統一、 カスタム樹形が増えた時の検索性確保)
  5. **鉢情報の default 単位を言語別に決定** (全 19 言語 = cm、 user 設定で変更可能)
  6. **Issue #14 AC2「50 種以上の樹種が seed されている」 を本 ADR で supersede** (新 AC: 5 種が seed されている)
- **適用範囲**: v1.0、 Free / Pro 両方、 iOS / Android / Web

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: **user 真意整合** — 「マスタは 5 種で十分、 カスタム入力主軸」 を明示要求 (2026-05-19 Sess15 議論)
- **Driver 2**: **UX 簡素化** — picker 初回表示遅延の根本解決 (50 種 DB query → 5 種で実質ゼロ)
- **Driver 3**: **マスタ保守コスト削減** — 50 種 × 19 言語 i18n キーのメンテ負荷を解消、 future-proof
- **Driver 4**: **4 ペルソナ全員 ◎** — シニア (5 種で迷わない) / Marcus IT 系 (検索で十分) / プロ (カスタム入力で業務効率) / ライト (圧迫感ゼロ)
- **Driver 5**: **過去 user なし前提** (まだストア未公開、 開発中) → 破壊的変更 OK、 migration logic 不要
- **Driver 6**: **一次情報準拠** (単位 default) — 19 言語の単位慣習を 1 次情報 (各国 BIPM / メートル条約批准状況 / 盆栽界慣習) で決定

---

## Alternatives considered（他の案と却下理由）

### Option A (採用): 案 α — 物理削減 5 種化

- **概要**: マスタ 50 → 5 種 / 10 → 5 種に物理削減、 build-time check 緩和
- **良い点**:
  - user 真意整合 最大化
  - DB query 軽量化、 初回表示遅延解消
  - 保守コスト最小
  - 4 ペルソナ全員 ◎
- **悪い点**:
  - 過去マスタを参照する bonsai レコードが「不明」 表示に (ただし過去 user なし前提で無視可能)
  - Issue #14 AC2 supersede が必要
- **採用理由**: user 明示要求 + 過去 user なし前提でリスクゼロ

### Option B: 案 β — 内部 50 種維持 + UI 5 種 pin + 「もっと見る」 toggle

- **概要**: master データは 50 種維持、 picker UI で「人気 5 種を上部 pin、 残り 45 種は折りたたみ」
- **良い点**:
  - 過去データ完全保護
  - Issue #14 AC2 維持
- **悪い点**:
  - 「マスタ件数 = 画面表示件数」 結合は残る (DB query 50 種は変わらない)
  - UI ロジック複雑化 (pin + toggle + 区切り線)
  - user 真意 (物理削減で十分) と乖離
- **却下理由**: user が「過去 user なし前提で OK、 物理削減で進めて」 を明示

### Option C: 案 γ — UI 5 種 + 内部 5 種 + 廃止 45 種を custom 自動登録

- **概要**: 物理削減し、 廃止樹種を `bonsai_species_custom` table に migrate
- **良い点**:
  - 過去データ完全保護 + 物理削減両立
- **悪い点**:
  - migration logic 大規模 (本来不要な作業)
  - 過去 user なし前提では over-engineering
- **却下理由**: 過去 user なし前提で migration 不要、 シンプルな案 A が王道

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 樹種 picker の初回表示遅延が解消 (体感ゼロ)
- マスタ保守コストが 50 種 × 19 言語 → 5 種 × 19 言語に縮小 (90% 削減)
- user カスタム入力が主軸になり、 user 個別性 (好みの樹種命名) が反映
- ペルソナ全員受容 (シニア「迷わない」 / プロ「自分の業務語彙で登録」 / ライト「圧迫感ゼロ」)
- bonsai-create 画面の i18n キー数が削減 (削除: bonsaiStyle_han_kengai / bunjingi / fukinagashi / sokan / ishitsuki + 樹種 45 種 × 2 言語 = 90 件)

### Negative（辛い/副作用）

- Issue #14 AC2 を改訂する必要あり (本 ADR で supersede)
- `docs/reference/basic_spec.md` §10.1 を「代表樹種 5 件」 に修正
- 過去 PR #14 系の Acceptance Test (50 種 seed 確認) は本 ADR で再定義
- 「カスタム樹形が増えてきたら検索が必要」 → 樹形 picker に検索バー追加 (PR-X で対応)

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/basic_spec.md` §10.1 を「代表樹種 5 件」 に修正 (本 PR で実施)
- [ ] `src/db/seedSpecies.ts` の build-time check を `!== 5` に変更 (PR-V で実施)
- [ ] `src/db/schema.ts` の `BONSAI_STYLES` を 5 種に削減 (PR-V で実施)
- [ ] 19 言語 i18n から廃止 `bonsaiStyle_*` キーを削除 (PR-V で実施)
- [ ] 樹形 picker に検索バー追加 (PR-X で実施)
- [ ] 言語別 default 単位を `src/core/i18n/lang-defaults.ts` に集約 (PR-BB で実施、 全 19 言語 = cm)

---

## Acceptance / Tests（合否：テストに寄せる）

- **正 (自動テスト)**:
  - Jest: `__tests__/db/seedSpecies.test.ts` で `SPECIES_SEED_COUNT === 5` を assert
  - Jest: `__tests__/db/schema.test.ts` で `BONSAI_STYLES.length === 5` を assert
  - Jest: `__tests__/core/i18n/lang-defaults.test.ts` (新規) で 19 言語すべて `cm` default を assert
  - `pnpm verify` 全通過 (lint + type-check + test + i18n:check + config:check + docs:lint)
- **手動チェック**:
  - 樹種 picker を開き、 5 種 + カスタム樹種 (Sess13 PR-H で実装済) が表示される
  - 樹形 picker を開き、 5 種 + 検索バー + カスタム樹形 (Sess13 PR-G で実装済) が表示される
  - 鉢情報 expander で default 単位が `cm` (日本語 lang 設定時)

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**: なし (過去 user なし前提、 migration logic 不要)
- **ロールバック方針**: revert (PR-V / PR-X / PR-BB を順次 revert)、 master ファイルは git history から復元可能
- **検知方法**:
  - CI: `pnpm verify` で seedSpecies count 違反を検出
  - 実機: bonsai-create 画面で picker を開き、 5 種表示確認

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` §1-4 (AI 非搭載)
- reference: `docs/reference/basic_spec.md` §10.1 (本 ADR で改訂)
- ADR-0020: `docs/adr/ADR-0020-claude-design-full-adoption.md` (4 ペルソナ評価軸)
- Issue: #14 (AC2 本 ADR で supersede)
- 関連 PR (Sess13-14): #577-#597 (bonsai-create リニューアル)
- 単位慣習 一次情報:
  - メートル条約批准国一覧: https://www.bipm.org/en/cgpm-membership
  - 米国 NIST メートル法移行ガイドライン: https://www.nist.gov/pml/owm/metric-si

---

## Notes（メモ：任意）

### Sess15 議論ログ要約

- 議論モード `/discuss` (6 名チーム + 4 ペルソナ評価) で 12 項目改善要望を分析
- user 判断確定 (Q1-Q11):
  - Q1: 樹種 5 種に物理削減 (案 α)
  - Q2: 樹形 5 種に物理削減 + 検索バー追加
  - Q3: 入力順序 案 P (写真を最後の方)
  - Q4: 単位切替 案 X (segmented control)
  - Q5: カスタム追加 button 案 D2 (outline + 緑文字)
  - Q6: × UI 案 E1 (SVG outline X)
  - Q7: Picker 共通化は今回せず Rule of Three 待ち (案 F1)
  - Q8: ADR-0026 起票 (本 ADR、 案 G1)
  - Q9: 英語 (en) default 単位 = cm
  - Q10: 「+タグ追加」 button 案 G1 (D2 完全統一)
  - Q11: 「任意」 表記は既存 `fieldOptionalLabel` 流用

### 樹種 5 種選定根拠

- 黒松 (Pinus thunbergii) — 盆栽の代表種、 松柏類
- モミジ (Acer palmatum) — 雑木類の代表、 紅葉が人気
- イチョウ (Ginkgo biloba) — 雑木類、 黄葉が人気
- 梅 (Prunus mume) — 花物の代表、 早春の花
- 真柏 (Juniperus chinensis) — 松柏類の代表、 シャリ・ジン表現

### 樹形 5 種選定根拠 (user 指定)

- chokkan (直幹) — 最も基本、 初心者推奨
- moyogi (模様木) — 最頻出スタイル
- shakan (斜幹) — 風雪表現
- kengai (懸崖) — 崖を表現、 動きあり
- kabudachi (株立ち) — 複数幹、 樹海表現

### §Notes Amended Sess74 PR-1 (2026-06-07) — master タグ 2 件追加 (= 樹種 / 樹形 / タグ の master/custom パターン 3 領域統一)

**背景**: テスター FB 「タグが思い浮かばない」 を受け、 本 ADR で確立した「master/custom 分離 + カスタム入力主軸」 パターンを **タグ機能 (F-09)** にも拡張する。 樹種 (5 種 master + custom) / 樹形 (5 種 master + custom) に続き、 タグ (2 件 master + custom) で 3 領域統一。

**追加 master タグ 2 件** (Sess74 plan v2、 19 言語フル翻訳):

| id          | ja         | en        | カテゴリ |
| ----------- | ---------- | --------- | -------- |
| `favorite`  | お気に入り | Favorite  | 感情     |
| `flowering` | 花あり     | Flowering | 特性     |

**「master = const 多言語 / custom = 生 string」 二層原則の明示** (Sess74 PR-1 で恒久化):

- master データ (アプリ提供物) は const 配列に閉じ、 多言語翻訳を提供 = `SPECIES_SEED` (`names.ja/en` + 他言語は en fallback) / `BONSAI_STYLES` (enum + i18n key 経由) / `TAG_PRESETS` (19 言語フル翻訳)
- custom データ (user 入力物) は SQLite に生 string で保存 = `bonsai_species_custom.name` / `bonsai_styles_custom.name` / `tags.name`
- カスタム入力主軸 (ADR-0026 本文) は維持。 master は「思い浮かばない初心者の最低ライン」 として 2-5 件に厳格固定

**理由**: アプリ提供物と user 入力物の境界が不明瞭だと、 多言語切替時に user の認知が混乱する (= タグ「お気に入り」 を JA で attach 後、 EN 切替で「Favorite」 と表示されると「自分が書いたのに?」 と違和感)。 二層原則により「master のみ翻訳 = アプリの責任、 custom は生 string = user の責任」 を明確化。

**Free 上限カウント方針 (ADR-0049 §Notes Amended Sess74 PR-1 と整合)**:

- 樹種 ⑥: master 5 種は Free 上限カウント対象外、 custom のみ 3 件まで
- 樹形 ⑥: master 5 種は Free 上限カウント対象外、 custom のみ 3 件まで
- タグ ②: master 2 件は Free 上限カウント対象外、 custom のみ 3 件まで (Sess74 PR-1 で実装)

**実装 PR**: Sess74 PR-1 (本 Amendment + `src/db/seedTagPresets.ts` 新規 + `tagRepository.ts` 拡張) + PR-2 (UI 配線、 BonsaiTagsSection / tag-edit / Settings タグ管理)。
**関連**: ADR-0049 §Notes Amended Sess74 PR-1 / `functional_spec.md` §14.3.3 (master/custom 2 種別明文化)。

---

### §Notes Amended Sess89 PR-4 (2026-06-09) — 樹形 raw text 設計 + atomic NULL cascade (案 c) の明文化

**背景**: Sess89 (= テスター苦情 「カスタム樹種/樹形の編集・削除動線がない」) で ADR-0049 ⑥ Grandfathered 緩 削除 OK の実装漏れを構造修復する際、 樹形は本 ADR §10.1 で確立した「`bonsai.style` raw text 保存」 設計のため、 **カスタム樹形削除時に 「幻の樹形」 (= 削除済 name が bonsai.style に残存) 問題** が顕在化。

**真因 (= 本 ADR の二層原則の延長)**:

- 樹種は `bonsai.custom_species_id` (FK + ON DELETE SET NULL) で **削除時 cascade 自動連動**
- 樹形は `bonsai.style` raw text (enum 値 or custom name の生 string) で FK ではないため、 **削除時 orphan 参照が残る**
- 本 ADR §Notes Amended Sess74 PR-1 「二層原則」 の盲点 = master/custom 区別と cascade pattern の対応関係が明示されていなかった

**Sess89 確定 = 案 c (= atomic NULL cascade)**:

`deleteCustomStyle(id)` 関数内で以下 3 stmt を 1 transaction で atomic 実行:

```sql
-- 1. 旧 name を取得
SELECT name FROM bonsai_styles_custom WHERE id = ?;
-- 2. master row 削除
DELETE FROM bonsai_styles_custom WHERE id = ?;
-- 3. orphan cleanup (= 旧 name を参照する bonsai を NULL に書換え)
UPDATE bonsai SET style = NULL WHERE style = ?;
```

`renameCustomStyle(id, newRawName)` も同型 cascade:

```sql
-- 1. 重複検証
SELECT id FROM bonsai_styles_custom WHERE name = ? AND id != ?;
-- 2. 旧 name 取得 (= cascade 用)
SELECT name FROM bonsai_styles_custom WHERE id = ?;
-- 3. master row 更新
UPDATE bonsai_styles_custom SET name = ? WHERE id = ?;
-- 4. cascade UPDATE (= bonsai.style raw text を旧名 → 新名)
UPDATE bonsai SET style = ? WHERE style = ?;
```

**他案との比較 (= Sess89 議論で却下)**:

| 案           | 説明                                      | 採否    | 理由                                                                                                |
| ------------ | ----------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| **c** (採用) | `deleteCustomStyle` 内 atomic NULL 書換え | ✅ 採用 | 最小差分 + 関数 atomic + 「未設定」 と表示 (= システム中立) + 同名 user 再追加で復元可              |
| b            | 「(削除済) {name}」 表示                  | ❌ 却下 | formatStyle 呼出箇所で `getAllCustomStyles()` fetch 必要 (= perf 懸念) + i18n key 19 言語追加負荷大 |
| a            | 起動時 migration で一括 NULL 書換え       | ❌ 却下 | 出力過剰 (= 削除毎に動かない) + perf 上 1 回で並行 3 項目以上時冗長                                 |
| 何もしない   | defensive code 任せ                       | ❌ 却下 | user 混乱 (= 削除したはずの名前が表示される)、 UX 致命傷                                            |

**「master/custom 二層原則 + cascade pattern matrix」 (= 本 Amendment で恒久化)**:

| 領域           | bonsai 参照型             | 削除時 cascade                                 | rename 時 cascade                                      |
| -------------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| カスタム樹種 ⑥ | `custom_species_id` (FK)  | ON DELETE SET NULL (= schema 自動)             | 不要 (= FK 自動追従)                                   |
| カスタム樹形 ⑥ | `style` (raw text)        | **atomic UPDATE NULL** (= `deleteCustomStyle`) | **UPDATE bonsai.style = 新名 WHERE style = 旧名**      |
| カスタムタグ ② | `bonsai_tags` (M:N table) | softDelete (= deleted_at セット)               | tagRepository.renameTag (= name 変更で FK 自動追従)    |
| 定期予定 ⑦     | `recurrence_rule_id` (FK) | softDelete (= 関連 events も連動 softDelete)   | replaceRecurrenceRule (= softDelete + create ラッパー) |

**実装 PR**: Sess89 PR #1031 (= Phase 3 = 樹形 management 画面 + 案 c 実装) / 本 PR (= ADR-0026 + ADR-0049 Amendment + R-72 起票)。

**関連**: ADR-0049 §Notes Amended Sess89 PR-4 / R-72 (= master/custom CRUD pattern SoT) / `src/db/bonsaiStylesCustomRepository.ts` (= `deleteCustomStyle` 案 c + `renameCustomStyle` cascade)。
