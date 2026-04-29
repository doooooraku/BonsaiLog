# 機能設計書（BonsaiLog / 盆栽手帳）

> **Diátaxis**: Reference（どう動くかをすぐ引けるための仕様）
> **バージョン**: v1.0（2026-04-23）
> **前提文書**: [`product_strategy.md`](../explanation/product_strategy.md) / [`basic_spec.md`](./basic_spec.md)

---

## §0. この文書の位置づけ（超重要）

- **文書タイプ**: Reference（「どう動くか」をすぐ引けるための仕様）
- **想定読者**:
  - 実装する人（未来の自分 / AI）
  - PR レビューする人
  - 不具合を切り分ける人
- **この文書に「書かない」こと**（ドリフト防止）:
  - 開発手順・コマンド → `docs/how-to/whole_workflow.md`
  - 背景や思想の長文 → `docs/adr/`
  - 画面の見た目詳細 → Figma（正）
  - できること/できないことの境界 → `basic_spec.md`
- **ソース・オブ・トゥルース（正）**:
  1. この機能設計書（期待動作）
  2. 自動テスト（期待動作の機械的検証）
  3. 実装（最終的な現実）
     ※ 1) と 2) が揃って初めて「仕様が生きている」とみなす

### 本書と basic_spec.md の役割分担

| 文書                         | 役割                                                        | 粒度    |
| ---------------------------- | ----------------------------------------------------------- | ------- |
| `basic_spec.md`              | できること / できないことの境界、受け入れ条件のインデックス | What    |
| `functional_spec.md`（本書） | 期待動作、状態遷移、擬似コード、境界値、エラーフロー        | **How** |

---

## §1. いつ・どんな時に必要になる？

- **仕様を元に Issue を立てる時**: 「受け入れ条件」「期待動作」をここからコピペ
- **実装前**: 既存機能の期待動作を確認し、影響範囲（どの F-XX に触れるか）を特定
- **PR レビュー時**: 変更内容がこの文書の期待動作を壊していないか確認
- **不具合調査時**: 「本来どう動くべきか」をここで確定し、ログ / 再現手順を組み立てる

---

## §2. 更新ルール（運用で死なせない）

### §2.1 更新トリガー

1 つでも当てはまれば更新:

- 新しい画面・設定項目・制約が増えた
- 既存の挙動（例: 「気遣い型」ポップアップの閾値、Free 制限）が変わった
- テストの期待値が変わった
- Pro / 課金 / 広告 / レビュー要求など、審査に関わる動作が変わった

### §2.2 PR の Definition of Done

- [ ] 変更した機能 ID（F-XX）を PR に列挙した
- [ ] 受け入れ条件が変わるなら、本書を更新した
- [ ] 関連テスト（Jest / Maestro）が追加・更新され、CI で実行される
- [ ] 状態遷移図・境界値テーブルが影響を受けるなら更新した

---

## §3. 全体の機能マップ（basic_spec.md F 番号との対応）

| F 番号 | 機能名                           | 本書 § |
| ------ | -------------------------------- | ------ |
| F-01   | 盆栽の登録・管理                 | §6     |
| F-02   | 作業履歴記録                     | §7     |
| F-04   | 水やり履歴の可視化               | §9     |
| F-05   | 「気遣い型」予定確認ポップアップ | §10    |
| F-07   | 針金がけ記録・外し時期通知       | §12    |
| F-08   | 写真管理（年次タイムライン）     | §13    |
| F-09   | 検索・タグ                       | §14    |
| F-10   | エクスポート（CSV / PDF）        | §15    |
| F-11   | お引っ越し機能                   | §16    |
| F-12   | 多言語対応                       | §17    |
| F-13   | 課金（サブスク + 買切）          | §18    |
| F-14   | Home 下部バナー広告              | §19    |
| F-15   | ダークモード / 屋外モード        | §20    |
| F-16   | ローカル通知                     | §21    |

---

## §4. 用語（この文書で使う言葉）

basic_spec.md §2 と重複しない本書固有語のみ:

- **optimistic update**: ユーザー操作を即座に UI 反映し、後で DB に書き込む手法。DB 失敗時は UI をロールバック。
- **query key**: TanStack Query がキャッシュを識別するための配列キー。例: `['bonsai', 'list']`。
- **invalidate**: TanStack Query のキャッシュを「古い」と印し、次の参照で再取得させる操作。
- **排他トランザクション（Exclusive TXN）**: `withExclusiveTransactionAsync`。他の並行クエリを巻き込まない、独立接続で実行。
- **identifier（通知）**: 通知の一意識別子。BonsaiLog では `bonsai_${id}_${event}_${YYYYMMDD}`。
- **canRequestAds**: UMP が返す真偽値。ユーザー同意が得られ広告要求可能か。
- **entitlement（RevenueCat）**: 課金で解放される権利。BonsaiLog は `premium` 1 つのみ。
- **Intent（スナックバー）**: 「取り消し」ボタンで可逆な通知型 UI。5〜7 秒表示。
- **WAL**: Write-Ahead Logging、SQLite の高並行性モード。
- **bigram / trigram**: 2 文字 / 3 文字で文字列を分割する方式。SQLite FTS5 tokenizer の選択肢。

---

## §5. 横断仕様（どの機能にも効くルール）

### §5.1 日付の基準

- **日付境界は端末のローカルタイム 00:00 切り替え**を基準とする
- アプリがバックグラウンドにいても、復帰時（AppState → active）に日付変更を検知して当日情報を再同期する
- **DB 保存は UTC ISO 8601 TEXT + `tz_offset_min` INTEGER**（basic_spec.md §5.2）
- 表示時のみ `tz_offset_min` または端末ローカルでの変換
- **リスク**: 端末の手動時刻変更 / タイムゾーン変更で意図しない日付が混ざる可能性
  - 対策: 横断的に「ローカル基準」と明記、将来必要なら ADR で「旅行対応」などを決める

### §5.2 タイムゾーン変更対応

AppState → active 時に以下を実施:

```typescript
AppState.addEventListener('change', async (state) => {
  if (state !== 'active') return;
  const nowTz = Localization.getCalendars()[0]?.timeZone;
  if (nowTz && nowTz !== lastTz) {
    lastTz = nowTz;
    await rescheduleAllBonsaiNotifications(); // F-05, F-16 再計算
  }
});
```

### §5.3 状態管理レイヤー（3 層分離）

| レイヤー             | 役割           | 技術                 |
| -------------------- | -------------- | -------------------- |
| **永続・真実**       | 正データ       | expo-sqlite 55 (WAL) |
| **キャッシュ・同期** | UI への供給    | TanStack Query v5    |
| **UI・ドラフト**     | 揮発性選択状態 | Zustand v5           |

**原則**: SQLite が source of truth、表示はキャッシュで高速に、永続化は DB で確実に。

**絶対ルール**:

- SQLite データを Zustand に丸ごとコピーしない（二重管理アンチパターン）
- Zustand は UI 状態（選択中 ID、フィルタ、ドラフト）のみ
- 複数フィールド選択時は `useShallow` を使う（v5 破壊的変更）
- `onSuccess` ではなく **`onSettled` で invalidate**（ロールバック時も正しく同期）

### §5.4 トランザクション選択ルール

| 状況                                       | 選択                                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| 単純な順次クエリ、他 process も触らない    | `withTransactionAsync`                                |
| 同時性競合あり、他フック経由のクエリが並行 | **`withExclusiveTransactionAsync`（BonsaiLog 既定）** |
| 1 件の INSERT/UPDATE/DELETE                | `runAsync`（TXN 不要）                                |
| DDL（ALTER, VACUUM）                       | TXN 外で実行                                          |

**BonsaiLog で必ず排他 TXN を使う場所**:

- F-01 盆栽削除（CASCADE で events/photos も連動削除）
- F-05 分散再計算（全盆栽リマインダーを書き換え）
- F-08 写真バッチ保存
- F-11 お引っ越し DB 置換
- マイグレーション（§5.11）

### §5.5 invalidateQueries タイミング表

| トリガ                 | invalidate する query key                                                               | 対象 F |
| ---------------------- | --------------------------------------------------------------------------------------- | ------ |
| 盆栽追加/編集/削除     | `['bonsai']`（全配下）                                                                  | F-01   |
| 作業記録追加/編集/削除 | `['bonsai','works',id]`, `['bonsai','detail',id]`, `['bonsai','list']`, `['reminders']` | F-02   |
| 分散再計算完了         | `['reminders']`, `['bonsai','list']`                                                    | F-05   |
| リマインダー設定変更   | `['reminders']`, `['bonsai','detail',id]`                                               | F-16   |
| 写真追加/削除          | `['bonsai','photos',id]`, `['bonsai','detail',id]`                                      | F-08   |
| タグ付与               | `['bonsai','tags',id]`, `['bonsai','list']`                                             | F-09   |
| お引っ越し復元         | **全キャッシュ破棄（`queryClient.clear()`）**                                           | F-11   |
| 言語切替               | 翻訳キャッシュのみ、query key は不変                                                    | F-12   |
| Pro 購入               | `['subscription']`、UI は Zustand で即反映                                              | F-13   |

### §5.6 optimistic update 採用ルール

以下のみ optimistic update を使う（可逆操作）:

- F-02 作業記録のトグル完了（水やり「済」にする）
- F-09 タグの付与/解除
- F-15 テーマ切替

以下は optimistic update を使わない（破壊的・非可逆・データ重要）:

- F-01 盆栽削除
- F-08 写真削除
- F-11 DB 置換
- F-13 購入

### §5.7 エラー時の原則

ユーザー操作の結果が保存できなかった場合:

- **画面に分かる形で通知する**（トースト / スナックバー）
- 可能なら「元に戻す」または「再試行」導線を用意
- 課金 / 復元は失敗しうる前提で、明確なメッセージを出す
- ログに PII を出さない（AdMob ID、transaction ID も含む）

### §5.8 確認ダイアログ vs Undo スナックバー（全 F 共通ルール）

| 操作                           | 確認ダイアログ            | Undo スナックバー | 理由                     |
| ------------------------------ | ------------------------- | ----------------- | ------------------------ |
| 水やり記録                     | ❌ 無音                   | ✅ 5 秒           | 頻度高、可逆             |
| 作業記録（その他）             | ❌                        | ✅ 5 秒           | 可逆、後で編集可         |
| 写真削除                       | ❌                        | ✅ 7 秒           | 可逆（ゴミ箱 30 日保持） |
| 盆栽アーカイブ                 | ❌                        | ✅ 7 秒           | アーカイブは可逆         |
| 盆栽完全削除（アーカイブから） | ✅ タイプ入力「削除」     | ❌                | 不可逆                   |
| タグ付与/解除                  | ❌ 無音                   | ❌                | 即座に再操作可能         |
| 言語切替                       | ❌                        | ❌                | 即反映                   |
| ダークモード切替               | ❌                        | ❌                | 即反映                   |
| テーマ切替                     | ❌                        | ❌                | 即反映                   |
| 課金                           | ✅ OS ネイティブ          | ❌（OS 任せ）     | 規約準拠                 |
| お引っ越し実行                 | ✅ 大きなダイアログ       | ❌                | 不可逆・重い処理         |
| 全データ初期化                 | ✅ タイプ入力「リセット」 | ❌                | 不可逆                   |

### §5.9 スナックバー仕様

```typescript
showSnackbar({
  label: '水やりを記録しました', // 14 字以内、言語ごとに短く
  action: '取り消し', // 動詞、5 字以内
  duration: 5000, // 5 秒（写真削除のみ 7 秒）
  onPress: async () => {
    /* ロールバック */
  },
  onTimeout: async () => {
    /* 後処理（通知再スケジュール等） */
  },
});
```

同時に複数スナックバーがある場合: **後発で置換**（スタックしない）。

### §5.10 データの正（DB）とキャッシュ（状態）

- **正**: ローカル DB（SQLite）
- **画面表示用**: TanStack Query キャッシュ
- **UI ドラフト**: Zustand
- **原則**: 表示はキャッシュで高速に、永続化は DB で確実に

### §5.11 マイグレーション戦略

- **`PRAGMA user_version` ベースの前進型**（ダウングレード非対応、basic_spec.md §5.2 ルール 6）
- **`withExclusiveTransactionAsync` 内で実行**（失敗時自動ロールバック）
- DDL のうち VACUUM / ALTER TABLE RENAME は TXN 外
- 失敗時は `PRAGMA user_version` も自動で戻る（TXN ロールバックで）

```typescript
const DATABASE_VERSION = 3;

async function migrate(db: SQLiteDatabase) {
  const { user_version: v } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  if (v >= DATABASE_VERSION) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    if (v < 1) await txn.execAsync(`CREATE TABLE bonsai (...); CREATE TABLE events (...);`);
    if (v < 2) await txn.execAsync(`CREATE TABLE photos (...);`);
    if (v < 3) await txn.execAsync(`CREATE VIRTUAL TABLE fts_bonsai_search USING fts5(...);`);
    await txn.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}
```

### §5.12 PRAGMA 初期化（起動時必須）

```typescript
await db.execAsync(`
  PRAGMA journal_mode = WAL;        -- 並行読み書き
  PRAGMA synchronous  = NORMAL;     -- WAL モードで安全
  PRAGMA foreign_keys = ON;         -- 既定 OFF なので必須
  PRAGMA busy_timeout = 5000;       -- 5 秒まで待つ
  PRAGMA temp_store   = MEMORY;
  PRAGMA cache_size   = -8000;      -- 8MB
