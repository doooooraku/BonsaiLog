# Lessons: DB / データ / i18n

> 索引: [`README.md`](./README.md)

---

### マイグレーションの冪等性（べきとうせい）

- **ルール**: `PRAGMA user_version` は無条件でセットする（if ブロックの中に入れない）。`ALTER TABLE ADD COLUMN` はカラムの存在を先にチェックする。
- **根本原因**: `CREATE TABLE IF NOT EXISTS` は冪等だが、`ALTER TABLE ADD COLUMN` は冪等ではない。アプリ再起動時に version=0 となり、再マイグレーションが走って「カラムが重複しています」エラーになる。

### バックアップ / エクスポートのフィールドカバレッジ

- **ルール**: `events`, `bonsai`, `photos` にカラムを追加したら、必ず対応する Backup 型、エクスポートマッピング、backupService のインポート INSERT を更新する。
- **根本原因**: スキーマ変更時にバックアップへの影響を確認するプロセスがなかった。

### baseEn のフォールバックに頼らない (i18n)

- **ルール**: 新しい翻訳キーは、すべてのロケールファイルで明示的にオーバーライドする。`...baseEn` のスプレッドを使うとキーは「存在する」が、翻訳されないまま英語が残る。
- **根本原因**: `i18n:check` スクリプトは en.ts のキーとコードの使用箇所を照合するが、スプレッドで英語をそのまま引き継いでいるロケールファイルは検出できない。

### 2 系統テーブル併存 → dead code + silent regression パターン (Sess9 PR-1)

- **ルール**: 「同じ概念」を表す M:N junction table を新規追加する PR では、 既存の旧 junction の **利用箇所を全て grep + 移行 or 廃止判定を同 PR 内で完遂** する。 「後で cleanup」 はほぼ確実に忘れる。
- **根本原因 (実例)**: T2-6 で `bonsai_tags` (M:N) を追加した時、 先行する `event_tags` (M:N) は廃止判定されず併存状態に。 結果として:
  1. UI から `attachTagToEvent` を呼ぶ箇所が 0 件 (`event_tags` が永遠に空)
  2. Issue #253 のホーム filter chip 実装が **旧 `event_tags` JOIN** を流用、 タグは新 `bonsai_tags` にしか入らないので **常に 0 件返却** → user empty state へ silent fallback
  3. 探す画面 (look-back/search) の `searchEventsByTags()` も常に 0 件返却、 ユーザー誰も気付かず
- **検出方法**:
  - 新規 schema 追加 PR で 「旧 junction が dead code でないか?」 を grep (`grep -rn "attachTagTo<Old>" app/ src/`) で確認
  - PR template の 「関連 SQL / 関数の影響範囲確認」 チェックを強化 (R-9 強化候補)
  - dead code が確定したら **同 PR で廃止** (DB migration + 関数削除 + ADR Amended)
- **修正 (Sess9 PR-1)**: `event_tags` を v11 で完全廃止、 `bonsai_tags` 一本化、 ADR-0008 §Notes Amended 2026-05-18 で意思決定を明文化。 `searchEventsByTags` → `searchEventsByBonsaiTags` (bonsai 経由) に置換。

### enum 列に CHECK 制約がない場合 schema migration 不要 (Sess16 PR-E + ADR-0028)

- **ルール**: `EVENT_TYPES` のような enum 列 (text、 CHECK 制約なし) に **新しい値を追加する時**、 schema migration / `SCHEMA_VERSION` bump は **不要**。 `EVENT_TYPES` 配列 + Valibot `PAYLOAD_SCHEMAS` map に追加するだけで完結する。
- **根本原因**: events.type column は `text NOT NULL` (CHECK 制約なし) で定義済。 enum 値の追加は column 型を変えるものではない、 アプリ層で扱う値の domain が広がるだけ。 Valibot `v.object` は strict ではないので、 追加 prop は warning なく通過 (型保証は手動担保)。
- **検出方法**:
  - 新規 EventType 追加時、 まず `src/db/schema.ts` の events table 定義 を Read して CHECK 制約有無を確認
  - 「ない」 なら EVENT_TYPES 配列追加 + payloadValidator.ts の PAYLOAD_SCHEMAS map 追加だけで終わる
  - 「ある」 なら CHECK 制約の更新 migration が必要 (Sess14 PR-P trauma 参考、 idempotent 設計)
- **実例 (Sess16 PR-E #638)**: 当初 v15 → v16 schema bump を計画 (Plan v1) → 実装着手時に CHECK 制約なし発見 → migration 不要 → 計画撤回、 PR-E 1 PR で完遂。 ADR-0028 で文書化。

### 手動 list 同期忘れ bug → enum 派生は動的生成へ (Sess16 PR-G + PR-J)

- **ルール**: enum (EVENT_TYPES 等) を一部だけ使う list (例: `ALL_WORK_TYPES` from WorkPickerScreen、 `BULK_WORK_TYPES` from BulkWorkPickerScreen) は **手動コピペで作らず、 `EVENT_TYPES.filter(...)` で動的生成**。
- **根本原因 (実例 Sess16 PR-G #639)**: Phase γ (PR-E #638) で EVENT_TYPES に `leaf_first_aid` 追加した時、 ALL_WORK_TYPES / BULK_WORK_TYPES (手動 list) には **追加し忘れ** → 実機 SS 検証で「葉の手当」 が work-picker grid に表示されない bug 発覚。 緊急 fix で 1 行追加。
- **恒久対応 (Sess16 PR-J #642)**: 両 list を `EVENT_TYPES.filter(...)` で動的生成に refactor。 将来 EventType 追加時に schema.ts の EVENT_TYPES に追加するだけで自動的に grid 反映。
- **一般化**: enum の派生 list (subset / 除外 / フィルタ) は手動コピペ禁止、 enum 原典を source of truth とする動的生成を default。 例外は「順序を変えたい」 等の理由がある時のみ (その場合も map による mapping 経由)。
