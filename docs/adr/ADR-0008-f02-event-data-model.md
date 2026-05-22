---


# ADR-0008: F-02 作業履歴記録のデータモデル + 仕組み化（STI + Drizzle ORM + 30 日ゴミ箱 + TZ 3 層防御）

- Status: Accepted
- Date: 2026-04-29
- Deciders: @doooooraku
- Related:
  - 上書き対象: `functional_spec.md` §7（F-02 詳細仕様、特に §7.4 未来日時 NG → 撤廃 / §7.3.4 Undo 5 秒撤廃）
  - 連動: ADR-0003（ストレージ方針）/ ADR-0007（F-11 お引っ越し、本 ADR の id / deleted_at / status と連携）
  - 影響先: Issue #14 (F-01 盆栽 foundation) / Issue #15 (F-08 写真 foundation) — Drizzle 採用と event_id 列追加の波及
  - Issue: [#17](https://github.com/doooooraku/BonsaiLog/issues/17)

---

## Context（背景：いま何に困っている？）

- 現状：
  - F-02 (作業履歴記録) は basic_spec §7 / functional_spec §7 で「STI + payload_json + FTS5 trigram」が提案されているが、**実装方式の最終決定なし**。
  - Repolog 先行アプリは生 SQL + 単一報告書設計で、**FTS5 / STI / 16 種 event_type の前例がない**。
  - 想定データ規模 25 万行（5 年分蓄積、basic_spec §5.4）で、Repolog の数千行規模とは桁違い。
- 困りごと：
  1. **規模感の違い**: Repolog 踏襲ありきだと 25 万行で性能破綻リスク。先行知見が薄い。
  2. **TZ 符号バグ**: JavaScript の `Date.prototype.getTimezoneOffset()` は符号反転（JST = UTC+9 だが `-540` を返す）。「実装時に注意」では必ずヒューマンエラー発生。
  3. **未来日時の扱い**: 元仕様では「未来日時 = NG」だが、ユーザー要望で「予定機能を v1.0 で実装」が新たに決定 → 仕様変更必要。
  4. **5 秒 Snackbar Undo の UX 破綻**: シニアユーザー (62 歳) で操作が間に合わずイライラ → WCAG 2.2.1 「タイミング調整可能」要件違反でもある。
  5. **画面更新の連鎖**: 1 件記録で 4 つの queryKey invalidate が必要、書き忘れリスク。
  6. **マイグレ番号の取り合い**: F-01 / F-08 並行開発で `SCHEMA_VERSION` 衝突リスク。
  7. **Drizzle ORM の採用是非**: 型安全 + 自動マイグレ生成は v1.0 から導入すべきか保留すべきか。
- 制約/前提：
  - `docs/reference/constraints.md` §1-2（SQLite + UUID v4 + UTC ISO 8601 + PRAGMA foreign_keys）
  - `docs/reference/constraints.md` §1-4（AI 非搭載原則、診断/判定禁止）
  - `docs/reference/constraints.md` §5-2（UI 禁止語: 診断 / 判定 / reminder / alert）
  - 既存パッケージ: `expo-sqlite ^55` / `@tanstack/react-query ^5.90` / `date-fns ^4.1` / `react-native-reanimated ^4.2`

---

## Decision（決めたこと：結論）

F-02 を以下の構成で実装する。

### データモデル

1. **STI 採用**: 単一 `events` テーブル + `type TEXT NOT NULL` + `payload_json TEXT` で 16 種別を統合（Repolog の単表 + JSON 実績準拠）。
2. **id は ULID**（`text` で保存、時系列ソート可、CRDT 互換）。UUID v4 ではなく ULID を採用 → constraints.md §1-2 を「UUID v4 → ULID」に更新する Follow-up あり。
3. **CRDT 互換 3 列**: `id (ULID) / deleted_at / updated_at` を最初から確保。v2.x 家族共有移行に備える。
4. **status 列**: `'planned' | 'logged' | 'cancelled'` を CHECK 制約付きで導入。**「未来日時の記録は status='planned' のときのみ DB 許可」を CHECK 制約で仕組み化**。
5. **TZ 3 列**: `occurred_at_utc TEXT NOT NULL` + `tz_offset_min INTEGER NOT NULL` + `tz_iana TEXT NOT NULL`（DST 対応のため IANA 名を必須に）。

### ORM とマイグレ

6. **Drizzle ORM** + **Drizzle Kit** を v1.0 から採用。生 SQL を廃止し、型安全 + マイグレーション自動生成。
7. **マイグレ番号は Drizzle Kit のタイムスタンプ自動生成**（`SCHEMA_VERSION` 手書き管理を廃止）。F-01 / F-08 / F-02 並行開発の番号衝突を構造的に回避。
8. **`useLiveQuery`** を採用、`invalidateQueries` 二重管理を最小化。invalidate が必要な箇所は `src/core/queries/invalidators.ts` のヘルパー関数に集約 + ESLint で直接呼び禁止。

### 検索 (FTS5)

9. **FTS5 trigram tokenizer** (SQLite docs §4.3.4、3.34+ ビルトイン) + **fts5vocab + LIKE 'query%' OR 展開** で **2 文字検索**対応。**1 文字検索は trigram 仕様上 MATCH 不可**のため、UI ガイドで「2 文字以上で検索」を表示 (functional_spec §14.3.1)。
10. **`detail=column`** で trigram インデックス容量を 54% 削減しつつ column filter (`note: 黒松` 等) を維持。**`detail=none` は採用しない**（容量最小だが**「植え替え」「黒松「太郎」」等の 3 文字超 token の MATCH が不可になる罠**あり、F-09 リサーチで発見）。
11. **external content table 同期**: `events` への INSERT / UPDATE / DELETE を `events_fts` に同期する trigger 3 本を必須実装。
12. **タグ表 `tags`**: 列 `id (ULID PK) / name TEXT NOT NULL / name_normalized TEXT NOT NULL UNIQUE / color TEXT NULL (v1.0 未使用) / created_at / updated_at`。**case-insensitive + Unicode NFC 正規化**で重複検知 (`name_normalized = name.toLowerCase().normalize('NFC')`)、UNIQUE 制約で SQL レベル防止 (Bear / Things / Notion 業界標準)。
13. **junction 表 `bonsai_tags`**: 列 `bonsai_id / tag_id / created_at`、PK = (bonsai_id, tag_id)、双方向 index (`(tag_id, bonsai_id)` + `(bonsai_id, tag_id)`)。CASCADE 削除 = 盆栽 or タグ削除時に該当行を自動削除。

### 取り消し UX

12. **30 日ゴミ箱方式** を採用（Apple / Notion / Day One 業界標準）。`deleted_at` カラム + partial index `WHERE deleted_at IS NULL` で性能保護。
13. **5 秒 Snackbar Undo 廃止**（Repolog 踏襲を撤回）。WCAG 2.2.1 違反、シニア要件と矛盾。
14. **アプリ起動時に 30 日経過分を自動物理削除**。写真ファイル本体も同タイミングで削除。F-11 ZIP には `deleted_at IS NULL` のみエクスポート。

### TZ 仕組み化（3 層防御）

15. **層 1 ESLint**: `eslint.config.js` の `no-restricted-syntax` で `getTimezoneOffset()` 直接呼び禁止、`new Date()` 引数なし禁止。
16. **層 2 Branded Type**: `IsoUtc` / `TzOffsetMin` / `TzIana` 型を `src/core/datetime/types.ts` に定義。
17. **層 3 ラッパー関数 5 つ**: `src/core/datetime/` に `nowUtc` / `toIsoUtc` / `getTzOffsetMin` / `getTzIana` / `formatLocal` を集約。**符号反転は `getTzOffsetMin` 内部の 1 ヶ所だけ**で実施。
18. **`date-fns-tz@^3`** を追加（既存 `date-fns@^4` 拡張、bundle 影響最小）。Hermes Intl 互換性は実機で `formatInTimeZone` を検証、必要なら `@formatjs/intl-*` polyfill 追加（実装時判断）。

### バリデーション

19. **Valibot** を採用（1.37 KB、Zod の 1/10）。`payload_json` 16 種別を Discriminated Union として書き込み時検証。

### 適用範囲

- v1.0 から全プラン（Free / Pro 両方）。Free 制限は写真枚数のみ、event 自体は無制限。

---

## Decision Drivers（判断の軸）

- Driver 1: **規模感に合った設計** — 25 万行で性能破綻させない（Repolog 踏襲ありきにしない）。
- Driver 2: **仕組みで間違いを防ぐ** — TZ 符号バグ・マイグレ衝突・画面更新書き忘れを「注意」ではなく ESLint / DB CHECK / ヘルパー関数で防ぐ。
- Driver 3: **シニア UX** — 5 秒 Snackbar 撤廃、30 日ゴミ箱、業界デファクト標準の学習コスト 0。
- Driver 4: **将来の拡張余地** — CRDT 互換 3 列で v2.x 家族共有に備える、op-sqlite 移行可能性を残す。
- Driver 5: **コスト 0** — 全 OSS（MIT）、外部 API 0 円、無料枠廃止リスクなし。

---

## Alternatives considered（他の案と却下理由）

### Option A: STI + 生 SQL（Repolog 完全踏襲）

- 概要: SCHEMA_VERSION 手書き、TanStack Query で invalidateQueries 直接呼び。
- 良い点: Repolog コード流用度最大、学習コスト 0。
- 悪い点: Drizzle 型推論の安全性を捨てる。マイグレ番号衝突リスク（F-01 / F-08 並行）。useLiveQuery が使えず invalidate 書き忘れリスク。
- 却下理由: 25 万行規模 + 並行開発体制で「人間の注意」依存は破綻リスク高。Drizzle 採用の長期保守メリットが上回る。

### Option B: 別テーブル分割（16 個の `watering_events` 等）

- 概要: 種別ごとに専用テーブル + UNION ALL で時系列結合。
- 良い点: 種別固有カラムで NOT NULL 強制、型安全（DB レベル）。
- 悪い点: SQLite optimizer が UNION ALL 16 表で ORDER BY をプッシュダウンしにくく性能劣化。FTS5 を 16 表分維持（trigger 48 本）。type 追加で DDL 16→17 箇所修正。
- 却下理由: タイムライン表示（F-02 主用途）で性能ボトルネック必発。Fowler の Concrete Inheritance 適用条件と一致しない。

### Option C: WatermelonDB

- 概要: Lazy load + Native スレッド駆動の React Native 専用 ORM。
- 良い点: 5 万件超の初期化高速、Reactive Observable。
- 悪い点: New Architecture 0.76+ サポートが [Issue #1851](https://github.com/Nozbe/WatermelonDB/issues/1851) で議論中、メンテナ単独依存。BonsaiLog の RN 0.83 + New Arch 環境でリスク高。独自スキーマ言語の学習コスト。
- 却下理由: v1.0 ローンチ時期に対応保証なし、リスクが Drizzle より高い。

### Option D: op-sqlite を v1.0 で導入

- 概要: JSI ベースで expo-sqlite の 5x 高速・5x 低メモリ。
- 良い点: パフォーマンス最強、CRDT 移行時に Yjs 永続化が直結。
- 悪い点: Expo Managed → prebuild 必須化、ビルド構成の大幅変更。Web 非対応。
- 却下理由: v1.0 ローンチ重視。**v1.x で再評価**（本 ADR の Follow-up に明記）。

### Option E: 5 秒 Snackbar Undo（Repolog 踏襲）

- 概要: 削除直後 5 秒間 Snackbar で Undo、5 秒経過で物理削除。
- 良い点: Material Design 標準、即時 UX。
- 悪い点: WCAG 2.2.1 違反（タイミング調整不可）、シニアユーザーが 5 秒以内に判断できずイライラ。誤操作の永久損失。
- 却下理由: ユーザー指示で「いつでも取り消せる」要件、WCAG 観点でも不適。

### Option F: 未来日時バリデーション継続（予定機能なし）

- 概要: basic_spec §7.4 のまま「未来日時 = NG」を維持。
- 良い点: シンプル、実装容易。
- 悪い点: 「明日水やり予定」を記録する v1.0 機能要件と矛盾。
- 却下理由: ユーザー要件で「予定機能 v1.0 実装」が確定。

---

## Consequences（結果）

### Positive（嬉しい）

- TZ 符号バグが ESLint + Branded Type で **コンパイル時に防がれる**（注意不要）。
- マイグレ番号衝突が Drizzle Kit のタイムスタンプ自動生成で **構造的に発生しない**。
- 30 日ゴミ箱で誤操作回復可能、シニア UX 向上、業界標準学習コスト 0。
- 予定 / 実績統合で Things 3 / Todoist / EventKit 業界標準に準拠、UI が直感的。
- CRDT 互換 3 列で v2.x 家族共有移行コスト最小化。
- ライセンス料 0、外部 API 0、無料枠リスクなし。

### Negative（辛い/副作用）

- **Drizzle ORM 学習コスト**: チーム未経験。F-01 / F-02 / F-08 で初導入のため最初の PR で躓く可能性。Drizzle 公式 docs を AGENTS.md に必読リンク追加で吸収。
- **Hermes Intl 不安定リスク**: `formatInTimeZone` が `RangeError` を吐く可能性。実機検証で `@formatjs/intl-*` polyfill 追加が必要になるかも。
- **30 日ゴミ箱で DB 容量増**: ユーザーが大量削除しても 30 日保持。F-11 ZIP には含まないので影響限定。
- **Drizzle Kit のマイグレファイル管理**: タイムスタンプ自動だが、SQL ファイルが増える。Repolog にない運用パターン。
- **`useLiveQuery` と TanStack Query の二重管理**: F-02 では invalidator ヘルパー集約で対応。F-04 以降に `useLiveQuery` への一本化検討。

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/constraints.md` §1-2 の「主キーは UUID v4 TEXT」を「主キーは ULID TEXT」に修正。
- [ ] `docs/reference/functional_spec.md` §7.3.3 の擬似コードを Drizzle + ULID + status + ラッパー関数版に書き換え。
- [ ] `docs/reference/functional_spec.md` §7.3.4 の Undo Snackbar 5 秒を 30 日ゴミ箱仕様に書き換え。
- [ ] `docs/reference/functional_spec.md` §7.4 の「未来日時 NG」境界値を「`status='planned'` のみ未来日 OK、`logged` は CHECK で禁止」に修正。
- [ ] `docs/reference/functional_spec.md` に「§5.x ゴミ箱仕様」セクション新設（30 日論理削除、自動物理削除、F-11 連携）。
- [ ] `docs/reference/glossary.md` に「ULID / status / deleted_at / 30 日ゴミ箱 / Drizzle」を追加。
- [ ] `eslint.config.js` に `no-restricted-syntax` で `getTimezoneOffset` / `new Date()` 禁止追記。
- [ ] `package.json` に追加: `drizzle-orm` / `drizzle-kit` / `date-fns-tz@^3` / `valibot` / `ulid`。
- [ ] `src/core/datetime/{types,clock,tz,format}.ts` 新規実装（共通仕組み化）。
- [ ] `src/core/queries/invalidators.ts` 新規実装（invalidate ヘルパー）。
- [ ] Issue #14 (F-01) / Issue #15 (F-08) に Drizzle 採用 + 共通仕組み化の波及をコメントで通知。
- [ ] Issue #15 (F-08) の photos テーブルに `event_id TEXT NULL` + `deleted_at TEXT NULL` を追加依頼。
- [ ] op-sqlite 移行を v1.x で再評価する Issue を作成（本 ADR Follow-up）。
- [ ] `react-native-zip-archive` Issue #330 進捗確認 (2026-10-29) と同タイミングで op-sqlite も再確認。
- [ ] `docs/reference/tasks/lessons.md` に「先行アプリ規模感が異なる場合は踏襲ありきにしない」を追記。

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - **Jest 単体テスト**:
    - `__tests__/core/datetime/tz.test.ts` — TZ ラッパー 5 関数の符号正しさ（JST/PST/CET の往復変換、DST 境界）
    - `__tests__/db/eventRepository.test.ts` — STI CRUD + status 遷移 (planned → logged) + 論理削除 + 30 日後自動物理削除
    - `__tests__/db/migrate.test.ts` — Drizzle Kit マイグレの冪等性（2 回連続実行で壊れない）
    - `__tests__/features/event/payloadValidator.test.ts` — Valibot 16 種別 Discriminated Union バリデーション
    - `__tests__/features/event/fts.test.ts` — FTS5 trigram + fts5vocab 1〜2 文字検索
  - **Maestro E2E**: `maestro/flows/log_event.yml` — 作業記録 → ゴミ箱 → 復元の 1 サイクル
- 手動チェック（必要最小限）：
  - PoC: 25 万件シードで「タイムライン 500 件表示 < 300ms」達成確認（実機 Pixel 7 / iPhone 13）
  - Hermes Intl 動作確認: `formatInTimeZone('Asia/Tokyo', ...)` が iOS / Android で `RangeError` を吐かないこと

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - F-01 / F-08 マージ後に F-02 マージ。Drizzle 導入は F-01 で先行（共通基盤として）。
  - リリースノートに「作業を記録できます。30 日以内ならゴミ箱から復元できます」を 19 言語で追記。
- ロールバック方針：
  - F-02 を v1.0.x ホットフィックスで無効化する場合、UI 側で `event` 機能を非表示化（DB は残す、Drizzle マイグレ不可逆のため）。
  - **Drizzle Kit マイグレは戻せない**: `db.execAsync('PRAGMA user_version=N-1')` 等の手動戻しは禁止、ホットフィックスは必ず UI 非表示で対応。
- 検知方法：
  - Sentry で `EventError.code` 別エラーレート監視（`schema_violation` / `tz_inconsistent` / `migration_failed`）
  - PoC ベンチマーク CI（25 万行シードで 500 件表示時間を計測、300ms 超過で警告）

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-2 ULID 化、§1-4 AI 非搭載、§5-2 禁止語)
- reference: `docs/reference/basic_spec.md` (§5.1 events 設計、§5.3 STI 採用理由、§5.4 性能目標、§7 F-02 機能)
- reference: `docs/reference/functional_spec.md` (§7 F-02 詳細、§14 検索)
- glossary: `docs/reference/glossary.md` (Event / event_type 13 種 + observation/other → 16 種、STI、payload_json、events_fts)
- 連動 ADR: `docs/adr/ADR-0003-storage-policy.md`、`docs/adr/ADR-0007-f11-data-migration-design.md`
- 影響 Issue: #14 (F-01)、#15 (F-08)
- PR: #<TBD>
- Issue: #<TBD>
- External docs:
  - [Martin Fowler - Single Table Inheritance](https://martinfowler.com/eaaCatalog/singleTableInheritance.html)
  - [SQLite FTS5 公式 (trigram §4.3.4、detail §4.6、external content §4.4.3、bm25 §5.1.1、fts5vocab §8)](https://www.sqlite.org/fts5.html)
  - [SQLite JSON1 (json_extract / generated columns)](https://www.sqlite.org/json1.html)
  - [Drizzle ORM Expo SQLite docs](https://orm.drizzle.team/docs/connect-expo-sqlite)
  - [Drizzle Kit migrations](https://orm.drizzle.team/docs/migrations)
  - [date-fns-tz v3 GitHub](https://github.com/marnusw/date-fns-tz)
  - [Hermes Intl Issue #1607](https://github.com/facebook/hermes/issues/1607)
  - [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339.html)
  - [ULID spec](https://github.com/ulid/spec)
  - [Valibot](https://valibot.dev/)
  - [Things 3 TMTask schema (things.py)](https://thingsapi.github.io/things.py/things/database.html)
  - [Todoist Sync API v9](https://developer.todoist.com/sync/v9/)
  - [Apple EventKit EKCalendarItem](https://developer.apple.com/documentation/eventkit/ekcalendaritem)
  - [Apple Support: 最近削除した項目 (30 日)](https://support.apple.com/en-us/124460)
  - [Notion Help: Trash 30 days](https://www.notion.com/help/duplicate-delete-and-restore-content)
  - [WCAG 2.2.1 Timing Adjustable](https://www.w3.org/TR/WCAG21/#timing-adjustable)
  - [NN/g: Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/)
  - [op-sqlite](https://github.com/OP-Engineering/op-sqlite) (v1.x 再評価候補)

---

## Notes（メモ）

### PoC 必須項目（F-02 着手 Phase 0 で実施）

1. **25 万件シード性能**: ランダム events 25 万件を投入し、`(bonsai_id, occurred_at_utc DESC) LIMIT 500` の応答時間を計測。300ms 未満を確認。
2. **FTS5 trigram の絵文字挙動**: `note` に `💧 ✂️ 🪴` を含むデータをインデックス、検索時の MATCH 動作を実機検証。
   2-A. **19 言語 trigram 動作**: Latin 拡張 (フランス語アクセント等)、キリル文字 (ロシア語)、タイ文字での MATCH 動作を実機検証 (F-09 PoC 拡張)。
   2-B. **タグ + 検索 2 段階フィルタ性能**: events_fts MATCH + tags AND の CTE 2 段階クエリで 25 万行 + 1000 タグ規模での応答時間計測 (F-09 PoC 拡張)。
   2-C. **タグ全体最大数の性能限界把握**: 1000 / 5000 / 10000 タグ投入時の挿入・検索・チップ表示性能計測 (F-09 ユーザー要望)。
3. **Hermes Intl 動作確認**: `formatInTimeZone('Asia/Tokyo', d, 'yyyy-MM-dd HH:mm zzz')` が iOS / Android で `RangeError` を吐かないこと。吐く場合は `@formatjs/intl-*` polyfill 追加。
4. **`useLiveQuery` の動作**: Drizzle のリアクティブクエリが optimistic update なしで実用的か確認。

### Drizzle Kit のマイグレ管理運用

- `drizzle/migrations/<timestamp>_<name>.sql` で番号自動生成
- マイグレ実行は `drizzle-orm/expo-sqlite/migrator` の `useMigrations` で自動化
- 旧 `SCHEMA_VERSION` / `hasColumn()` パターンは廃止、`db.ts` を Drizzle 標準パターンに書き換え
- F-01 マージで Drizzle 基盤確立 → F-08 / F-02 はその上に乗る

### Repolog との同期方針

- Repolog (生 SQL) → BonsaiLog (Drizzle) は **逆移植不可**（Drizzle スキーマからの逆変換が困難）
- 互換性は維持しない方針（Repolog は Repolog として維持、BonsaiLog は新基盤で進化）
- ただし Repolog の `getDb()` シングルトン / マイグレ冪等性パターン（lessons.md L202）は Drizzle 経由でも維持

### v1.x 拡張候補（本 ADR 対象外）

- op-sqlite 移行（5x 高速、CRDT 移行に有利）
- `useLiveQuery` 全面採用（invalidator ヘルパー廃止）
- 完全置換モード（マージポリシー追加）
- 予定の繰り返し（RRULE）— 現状は単発 plan のみ
- ゴミ箱から「すべて空にする」ボタン
- 写真の論理削除タイミング細分化（event 削除と独立させるか）

---

## Notes Amended (2026-05-18, Sess9 PR-1): event_tags 廃止 + bonsai_tags 一本化

### 変更内容

- **`event_tags` テーブル + 関連 Repository 関数 3 個を完全廃止** (DB migration v10 で `DROP TABLE event_tags;`)
- `searchEventsByTags()` (event_tags 経路) を廃止し、 `searchEventsByBonsaiTags()` (bonsai_tags 経路) で置換
- タグは **`bonsai_tags` のみ** で運用 (1 系統一本化)
- 探す画面 (look-back/search) の tag filter セマンティクスを 「指定タグ全部が付いている **盆栽** の active events を返す」 に変更

### 廃止対象 (Sess9 PR-1 grep 確認済)

| 対象                            | 場所                                | 状況                                                                    |
| ------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `event_tags` table + index 2 個 | `src/db/schema.ts:228-244, 421-431` | DROP                                                                    |
| `attachTagToEvent()`            | `src/db/tagRepository.ts:96-103`    | UI から呼ばれていない (dead code)                                       |
| `detachTagFromEvent()`          | `src/db/tagRepository.ts:109-113`   | UI から呼ばれていない (dead code)                                       |
| `getTagsByEvent()`              | `src/db/tagRepository.ts:131-141`   | UI から呼ばれていない (dead code)                                       |
| `searchEventsByTags()`          | `src/db/eventRepository.ts:437-460` | 探す画面で呼ばれるが event_tags が空のため常に 0 件 (silent regression) |
| `DELETE FROM event_tags`        | `src/dev/seedTestData.ts:286`       | clearAllData クリア対象から除外                                         |

### 理由 (証拠 3 件)

1. **設計仕様との整合**: `docs/reference/basic_spec.md` F-09 セクション + 本 ADR §13 (junction 表 `bonsai_tags`) で `bonsai_tags` を「正」 と明記。 「1 盆栽あたり最大 10 タグ、 アプリ全体タグ数制限なし」 という記述も event 単位ではなく **盆栽単位**。 event タグはどの仕様書にも記述なし。
2. **実装の実態 (dead code)**: `event_tags` への attach UI が **存在しない** (grep で `attachTagToEvent` を呼ぶ `.tsx` ファイル 0 件)。 結果として `event_tags` table は **永遠に空**。 探す画面の `searchEventsByTags()` も常に 0 件返却 (silent regression、 ユーザー誰も気付かず)。
3. **業界事例**: Apple Notes / Things 3 / Bear Notes / Linear 全て **entity 単位タグ** (ノート / タスク / Issue にタグ)。 log 単位 (ノート内段落 / サブログ / コメント) にタグを付ける事例ゼロ。 BonsaiLog のシニア (62 歳) + ライト想定では event 単位の細かい分類は不要、 盆栽単位 + `event.type` (16 種固定) + `event.note` (自由記述) で十分。

### 歴史的経緯

- **2026-04** F-02 foundation 着工時、 タグ概念の最初の実装として `event_tags` を schema v4 で作成
- **2026-05** T2-6 (schema v9) で「やっぱり盆栽自体にタグを付けたい」 と仕様変更、 `bonsai_tags` を新規追加。 `BonsaiBasicForm` + `seedTestData` は `bonsai_tags` 使用。 だが `event_tags` の cleanup は漏れた
- **2026-05-06** Issue #253 (PR #250) でホーム filter chip 実装。 当時 `bonsai_tags` 整備直後 or 同時で、 既存 `searchEventsByTags` パターンを流用して **`event_tags` JOIN で書かれた**
- **2026-05-18 Sess9** で user の 「そもそも event タグって何が嬉しい?」 質問から dead code 検出 → 本 Amended で廃止

### Risk 評価

| Risk                     | 評価    | 対策                                                                      |
| ------------------------ | ------- | ------------------------------------------------------------------------- |
| 既存ユーザーデータ破損   | 🟢 低   | v1.0 リリース前、 migration v10 で `DROP TABLE` のみ                      |
| 探す画面 UX 退化         | 🟢 なし | 現状も常に 0 件返却、 `searchEventsByBonsaiTags()` 再実装でむしろ機能する |
| 将来「event タグ欲しい」 | 🟢 極小 | 業界事例ゼロ、 仕様記述なし、 v1.x 後の判断で復活可                       |
| ADR 改訂のコスト         | 🟢 低   | 本 Amended セクションで完結                                               |

### 仕組み化 (再発防止)

- `docs/reference/tasks/lessons/data-model.md` に 「**2 系統 dead code 検出パターン**」 を記録
- PR template に 「廃止候補 schema/関数の grep 確認」 チェック追加検討 (R-9 強化)
- T2-6 のような 「機能の中核を入れ替える」 PR は **既存 dead code の cleanup を同 PR で完遂** を ADR / lessons で原則化

---

## Notes Amended (2026-05-23、 Sess36 PR-8): §TZ 3 層防御に `toLocalDateKey` を 6 つ目のラッパーとして明文化

### 背景 (Sess36 実機検証で発覚した bug)

Sess36 実機検証で「JST 早朝 (5:44 = UTC 5/22 20:44) に記録 form の日付欄が **2026-05-22 (UTC 日付)** で表示される」 bug が発覚。 原因は 3 file (`BulkLogConfirmScreen.tsx` / `BulkWorkPickerScreen.tsx` / `WorkLogConfirmScreen.tsx`) で `(nowUtc() as string).slice(0, 10)` という pattern が使われていたこと。

旧コード comment は `// ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、 nowUtc() 経由` と本 ADR を参照していたが、 **実際は §TZ 3 層防御を破る誤用** だった (Sess16 PR-A2/B2/H 由来、 R-55 網羅調査で 3 件確認)。

### 根本原因 = §TZ 3 層防御の不完全性

本 ADR §TZ 仕組み化 (上記) で **ラッパー関数 5 つ** (`nowUtc` / `toIsoUtc` / `getTzOffsetMin` / `getTzIana` / `formatLocal`) を定義したが、 **「ローカル日付キー (YYYY-MM-DD) の取得」** に該当する関数が明示されていなかった。 そのため実装者は `nowUtc().slice(0, 10)` という UTC 日付取得を「ローカル日付取得」 と誤用した。

実は同等の関数は **`src/features/watering/dateUtils.ts:38` の `toLocalDateKey(isoUtc, tzOffsetMin)`** として watering 由来で存在し、 notification 系 (`invalidator.ts` 等) で正しく使用されていた。 本 Notes Amended で本関数を **§TZ 3 層防御の正式 6 つ目のラッパー** として昇格させる。

### §TZ 3 層防御の改訂 (本 Notes Amended)

#### ラッパー関数 = 6 つ (旧 5 → 新 6)

| #     | 関数                                      | 場所                                        | 用途                                                      |
| ----- | ----------------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| 1     | `nowUtc()`                                | `src/core/datetime/clock.ts`                | 現在時刻取得 (IsoUtc)                                     |
| 2     | `isoUtcFrom(value)`                       | 同上                                        | 任意 Date/number/string から IsoUtc 生成                  |
| 3     | `getTzOffsetMin()`                        | `src/core/datetime/tz.ts`                   | TZ オフセット (分、 JST=540、 符号反転は本 fn 内のみ)     |
| 4     | `getTzIana()`                             | 同上                                        | TZ IANA 名 (DST 対応用)                                   |
| 5     | `formatLocal(...)`                        | `src/core/datetime/format.ts`               | ローカル時刻表示                                          |
| **6** | **`toLocalDateKey(isoUtc, tzOffsetMin)`** | **`src/features/watering/dateUtils.ts:38`** | **ローカル日付キー (YYYY-MM-DD) 取得 ★本 Amended で追加** |

### 禁止 pattern

- ❌ `nowUtc().slice(0, 10)` — UTC 日付を返す、 JST 早朝に「昨日」 化
- ❌ `(nowUtc() as string).slice(0, 10)` — 同上 (Branded Type unwrap だけで本質は同じ)
- ❌ `new Date().toISOString().slice(0, 10)` — UTC 日付 + ESLint `no-restricted-syntax` 違反

### 正しい pattern

```typescript
import { nowUtc, getTzOffsetMin } from '@/src/core/datetime';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

// ✅ ローカル日付キーを取得
const todayLocal = toLocalDateKey(nowUtc() as string, getTzOffsetMin());
```

### 自動化 (R-9 昇華、 Sess36 PR-9 連動)

- `scripts/check-utc-date-slice.mjs` 新規 (Sess36 PR-9): `nowUtc.*slice|new Date().*slice` を `src/` 配下で grep → 違反検出時 exit 1
- 例外: `app/export/*` (機械処理用 = ファイル名 / 表示ラベル、 user 体感「日付」 ではない)
- `pnpm verify:utc-date-slice` 経由で `pnpm verify` chain に組込予定 (PR-9)

### 修正実績 (Sess36 PR-7)

| file:line                      | 旧                                                    | 新                                                                       |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `BulkLogConfirmScreen.tsx:128` | `(nowUtc() as string).slice(0, 10)` + 直書き default  | `params.date ?? toLocalDateKey(nowUtc() as string, getTzOffsetMin())`    |
| `BulkWorkPickerScreen.tsx:59`  | `scheduleDate \|\| (nowUtc() as string).slice(0, 10)` | `scheduleDate \|\| toLocalDateKey(nowUtc() as string, getTzOffsetMin())` |
| `WorkLogConfirmScreen.tsx:87`  | `(nowUtc() as string).slice(0, 10)`                   | `toLocalDateKey(nowUtc() as string, getTzOffsetMin())`                   |

### 関連

- 本 Notes Amended の親 PR: Sess36 PR-8 (本 file 改訂)
- 修正 PR: Sess36 PR-7 #816 (3 file fix + 副次 bug fix = date URL param 伝搬)
- lint 自動化: Sess36 PR-9 (`scripts/check-utc-date-slice.mjs`)
- 既存 fn 出典: `src/features/watering/dateUtils.ts` `toLocalDateKey` (watering 由来、 notification 系で使用済の信頼実装)
- R-55 (CLAUDE.md §2 関連項目網羅調査) の適用例 1 号: 1 件発覚 → 同 pattern 全件 grep で 3 件修正 + 副次 bug 1 件発見