`);
```

### §5.13 日付/時刻の表示フォーマット（全F共通）

| 用途                       | フォーマット                    | 言語例                                       |
| -------------------------- | ------------------------------- | -------------------------------------------- |
| リスト表示「最後の水やり」 | `Intl.RelativeTimeFormat`       | ja: 「3 日前」 / en: "3 days ago"            |
| 詳細画面                   | `Intl.DateTimeFormat('long')`   | ja: 「2026年4月23日」 / en: "April 23, 2026" |
| タイムライン軸             | `Intl.DateTimeFormat('medium')` | ja: 「4月23日」 / en: "Apr 23"               |
| CSV エクスポート           | ISO 8601 UTC                    | 全言語同一 `2026-04-23T10:30:00Z`            |

---

## §6. F-01 盆栽の登録・管理

### §6.1 目的

ユーザーが「育てている盆栽」を登録し、後から編集・並び替え・アーカイブできるようにする。

### §6.2 画面 / 入口

- Home（一覧表示、`(tabs)/index`）
- 盆栽追加モーダル（`(modals)/bonsai-new`、`modal` presentation）
- 盆栽詳細（`bonsai/[id]`、Stack `card` presentation）
- 盆栽編集（`bonsai/[id]/edit`、Stack `card` presentation）

### §6.3 期待動作

#### §6.3.1 新規登録フロー

```mermaid
flowchart TD
  Home[Home画面] -->|FABタップ| CheckDraft{未保存下書き?}
  CheckDraft -- あり --> Resume[再開確認ダイアログ]
  Resume -->|継続| Modal
  Resume -->|破棄| Modal
  CheckDraft -- なし --> Modal[bonsai-new モーダル]
  Modal -->|樹種選択| Species[Species Stack]
  Species -->|選択| Modal
  Modal -->|写真追加| Camera[expo-image-picker]
  Camera --> Modal
  Modal -->|Save| Validate{バリデーション}
  Validate -- NG --> Error[インラインエラー]
  Validate -- OK --> TXN[withExclusiveTransactionAsync]
  TXN -->|成功| Invalidate[invalidate 'bonsai']
  Invalidate --> DismissReplace[dismissAll + replace /bonsai/:id]
  DismissReplace --> Detail[盆栽詳細]
  TXN -->|失敗| RollbackError[UI エラー + 下書き保存]
```

#### §6.3.2 必須項目とバリデーション

| 項目                        | 必須 | バリデーション                                                                               |
| --------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| 名前 (name)                 | ✅   | 1〜100 文字、trim 後空文字禁止                                                               |
| 樹種 (species_id)           | ❌   | species テーブルに存在する ID または null                                                    |
| 購入日 (acquired_on)        | ❌   | ISO 8601 YYYY-MM-DD、未来日禁止                                                              |
| 樹形スタイル (style)        | ❌   | enum: chokkan/moyogi/shakan/kengai/han_kengai/bunjin/ishitsuki/sokan/kabudachi/yose_ue/other |
| 鉢情報 (pot_info_json)      | ❌   | 有効な JSON、サイズ 4KB 以内                                                                 |
| メモ (notes)                | ❌   | 10,000 文字以内                                                                              |
| カバー写真 (cover_photo_id) | ❌   | photos テーブルに存在する ID                                                                 |

#### §6.3.3 編集擬似コード

```typescript
// hooks/useUpdateBonsai.ts
export function useUpdateBonsai() {
  const db = useSQLiteContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBonsaiInput) => {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync(
          `UPDATE bonsai SET name = ?, species_id = ?, style = ?, notes = ?,
                             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE id = ?`,
          [input.name, input.speciesId, input.style, input.notes, input.id],
        );
      });
    },
    onSettled: (_, __, input) => {
      qc.invalidateQueries({ queryKey: ['bonsai', 'detail', input.id] });
      qc.invalidateQueries({ queryKey: ['bonsai', 'list'] });
    },
  });
}
```

#### §6.3.4 アーカイブ / 復元

- アーカイブは `archived_at` に現在時刻を書く（物理削除しない）
- Home 一覧は `WHERE archived_at IS NULL` でフィルタ
- アーカイブ画面（設定 → アーカイブ済み盆栽）から復元可能
- **完全削除**はアーカイブ済みの盆栽に対してのみ可能（タイプ入力「削除」）
- 完全削除時: CASCADE で `events`, `photos`, `reminders` も削除
- 完全削除時の写真ファイルは `FileSystem.deleteAsync` で物理削除

#### §6.3.5 並び替え

- 並び替え順は SQLite テーブル `bonsai_order`（`bonsai_id`, `position` INTEGER）で管理
- ドラッグ&ドロップで `position` を再計算
- デフォルトソート: 登録日降順（`created_at DESC`）

### §6.4 境界値テーブル

| 項目                | 境界     | 期待動作                                                |
| ------------------- | -------- | ------------------------------------------------------- |
| 名前長 0 文字       | 下限未満 | バリデーション NG、インラインエラー                     |
| 名前長 1 文字       | 下限     | OK                                                      |
| 名前長 100 文字     | 上限     | OK                                                      |
| 名前長 101 文字     | 上限超   | バリデーション NG、100 文字で自動 truncate は**しない** |
| 名前に改行          | 特殊     | `\n` は trim 対象外、保存可（表示は 1 行に）            |
| 盆栽数 0            | 境界     | Home 空状態「最初の盆栽を追加しよう」表示               |
| 盆栽数 1            | 境界     | FlashList 表示                                          |
| 盆栽数 1,000        | 高負荷   | FlashList で遅延なし                                    |
| 盆栽数 10,000       | 極端     | 動作するが UX 未保証（v1 対象外）                       |
| 購入日 = 今日       | 境界     | OK                                                      |
| 購入日 = 明日       | 未来日   | バリデーション NG                                       |
| 購入日 = 1900-01-01 | 極端     | OK（祖先樹木の価値）                                    |
| アーカイブ数 0      | 境界     | アーカイブ画面「なし」                                  |

### §6.5 エラーフロー

| エラー                     | 表示                                           | ユーザー操作                        |
| -------------------------- | ---------------------------------------------- | ----------------------------------- |
| SQLite 書き込み失敗        | エラートースト「保存できませんでした」         | 再試行ボタン、下書きは Zustand 保持 |
| 名前が空                   | インラインエラー「名前を入力してください」     | 修正                                |
| 購入日が未来               | インラインエラー「未来の日付は選べません」     | 修正                                |
| 樹種画像が 5MB 超過        | ダイアログ「画像が大きすぎます（最大 5MB）」   | 撮り直し / 選び直し                 |
| 名前重複（同名の盆栽存在） | **許容**（警告表示のみ、ユーザー判断に委ねる） | そのまま保存可                      |

### §6.6 受け入れ条件

- [ ] 名前空の盆栽は作成できない
- [ ] 新規作成後、自動で `(modals)/bonsai-new` → 詳細画面 `bonsai/[id]` へ遷移（戻るボタンで Home に戻る）
- [ ] アーカイブで Home から消え、アーカイブ画面に現れる
- [ ] 完全削除で CASCADE により events/photos/reminders も削除
- [ ] 並び替え後、再起動しても順序保持
- [ ] 盆栽 1,000 本登録時も Home スクロール 60fps 維持

### §6.7 対応テスト

- Jest: `__tests__/features/bonsai/create.test.ts`, `archive.test.ts`, `delete_cascade.test.ts`, `reorder.test.ts`
- Maestro: `maestro/flows/add_bonsai.yaml`

---

## §7. F-02 作業履歴記録

### §7.1 目的

1 本の盆栽に対する作業（水やり・剪定・針金・植替え等）をワンタップ記録する。

### §7.2 画面 / 入口

- 盆栽詳細（`bonsai/[id]`）内の「作業を記録」ボタン
- 作業種別選択シート（`(sheets)/work-type`、`formSheet` presentation）
- 作業記録確認画面（`(sheets)/work-confirm`、同上）

### §7.3 期待動作

#### §7.3.1 記録フロー

```mermaid
stateDiagram-v2
  [*] --> Detail: 盆栽詳細
  Detail --> TypeSheet: 「作業を記録」タップ (formSheet)
  TypeSheet --> Detail: スワイプダウン or Back
  TypeSheet --> Confirm: 作業種別選択 (push)
  Confirm --> Saving: 保存タップ
  Saving --> Timeline: 成功 (dismissAll + push)
  Saving --> ErrorToast: DB エラー
  Timeline --> UndoSnackbar: 5秒スナックバー表示
  UndoSnackbar --> Rollback: Undo タップ
  UndoSnackbar --> Settled: 5秒経過
  Settled --> ReschedNotif: 通知再スケジュール
  Rollback --> Detail
```

#### §7.3.2 作業種別 16 種

| type              | 名称           | icon | 既定値                                        |
| ----------------- | -------------- | ---- | --------------------------------------------- |
| watering          | 水やり         | 💧   | duration=null, amount=null                    |
| pruning           | 剪定           | ✂️   | duration=null                                 |
| wiring            | 針金がけ       | 〰️   | payload={wire_size_mm: 2, body_part: 'trunk'} |
| unwiring          | 針金外し       | ✂️〰️ | payload={linked_wiring_event_id: null}        |
| repotting         | 植替え         | 🪴   | payload={soil_type: null, pot_changed: true}  |
| fertilizing       | 施肥           | 🌱   | payload={fertilizer_type: 'solid'}            |
| pest_control      | 消毒           | 🦋   | payload={chemical: null}                      |
| disease_treatment | 病気治療       | 🩹   | 任意                                          |
| leaf_trimming     | 葉刈り         | 🍃   | 任意                                          |
| defoliation       | 全葉刈         | 🍂   | 任意                                          |
| deshoot           | 芽かき         | 🌿   | 任意                                          |
| candle_cut        | 芽切り（松類） | 🔥   | 樹種が松類時のみ表示                          |
| moss_care         | 苔手入れ       | 🌾   | 任意                                          |
| position_change   | 置き場変更     | 📍   | payload={new_location: null}                  |
| observation       | 観察メモ       | 👁   | 写真推奨                                      |
| other             | その他         | ❓   | 自由記述必須                                  |

**Candle cut（芽切り）は松類（species.scientific_name が `Pinus` 属）のみ選択肢表示**。

#### §7.3.3 記録擬似コード（optimistic update 付き）

```typescript
// hooks/useCreateEvent.ts
export function useCreateEvent() {
  const db = useSQLiteContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const id = uuidv4();
      await db.runAsync(
        `INSERT INTO events (id, bonsai_id, type, occurred_at, tz_offset_min,
                             duration_min, payload_json, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.bonsaiId,
          input.type,
          input.occurredAt.toISOString(),
          -input.occurredAt.getTimezoneOffset(),
          input.durationMin ?? null,
          input.payload ? JSON.stringify(input.payload) : null,
          input.note ?? null,
        ],
      );
      return id;
    },
    onMutate: async (input) => {
      // 直近の水やりなら optimistic update
      if (input.type === 'watering') {
        await qc.cancelQueries({ queryKey: ['bonsai', 'detail', input.bonsaiId] });
        const previous = qc.getQueryData(['bonsai', 'detail', input.bonsaiId]);
        qc.setQueryData(['bonsai', 'detail', input.bonsaiId], (old: any) => ({
          ...old,
          last_watered_at: input.occurredAt.toISOString(),
        }));
        return { previous };
      }
    },
    onError: (_err, input, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['bonsai', 'detail', input.bonsaiId], ctx.previous);
      }
    },
    onSettled: (_id, _err, input) => {
      qc.invalidateQueries({ queryKey: ['bonsai', 'detail', input.bonsaiId] });
      qc.invalidateQueries({ queryKey: ['bonsai', 'works', input.bonsaiId] });
      qc.invalidateQueries({ queryKey: ['bonsai', 'list'] });
      qc.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
```

#### §7.3.4 Undo スナックバー

記録保存後 5 秒間「取り消し」ボタンが表示される。タップで `DELETE` 実行。5 秒経過で通知再スケジュール（F-05, F-16）発火。

```typescript
const handleSave = async (input: CreateEventInput) => {
  const eventId = await createEventMutation.mutateAsync(input);
  router.dismissAll();
  router.navigate(`/bonsai/${input.bonsaiId}?tab=timeline`);

  showSnackbar({
    label: t('event.saved', { type: t(`event.type.${input.type}`) }),
    action: t('common.undo'),
    duration: 5000,
    onPress: async () => {
      await db.runAsync('DELETE FROM events WHERE id = ?', [eventId]);
      qc.invalidateQueries({ queryKey: ['bonsai', 'detail', input.bonsaiId] });
    },
    onTimeout: async () => {
      await rescheduleBonsai(input.bonsaiId); // F-05, F-16
    },
  });
};
```

#### §7.3.5 写真添付

- 作業記録画面から複数枚添付可能（最大 10 枚/作業）
- 添付済み写真は `photos` テーブルに `event_id` を紐付けて保存
- F-08 の制約（Free 3 枚/盆栽）とは**別集計**（作業記録の写真は Free でも無制限、ただし盆栽単位では 3 枚）
- ※実装注意: Free ユーザーが作業記録経由で写真を大量添付し、結果的に盆栽単位の上限を迂回するケース → **作業記録写真も盆栽単位カウントに含める**（統一ルール）

#### §7.3.6 メモ

- 自由記述、最大 2,000 文字（UI 上は 280 文字でスクロール表示）
- FTS5 インデックス `events_fts` で検索対象（F-09）
- 改行 `\n` 保持

### §7.4 境界値テーブル

| 項目               | 境界   | 期待動作                           |
| ------------------ | ------ | ---------------------------------- |
| メモ 0 文字        | 下限   | OK                                 |
| メモ 2,000 文字    | 上限   | OK                                 |
| メモ 2,001 文字    | 上限超 | バリデーション NG、truncate しない |
| 添付写真 0 枚      | 境界   | OK                                 |
| 添付写真 10 枚     | 上限   | OK                                 |
| 添付写真 11 枚目   | 上限超 | ダイアログ「10 枚まで」            |
| 同一時刻に複数記録 | 境界   | 許可（例: 水やり後すぐ施肥）       |
| 未来日時           | 異常   | バリデーション NG                  |
| 10 年前            | 境界   | OK（遡及記録）                     |

### §7.5 エラーフロー

| エラー                      | 表示                       | 対応                     |
| --------------------------- | -------------------------- | ------------------------ |
| SQLite 書き込み失敗         | エラートースト             | 再試行ボタン、下書き保持 |
| 未来日時                    | インラインエラー           | 現在時刻にリセット       |
| Candle cut を松類以外で記録 | UI で選択肢非表示          | –                        |
| 写真添付中にメモリ不足      | トースト「画像処理に失敗」 | 写真を減らす             |

### §7.6 受け入れ条件

- [ ] 作業記録後、タイムラインに即時反映
- [ ] Undo スナックバー 5 秒間表示、タップで記録削除
- [ ] 5 秒経過後に通知再スケジュール発火
- [ ] 水やり記録時、盆栽詳細の「最後の水やりから X 日」が 0 日にリセット（optimistic update）
- [ ] DB 書き込み失敗時、optimistic update は元に戻る
- [ ] 松類以外で candle_cut が選択肢に出ない

### §7.7 対応テスト

- Jest: `__tests__/features/event/create.test.ts`, `timeline.test.ts`, `optimistic_rollback.test.ts`
- Maestro: `maestro/flows/log_watering.yaml`

---

## §8. （欠番）

> F-03 は v1.0 で実装しない。詳細経緯は ADR-0011 を参照。

---

## §9. F-04 水やり履歴の可視化

### §9.1 目的

水やり記録を棒グラフと「最後の水やりから X 日」で可視化する。盆栽健康問題の 98% が水やり由来（Bonsai Direct 公式）ゆえ、記録習慣がコア価値。

### §9.2 画面 / 入口

- 盆栽詳細のサマリセクション（最後の水やりから X 日）
- 盆栽詳細のグラフセクション（直近 30 日の棒グラフ、切替可能）
- 全盆栽水やり比較（Pro 限定、`(tabs)/stats`）

### §9.3 期待動作

#### §9.3.1 「最後の水やりから X 日」表示

```typescript
// components/DaysSinceWatering.tsx
export function DaysSinceWatering({ bonsaiId }: { bonsaiId: string }) {
  const { data: lastEvent } = useQuery({
    queryKey: ['bonsai', 'last_watering', bonsaiId],
    queryFn: () => db.getFirstAsync<Event>(
      `SELECT * FROM events WHERE bonsai_id = ? AND type = 'watering'
       ORDER BY occurred_at DESC LIMIT 1`,
      [bonsaiId]
    ),
  })

  if (!lastEvent) return <Text>{t('water.never')}</Text>

  const days = differenceInDays(new Date(), new Date(lastEvent.occurredAt))

  if (days === 0) return <Text size="$8">{t('water.today')}</Text>
  return <Text size="$8">{t('water.days_ago', { count: days })}</Text>
}
```

#### §9.3.2 棒グラフ仕様

- 横軸: 日（直近 30/90/365 日、ボトムタブで切替）
- 縦軸: その日の水やり回数（0〜5、通常は 0 or 1）
- 空の日は**棒なし**（0 で埋めない、記録欠損の可視化）
- **判定は行わない**（「少なすぎます」等の警告を出さない、原則 P2）
- Pro 限定: 365 日表示、全盆栽横断比較

```mermaid
graph LR
  A[SQLite events WHERE type='watering'] --> B[groupBy dateKey]
  B --> C[今日から N 日前まで配列を埋める]
  C --> D[空日は null で保持]
  D --> E[VictoryNative / Recharts で棒グラフ描画]
```

#### §9.3.3 切替 UI

```
┌────────────────────────────────┐
│  最後の水やりから 3 日           │
├────────────────────────────────┤
│  ▁▁█▁▁█▁▁▁█▁▁▁▁█▁▁█▁▁  ← 30 日 │
│                                 │
│  [30日] [90日] [365日★]         │
└────────────────────────────────┘
★ = Pro 限定マーク
```

### §9.4 境界値テーブル

| 項目                      | 境界 | 期待動作                                      |
| ------------------------- | ---- | --------------------------------------------- |
| 水やり記録 0 件           | 下限 | 「まだ記録がありません」+ 記録ボタン          |
| 水やり記録 1 件（今日）   | 境界 | 「今日、水やりしました」                      |
| 水やり記録 1 件（昨日）   | 境界 | 「最後の水やりから 1 日」                     |
| 水やり記録 1 件（1 年前） | 境界 | 「最後の水やりから 365 日」（警告表示しない） |
| 同日 2 回の水やり         | 境界 | 棒グラフで棒高さ 2（積み上げ）                |
| 未来日時の記録            | 異常 | バリデーション NG（F-02 で対処）              |
| Free で 365 日タップ      | 境界 | Paywall 遷移                                  |

### §9.5 エラーフロー

| エラー            | 表示                             | 対応                      |
| ----------------- | -------------------------------- | ------------------------- |
| グラフ描画失敗    | 「グラフを読み込めませんでした」 | 再試行                    |
| events データ破損 | 「データを修復してください」     | 設定 → 整合性チェック機能 |

### §9.6 受け入れ条件

- [ ] 水やり記録 10 件 → 棒グラフに 10 本表示
- [ ] 記録のない日は棒なし（0 で埋めない）
- [ ] 「警告」「不足」等の判定語が UI に出ない
- [ ] Free で 365 日切替 → Paywall 表示
- [ ] Pro 購入後、365 日表示即有効

### §9.7 対応テスト

- Jest: `__tests__/features/care/watering_chart.test.ts`, `days_since.test.ts`
- Jest: `__tests__/domain/stats/group_by_date.test.ts`

---

## §10. F-05 「気遣い型」予定確認ポップアップ

### §10.1 目的

ユーザーが 1 日に 6 件目の予定を登録しようとした時に、「無理のない範囲で進めてくださいね」とソフトに声かけする（押し付けがましくないリマインド）。

### §10.2 画面 / 入口

- 任意の予定登録画面（盆栽詳細 → 作業を記録 → 予定として保存、または status='planned' で記録）

### §10.3 期待動作

#### §10.3.1 発火条件

- 同一日（occurred_at_utc の日付） に既に **5 件以上の予定 (status='planned' or 'logged')** が存在する状態で、6 件目を登録しようとした時
- ユーザーが「今後表示しない」を選択した後は発火しない

#### §10.3.2 ポップアップ仕様

```
┌─────────────────────────────────┐
│ お知らせ                          │
├─────────────────────────────────┤
│ この日は既に 5 件の予定があります。│
│ 無理のない範囲で進めてくださいね 🌱 │
├─────────────────────────────────┤
│ [ そのまま登録 ]  ← デフォルト    │
│ [ 一覧を見る ]                    │
│ [ 今後表示しない ]                │
└─────────────────────────────────┘
```

#### §10.3.3 設定

- デフォルト ON
- Settings → 通知設定 → 「予定が多い時の確認ポップアップ」トグルで OFF 可能（盆栽園プロ等の業務利用者向け抑制）

### §10.4 境界値

| 項目                     | 境界       | 期待動作                                     |
| ------------------------ | ---------- | -------------------------------------------- |
| 同一日 4 件              | 境界       | 発火しない                                   |
| 同一日 5 件 → 6 件目登録 | 発火       | ポップアップ表示                             |
| 同一日 100 件            | 既に発火済 | 「今後表示しない」が押されていれば発火しない |
| 「今後表示しない」選択後 | 抑制       | Settings で再有効化されるまで発火しない      |
| OFF 設定時               | 無効       | 発火しない                                   |

### §10.5 受け入れ条件

- [ ] 6 件目の予定登録時にポップアップ発火
- [ ] 文言が「この日は既に 5 件の予定があります。無理のない範囲で進めてくださいね」
- [ ] 「そのまま登録」がデフォルト操作（左寄り、目立つ）
- [ ] 「今後表示しない」を押すと以降発火しない
- [ ] Settings → 通知設定 で再有効化可能
- [ ] OFF 設定時はポップアップ発火しない

### §10.6 対応テスト

- Jest: `__tests__/features/reminders/popupTrigger.test.ts`
- Maestro: `maestro/flows/popup_5_events.yml`

---

## §11. （欠番）

> F-06 は v1.0 で実装しない。詳細経緯は ADR-0011 を参照。

---

## §12. F-07 針金がけ記録・外し時期通知

### §12.1 目的

針金がけ作業を記録した際に、ユーザーが**任意で「外す予定日時」を指定**できる。指定日時に通知を発火し、加えて装着期間経過の事実通知も対応する。Marcus 型ペルソナの「針金食い込みで永久傷」実害（🩹6）への回答。

> 「外しましょう」等の推奨/命令文言は禁止（事実通知のみ）。

### §12.2 画面 / 入口

- 盆栽詳細 → 作業記録 → wiring 選択
- 盆栽詳細 → 未外しの針金一覧
- 設定 → 全盆栽横断「未外しの針金」リスト

### §12.3 期待動作

#### §12.3.1 針金記録フロー

```mermaid
stateDiagram-v2
  [*] --> InputForm: 針金がけ記録開始
  InputForm --> SetUnwireDate: 「外す予定日時」入力（任意）
  SetUnwireDate --> Save: 保存
  InputForm --> Save: 「外す予定日時」未入力でも保存可
  Save --> Active: events INSERT 完了
  Active --> NotificationScheduled: 外す予定日時が指定されていれば通知スケジュール
  Active --> WeeklyFactNotice: 装着期間 6 週経過時に事実通知（任意機能）
  Active --> Unwired: 針金外し記録 (unwiring event)
  Unwired --> [*]
```

#### §12.3.2 針金 event のペイロード

```typescript
interface WiringPayload {
  wire_size_mm: number; // 0.5, 1, 1.5, 2, 2.5, 3, 4
  body_part: 'trunk' | 'branch_primary' | 'branch_secondary' | 'apex' | 'other';
  photo_ids: string[]; // 写真 ID
  scheduled_unwire_at: string | null; // ISO UTC、ユーザー指定の外し予定日時
  linked_unwiring_event_id: string | null; // 外し記録が付いたら埋める
}
```

#### §12.3.3 外し時期通知（指定日時 / 事実通知）

**ユーザー指定日時通知**:

```typescript
// ユーザーが「外す予定日時」を 2026-06-15 09:00 と指定した場合
if (payload.scheduled_unwire_at) {
  await Notifications.scheduleNotificationAsync({
    identifier: `bonsai_${bonsaiId}_unwire_${wiringEventId}`,
    content: {
      title: t('wire.scheduled.title', { bonsaiName }),
      body: t('wire.scheduled.body', {
        date: formatLocal(payload.scheduled_unwire_at, tzIana, locale),
      }),
      data: { bonsai_id: bonsaiId, event_type: 'unwiring', wiring_event_id: wiringEventId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: payload.scheduled_unwire_at,
    },
  });
}
```

**通知文言（推奨ではなく事実）**:

- ✅ 「針金の指定日時です（◯月◯日設定）」 (`wire.scheduled.body`)
- ✅ 「装着期間 6 週経過しました」 (`wire.weeks_elapsed.body`)
- ❌ 「針金を外しましょう」（推奨/命令、禁止）
- ❌ 「作業してください」（推奨/命令、禁止）

#### §12.3.4 外し記録の紐付け

```mermaid
sequenceDiagram
  participant UI
  participant DB
  UI->>UI: 未外しの針金一覧で wiring event を選択
  UI->>UI: 「外し記録」タップ
  UI->>DB: INSERT events (type='unwiring', payload.linked_wiring_event_id=wId)
  UI->>DB: UPDATE events SET payload.linked_unwiring_event_id=? WHERE id=wId
  DB-->>UI: 完了
  UI->>UI: 通知 identifier キャンセル
```

### §12.4 境界値テーブル

| 項目                           | 境界   | 期待動作                                   |
| ------------------------------ | ------ | ------------------------------------------ |
| wire_size_mm = 0.5             | 最細   | OK                                         |
| wire_size_mm = 4               | 最太   | OK                                         |
| wire_size_mm = 0               | 無効   | バリデーション NG                          |
| body_part = 不明値             | 無効   | enum にマップ、不一致は NG                 |
| scheduled_unwire_at = 過去日時 | 無効   | バリデーション NG                          |
| scheduled_unwire_at = null     | 任意   | 通知スケジュールなし、装着期間経過のみ通知 |
| 装着期間 6 週経過              | 境界   | 事実通知（任意機能、Settings で OFF 可能） |
| 外し前に針金 event 削除        | 整合性 | CASCADE 削除、関連通知キャンセル           |

### §12.5 エラーフロー

| エラー                         | 表示             | 対応                           |
| ------------------------------ | ---------------- | ------------------------------ |
| 通知スケジュール失敗           | ログのみ         | DB 正、起動時に再試行          |
| 外し記録の紐付け先が存在しない | インラインエラー | 適切な wiring event を選び直す |
| scheduled_unwire_at が過去     | インラインエラー | 修正                           |

### §12.6 受け入れ条件

- [ ] 針金記録時に「外す予定日時」入力欄が表示される（任意入力）
- [ ] 指定日時に通知発火、文言が「針金の指定日時です（◯月◯日設定）」
- [ ] 装着期間 6 週経過で事実通知発火、文言が「装着期間 6 週経過しました」
- [ ] 「外しましょう」「作業してください」等の禁止語が含まれない（CI で `i18n:audit` で検出）
- [ ] 外し記録で該当針金レコードが Unwired 状態、通知キャンセル
- [ ] 針金 event 削除で CASCADE、通知もキャンセル
- [ ] scheduled_unwire_at 未入力時は事実通知のみ動作

### §12.7 対応テスト

- Jest: `__tests__/features/wiring/record.test.ts`, `scheduledNotification.test.ts`, `weeksElapsedNotice.test.ts`, `forbiddenWords.test.ts`
- Maestro: `maestro/flows/wiring_with_schedule.yml`

---

## §13. F-08 写真管理（年次タイムライン）

### §13.1 目的

盆栽 1 本ごとに写真を時系列保存し、年次タイムライン画像を自動生成する。

### §13.2 画面 / 入口

- 盆栽詳細 → 写真タブ
- 作業記録画面（添付）
- 設定 → 年次タイムライン生成（Pro 限定）

### §13.3 期待動作

#### §13.3.1 写真追加フロー

```mermaid
flowchart TD
  Add[写真追加ボタン] --> Source{ソース選択}
  Source -->|カメラ| Camera[expo-image-picker launchCameraAsync]
  Source -->|ライブラリ| Library[expo-image-picker launchImageLibraryAsync]
  Camera --> Permission{カメラ権限 OK?}
  Library --> PermissionL{写真アクセス権限 OK?}
  Permission -- NG --> RequestCam[requestCameraPermissions]
  PermissionL -- NG --> RequestLib[requestMediaLibraryPermissions]
  Permission -- OK --> Picked
  PermissionL -- OK --> Picked
  Picked[画像取得] --> Resize[リサイズ 長辺 2048px 以下]
  Resize --> Compress[JPEG quality 0.7]
  Compress --> HashAndEXIF[SHA256 + EXIF 抽出]
  HashAndEXIF --> FreeCheck{Free プラン?}
  FreeCheck -- Yes --> LimitCheck{盆栽単位で 3 枚未満?}
  FreeCheck -- No --> Copy
  LimitCheck -- No --> Paywall[Paywall 遷移]
  LimitCheck -- Yes --> Copy
  Copy[FileSystem.copyAsync で documentDirectory/photos/bonsai_UUID/ へ]
  Copy --> InsertDB[INSERT photos - 相対パスのみ保存]
  InsertDB --> InvalidateCache[invalidate 'bonsai.photos.id']
```

#### §13.3.2 相対パス保存（basic_spec.md §5.2 重要ルール）

```typescript
// db/filePathUtils.ts
const BASE = FileSystem.documentDirectory! + 'photos/';

export function toRelative(absUri: string): string {
  if (!absUri.startsWith(FileSystem.documentDirectory!)) {
    throw new Error('Photo must be under documentDirectory');
  }
  return absUri.substring(FileSystem.documentDirectory!.length);
}

export function toAbsolute(relPath: string): string {
  if (relPath.startsWith('/') || relPath.startsWith('file://')) {
    throw new Error('Photo path must be relative');
  }
  return FileSystem.documentDirectory + relPath;
}

// 使用例
const absUri = await copyPhotoToDocumentDir(sourceUri, bonsaiId);
const relPath = toRelative(absUri); // "photos/bonsai_abc-123/2026-04-23-uuid.jpg"
await db.runAsync('INSERT INTO photos (...) VALUES (..., ?)', [relPath]);
```

#### §13.3.3 リサイズ・圧縮

```typescript
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function optimizePhoto(sourceUri: string): Promise<string> {
  const result = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 2048 } }], // 長辺 2048px（basic_spec.md §6.3 境界値）
    { compress: 0.7, format: SaveFormat.JPEG },
  );
  return result.uri;
}
```

#### §13.3.4 サムネイル生成

リスト用 300px、詳細用 800px の 2 サイズを `cacheDirectory` 配下に生成:

```typescript
const listThumb = await manipulateAsync(absUri, [{ resize: { width: 300 } }], {
  compress: 0.5,
  format: SaveFormat.JPEG,
});
```

`cacheDirectory` は OS が自動削除するので、表示時に不在なら再生成。

#### §13.3.5 年次タイムライン画像生成（Pro 限定）

```
┌────────────────────────┐
│   黒松「翁」 2026 年    │
│ ┌────┐┌────┐┌────┐    │
│ │1月 ││2月 ││3月 │    │
│ └────┘└────┘└────┘    │
│ ┌────┐┌────┐┌────┐    │
│ │4月 ││5月 ││6月 │    │
│ └────┘└────┘└────┘    │
│ …                       │
│ Generated by BonsaiLog │
└────────────────────────┘
     縦長 1080x1920px
```

各月: その月で最も撮影日が新しい写真を自動選択、ユーザー置換可能。

```typescript
// domain/photo/yearly_timeline.ts
export async function generateYearlyTimeline(bonsaiId: string, year: number): Promise<string> {
  const photos = await db.getAllAsync<Photo>(
    `SELECT * FROM photos WHERE bonsai_id = ?
     AND strftime('%Y', taken_at) = ? ORDER BY taken_at`,
    [bonsaiId, year.toString()],
  );
  const byMonth = groupByMonth(photos);
  return await renderTimelineImage(byMonth, bonsaiId, year);
}
```

Share Sheet で Instagram / Twitter / メール等に共有可。

### §13.4 境界値テーブル

| 項目                          | 境界             | 期待動作                                           |
| ----------------------------- | ---------------- | -------------------------------------------------- |
| 写真サイズ 0 バイト           | 無効             | バリデーション NG                                  |
| 写真サイズ 5MB（既定上限）    | 境界             | OK                                                 |
| 写真サイズ 6MB                | 上限超           | ダイアログ「画像が大きすぎます」、リサイズ後再試行 |
| 長辺 1080px                   | 境界             | リサイズなし                                       |
| 長辺 4096px                   | 上限超           | 2048 に縮小                                        |
| Free 盆栽あたり 3 枚          | 既定上限         | OK                                                 |
| Free 4 枚目                   | 上限超           | Paywall 遷移                                       |
| Pro 盆栽あたり 1,000 枚       | 上限なし（推奨） | OK                                                 |
| Pro 盆栽あたり 10,000 枚      | 極端             | 動作するが UX 劣化、警告表示                       |
| HEIC 入力                     | 特殊             | JPEG に自動変換（Samsung/Xiaomi 互換性）           |
| EXIF 欠損                     | 境界             | `taken_at = created_at` フォールバック             |
| 年次タイムライン: 月 0 枚     | 境界             | プレースホルダー（「写真なし」）                   |
| 年次タイムライン: 年全体 0 枚 | 境界             | 「生成できません」                                 |

### §13.5 エラーフロー

| エラー                   | 表示                                   | 対応                     |
| ------------------------ | -------------------------------------- | ------------------------ |
| カメラ権限拒否           | ダイアログ「設定から許可してください」 | `Linking.openSettings()` |
| 保存先ディスク不足       | トースト「ストレージ不足」             | 古い写真削除を提案       |
| コピー失敗               | トースト「写真を保存できませんでした」 | 再試行                   |
| DB INSERT 失敗           | ロールバック（ファイル削除）           | 再試行                   |
| 年次タイムライン生成失敗 | トースト「生成に失敗しました」         | 再試行                   |

### §13.6 受け入れ条件

- [ ] 写真 1 枚追加 → DB に相対パス保存確認
- [ ] アプリ再インストール後も写真表示可能（相対パス動作）
- [ ] Free で 4 枚目追加 → Paywall 表示
- [ ] Pro 購入後、Free 時代の 3 枚制限が即解除
- [ ] HEIC 入力 → JPEG で保存
- [ ] 長辺 4096px → 2048px にリサイズ
- [ ] 年次タイムライン生成 → Share Sheet 動作
- [ ] 盆栽削除 → 写真ファイルも物理削除（CASCADE + FileSystem）

### §13.7 対応テスト

- Jest: `__tests__/features/photo/add.test.ts`, `relative_path.test.ts`, `free_limit.test.ts`, `yearly_timeline.test.ts`
- Maestro: `maestro/flows/add_photo.yaml`

---

## §14. F-09 検索・タグ

### §14.1 目的

盆栽名・樹種・メモ・タグで検索する。BonsaiNut「Notion で自作」「Excel で全木 ID 管理」層の取り込み（🩹9）。

### §14.2 画面 / 入口

- Home 上部の検索バー
- 検索画面（`/search`）

### §14.3 期待動作

#### §14.3.1 検索アルゴリズム

```mermaid
flowchart TD
  Input[ユーザー入力] --> Length{文字数}
  Length -- 1文字 --> Too_short[UI「2文字以上で検索」]
  Length -- 2文字 --> Vocab[fts5vocab で trigram 前方一致]
  Length -- 3文字以上 --> DirectFTS[fts5 直接 MATCH]
  Vocab --> Expand[OR 展開クエリ作成]
  Expand --> FTS[fts5 MATCH 実行]
  DirectFTS --> FTS
  FTS --> Rank[bm25 でスコアリング]
  Rank --> Display[上位 50 件表示]
```

#### §14.3.2 2 文字クエリ対応（trigram + fts5vocab）

```typescript
// domain/search/fts.ts
export async function searchBonsai(q: string): Promise<Bonsai[]> {
  if ([...q].length < 2) return [];

  if ([...q].length >= 3) {
    return db.getAllAsync<Bonsai>(
      `SELECT b.* FROM events_fts f
       JOIN events e ON e.rowid = f.rowid
       JOIN bonsai b ON b.id = e.bonsai_id
       WHERE events_fts MATCH ?
       ORDER BY bm25(events_fts)
       LIMIT 50`,
      [q],
    );
  }

  // 2 文字: vocab から trigram 前方一致を拾う
  const tokens = await db.getAllAsync<{ term: string }>(
    `SELECT term FROM events_fts_vocab
     WHERE term LIKE ? ESCAPE '\\'
     LIMIT 200`,
    [q.replace(/[%_\\]/g, '\\$&') + '%'],
  );

  if (tokens.length === 0) return [];

  const matchExpr = tokens.map((t) => `"${t.term}"`).join(' OR ');
  return db.getAllAsync<Bonsai>(
    `SELECT b.* FROM events_fts f
     JOIN events e ON e.rowid = f.rowid
     JOIN bonsai b ON b.id = e.bonsai_id
     WHERE events_fts MATCH ?
     ORDER BY bm25(events_fts) LIMIT 50`,
    [matchExpr],
  );
}
```

#### §14.3.3 タグ機能

- ユーザー定義タグ（例: `#展示会候補`、`#ベランダ`、`#要注意`）
- `tags` テーブル（id, name）と `bonsai_tags`（bonsai_id, tag_id）の多対多
- Home 上部にタグチップ、複数選択で AND フィルタ
- タグは言語非依存（ユーザー入力）、翻訳キー経由しない

#### §14.3.4 検索履歴

- 端末内、最大 20 件（AsyncStorage に保存）
- 最古が落ちる FIFO
- 「履歴を削除」ボタン

### §14.4 境界値テーブル

| 項目                     | 境界     | 期待動作                             |
| ------------------------ | -------- | ------------------------------------ |
| クエリ 0 文字            | 下限     | 全件表示（検索バー空）               |
| クエリ 1 文字            | 下限未満 | ガイド表示、検索不実行               |
| クエリ 2 文字            | 下限     | vocab 展開で検索                     |
| クエリ 3 文字            | 下限超   | 直接 fts5 MATCH                      |
| クエリ 100 文字          | 上限なし | 実行（結果は少数か 0）               |
| 検索結果 0 件            | 境界     | 「該当なし」+ タイプミス示唆         |
| 検索結果 50 件           | 上限     | 上位 50 件のみ表示                   |
| タグ 0 個                | 境界     | タグチップ非表示                     |
| タグ 100 個              | 極端     | 横スクロール表示                     |
| 同名タグ重複作成         | 異常     | 既存タグを再利用（大文字小文字区別） |
| クエリに `"`/`*`/`(`/`)` | 特殊     | エスケープして実行                   |

### §14.5 エラーフロー

| エラー                      | 表示               | 対応                      |
| --------------------------- | ------------------ | ------------------------- |
| FTS インデックス破損        | 「検索できません」 | 設定 → インデックス再構築 |
| 検索タイムアウト（10 秒超） | 「応答なし」       | 検索キャンセル            |

### §14.6 受け入れ条件

- [ ] 「黒松」で検索 → 該当盆栽表示
- [ ] 2 文字「水や」で検索 → vocab 展開で結果表示
- [ ] 1 文字 → 「2 文字以上で検索」ガイド
- [ ] 盆栽 1,000 本 + 作業 50,000 件で検索 < 300ms
- [ ] タグ複数選択で AND フィルタ動作
- [ ] 検索履歴 20 件超で FIFO

### §14.7 対応テスト

- Jest: `__tests__/features/search/bonsai_name.test.ts`, `fts5_memo.test.ts`, `fts5_two_char.test.ts`, `tag_filter.test.ts`

---

## §15. F-10 エクスポート（CSV / PDF）

### §15.1 目的

全データを CSV・PDF 形式でエクスポートする。展示会出品記録・青色申告・データポータビリティ対応。

### §15.2 画面 / 入口

- 設定 → データ → エクスポート（Pro 限定）

### §15.3 期待動作

#### §15.3.1 エクスポート種類

| 種類             | フォーマット | 内容                         |
| ---------------- | ------------ | ---------------------------- |
| 盆栽一覧         | CSV          | 全盆栽の基本情報             |
| 作業履歴         | CSV          | 全作業履歴（盆栽結合済み）   |
| 樹種別サマリ     | CSV          | 樹種ごとの保有数・最終作業   |
| 個別盆栽レポート | PDF          | 1 本ずつの 1 ページサマリ    |
| 全盆栽リスト     | PDF          | 全盆栽のリスト（複数ページ） |

#### §15.3.2 CSV 仕様

- **UTF-8 BOM 付き**（Excel 日本語版の文字化け対策）
- カンマ区切り、RFC 4180 準拠
- ヘッダ行あり（多言語、エクスポート時の言語で出力）
- 日時は ISO 8601 UTC

```csv
"id","name","species_scientific","species_common","acquired_on","style","archived_at","created_at","updated_at"
"abc-123","翁","Pinus thunbergii","黒松","2020-03-15","chokkan","","2026-04-23T10:30:00Z","2026-04-23T10:30:00Z"
```

#### §15.3.3 PDF 仕様

- A4 縦向き
- `expo-print` 使用、HTML → PDF 変換
- 1 ページ/盆栽: 名前、樹種、購入日、カバー写真、作業履歴サマリ、メモ
- 多言語対応（エクスポート時の言語で出力）

#### §15.3.4 共有

- iOS: Share Sheet
- Android: Intent.ACTION_SEND
- 保存先: `cacheDirectory`（一時）、共有後に自動削除可

### §15.4 境界値テーブル

| 項目           | 境界 | 期待動作                                 |
| -------------- | ---- | ---------------------------------------- |
| 盆栽 0 本      | 境界 | 「エクスポートするデータがありません」   |
| 盆栽 1,000 本  | 中量 | 3 秒以内に生成                           |
| 盆栽 10,000 本 | 極端 | プログレスバー表示、バックグラウンド生成 |
| PDF 100 ページ | 極端 | 生成可、メモリ警告あれば分割提案         |
| Free プラン    | 境界 | Paywall 遷移                             |

### §15.5 エラーフロー

| エラー                 | 表示     | 対応           |
| ---------------------- | -------- | -------------- |
| 生成失敗（メモリ不足） | トースト | 件数絞込を提案 |
| Share Sheet キャンセル | 無音     | –              |

### §15.6 受け入れ条件

- [ ] CSV エクスポート → UTF-8 BOM → Excel 日本語で文字化けなし
- [ ] PDF エクスポート → Share Sheet で保存可能
- [ ] 盆栽 100 本で CSV 生成 < 1 秒
- [ ] Free でタップ → Paywall 遷移

### §15.7 対応テスト

- Jest: `__tests__/features/export/csv.test.ts`, `pdf.test.ts`, `free_limit.test.ts`

---

## §16. F-11 お引っ越し機能（デバイス移行）

> ⚠️ **設計変更履歴**: 当初仕様（QR コード + WebRTC P2P + AES-256-GCM + ECDH P-256 + HKDF-SHA256 + DTLS の 4 層暗号化）は **ADR-0007 で却下** された。実装コスト過大・テスト容易性極低・シニアペルソナ UX 厳しい・ADR-0005 (iOS 暗号化フラグ) との整合判断が必要、という理由。本仕様は Repolog アプリで実証済みの「ZIP + Share Sheet」方式に変更したもの。

### §16.1 目的

旧端末から新端末へ全データ（盆栽 + 樹種 + 作業履歴 + 写真 + リマインダー + タグ + 設定）を移行する。標準 OS の Share Sheet を使い、ユーザーが任意の保存先（iCloud Drive / Google Drive / メール / LINE 等）を選択できる。クラウドサービス非依存（Local-first）。

高橋さん 62 歳の「スマホ買い替え不安」（🩹10）への回答。

### §16.2 画面 / 入口

- **エクスポート**: 設定 → 「バックアップを作成」（S-05）
- **インポート**: 設定 → 「バックアップから復元」（S-05）
- 両画面とも `fullScreenModal` 不要、通常のスタック遷移

### §16.3 期待動作

#### §16.3.1 エクスポートフロー

```mermaid
stateDiagram-v2
  [*] --> ExportIntro: 設定 → バックアップを作成
  ExportIntro --> Resizing: 「作成」タップ
  Resizing --> Snapshotting: 写真リサイズ完了（長辺 2048 px）
  Snapshotting --> Zipping: VACUUM INTO で DB スナップショット
  Zipping --> SizeCheck: ZIP 完成
  SizeCheck --> ShareSheet: 200 MB 以下
  SizeCheck --> SizeError: 200 MB 超 → エラー表示
  ShareSheet --> Cleanup: ユーザーが保存先選択
  Cleanup --> Done: cacheDirectory の ZIP を削除
```

#### §16.3.2 インポートフロー

```mermaid
stateDiagram-v2
  [*] --> ImportIntro: 設定 → バックアップから復元
  ImportIntro --> Warning: 「復元」タップ
  Warning --> FilePicker: 「既存データに追加されます」承認
  FilePicker --> Unzip: ZIP ファイル選択
  Unzip --> Validate: 解凍完了
  Validate --> Merge: schema_version + 写真整合 OK
  Validate --> ValidationError: 検証失敗
  Merge --> Done: 追記マージ完了（件数表示）
```

#### §16.3.3 ZIP 構造

```
backup-<ISO8601>.zip
├── manifest.json         # メタデータ
├── bonsai.db             # SQLite VACUUM INTO スナップショット
└── photos/
    ├── <photoId1>.jpg    # 長辺 2048 px にリサイズ済み
    ├── <photoId2>.jpg
    └── ...
```

#### §16.3.4 manifest.json スキーマ

```json
{
  "schema_version": 1,
  "exported_at": "2026-04-29T10:00:00.000Z",
  "app_version": "1.0.0",
  "db_sha256": "<sha256 hex>",
  "stats": {
    "bonsai_count": 5,
    "event_count": 120,
    "photo_count": 15
  }
}
```

### §16.4 暗号化方針

- **暗号化なし**（生 JSON + 生 JPEG + 生 SQLite）
- 位置情報を**一切保持しない**（緯度経度を取得しない、constraints §1-3）→ PII リスクなし
- UI で「バックアップは暗号化されません。クラウドに保存する場合はパスワードで保護されたフォルダにご保管ください」を明示（19 言語で）
- iOS の `usesNonExemptEncryption: false`（ADR-0005）を維持

> v1.1 以降でパスワード付 ZIP（AES-256）追加検討。`react-native-zip-archive` の `zipWithPassword` / `unzipWithPassword` で対応可能。

### §16.5 ライブラリ

- `expo-file-system`（SDK 55 同梱、新 API: `Paths.document`, `Paths.cache`, `File`, `Directory`, `File.pickFileAsync`）
- `expo-sharing`（SDK 55 同梱、Share Sheet）
- `expo-image-manipulator`（SDK 55 同梱、写真リサイズ）
- `react-native-zip-archive@7.0.2`（**固定ピン**、`pnpm.overrides` で transitive 経由のアップグレード禁止）

### §16.6 マージポリシー

- v1.0 は **追記のみ（Append）**。ID 重複の盆栽・写真・作業はスキップ
- 完全置換モードは **v1.0 では実装しない**（v1.1 以降で UX フィードバック次第）
- `schema_version !== 1` の ZIP は `BackupError('schema')` で拒否（マイグレータ API は予約のみ）

### §16.7 上限・制約

- バックアップサイズ **200 MB ハード制限**（react-native-zip-archive 公式ガイド準拠）
- 写真リサイズ **長辺 2048 px**（`expo-image-manipulator`）
- 1 端末で同時に作成できるバックアップ ZIP は 1 つ（cacheDirectory 内）

### §16.8 エラー処理

| エラー                 | UI 文言（i18n キー）                       | エラーコード |
| ---------------------- | ------------------------------------------ | ------------ |
| `schema_version !== 1` | 「このバックアップは別バージョン用です」   | BL-006       |
| 写真ファイル欠損       | 「バックアップが壊れています」             | BL-007       |
| 200 MB 超過            | 「写真を削減してから再度作成してください」 | BL-008       |
| ファイル選択キャンセル | （無音）                                   | -            |
| Share Sheet キャンセル | （無音、ZIP は削除）                       | -            |

### §16.9 受け入れ条件

- [ ] 旧端末で盆栽 5 樹 + 各 3 枚写真を登録 → エクスポート → Share Sheet 起動
- [ ] iCloud Drive / Google Drive / メール / LINE 等の保存先が選択可能
- [ ] 旧端末（iOS）で作成した ZIP を新端末（Android）でインポート → 復元成功
- [ ] 旧端末（Android）で作成した ZIP を新端末（iOS）でインポート → 復元成功
- [ ] 200 MB 超のバックアップは作成前にエラー表示
- [ ] `schema_version !== 1` の ZIP は `BL-006` エラー
- [ ] 写真ファイル欠損 ZIP は `BL-007` エラー
- [ ] エクスポート / インポート後、cacheDirectory に ZIP 残骸が残らない
- [ ] 「暗号化されません」警告文が 19 言語で表示される
- [ ] iOS の `usesNonExemptEncryption: false` を維持

### §16.10 対応テスト

- **Jest（純粋関数）**: `__tests__/features/backup/backupImportPlanner.test.ts`（マージプラン構築・schema_version 検証・写真欠損検知）
- **Maestro（E2E）**: `maestro/flows/backup-screen-reach.yml`（画面到達 + Share Sheet 起動の手前まで、CI 実行可）
- **手動 E2E（必須）**: 2 端末 + クロス OS 転送（iOS↔Android）。`docs/reference/constraints.md` §9 の方針に従い、Issue / PR で「手動 E2E 必須」を明示

### §16.11 関連

- **ADR-0007**（F-11 設計方針: ZIP + Share Sheet 採用、暗号化排除）
- **ADR-0005**（iOS 暗号化エクスポートコンプライアンス、本機能で `false` 維持）
- **既存実装参照**: Repolog `/src/features/backup/`（移植元、ただし legacy API → 新 API 変換が必要）

---

## §17. F-12 多言語対応

### §17.1 目的

19 言語で UI・樹種名・作業名を提供する。Claude Code による翻訳生成 + 予算ゼロ。

### §17.2 画面 / 入口

- 初回起動の言語選択
- 設定 → 言語（即時反映、再起動不要）

### §17.3 期待動作

#### §17.3.1 言語検出と切替フロー

```mermaid
stateDiagram-v2
  [*] --> Init: アプリ起動
  Init --> HasOverride: AsyncStorage チェック
  HasOverride --> UseOverride: 'bonsai.locale' あり
  HasOverride --> DetectDevice: なし
  DetectDevice --> Detect: Localization.getLocales[0]
  Detect --> MapToSupported: マップ（中国語は繁簡自動判定）
  MapToSupported --> UseMapped: 対応言語
  MapToSupported --> UseEn: 非対応 → en
  UseOverride --> Ready
  UseMapped --> Ready
  UseEn --> Ready
  Ready --> Runtime: ユーザー切替
  Runtime --> ChangeLanguage: i18n.changeLanguage
  ChangeLanguage --> UpdateStorage: AsyncStorage 保存
  UpdateStorage --> Rerender: i18next languageChanged → useTranslation 更新
```

#### §17.3.2 init 擬似コード

```typescript
// core/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '@formatjs/intl-pluralrules/polyfill-force';

const SUPPORTED = [
  'en',
  'ja',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'ru',
  'zh-Hans',
  'zh-Hant',
  'ko',
  'hi',
  'id',
  'th',
  'vi',
  'tr',
  'nl',
  'pl',
  'sv',
] as const;

function pickLocale(tag: string, code: string) {
  if (code === 'zh') {
    if (/Hant/i.test(tag) || /(TW|HK|MO)/i.test(tag)) return 'zh-Hant';
    return 'zh-Hans';
  }
  return SUPPORTED.includes(code as any) ? code : 'en';
}

export async function initI18n() {
  const override = await AsyncStorage.getItem('bonsai.locale');
  const device = getLocales()[0];
  const lng = override ?? pickLocale(device?.languageTag ?? 'en', device?.languageCode ?? 'en');

  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: { 'zh-Hant': ['zh-Hans', 'en'], default: ['en'] },
    supportedLngs: SUPPORTED,
    compatibilityJSON: 'v4', // ru/pl の 4 形 plural 対応
    interpolation: { escapeValue: false },
    resources, // 19 言語の翻訳
  });
}

export async function switchLanguage(lng: string) {
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem('bonsai.locale', lng);
}
```

#### §17.3.3 plural 境界値（ICU / CLDR）

**ja/zh-Hans/zh-Hant/ko/vi/th/id**: 1 形（`other` のみ）

```json
{ "events_other": "{{count}} 件のイベント" }
```

**en/de/it/nl/es/tr/sv**: 2 形（`one` / `other`）

```json
{ "events_one": "{{count}} event", "events_other": "{{count}} events" }
```

**hi**: 2 形（`one` は 0, 1 を含む）

```json
{ "events_one": "{{count}} घटना", "events_other": "{{count}} घटनाएँ" }
```

**fr**: 3 形（`one` 0,1 / `many` 10^6,10^9... / `other`）

```json
{
  "events_one": "{{count}} événement",
  "events_many": "{{count}} événement",
  "events_other": "{{count}} événements"
}
```

**ru**: 4 形

```json
{
  "events_one": "{{count}} событие", // 1, 21, 31 (n%10=1, n%100≠11)
  "events_few": "{{count}} события", // 2-4, 22-24 (n%10=2-4, n%100∉12-14)
  "events_many": "{{count}} событий", // 0, 5-20, 25-30
  "events_other": "{{count}} события" // 小数
}
```

**pl**: 4 形

```json
{
  "events_one": "{{count}} wydarzenie", // n=1
  "events_few": "{{count}} wydarzenia", // 2-4, 22-24 (n%10=2-4, n%100∉12-14)
  "events_many": "{{count}} wydarzeń", // 0, 5-21, 25-31
  "events_other": "{{count}} wydarzenia" // 小数
}
```

**ar（v1.3 で追加）**: 6 形

```json
{
  "events_zero": "لا توجد أحداث",
  "events_one": "حدث واحد",
  "events_two": "حدثان",
  "events_few": "{{count}} أحداث",
  "events_many": "{{count}} حدثًا",
  "events_other": "{{count}} حدث"
}
```

#### §17.3.4 日付・数値フォーマット

```typescript
// utils/format.ts
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatRelativeDays(days: number, locale: string): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
}
```

### §17.4 境界値テーブル

| 項目                  | 境界        | 期待動作                                |
| --------------------- | ----------- | --------------------------------------- |
| 端末 locale = `ja-JP` | 代表        | ja 選択                                 |
| 端末 locale = `ko-KR` | 対応        | ko 選択                                 |
| 端末 locale = `zh-CN` | 中国語      | zh-Hans                                 |
| 端末 locale = `zh-TW` | 繁体        | zh-Hant                                 |
| 端末 locale = `zh-HK` | 特殊        | zh-Hant（香港）                         |
| 端末 locale = `ar-SA` | v1.3 未対応 | en フォールバック                       |
| 端末 locale = `uk-UA` | 未対応      | en フォールバック                       |
| override = 未対応言語 | 異常        | en フォールバック                       |
| plural: ru で n=21    | 境界        | one（「21 событие」）                   |
| plural: ru で n=22    | 境界        | few（「22 события」）                   |
| plural: ru で n=11    | 境界        | many（「11 событий」、n%100=11 は特殊） |
| plural: pl で n=22    | 境界        | few                                     |
| 言語切替ボタンタップ  | UX          | 0.5 秒以内に全画面再レンダ              |

### §17.5 エラーフロー

| エラー               | 表示           | 対応               |
| -------------------- | -------------- | ------------------ |
| 翻訳ファイル欠損     | キー文字列表示 | en フォールバック  |
| AsyncStorage 失敗    | 無音           | 端末 locale で継続 |
| 言語切替中クラッシュ | 前言語で継続   | –                  |

### §17.6 受け入れ条件

- [ ] 端末を `pl` で起動 → 全画面ポーランド語
- [ ] 「3 件の盆栽」が ja/en/pl/ru すべて正しい plural 形
- [ ] 設定画面で言語切替 → 0.5 秒以内に全 UI 反映
- [ ] `pnpm i18n:check` で 19 言語キー 100% 一致
- [ ] ハードコード文字列ゼロ（`pnpm i18n:audit` 通過）

### §17.7 対応テスト

- Jest: `__tests__/i18n/locale_detection.test.ts`, `plural_ru.test.ts`, `plural_pl.test.ts`, `change_language.test.ts`
- CI: `pnpm i18n:check`, `pnpm i18n:audit`

---

## §18. F-13 課金（サブスク＋買切）

### §18.1 目的

月額・年額サブスク + Lifetime 買切で Pro 機能を解放する。

### §18.2 画面 / 入口

- Paywall（`(modals)/paywall`、`fullScreenModal` presentation、`gestureEnabled: false`）
- 設定 → アカウント → プラン確認
- Free 機能タップ時の誘導（例: タイミング計算、写真 4 枚目、エクスポート）

### §18.3 期待動作

#### §18.3.1 購入フロー

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> offerings_loading: openPaywall()
  offerings_loading --> offerings_loaded: Purchases.getOfferings() resolved
  offerings_loading --> offerings_error: network/config error
  offerings_loaded --> purchasing: user taps Buy
  purchasing --> success: purchasePackage resolved
  purchasing --> cancelled: userCancelled
  purchasing --> pending: PAYMENT_PENDING_ERROR (家族承認待ち)
  purchasing --> already_owned: PRODUCT_ALREADY_PURCHASED_ERROR
  purchasing --> error: other PurchasesError
  pending --> success: CustomerInfoUpdateListener 受信
  already_owned --> restoring: 「復元」を促す
  offerings_loaded --> restoring: 「購入を復元」タップ
  restoring --> success: entitlement 'premium' active
  restoring --> no_entitlement: 空
  success --> [*]: dismissAll + Pro 解放
```

#### §18.3.2 設定（Entitlement / Offering / Packages）

```typescript
const ENTITLEMENT_ID = 'premium'; // 1 つのみ
const OFFERING_ID = 'default'; // 1 つのみ

// Packages:
// $rc_monthly  → bonsailog_pro_monthly  （Auto-Renewable Subscription）
// $rc_annual   → bonsailog_pro_yearly   （Auto-Renewable Subscription）
// $rc_lifetime → bonsailog_pro_lifetime （Non-Consumable IAP / One-time Product）
```

#### §18.3.3 購入擬似コード

```typescript
// features/paywall/buy.ts
type PurchaseOutcome =
  | { kind: 'success'; info: CustomerInfo }
  | { kind: 'cancelled' }
  | { kind: 'pending' }
  | { kind: 'already_owned' }
  | { kind: 'error'; code: string; readable: string; message: string };

export async function buy(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { kind: 'success', info: customerInfo };
  } catch (e: any) {
    if (e.userCancelled || e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)
      return { kind: 'cancelled' };
    if (e.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { kind: 'pending' };
    if (e.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR)
      return { kind: 'already_owned' };
    return {
      kind: 'error',
      code: String(e.code),
      readable: e.readableErrorCode,
      message: e.message,
    };
  }
}
```

#### §18.3.4 CustomerInfoUpdateListener（source of truth）

```typescript
// hooks/usePro.ts
export function usePro() {
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    // 起動時に現状確認
    Purchases.getCustomerInfo().then((info) =>
      setIsPro(info.entitlements.active['premium'] != null),
    );
    // リアルタイム更新
    const handler = (info: CustomerInfo) => setIsPro(info.entitlements.active['premium'] != null);
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => Purchases.removeCustomerInfoUpdateListener(handler);
  }, []);

  return isPro;
}
```

#### §18.3.5 Restore フロー

```mermaid
flowchart TD
  Tap[購入を復元タップ] --> Confirm[OS ダイアログで認証]
  Confirm --> Call[Purchases.restorePurchases]
  Call --> Check{entitlement 'premium' active?}
  Check -- Yes --> Success[Pro 解放、「復元しました」]
  Check -- No --> Fail[「復元する購入はありません」]
```

#### §18.3.6 Paywall UI

```
┌─────────────────────────────┐
│  🌱 BonsaiLog Pro          │
├─────────────────────────────┤
│  ・写真 3 枚/本の制限撤廃    │
│  ・CSV / PDF エクスポート    │
│  ・年次タイムライン画像      │
│  ・広告非表示                │
├─────────────────────────────┤
│  [ 年額 ¥3,980 ]  ← 推奨   │ 33%お得バッジ、デフォルト選択
│   月換算 ¥331/月             │
│  [ 月額 ¥500 ]               │
│  [ 買切 ¥9,800 ]            │ 一度だけ、ずっと Pro
├─────────────────────────────┤
│  [    購読する    ]          │
│  購入を復元 | 利用規約 | プライバシー │
└─────────────────────────────┘
```

**Apple Review Guideline 3.1.1 準拠**: 「購入を復元」は **Paywall と Settings 両方** に配置。

#### §18.3.7 オフライン挙動

- SDK キャッシュから `getCustomerInfo` 即返却
- `entitlements.active['premium']` が true ならオフラインでも Pro として扱う
- 最大 3 日間グレースピリオド
- **Lifetime（Non-Consumable）は Offline Entitlements 対象外**（RC 仕様）。RC サーバダウン時に Lifetime 購入は失敗する可能性

### §18.4 境界値テーブル

| 項目                      | 境界       | 期待動作                              |
| ------------------------- | ---------- | ------------------------------------- |
| 初回起動                  | 境界       | Free プラン、entitlement 空           |
| 月額購入成功              | 正常       | `premium` active                      |
| 年額購入成功              | 正常       | `premium` active                      |
| 買切購入成功              | 正常       | `premium` active、expirationDate なし |
| 購入キャンセル            | ユーザー   | 無音で Paywall に戻る                 |
| 承認待ち（Family）        | pending    | 「承認待ち」画面、listener で完了検知 |
| 既購入（同一 Apple ID）   | 重複       | 「復元」誘導                          |
| ネットワークエラー        | 異常       | 「後で再試行」、購入未確定            |
| 月額 → 年額アップグレード | OS 管理    | OS のアップグレード UI                |
| 年額 → 月額ダウングレード | OS 管理    | 次回更新時に反映                      |
| 期限切れ                  | 正常遷移   | entitlement inactive、Free に戻る     |
| 3 日グレースピリオド経過  | オフライン | entitlement inactive 扱い             |

### §18.5 エラーフロー

| コード                      | 表示                                         | 対応                      |
| --------------------------- | -------------------------------------------- | ------------------------- |
| 1 PURCHASE_CANCELLED        | 無音                                         | Paywall 維持              |
| 2 STORE_PROBLEM             | 「ストアに問題があります」                   | 再試行                    |
| 3 PURCHASE_NOT_ALLOWED      | 「購入が許可されていません」                 | 端末設定確認              |
| 6 PRODUCT_ALREADY_PURCHASED | 「既に購入済み」                             | 復元誘導                  |
| 10 NETWORK                  | 「接続を確認してください」                   | 再試行                    |
| 20 PAYMENT_PENDING          | 「承認待ちです」                             | 待機、listener で自動反映 |
| 22 CONFIGURATION            | 「アプリ設定に問題があります」（開発エラー） | 開発者に連絡              |

### §18.6 受け入れ条件

- [ ] Free ユーザーが Pro 機能タップ → Paywall 表示
- [ ] 年額購入成功 → `isPro = true` 即時反映
- [ ] Restore → 過去購入があれば Pro 復元
- [ ] Restore → 過去購入がなければ「復元する購入はありません」
- [ ] オフラインでも Pro 判定が SDK キャッシュから可能
- [ ] 購入キャンセルで無音、Paywall 維持
- [ ] 「購入を復元」ボタンが Paywall と Settings 両方に存在
- [ ] Lifetime 購入が Non-Consumable として RC Dashboard に登録（事前確認）

### §18.7 対応テスト

- Jest: `__tests__/features/purchase/buy_monthly.test.ts`, `buy_annual.test.ts`, `buy_lifetime.test.ts`, `restore.test.ts`, `listener_update.test.ts`
- Maestro: `maestro/flows/paywall_to_purchase.yaml`（RevenueCat sandbox）

---

## §19. F-14 Home 下部バナー広告

### §19.1 目的

Free プランで Home 画面下部にバナー広告を表示する。ATT/UMP 規約準拠。

### §19.2 画面 / 入口

- Home 画面最下部のみ
- Pro では完全非表示

### §19.3 期待動作

#### §19.3.1 ATT → UMP → AdMob 初期化 7 ステップ

```mermaid
flowchart TD
  Launch[アプリ起動] --> Onboard{オンボ完了?}
  Onboard -- No --> Welcome[ウェルカム画面]
  Welcome --> Language[言語選択]
  Language --> NotifPerm[通知権限要求]
  NotifPerm --> AttExplain[ATT 価値説明画面]
  AttExplain --> ATT[requestTrackingPermissionsAsync]
  ATT --> UMP[AdsConsent.requestInfoUpdate]
  UMP --> Form{UMP form 必要?}
  Form -- Yes --> ShowForm[loadAndShowConsentFormIfRequired]
  Form -- No --> CanCheck
  ShowForm --> CanCheck[AdsConsent.getConsentInfo]
  CanCheck --> CanAds{canRequestAds?}
  CanAds -- Yes --> Config[mobileAds setRequestConfiguration]
  CanAds -- No --> HomeNoBanner[Home バナー非表示]
  Config --> Init[mobileAds.initialize]
  Init --> HomeBanner[Home 下部バナー表示]
```

#### §19.3.2 BannerAd コンポーネント

```tsx
// components/HomeBannerAd.tsx
export function HomeBannerAd() {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const canRequestAds = useAdsStore((s) => s.canRequestAds);
  const insets = useSafeAreaInsets();
  const bannerRef = useRef<BannerAd>(null);
  const lastLoadedAt = useRef(0);
  const [failed, setFailed] = useState(false);

  if (isPro) return null; // Pro 即非表示
  if (!canRequestAds) return null;

  // iOS バックグラウンド復帰時の 60 秒制限対応
  useForeground(
    useCallback(() => {
      if (Platform.OS !== 'ios') return;
      const now = Date.now();
      if (now - lastLoadedAt.current < 60_000) return;
      bannerRef.current?.load();
      lastLoadedAt.current = now;
    }, []),
  );

  if (failed) return <View style={[styles.placeholder, { paddingBottom: insets.bottom }]} />;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <Text size="$1" color="$gray10" style={styles.label}>
        {t('ads.label')}
      </Text>
      <BannerAd
        ref={bannerRef}
        unitId={
          __DEV__
            ? TestIds.ADAPTIVE_BANNER
            : Platform.select({
                ios: PROD_IOS_UNIT_ID,
                android: PROD_ANDROID_UNIT_ID,
              })!
        }
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => {
          lastLoadedAt.current = Date.now();
          setFailed(false);
        }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
```

#### §19.3.3 設定値（固定）

```typescript
await mobileAds().setRequestConfiguration({
  maxAdContentRating: MaxAdContentRating.PG, // 家族向け
  tagForChildDirectedTreatment: false, // General Audience
  tagForUnderAgeOfConsent: false,
});
```

#### §19.3.4 UI 配置ルール（基本仕様 §9.4 再掲）

- **位置**: Home 画面 tabBar の**上**（タブ外配置で切替 unmount 回避）
- **サイズ**: Anchored Adaptive Banner（高さ 50-60dp）
- **表示タイミング**: アプリ起動後 **3 秒以上経過後**
- **X ボタン**: **48dp 以上**、右上
- **セーフエリア**: 広告周囲 **16dp 以上の余白**
- **「広告」ラベル**: 常時表示（小さくグレー）
- **Pro 版**: **完全非表示**（即時反映）

#### §19.3.5 タブ外配置

```tsx
<Stack.Screen name="Main">
  {() => (
    <View style={{ flex: 1 }}>
      <Tab.Navigator>{/* Home, Plants, Care, Settings */}</Tab.Navigator>
      <HomeBannerAd /> {/* タブ切替でも unmount されない */}
    </View>
  )}
</Stack.Screen>
```

### §19.4 境界値テーブル

| 項目                               | 境界         | 期待動作                             |
| ---------------------------------- | ------------ | ------------------------------------ |
| Free + canRequestAds=true          | 正常         | バナー表示                           |
| Free + canRequestAds=false         | UMP 拒否     | バナー非表示（課金プロンプトは残す） |
| Pro                                | 課金済       | バナー完全非表示、即時反映           |
| ATT notDetermined                  | 初回         | プロンプト                           |
| ATT denied                         | 拒否         | パーソナライズなし広告配信           |
| UMP REQUIRED                       | GDPR         | フォーム表示                         |
| UMP NOT_REQUIRED                   | 非GDPR       | フォームスキップ                     |
| UMP OBTAINED                       | 再起動       | フォームスキップ                     |
| 広告ロード失敗                     | ネットワーク | プレースホルダ                       |
| 起動後 3 秒未満                    | 境界         | 表示しない                           |
| iOS バックグラウンド復帰 60 秒以内 | 境界         | 再ロードしない                       |
| Pro 購入 → バナー消失              | 即時         | 購入完了時に即 unmount               |

### §19.5 エラーフロー

| エラー                     | 表示           | 対応                       |
| -------------------------- | -------------- | -------------------------- |
| UMP ネットワーク失敗       | 無音           | 前回 consent status で継続 |
| AdMob 初期化失敗           | バナー非表示   | 次回起動で再試行           |
| 広告ロード失敗             | プレースホルダ | onAdLoaded を待つ          |
| 誤タップでリンク先が怪しい | –              | カテゴリフィルタで事前防止 |

### §19.6 受け入れ条件

- [ ] 初回起動 → ATT → UMP → Home にバナー表示
- [ ] Pro 購入 → バナー即消失
- [ ] 詳細画面・設定画面では非表示
- [ ] 設定 → プライバシー設定 → UMP フォーム再表示可能
- [ ] カテゴリフィルタで ギャンブル・アルコール・出会い系 全拒否
- [ ] Google Play Policy / Apple Guideline 違反なし（事前レビュー済み）

### §19.7 対応テスト

- Jest: `__tests__/features/ads/visibility.test.ts`, `placement.test.ts`, `ump_consent.test.ts`, `att_order.test.ts`
- Maestro: `maestro/flows/first_launch_consent.yaml`

---

## §20. F-15 ダークモード / 屋外モード

### §20.1 目的

システム設定連動のダークモードと、手動切替の屋外（ハイコントラスト）モードを提供する。

### §20.2 画面 / 入口

- 設定 → 外観 → テーマ（システム / ライト / ダーク）
- 設定 → 外観 → 屋外モード（手動切替）
- ステータスバーのクイックアクセス（屋外モード）

### §20.3 期待動作

#### §20.3.1 テーマ切替フロー

```mermaid
stateDiagram-v2
  [*] --> System: 初期値
  System --> Light: ユーザー選択
  System --> Dark: ユーザー選択
  Light --> System: 選択
  Dark --> System: 選択
  Light --> Outdoor: 屋外モード ON
  Dark --> Outdoor: 屋外モード ON
  System --> Outdoor: 屋外モード ON
  Outdoor --> Light: 屋外モード OFF (light ベース)
  Outdoor --> Dark: 屋外モード OFF (dark ベース)
  Outdoor --> System: 屋外モード OFF (system ベース)
```

#### §20.3.2 Tamagui テーマ統合

```tsx
// app/_layout.tsx
export default function RootLayout() {
  const themeMode = useSettingsStore((s) => s.themeMode); // 'system' | 'light' | 'dark'
  const isOutdoor = useSettingsStore((s) => s.isOutdoor);
  const systemScheme = useColorScheme();

  const resolved = useMemo(() => {
    if (isOutdoor) return 'outdoor';
    if (themeMode === 'system') return systemScheme ?? 'light';
    return themeMode;
  }, [themeMode, isOutdoor, systemScheme]);

  return (
    <TamaguiProvider config={config} defaultTheme={resolved}>
      <Slot />
    </TamaguiProvider>
  );
}
```

#### §20.3.3 色トークン（WCAG AA/AAA 準拠）

| トークン         | light              | dark    | outdoor          |
| ---------------- | ------------------ | ------- | ---------------- |
| `bg.primary`     | #FFFFFF            | #0A0E1A | #FFFFFF          |
| `bg.secondary`   | #F5EBDA（和紙）    | #141820 | #FFFF00          |
| `text.primary`   | #1A1A1A (17.4:1)   | #F5F5F5 | #000000 (21:1)   |
| `text.secondary` | #4A5568 (8.7:1)    | #A0AEC0 | #0F1419          |
| `primary`        | #0F5132 (9.6:1 緑) | #4ADE80 | #000080 (15.3:1) |
| `warning`        | #B45309 (5.0:1)    | #FBBF24 | #CC0000          |
| `danger`         | #B91C1C (6.1:1)    | #F87171 | #FF0000          |

#### §20.3.4 Reduced Motion 対応

```tsx
const reduceMotion = useReducedMotion(); // react-native-reanimated
const duration = reduceMotion ? 0 : 300;
```

### §20.4 境界値テーブル

| 項目                             | 境界     | 期待動作                |
| -------------------------------- | -------- | ----------------------- |
| システム = dark、モード = system | 境界     | dark 適用               |
| システム = light、モード = dark  | 強制     | dark 適用               |
| 屋外モード ON + dark ベース      | 境界     | outdoor 適用            |
| reduced motion ON                | 境界     | アニメーション 0ms      |
| コントラスト 4.5:1（下限）       | 境界     | WCAG AA OK              |
| コントラスト 3:1                 | 境界未満 | UI 要素のみ OK、本文 NG |

### §20.5 エラーフロー

| エラー                | 表示 | 対応                             |
| --------------------- | ---- | -------------------------------- |
| AsyncStorage 保存失敗 | 無音 | セッション内は反映、再起動で戻る |

### §20.6 受け入れ条件

- [ ] システム = dark → アプリもダーク
- [ ] 手動で light 選択 → システム設定に関わらず light
- [ ] 屋外モード ON → コントラスト AAA（7:1 以上）
- [ ] reduced motion ON → トランジション瞬時
- [ ] 切替時に画面点滅なし
- [ ] 全画面で WCAG AA 以上

### §20.7 対応テスト

- Jest: `__tests__/features/theme/system_mode.test.ts`, `outdoor_mode.test.ts`, `contrast_aaa.test.ts`

---

## §21. F-16 ローカル通知

### §21.1 目的

作業リマインダーをローカル通知で配信する。サーバ非依存。

### §21.2 画面 / 入口

- 設定 → 通知 → 許可 / 不許可
- 設定 → 通知 → チャネル別設定（Android 13+）
- 通知タップで Deep Link → 盆栽詳細の該当作業画面

### §21.3 期待動作

#### §21.3.1 権限要求フロー

```mermaid
stateDiagram-v2
  [*] --> 未要求: アプリ初回起動
  未要求 --> チャネル作成: Android: initNotificationChannels
  チャネル作成 --> 要求中: requestPermissionsAsync
  未要求 --> 要求中: iOS 直接
  要求中 --> 許可: granted
  要求中 --> 拒否_再要求可: denied && canAskAgain
  要求中 --> 拒否_ブロック: canAskAgain=false
  拒否_再要求可 --> 要求中: UI「通知を有効にする」
  拒否_ブロック --> 設定誘導: Linking.openSettings()
  設定誘導 --> 許可: 設定で ON
  許可 --> OS無効化: OS 設定で OFF
  OS無効化 --> 許可: OS 設定で ON
```

#### §21.3.2 通知チャネル（Android 13+）

```typescript
// notifications/channels.ts
export const CHANNELS = {
  WATER: 'bonsai_water',
  FERTILIZE: 'bonsai_fertilize',
  PESTICIDE: 'bonsai_pesticide',
  WIRING: 'bonsai_wiring',
} as const;

export async function initNotificationChannels() {
  if (Platform.OS !== 'android') return;
  // ⚠️ 権限要求より前に必ず実行
  await Notifications.setNotificationChannelAsync(CHANNELS.WATER, {
    name: '水やりリマインダー',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4CAF50',
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.PESTICIDE, {
    name: '消毒リマインダー',
    importance: Notifications.AndroidImportance.HIGH, // heads-up
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.FERTILIZE, {
    name: '施肥リマインダー',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.WIRING, {
    name: '針金外しリマインダー',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
```

#### §21.3.3 スケジューリング擬似コード

```typescript
// notifications/schedule.ts
const IOS_SAFE_LIMIT = 60; // 64 の余裕枠

export async function scheduleBonsaiNotification(params: {
  bonsaiId: string;
  eventType: EventType;
  date: Date;
  channelId: string;
  title: string;
  body: string;
}) {
  const identifier = `bonsai_${params.bonsaiId}_${params.eventType}_${formatYYYYMMDD(params.date)}`;

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: params.title,
      body: params.body,
      data: {
        bonsai_id: params.bonsaiId,
        event_type: params.eventType,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.date,
      channelId: params.channelId,
    },
  });
}

export async function rescheduleBonsai(bonsaiId: string, plans: Plan[]) {
  // 既存の通知を取得
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  // 対象盆栽の既存通知を全削除（prefix マッチ）
  const targets = existing.filter((n) => n.identifier.startsWith(`bonsai_${bonsaiId}_`));
  await Promise.all(
    targets.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  // 新規計画を登録
  for (const p of plans) {
    await scheduleBonsaiNotification(p);
  }
  // iOS 64 件上限対策
  await enforceIosLimit();
}

async function enforceIosLimit() {
  if (Platform.OS !== 'ios') return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  if (all.length <= IOS_SAFE_LIMIT) return;

  // 遠い未来の低優先度通知を削除
  const sorted = all.sort((a, b) => {
    const dateA = (a.trigger as any).date?.getTime() ?? 0;
    const dateB = (b.trigger as any).date?.getTime() ?? 0;
    return dateA - dateB;
  });
  const toRemove = sorted.slice(IOS_SAFE_LIMIT);
  await Promise.all(
    toRemove.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
```

#### §21.3.4 通知タップ → Deep Link

```typescript
// app/_layout.tsx
useEffect(() => {
  const redirect = (notif: Notifications.Notification) => {
    const data = notif.request.content.data as { bonsai_id?: string; event_type?: string };
    if (data.bonsai_id) {
      router.push(`/bonsai/${data.bonsai_id}?event=${data.event_type}`);
    }
  };

  // 完全停止からの復帰: listener 登録前に発火するため必須
  const last = Notifications.getLastNotificationResponse();
  if (last?.notification) {
    redirect(last.notification);
    Notifications.clearLastNotificationResponseAsync();
  }

  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    redirect(resp.notification);
  });
  return () => sub.remove();
}, []);
```

#### §21.3.5 通知設定の既定値

- 水やり: 毎朝 8:00（ユーザー変更可）
- 施肥: 対象日 8:00
- 消毒: 対象日 8:00（HIGH importance）
- 針金外し: 対象日 8:00（Pro 限定）

### §21.4 境界値テーブル

| 項目                               | 境界   | 期待動作                                           |
| ---------------------------------- | ------ | -------------------------------------------------- |
| 通知 0 件                          | 下限   | OK                                                 |
| iOS pending 63 件                  | 境界   | OK                                                 |
| iOS pending 64 件（上限）          | 境界   | 既定動作だが BonsaiLog は 60 件で抑制              |
| iOS pending 100 件                 | 上限超 | 60 件に絞り込み、残りは次回起動時に補充            |
| Android pending 1,000 件           | 高負荷 | OK（OS 上限なし）                                  |
| 通知時刻 = 過去                    | 異常   | バリデーション NG                                  |
| 通知時刻 = 2030 年                 | 未来   | OK                                                 |
| タイムゾーン変更後                 | 境界   | AppState=active で再スケジュール                   |
| 端末バッテリー最適化 ON（Android） | 境界   | Inexact alarm で最大 15 分遅延                     |
| 通知許可 granted                   | 境界   | 通知表示                                           |
| 通知許可 denied                    | 境界   | scheduleNotificationAsync は成功するが配信されない |

### §21.5 エラーフロー

| エラー                    | 表示                         | 対応                             |
| ------------------------- | ---------------------------- | -------------------------------- |
| 権限拒否（ブロック）      | 「設定から許可してください」 | `Linking.openSettings()`         |
| スケジュール失敗          | ログのみ                     | 次回起動時に再試行               |
| チャネル作成失敗          | ログのみ                     | DEFAULT チャネルにフォールバック |
| 通知タップ → 盆栽削除済み | Home にフォールバック        | 「盆栽が見つかりません」トースト |

### §21.6 受け入れ条件

- [ ] 盆栽登録 → 水やり通知スケジュール → 翌日 8:00 に配信
- [ ] 通知タップ → 該当盆栽詳細の作業画面へ
- [ ] 完全停止状態からの通知タップで正しく遷移
- [ ] iOS で 60 件超スケジュール時に自動削減
- [ ] Android 13+ でチャネル未作成だと権限プロンプトが表示されない（既知挙動）
- [ ] タイムゾーン変更後、AppState=active で自動再スケジュール

### §21.7 対応テスト

- Jest: `__tests__/features/notification/schedule.test.ts`, `channel_android.test.ts`, `deep_link.test.ts`, `ios_64_limit.test.ts`
- Maestro: `maestro/flows/notification_permission.yaml`

---

## §22. 画面遷移マップ（5 主要フロー）

### §22.1 オンボーディング

```mermaid
stateDiagram-v2
  [*] --> Splash
  Splash --> Language: 未完了
  Splash --> Home: 完了フラグあり
  Language --> Notification: 選択 (replace)
  Notification --> ATT_Explain: iOS 価値説明
  Notification --> UMP: Android（ATT スキップ）
  ATT_Explain --> ATT: 「続ける」
  ATT --> UMP
  UMP --> FirstBonsai: GDPR 地域外はスキップ
  FirstBonsai --> Home: 盆栽保存 (dismissAll + replace /)
  FirstBonsai --> Home: 「あとで」 (replace /)
```

**presentation**: 各ステップは `fullScreenModal` + `router.replace`（戻る禁止）、完了時 `router.dismissAll(); router.replace('/(tabs)')`。

### §22.2 盆栽追加

```mermaid
flowchart TD
  A[Home /(tabs)/index] -->|FAB tap| B{未保存下書き?}
  B -- あり --> C[再開確認]
  B -- なし --> D[/(modals)/bonsai-new/]
  C -->|破棄| D
  D -->|樹種選択| E[ネスト Stack push /species]
  E -->|選択| D
  D -->|写真追加| F[expo-image-picker]
  F --> D
  D -->|Save| G{バリデーション}
  G -- NG --> D1[インラインエラー]
  G -- OK --> H[withExclusiveTransactionAsync]
  H -->|成功| I[dismissAll + replace /bonsai/:id]
  H -->|失敗| D2[エラー + 下書き保持]
  D -->|Close ×| J{dirty?}
  J -- あり --> K[破棄確認シート]
  K -->|破棄| A
```

### §22.3 作業記録（§7.3.1 と同じ、再掲略）

### §22.4 課金

```mermaid
flowchart TD
  A[Free 機能タップ] --> B{isPro?}
  B -- Yes --> Z[機能実行]
  B -- No --> P[/(modals)/paywall fullScreenModal, gestureEnabled:false/]
  P -->|Close ×| A
  P -->|Package タップ| S[StoreKit / BillingClient]
  S -->|キャンセル| P
  S -->|成功| V[RevenueCat 検証 + Listener]
  S -->|失敗| E[エラーダイアログ]
  V -->|entitlement 'premium' active| U[isPro=true → dismissAll → Z]
  V -->|検証失敗| E
```

### §22.5 お引っ越し（§16.3.1 と同じ、再掲略）

---

## §23. Deep Link 仕様

### §23.1 URL スキーム

- **Custom Scheme**: `bonsailog://`
- **Universal Link / App Links**: `https://bonsailog.app/` (v2+)

### §23.2 URL パターン

| URL                                      | 画面                  | Stack 構築                               |
| ---------------------------------------- | --------------------- | ---------------------------------------- |
| `bonsailog://`                           | Home                  | `(tabs)/index`                           |
| `bonsailog://bonsai/[id]`                | 盆栽詳細              | `(tabs)/index` → `bonsai/[id]`           |
| `bonsailog://bonsai/[id]?event=watering` | 盆栽詳細 + 作業選択済 | → 作業シート表示                         |
| `bonsailog://event/[id]`                 | 作業詳細              | → `bonsai/[bonsaiId]` → `event/[id]`     |
| `bonsailog://settings`                   | 設定                  | `(tabs)/settings`                        |
| `bonsailog://settings/theme`             | テーマ設定            | → `settings/theme`                       |
| `bonsailog://settings/language`          | 言語設定              | → `settings/language`                    |
| `bonsailog://paywall`                    | Paywall               | + `(modals)/paywall`                     |
| `bonsailog://migration`                  | お引っ越し            | `(tabs)/settings` → `(modals)/migration` |

### §23.3 失敗時の挙動

| エラー                  | 挙動                             |
| ----------------------- | -------------------------------- |
| 盆栽 ID が存在しない    | Home にフォールバック + トースト |
| 未対応パス              | Home にフォールバック            |
| 認証が必要な画面（v2+） | Login へ誘導                     |

---

## §24. エラーコード一覧

### §24.1 RevenueCat エラーコード（§18.5 再掲）

| コード | 名称                      | UI 対応    |
| ------ | ------------------------- | ---------- |
| 1      | PURCHASE_CANCELLED        | 無音       |
| 2      | STORE_PROBLEM             | 再試行     |
| 3      | PURCHASE_NOT_ALLOWED      | 設定確認   |
| 6      | PRODUCT_ALREADY_PURCHASED | 復元誘導   |
| 10     | NETWORK                   | 再試行     |
| 20     | PAYMENT_PENDING           | 待機       |
| 22     | CONFIGURATION             | 開発エラー |

### §24.2 BonsaiLog 内部エラー（アプリ固有）

| コード | 名称                    | 発生場所 | UI 対応                                    |
| ------ | ----------------------- | -------- | ------------------------------------------ |
| BL-001 | DB_LOCKED               | SQLite   | リトライ（busy_timeout 5秒）               |
| BL-002 | DB_MIGRATION_FAILED     | 起動時   | 「データベースの更新に失敗」、アプリ再起動 |
| BL-003 | PHOTO_COPY_FAILED       | F-08     | 「写真を保存できませんでした」             |
| BL-004 | PHOTO_SIZE_EXCEEDED     | F-08     | 「画像が大きすぎます（最大 5MB）」         |
| BL-005 | FREE_LIMIT_REACHED      | F-08     | Paywall 遷移                               |
| BL-006 | MIGRATION_HASH_MISMATCH | F-11     | 「データが破損しています」                 |
| BL-007 | MIGRATION_SCHEMA_FUTURE | F-11     | 「アプリを更新してください」               |
| BL-008 | NOTIFICATION_LIMIT      | F-16     | 自動削減 + ログ                            |
| BL-010 | TRANSLATION_MISSING     | F-12     | キー文字列表示 + ログ                      |

### §24.3 Expo / RN 既知エラー

| エラー                                      | 発生条件                      | 回避策                                                 |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| `SQLITE_BUSY`                               | 並行書き込み競合              | `busy_timeout = 5000`、`withExclusiveTransactionAsync` |
| `FileSystem UUID changed`                   | iOS 再インストール/TestFlight | 相対パス保存（basic_spec §5.2）                        |
| `Maximum update depth exceeded`             | Zustand v5 セレクタ           | `useShallow` 使用                                      |
| `CALENDAR trigger not supported on Android` | F-16                          | DATE trigger にフォールバック                          |

---

## 付録A：小中学生向け用語辞典（本書固有語のみ）

- **optimistic update**（オプティミスティック・アップデート）: ボタンを押した瞬間に「成功した」という前提で画面を更新する方法。失敗したらあとで元に戻す。速く見せるため。
- **ロールバック**: 失敗したら変更を「なかったこと」にする操作。
- **query key**（クエリキー）: データの住所のようなもの。`['bonsai', 'list']` = 「盆栽リストの住所」。
- **invalidate**（インバリデート）: 「そのデータは古いよ、もう一度取ってきて」というマーク。
- **ZIP**: 複数のファイルを 1 つにまとめて圧縮するファイル形式。盆栽の写真と DB をひとまとめにして送る箱。
- **Share Sheet**: スマホで「他のアプリに送る」を選ぶときに出てくる標準のメニュー。「メールで送る」「Drive に保存」など。
- **VACUUM INTO**: SQLite で「DB の中身を綺麗な状態でファイルに書き出す」コマンド。バックアップ用のスナップショットを作るときに使う。
- **manifest.json**: バックアップ ZIP の中に入っている「メモ書き」。「いつ作ったか」「中身は何件か」が書いてある。
- **FTS5**: SQLite の検索機能。文章の中の言葉を早く探せる。
- **trigram tokenizer**: 3 文字ずつ区切って検索する方法。日本語でも英語でも使える。
- **fts5vocab**: FTS5 が持っている「使われている単語の一覧」。ここから前方一致で単語を拾える。
- **bm25**: 検索結果の「どれが一番関連性が高いか」を数値化する計算方法。
- **Mermaid**: 状態遷移図やフローチャートを文字だけで書く記法。GitHub でも表示できる。
- **状態遷移図**: 「こういう時はこう動く」を矢印で書いた図。プログラムの動きを整理できる。
- **擬似コード**: 「こんなコードになる」を正確じゃなくていいから書いたもの。実装の指針。
- **境界値**: データの最小・最大や、動きが変わるギリギリの値。ここを間違えるとバグが出やすい。

## 付録B：実装前チェックリスト

実装に入る前に確認:

- [ ] 本書の該当 F 章を最後まで読んだ
- [ ] basic_spec.md の該当 F 章と整合している
- [ ] 必要な状態遷移図を理解した
- [ ] 境界値テーブルをテストケースに転記した
- [ ] エラーフローを網羅したエラーハンドリングを設計した
- [ ] 横断仕様（§5）に従っている（特に TXN 選択、invalidate タイミング）
- [ ] テストファイル配置を決めた（`__tests__/...`）
- [ ] Maestro flow が必要なら `.maestro/` に配置を決めた
- [ ] PRAGMA 初期化が必要な処理か確認した（§5.12）

## 付録C：既知の仕様曖昧点（未決定リスト）

以下は現時点で「決めていない」または「調査中」の項目。実装時に迷ったら ADR を起こすこと:

1. **作業記録の写真は盆栽写真と別カウント？**
   - 現状: §7.3.5 で「盆栽単位カウントに含める」と決定。ただし UX 実装で迂回の抜け道がないか要確認。
2. **お引っ越しの iOS↔Android クロス**
   - 現状: §16.4 で「v1.0 未対応」と明記。実装上の障壁は低いが、DB ファイルが同一 SQLite 形式であることを保証すれば可能。v1.1 検討。
3. **365 日水やり履歴の FlashList 性能**
   - 現状: §9 では触れていない。365 本棒グラフのレンダリング性能要検証（VictoryNative / Recharts いずれか）。
4. **言語切替中のメモ欄入力中ドラフト**
   - 現状: §17 では触れていない。切替時に入力中テキストが消える可能性 → 要検証。
5. **Lifetime 購入のオフライン挙動**
   - 現状: §18.3.7 で「Offline Entitlements 対象外」と明記。RC サーバダウン時に Lifetime 購入が失敗するケースの UX 要設計。
6. **通知許可の二度拒否後の再プロンプト UX**
   - 現状: §21.3.1 で「設定誘導」と決定。ただし Android 13+ で `canAskAgain=false` の閾値が Android バージョンで異なる挙動 → 実機検証要。

## 付録D：本書を生かし続けるためのチェック（最短版）

- 機能追加・挙動変更したら、必ず「該当 F-XX の章」を更新する
- テスト（Jest / Maestro）と「受け入れ条件」をセットで更新する
- 状態遷移図・境界値テーブルが影響を受けるなら更新する
- docs 変更は CODEOWNERS レビュー必須にする
- 付録 C「未決定リスト」に新規曖昧点が生じたら追記する
