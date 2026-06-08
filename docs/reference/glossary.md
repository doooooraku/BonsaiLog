# BonsaiLog Glossary（用語集 / Reference）

この文書は BonsaiLog の仕様書・Issue・PR・コード内で使う「言葉の意味」を固定するための辞書です。
“同じものを違う言い方で呼ぶ”/“人によって意味がズレる” を防ぎます。

- 種別（Diátaxis）：Reference（参照）
- 読者：未来の自分 / 共同開発者 / Claude Code（AI）/ レビュワー / テスター
- 目的：迷ったらここを見て「用語の意味」と「同義語/禁止語」が1分で分かること

---

## 0. この文書の使い方（最短）

### 0-1. こんなときに使う

- 仕様書で同じ概念に違う呼び名が出てきた（例：「盆栽」と「樹」と「鉢」）
- Issue/PR で言葉が曖昧になりそう（例：「広告を消す」＝どの広告？どの条件？）
- UI/テスト/実装で“用語の粒度”が揃っていないと感じた
- 翻訳（i18n）や画面 ID、機能 ID の意味が混乱した

### 0-2. 更新ルール（最低限）

- **新しい概念が登場したら追記する**
  - 新機能（F-xx）が増えた / 画面（S-xx）が増えた / 新 SDK 導入 / 新しい統計値を追加した …など
- **意味が変わったら修正する**
- **表記ゆれが出たら、正を決めて「同義語」を登録する**

> 更新を強制する仕組み（PR テンプレチェック、CODEOWNERS、ブランチ保護など）は “運用” 側で担保します（この文書単体では強制できないため）。

### 0-3. “正（Single Source of Truth）” の方針（重要）

矛盾が起きたら、原則こう扱います。

1. コード（実装）
2. constraints（前提/制約）
3. ADR（理由・比較・却下案）
4. その他仕様書（0〜7）

---

## 1. ID・採番（仕様書 / Issue / PR で共通言語にする）

### 1-1. 機能 ID（F-xx）

- 形式：`F-01` のように `F-` + 2 桁
- 意味：ユーザー価値単位の機能（仕様書での機能一覧の“見出し”）
- 例：`F-01` 盆栽の登録・管理、`F-11` お引っ越し機能、`F-12` 多言語対応

### 1-2. 画面 ID（S-xx）

- 形式：`S-01` のように `S-` + 2 桁
- 意味：UI 画面の単位（設計・テスト・PR 影響範囲で使う）
- 例：`S-01` ホーム、`S-02` 盆栽詳細、`S-03` 設定、`S-04` Paywall、`S-05` バックアップ

### 1-3. ユースケース ID（UC-xx）

- 形式：`UC-01` のように `UC-` + 2 桁
- 意味：ユーザー行動のシナリオ単位（画面遷移や例外含む）

### 1-4. テストケース ID（TC-xxx / Scenario-xx）

- `TC-F01-001` のように “対象機能” が分かる形で付ける
- E2E は `Scenario-01` のように “ユーザーストーリー” で付ける

---

## 2. プロダクト / ドメイン用語（BonsaiLog の中身）

### BonsaiLog

- 定義：樹種 × 作業履歴を **鉢 1 本ずつ一生分**記録するオフライン完結の盆栽台帳アプリ
- 同義語：なし（本アプリ名は固有名詞、翻訳禁止）
- 禁止語：診断 / 判定 / 推奨 / べき / 危険 / 病気 / 治療 / reminder / tracker / alert（§7-2 参照）

### 盆栽（Bonsai）

- 定義：アプリで管理する樹木 1 本（= 鉢 1 本）。最上位エンティティ
- 同義語：樹（tree）、鉢、Bonsai（仕様書内では英日混在を許容、UI は ja `盆栽` / en `bonsai`）
- 最低限の属性：`id (UUID v4)` / `name` / `species_id` / `acquired_at` / `style` / `pot_info` / `archived_at` / `created_at`
- 関連：F-01

### 樹種（Species）

- 定義：盆栽の樹種マスタ。学名（scientific_name）を主キー的に持つ静的データ
- 同義語：scientific_name は **学名**、common_name は **通称名**
- 例：黒松（Pinus thunbergii）、真柏（Juniperus chinensis）、Ficus retusa（ガジュマル）
- 最低限の属性：`id` / `scientific_name` / `family` / `default_tasks (JSON)`
- 関連：F-12（参考情報として 50 種、推奨計算には使わない）

### 樹種通称（Species Names）

- 定義：locale × species で 19 言語の通称名を保持するテーブル
- 関連：F-12

### 作業（Event / Care Event）

- 定義：盆栽 1 本に時系列で紐付く作業イベント。STI（Single Table Inheritance）設計、`payload_json` で種別固有情報を保持
- 同義語：イベント、Event、Care Event（仕様書での 3 表記併記を許容、コードは `event` で統一）
- 関連：F-02

### 作業種別（event_type、13 種）

| コード            | 日本語         | 説明                       |
| ----------------- | -------------- | -------------------------- |
| `watering`        | 水やり         | 灌水                       |
| `pruning`         | 剪定           | 枝の整理                   |
| `wiring`          | 針金がけ       | 樹形整形のため針金を装着   |
| `unwiring`        | 針金外し       | 装着済み針金の除去         |
| `repotting`       | 植替え         | 鉢替え + 根の整理          |
| `fertilizing`     | 施肥           | 肥料を与える               |
| `pest_control`    | 病害虫対処     | 殺虫剤等の対処             |
| `leaf_trimming`   | 葉刈り（部分） | 一部の葉を刈る             |
| `defoliation`     | 葉刈り（全葉） | 全葉除去（成長促進）       |
| `deshoot`         | 芽摘み         | 新芽を摘む                 |
| `candle_cut`      | ミドリ摘み     | 松類の新芽（ミドリ）摘み   |
| `moss_care`       | 苔の手入れ     | 鉢面の苔の管理             |
| `position_change` | 置き場変更     | 屋外 / 室内 / 棚位置の変更 |

> `leaf_trimming` と `defoliation` の **両方を「葉刈り」と訳しうる**ため、UI 文言では区別を明記する（i18n キーで分離）。

### 写真（Photo）

- 定義：盆栽または作業に紐付く子エンティティ。**相対パス**で DB に保存（絶対パス禁止）
- 同義語：photo（コード）、画像（避ける）、サムネイル（避ける、必要なら別概念）
- 最低限の属性：`id (UUID v4)` / `bonsai_id` / `event_id (nullable)` / `relative_path` / `taken_at` / `is_cover`
- 保存先：`Paths.document/photos/<bonsaiId>/<photoId>.jpg`
- 関連：F-08

### カバー写真（Cover Photo）

- 定義：盆栽の代表写真（一覧で表示される 1 枚）
- 関連：F-01、F-08

### リマインダー（Reminder）

- 定義：次回作業の予定通知。RFC5545 RRULE で繰り返し定義
- 同義語：notification（コード）。**alert / 通知 / 警告は禁止語**（§7-2）
- 最低限の属性：`id` / `bonsai_id` / `event_type` / `next_at` / `rrule (TEXT)` / `completed_at`
- 関連：F-16

### タグ（Tag）

- 定義：盆栽に付与するユーザー定義ラベル（多対多）。「ラベル」と呼ばない
- 関連：F-09

### 樹形スタイル（Style）

- 定義：盆栽の伝統的な樹形分類。日本語音訳をそのまま 19 言語で使う（翻訳禁止）
- 例：`Chokkan`（直幹）、`Moyogi`（模様木）、`Shakan`（斜幹）、`Kengai`（懸崖）、`Han-Kengai`（半懸崖）、`Bunjin`（文人木）、`Sokan`（双幹）
- 関連：F-01

### 装着期間経過通知（Weeks Elapsed Notice）

- 定義：針金がけ event の装着期間が一定週数（既定 6 週）経過した時の事実通知
- 文言：「装着期間 6 週経過しました」（推奨ではなく事実、「外しましょう」等の命令禁止）
- 関連：F-07

### 外し予定日時（Scheduled Unwire At）

- 定義：針金がけ event のペイロードに含まれる「ユーザーが任意で指定した外す予定日時」（ISO UTC、`scheduled_unwire_at` フィールド）
- 通知文言：「針金の指定日時です（◯月◯日設定）」（推奨ではなく事実）
- 関連：F-07

### お引っ越し機能（Device Migration）

- 定義：旧端末から新端末へのデータ移行機能。**ZIP + Share Sheet 方式**（ADR-0007）
- 同義語：Device Migration、バックアップ・復元、Backup / Restore
- 関連：F-11、ADR-0007

### バックアップ ZIP（Backup ZIP）

- 定義：F-11 で生成する ZIP ファイル。`manifest.json` + `photos/` + `bonsai.db` の 3 種を格納
- 暗号化：なし（位置情報は Zone レベルのため、ADR-0007）
- 関連：F-11、ADR-0007

### manifest.json

- 定義：バックアップ ZIP のメタデータファイル
- 必須フィールド：`schema_version` / `exported_at` / `app_version` / `db_sha256` / `stats`
- 関連：F-11

### schema_version

- 定義：バックアップ ZIP のスキーマバージョン番号。**厳格一致** で互換性チェック
- v1.0 では `1` のみ受け入れ。マイグレータは v1.0 で **API のみ予約**、実装は v2.0 以降
- 関連：F-11、ADR-0007

### VACUUM INTO

- 定義：SQLite の `VACUUM INTO 'backup.db'` 構文。本体 DB をロックせず単一ファイルのスナップショットを作成
- 関連：F-11、ADR-0007

### STI（Single Table Inheritance）

- 定義：1 つのテーブル `events` で 13 種の作業イベントを統合管理する設計。種別固有情報は `payload_json` に格納
- 関連：F-02

### payload_json

- 定義：`events` テーブルの汎用カラム。`event_type` ごとに異なる属性を JSON で格納
- 例：`watering` の payload `{ amount_ml: 200 }`、`fertilizing` の payload `{ fertilizer_type: "magamp", grams: 5 }`
- 関連：F-02

### events_fts

- 定義：`events.note` 全文検索用 SQLite FTS5 仮想テーブル（trigram tokenizer）
- 関連：F-09

### 針金: 装着中 / クローズ

- 定義：F-07 で針金がけイベントを管理する 2 状態
  - 装着中（未外し）：`unwiring` イベント未記録
  - クローズ（外し済）：`unwiring` イベント記録済み
- 関連：F-07

---

## 3. Free / Pro / 収益化用語（課金と広告）

### Free（無料版）

- 定義：無料で使える状態
- 不変条件（要点）：
  - 樹木登録は **無制限**
  - 写真は **1 樹あたり 3 枚まで**
  - CSV / PDF / QR 印刷は **不可**
  - お引っ越し機能（F-11）は **可**
  - 広告：ホーム下部にバナーを **常時表示**

### Pro（有料版）

- 定義：サブスクリプション or 買い切り（Lifetime）で購入済みの状態
- 不変条件（要点）：
  - Free の制限を **全て解除**（写真無制限、CSV/PDF/QR 可）
  - 広告は **完全非表示**（広告コンポーネント自体をマウントしない）

### サブスクリプション（Subscription）

- 定義：月額 / 年額の継続課金購入形態

### 買切（Lifetime / Non-Consumable IAP）

- 定義：一括購入で永続 Pro 権限を得る購入形態（¥9,800 / $79.99 想定）
- 同義語：One-time Product、Lifetime
- 関連：F-13

### Restore Purchases（復元）

- 定義：過去の購入履歴を復元する処理。法的に提供必須

### RevenueCat

- 定義：サブスク購入・復元など課金周りを扱う SDK / サービス
- 用語：
  - Entitlement：ユーザーが得られる権利（例：`premium` Entitlement = Pro 権限）
  - Offering：販売メニューの集合
  - Restore（復元）：過去購入の復元

### Paywall

- 定義：Pro 機能利用時に表示する課金誘導画面（S-04）

### Champion 方式（Pocket Casts Champion Mode）

- 定義：Lifetime 買切購入後、Paywall や設定画面でサブスクリプション (月額 / 年額) の表示を抑止する UI 制御方式
- 出典：Pocket Casts のライフタイム会員 (Champion) 制度を参考に採用
- 採用箇所：`src/features/pro/championMode.ts` (`shouldHideSubscriptions` 純関数)、PaywallScreen 上部 Champion バナー、Settings 3 状態表示
- 関連：ADR-0009 §61-67、AC3-1 / AC3-2 / AC3-4
- 動機：シニアペルソナ (高橋さん 62 歳) 向けに「もう買ったのに購入を促される」UX を完全排除する

### Notion 方式データ保護（Notion Plan Downgrade Pattern）

- 定義：Pro 加入中に作成したデータ (例: 写真 4 枚目以降) を Free 戻り後も閲覧可能とし、新規追加のみ Free 制限を適用する方式
- 出典：Notion の Plan Downgrade Policy を参考に採用
- 採用箇所：F-08 写真管理 (`canAddPhoto` の制限ロジック)、ADR-0009 §74-78
- 関連：ADR-0009 §74-78、AC6-1 / AC6-2 / AC6-3
- 動機：Pro → Free に戻ったユーザーの既存データを失わせず、ストアレビューの「データ消失」苦情を構造で防ぐ

### Pro メンバー (買切)

- 定義：Lifetime 買切 (`bonsailog_pro_lifetime`) を購入済の Pro 状態。Settings / Paywall 上で「Pro メンバー (買切)」と表示される
- i18n キー：`settingsAccountProLifetimeTitle` / `paywallChampionBannerTitle`
- 関連：ADR-0009 §69-72、Champion 方式

### Pro メンバー (年額・期限まで)

- 定義：月額 (`bonsailog_pro_monthly`) または年額 (`bonsailog_pro_yearly`) サブスクリプション加入済の Pro 状態。Settings / Paywall で「Pro メンバー」と表示される
- i18n キー：`settingsAccountProActive`
- 関連：ADR-0009 §69-72

### AdMob

- 定義：広告配信プラットフォーム（Google）
- 用語：
  - Banner（バナー）：画面の一部に表示される広告
  - Adaptive Banner（アダプティブバナー）：画面幅に応じてサイズが変わるバナー
  - Test Ad Unit（テスト広告ユニット）：開発中に使う“ダミー広告 ID”
  - UMP（User Messaging Platform）：GDPR / CCPA 同意取得
- 注意：
  - 本番広告ユニット ID をソースに直書きしない
  - 開発中は必ずテスト広告ユニットを使う
  - 全画面広告（インタースティシャル）/ リワード広告は **採用しない**（constraints §2-1）

---

## 4. 画面 / UI 用語（UI 仕様で迷わないための言葉）

### 画面（Screen）

- 定義：ユーザーが見る UI の単位。画面 ID（S-xx）で表す

### コンポーネント（Component）

- 定義：UI 部品のかたまり（ボタン、カード、行、モーダル等）。再利用できる単位

### FAB（Floating Action Button）

- 定義：画面の右下などに浮いた主要アクションボタン（例：＋）

### トースト（Toast）

- 定義：数 秒で消える軽い通知。操作を強制しない

### ダイアログ / アラート（Dialog / Alert）

- 定義：ユーザーの確認が必要なポップアップ（OK / キャンセル等）
- 注：UI 文言で「アラート」「警告」を使わない（医療的ニュアンス回避、§7-2）

### オーバーレイ（Overlay）

- 定義：画面の上に重ねて説明や強調を出す UI（初回チュートリアル等）

### ロック表示（Locked）

- 定義：Free では使えない項目を「鍵」などで見せ、Pro へ誘導する表現

### ダークモード / 屋外モード

- ダークモード：通常の暗色テーマ
- 屋外モード：高輝度モード（直射日光下での視認性向上、F-15）

### ヒートマップ / Skia / Skia Atlas / ColorBrewer / 凡例 / 達成率 / Apple Health 風 BottomSheet — 撤廃 (ADR-0039、 2026-05-22)

F-04 水やり履歴の可視化機能 (ヒートマップ + 関連 UI / Skia 描画 / Apple Health 風 BottomSheet) は ADR-0039 で完全撤廃。 詳細は [ADR-0039](../adr/ADR-0039-watering-heatmap-removal.md) を参照。 維持: 「最後の水やりから X 日」 テキストのみ (下記)。

### 「最後から X 日」（Days Since Watering）

- 定義：最後の水やり日からの経過日数を大きく表示（24-28pt Bold、AAA 7:1）
- しきい値:
  - 0 件: 「まだ記録がありません」
  - 0 日: 「今日、水やりしました」
  - 1-30 日: 「最後の水やりから X 日」（28pt Bold）
  - 31-365 日: 「最後の水やりから X 日」（24pt Regular、`#4A4A4A`）
  - 365 日超: 「最後の水やりから 1 年以上」
- 集約モード（stats タブ）では非表示（ADR-0013 §X1）

### 当日まとめ通知（Daily Summary Notification）

- 定義：毎日朝 X 時 (デフォルト 07:00) に発火する 1 件の通知。当日の F-02 planned events を集計し「N 件の作業予定があります」と配信（ADR-0014）
- ライブラリ: expo-notifications DATE trigger
- タップ後遷移: 作業予定カレンダー (S-08) 当日選択状態
- 0 件の日: 通知発火しない（キャンセル）

### 水やり繰り返し通知（Watering Daily Notification）

- 定義：毎日同じ時刻に発火する繰り返し通知。本文「水やりの時間です」（ADR-0014）
- ライブラリ: expo-notifications DAILY trigger
- 1 日 1〜5 回まで設定可、各時刻独立
- 全盆栽共通（個別盆栽の水やり時刻は持たない）

### 7 日ローリング予約（7-Day Rolling Schedule）

- 定義：当日 + 6 日先までの当日まとめ通知を予約し続ける方式（ADR-0014）
- 再予約タイミング: アプリ起動時のみ (R2、シンプル原則)
- メモリ消費: 最大 7 件 + 水やり 5 件 = 12 件（約 1.2KB）
- iOS 64 件上限の 1/5 で余裕、enforceIosLimit ロジック不要

### DAILY trigger / DATE trigger

- DAILY trigger: 毎日同じ時刻に発火する繰り返し通知（expo-notifications）。水やり通知で使用
- DATE trigger: 特定日時に 1 回発火する通知。当日まとめ通知で使用

### iOS 64 件上限

- 定義：iPhone は 1 アプリにつき pending 通知を最大 64 件保持可能（Apple OS 仕様）
- 64 件超過: OS が古い順に自動削除
- BonsaiLog 対応: 7 日ローリング + 水やり 5 件で最大 12 件 → 構造的に解消（ADR-0014）

### Notification Channel（Android 8+）

- 定義：通知のカテゴリ分け仕組み。ユーザーがカテゴリ別に音/振動/ON/OFF を変更可能
- BonsaiLog の 2 チャネル: `WATERING`（水やり）/ `DAILY_SUMMARY`（当日まとめ）
- importance: 全 DEFAULT（heads-up なし、控えめ）
- 作成後の importance 変更不可（delete + recreate のみ）

### interruption level（iOS 通知優先度）

- `.passive`: サイレント（通知センターのみ）
- `.active`（BonsaiLog 採用）: 通常通知、Focus / DnD でブロックされる
- `.timeSensitive`: Focus 突破（entitlement 申請必須、不採用）
- `.critical`: 緊急（Apple 個別承認、医療/防災用、不採用）

### Doze モード（Android）

- 定義：画面 OFF + 静止 + 充電なし状態で発動する省電力モード
- 通知遅延: 最大 15 分（許容範囲、ADR-0014）

### SCHEDULE_EXACT_ALARM（Android 14+）

- 定義：分単位精度の通知予約に必要な権限、デフォルト deny
- BonsaiLog: 要求しない（inexact alarm で十分、 シニア向け「介入しない」 哲学整合、 ADR-0011）

### 現地時刻自動切替（Local Time Auto-switch）

- 定義：海外旅行で TZ 変更時、通知を現地時刻基準に自動再予約（ADR-0014 B1）
- 取得方法: `Intl.DateTimeFormat().resolvedOptions().timeZone` で TZ 検出
- ADR-0008 datetime ラッパー `getTzIana()` を流用
- アプリ起動時に再予約（R2）

### 作業予定カレンダー（S-08、Calendar Screen）

- 定義：月単位で全作業予定 + 実績を表示する独立画面（ADR-0014）
- 画面 ID: S-08
- 配置: F-02 タイムラインタブから push（タブバー追加なし、4 タブ維持）
- 通知タップ後の遷移先（当日選択状態で開く）
- 構造: 月単位カレンダー + dot 件数表現（1=`•`、2=`••`、3+=`•••`）+ 当日選択時に下部リスト表示

### Step 5 通知（Onboarding Step 5）

- 定義：オンボーディング 5 ステップの最終 Step、通知設定（ADR-0014、ADR-0011 で 4 → 5 拡張）
- アイコン: 🔔 ベル
- タイトル: 「通知で水やりを忘れない」
- メインボタン「通知を有効にする」 → OS 許可リクエスト → Step 5-B 水やり時刻設定
- サブリンク「あとで」 → 通知 OFF 状態で完了
- スキップ時のデフォルト: 通知マスタートグル OFF（K1）

### 装着期間アプリ内表示（Wiring Period In-App Display）

- 定義：針金がけ日からの経過時間を盆栽詳細 → 針金一覧で表示（ADR-0014、旧装着期間経過通知の代替）
- 表示: 「装着期間: X 週 Y 日 (経過済 / あと N 週 / 完了)」
- 通知発火なし: ユーザーが自発的にアプリを開いて確認

### Vacation モード（不採用）

- 旅行中の通知一時停止機能（Habitify が代表）
- BonsaiLog: 採用しない（V3）、OS 標準 Settings の通知 OFF で代替（ADR-0014）

### snippet 関数（FTS5）

- 定義：FTS5 のマッチ部分を `<b>` 等のタグで強調する SQL 関数（ADR-0008 / functional_spec §14）
- 例: `snippet(events_fts, 0, '<b>', '</b>', '...', 8)` で「水やり」マッチ時に「`<b>水やり</b>` をした」が返る
- F-09 検索結果のハイライト表示で使用

### NFC 正規化（Unicode Normalization Form C）

- 定義：Unicode 文字を「同じ意味なら同じバイト列」に揃える正規化方式
- 例: `が` を 1 文字 (U+304C) vs 2 文字 (U+304B + U+3099) で表現可能 → NFC で統一
- F-09 タグ重複防止に使用 (`name.toLowerCase().normalize('NFC')`)

### name_normalized（タグ重複防止列）

- 定義：tags テーブルの正規化済タグ名列（ADR-0008 §12）
- 計算式: `name_normalized = name.toLowerCase().normalize('NFC')`
- UNIQUE 制約で SQL レベル重複防止（case-insensitive + NFC）
- 業界標準 (Bear / Things / Notion)

### detail オプション（FTS5）

- 定義：FTS5 インデックスの詳細度設定 (`full` / `column` / `none` の 3 段階)
- BonsaiLog 採用: **detail=column** (容量 54% 削減 + column filter 維持、ADR-0008 §10)
- detail=none は容量最小だが「植え替え」等の 3 文字超 token MATCH が不可になる罠あり、不採用

### 3 段組み検索結果表示（Multi-Section Search Result）

- 定義：F-09 検索結果を「盆栽名 N 件 / 樹種名 N 件 / メモ N 件」の 3 セクションに分割表示（functional_spec §14.3.2）
- Things 3 / Apple Notes 業界標準
- 0 件のセクションは非表示（動的に表示数変化、SE1）

### 最近使われた 3 タグ候補チップ

- 定義：盆栽編集画面で「タグを追加」入力欄上部に直近 30 日 INSERT 上位 3 タグをチップ表示
- タップで即追加（Bear / Things 業界標準、G1 採用）
- ライトユーザー (タグ 0 件) は非表示

### Material 3 baseline（ダークモード背景 #121212）

- 定義：Google Material Design 3 が定める「ダークモード推奨背景色」(ADR-0015 BD1)
- 純黒 #000000 ではなく濃灰 #121212 を採用する理由: shadow が見える + light text 上の eye strain 軽減
- BonsaiLog 採用: dark theme background = #121212、surface = #1E1E1E (+1 elevation) / #242424 (+2)

### monochromatic palette（単色濃淡配色）

- 定義：1 色相の明度濃淡だけで階調を表現する配色方式
- BonsaiLog 採用: F-15 屋外モード accent (緑単色 #1B5E20)
- 利点: 色覚異常者 (P 型/D 型 = 日本男性 4-6.5%) も識別可、老眼者の青-紫弁別困難回避 (ADR-0015 OC1)

### userInterfaceStyle（Expo / iOS）

- 定義：アプリ全体のテーマモード設定。`automatic` / `light` / `dark` の 3 値
- BonsaiLog 採用: `automatic` (OS 設定追従、ADR-0015 SP1)
- 設定場所: app.config.ts

### useColorScheme（React Native）

- 定義：OS のダークモード設定を読む React Native 標準フック
- 戻り値: `'light' | 'dark' | null`
- null フォールバック: BonsaiLog は **light** (シニア初見「真っ暗 = 故障?」回避、ADR-0015 IM1-A)

### DynamicColorIOS（React Native iOS 専用）

- 定義：iOS で「light 時 #FFF、dark 時 #000」のように動的に色を変える API
- BonsaiLog 採用: 通常モードのみ、Outdoor モードは独自 (OS スコープ外)

### OLED 焼き付き

- 定義：OLED ディスプレイで「同じ画面を長時間表示すると残像が残る」問題
- 純黒 #000000 は省電力だが薄黒は焼き付きリスク低 (両論あり)
- BonsaiLog dark theme は Material 3 baseline #121212 採用 (ADR-0015 BD1、純黒/独自値撤回)

### Reduced Motion

- 定義：iOS / Android の「動きを減らす」アクセシビリティ設定 (アニメ酔い対策)
- BonsaiLog: ON 時にテーマ切替アニメ 0ms (A1)
- 検知: `useReducedMotion()` (react-native-reanimated)

### surface elevation（Material 3）

- 定義：UI レイヤの「高さ」を表現する surface トークン階層
- Material 3 推奨: surface (基本) / surface +1 / +2 / +3 / +4 / +5 で elevation 増
- BonsaiLog dark theme: surface = #1E1E1E (+1) / surface2 = #242424 (+2) を採用 (ADR-0015)

### bonsai\_\* プレフィクス（テーマトークン命名）

- 定義：標準キー (background / color 等) と独自トークン (例: `bonsai_today_border`) を区別するプレフィクス
- 注: Tamagui 撤去 (ADR-0015 Amendment 2026-05-30) 後は `src/core/theme/colors.ts` の plain hex マップで管理。 トークン命名規約は `docs/reference/design_system.md` §6 を参照

### 直 hex 禁止ルール（ESLint）

- 定義：JSX 内の `color` / `backgroundColor` / `borderColor` プロパティに直 hex (`#xxx`) を禁止
- 強制: `useColors()` hook 経由のみ (ADR-0015 Amendment)
- 例外: `src/core/theme/colors.ts` 内の hex 定義のみ許可
- 目的: テーマ追加時の漏れ検出、構造的品質保護

### BOM (Byte Order Mark)

- 定義：UTF-8 ファイルの先頭 3 バイト `﻿` (`0xEF 0xBB 0xBF`)、文字コード判定の目印
- BonsaiLog F-10 採用: CSV ファイルに必須 (Excel 日本語版が UTF-8 と判定するため、ADR-0016)
- BOM なしだと Excel が Shift_JIS と誤判定 → 日本語が文字化け

### RFC 4180

- 定義：CSV (Comma-Separated Values) の国際規格 (IETF 標準)
- BonsaiLog 採用 (ADR-0016):
  - フィールド区切り: `,`
  - レコード終端: CRLF (`\r\n`)
  - quote escape: `,` / `"` / 改行を含むフィールドは `"..."` で囲む、内部 `"` は `""` 2 連
- MIME type: `text/csv` (RFC 4180 §3 IANA 登録)

### CRLF (`\r\n`)

- 定義：Windows 標準改行コード (Carriage Return + Line Feed)
- RFC 4180 で CSV 改行コードに規定
- BonsaiLog F-10 採用 (Q18 LB1、ADR-0016)

### WKWebView 制約 (iOS)

- 定義：iOS の標準ブラウザエンジン WKWebView は `<img src="file://path/to/photo.jpg" />` のローカルパス読み込み**不可** (Issue #1308)
- 回避策: 写真を base64 化して `<img src="data:image/jpeg;base64,..." />` で HTML に inline (ADR-0016 Q1 W1)
- BonsaiLog F-10 PDF 生成で必須対応

### SAF (StorageAccessFramework)

- 定義：Android 4.4+ のファイルストレージアクセス API、ユーザーが保存場所 (Drive / Local / Dropbox 等) を選択
- BonsaiLog F-10 採用 (Q15 SAF1、ADR-0016): Android のみ SAF、iOS は Share Sheet
- API: `LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()` + `createFileAsync()`

### 3 段階フォールバック (PDF 生成)

- 定義：F-10 PDF 生成時に OOM / blank PDF / hang 検出時に自動で品質を落として再試行する仕組み (Repolog 流用、ADR-0016 Q11 FB1)
- attempt 1: full quality (system fonts、画像 1200/1600px @ 0.80)
- attempt 2: reduced images (system fonts、画像縮小)
- attempt 3: tiny images (system fonts、最小画像)
- fallback cooldown 300ms (native heap 解放待ち)

### PdfHangError / PdfStorageLowError / BlankPdfError

- 定義：F-10 PDF 生成のカスタムエラー (Repolog 流用、ADR-0016)
- `PdfHangError`: `printToFileAsync` が指定タイムアウト内に応答しない (Promise.race timeout)
- `PdfStorageLowError`: 端末空き容量 100MB 未満 (フォールバック不可、即時エラー)
- `BlankPdfError`: 生成された PDF が 1024 byte 未満 (Android Chromium 印刷エンジンの silent failure)

### Forbidden chars (ファイル名)

- 定義：Windows ファイル名で使用禁止の文字 `[\/\\:*?"<>|]`
- BonsaiLog F-10 採用 (Q14 NM3、Repolog 流用): `_` に自動置換、連続 `_` を 1 つに圧縮、端の `_` を除去
- Microsoft 公式 docs に基づく

### page-break-after / -webkit-page-break-after

- 定義：CSS の改ページ指示。WebKit (iOS Safari / WKWebView) は `-webkit-` プレフィクス必須 (Issue #8843)
- BonsaiLog F-10 採用 (Q2、ADR-0016): 両方併記必須
  ```css
  page-break-after: always;
  -webkit-page-break-after: always;
  ```

### data URI (data:image/jpeg;base64,...)

- 定義：画像をテキスト化 (base64 エンコード) して HTML に inline する形式
- BonsaiLog F-10 採用 (Q1 W1): iOS WKWebView の file:// パス制約回避
- expo-image-manipulator で 800×800 px / JPEG quality 75 にリサイズ後 base64 化

### cacheDirectory (一時保存場所)

- 定義：expo-file-system の `Paths.cache` (`cacheDirectory`)、OS が任意のタイミングで削除可能な一時保存場所
- BonsaiLog F-10 採用: PDF / CSV を一時生成 → Share Sheet → `file.delete()` で後始末 (Q7、ADR-0016)
- ADR-0007 (F-11) と同思想 (cacheDirectory + Share Sheet + 後始末)

### data portability (データポータビリティ)

- 定義：ユーザーが自分のデータを別の形式 / 別のサービスに持ち出せる権利・仕組み
- BonsaiLog F-10 のキャッチ「あなたの記録を、あなたの手元へ。」(Design 参考)
- GDPR / 業界標準で重視される概念

---

## 5. 多言語 / i18n 用語（翻訳・表記ゆれ対策）

### i18n

- 定義：internationalization（国際化）。多言語対応の仕組み全体

### ローカライズ（l10n）

- 定義：localization（地域化）。翻訳文言や文化的差異を調整する作業

### i18n キー

- 定義：翻訳文言を参照するためのキー（例：`home.title`）
- ルール：画面名 + 用途で構成し、ハードコード文字列は原則禁止

### 言語コード（Language Code）

- 定義：言語を表す短いコード。BCP47 / IANA のサブタグを正とする
- 例：`nl` は Dutch（オランダ語）、`zh-Hans` は簡体字、`zh-Hant` は繁体字
- 本プロジェクトでの決定：constraints §3-2 を正

### LTR / RTL

- LTR：Left-to-Right（左→右）。英語 / 日本語など
- RTL：Right-to-Left（右→左）。アラビア語など
- 本プロジェクト方針：**LTR のみ**（RTL は非対応、constraints §4 非ゴール）

### 翻訳禁止語（盆栽ドメイン）

以下は日本語音訳をそのまま 19 言語で使う（翻訳しない）:

- `bonsai`（盆栽）
- `yamadori`（山採り）
- `shohin`（小品）
- `akadama`（赤玉土）
- `kanuma`（鹿沼土）
- `kokedama`（苔玉）
- `Chokkan` / `Moyogi` / `Shakan` / `Kengai` / `Han-Kengai` / `Bunjin` / `Sokan`（樹形スタイル）

---

## 6. 保存 / データ / セキュリティ用語

### ローカル志向（Local-first）

- 定義：データを端末内に保存し、基本はクラウド同期しない設計方針

### SQLite

- 定義：端末内 DB。ドメインエンティティ（bonsai / events / photos / reminders / tags 等）を保存
- 起動時に `PRAGMA foreign_keys = ON` を必ず有効化（constraints §1-2）

### AsyncStorage

- 定義：軽量な key-value ストレージ。Settings / ProState / locale 上書き / リマインダー履歴（直近 20 件）など参照頻度の高いデータ用
- 関連：constraints §1-2

### SecureStore

- 定義：OS の暗号化ストレージ。秘匿性の高い小さなデータ（必要時のみ使用）

### 秘密情報（Secrets）

- 定義：API キー、広告ユニット ID 等の漏洩すると危険な情報
- ルール：ソース直書き禁止。環境変数や設定注入で扱う

### PII（個人特定情報）

- 定義：個人が特定できる情報（氏名 / メール / 住所 / 電話 / 正確な GPS 座標）
- ルール：取得しない、ログに出さない、保存しない（constraints §1-3）

### IANA timezone

- 定義：タイムゾーン識別子（例：`Asia/Tokyo`、`America/New_York`）
- 関連：作業日時の保存（constraints §1-2 の `tz_offset_min`）

---

## 7. 禁止語 / 許可語（医療的・命令的表現の排除）

### 7-1. 「診断しない、記録する」原則

BonsaiLog は **台帳**（記録するもの）であり、**判定するもの**ではない（constraints §1-4）。

### 7-2. 禁止語（CI で検出して落とす）

UI 文言・コード内コメント・i18n キー値で以下を使わない:

| 禁止語   | 理由                         | 代替（許可語）           |
| -------- | ---------------------------- | ------------------------ |
| 診断     | 医療的判定を匂わせる         | 記録、参考、目安         |
| 判定     | AI 判定機能を期待させる      | 記録、整理               |
| 推奨     | 命令的・医療的               | 参考、目安、テンプレート |
| べき     | 命令的                       | できます、おすすめ       |
| 危険     | 医療的・治療的               | 注意、目安               |
| 病気     | 医療的                       | 状態、変化               |
| 治療     | 医療的                       | 対処、ケア               |
| reminder | 命令的（catalog の例外あり） | notification, schedule   |
| tracker  | 監視的ニュアンス             | log, journal, record     |
| alert    | 警告的・医療的               | notification             |

> `pnpm i18n:audit` で全 locale を grep して落とす（CI 統合）。

### 7-3. 許可語（推奨）

- 記録 / 履歴 / 整理 / 参考 / 目安 / テンプレート / 台帳
- log / journal / record / note / schedule / library

---

## 8. 実装 / アーキテクチャ用語（会話を揃える）

### Store（状態管理）

- 定義：UI を動かすための状態のまとまり（例：設定、Pro 状態、盆栽一覧、リマインダー一覧）
- 実装：zustand を採用

### Repository（データ層）

- 定義：DB / 保存先への読み書きをまとめた層。UI から直接 SQL を書かないための境界
- 例：`bonsaiRepository` / `eventRepository` / `photoRepository`

### Service（サービス層）

- 定義：複数の処理を束ねる“業務ロジック寄り”の層
- 例：`backupService` / `reminderDistributionService` / `migrationService`

### 型（Type）

- 定義：TypeScript の型。データ構造の契約（間違いをコンパイル時に検出する）

---

## 9. テスト / 品質用語

### 受け入れ条件（Acceptance Criteria / AC）

- 定義：その Issue / 機能が「合格」と言える条件
- 重要：曖昧な文章ではなく、できればテスト（自動 / 手動）で判定できる形にする

### ユニットテスト（Unit Test）

- 定義：小さな関数 / モジュール単位のテスト。Jest などで自動化しやすい

### E2E テスト（End-to-End）

- 定義：起動〜操作〜結果までを“実際のアプリ操作”で確認するテスト

### Jest

- 定義：JavaScript / TypeScript のテストランナー。ロジックの自動テストに使う

### Maestro

- 定義：モバイルアプリを自動操作する E2E ツール。手順（フロー）をシナリオ化できる

### シナリオ（Scenario-xx）

- 定義：E2E で自動化する“ユーザーストーリー”単位のフロー

### 手動テスト前提機能

- 定義：自動化困難な機能（例：F-11 の 2 端末 + クロス OS 転送）。Issue / PR で「手動 E2E 必須」を明示

---

## 10. 開発運用 / GitHub 用語（docs-as-code の土台）

### docs-as-code

- 定義：ドキュメントをコード同様に Git / PR / CI で扱い、差分とレビューで品質を担保するやり方

### CI（継続的インテグレーション）

- 定義：push / PR をトリガーにテスト等を自動実行し、壊れていないことを担保する仕組み
- 本プロジェクトの 5 ゲート：lint / type-check / test / i18n:check / config:check

### PR（Pull Request）

- 定義：変更を取り込む前にレビューする仕組み。説明・影響範囲・テスト結果を書く

### Done 条件（Definition of Done / DoD）

- 定義：「このタスクは終わった」と言えるチェック項目のセット
- 例：テストが通る、該当 docs が更新されている、など

### ブランチ保護（Branch Protection）

- 定義：main 等へのマージ前に「必須チェック合格」や「レビュー必須」を強制する設定

### CODEOWNERS

- 定義：特定のパス（例：docs/）の“担当者”を指定し、その人のレビューを要求できる仕組み

### Conventional Commits

- 定義：コミットメッセージの形式（例：`feat:` `fix:` `refactor:`）
- 目的：履歴を読みやすくし、変更内容が一目で分かるようにする

---

## 11. 表記ルール（表記ゆれ対策）

### 盆栽ドメインの表記

- 正：**盆栽**（コードは `bonsai`、UI は ja `盆栽` / en `bonsai`）
- 正：**作業**（コードは `event`、ID 文脈では `event_type`）
- 正：**写真**（画像 / サムネイルと書かない）
- 正：**リマインダー**（通知 / アラート / 警告と書かない）
- 正：**タグ**（ラベルと書かない、constraints §F-09）
- 正：**樹種**（コードは `species`）
- 正：**樹形スタイル**（コードは `style`、日本語音訳維持）

### 一般

- 正：**受け入れ条件**（AC）
- 正：**Free / Pro**（無料 / 有料でも可だが、仕様 / 実装は Free / Pro を優先）
- 正：**i18n キー**（翻訳キーと書かない）
- 正：**お引っ越し機能**（バックアップ / 復元 / Device Migration を併記可、ただし正は「お引っ越し機能」）

### ストアテキスト例（参考）

- 正：盆栽一覧 / 作業履歴 / リマインダー
- 誤：習慣一覧 / タスク履歴 / アラート（テンプレ残骸表現を使わない）

---

## 12. 追加したい用語が出たら（テンプレ）

以下をコピペして追記してください。

### 用語名（日本語 / English）

- 定義：
- 同義語：
- 禁止語：
- 使う場面：
- 例：
- 関連（F-xx / S-xx / UC-xx / TC-xx / ADR）：

---

## 13. 定期予定 (Recurring Schedule、 Sess78 ADR-0056 由来)

Sess78 (2026-06-08) で ADR-0056 起票時に 追加された用語群。 RFC 5545 RRULE 業界標準に準拠。

### 定期予定 / Recurring Schedule

- 定義: 「毎週月曜に水やり」 のような繰り返し予定。 1 件のルールから 複数の `planned` events が自動生成される
- 同義語: 繰り返し予定 / Recurring event / Recurring task
- 禁止語: 自動推奨 (= AI 判断の意味、 ADR-0011 哲学違反) / Reminder (= 通知系の用語と混同)
- 使う場面: 予定タブ FAB → 種別/盆栽選択 → 🔁 繰り返し toggle → 6 preset 選択
- 例: 「黒松に毎週月曜 水やり (1 年後まで)」 = 1 ルールで 52 件の planned events 生成
- 関連: F-02 (作業履歴) / S-08 (予定タブ) / ADR-0008 (events) / ADR-0056 (本機能 SoT)

### recurrence_rule

- 定義: DB 上の `recurrence_rules` テーブル 1 行。 id (ULID) / bonsai_id / event_type / rrule (RFC 5545 文字列) / start_at_utc / end_at_utc / exdates / deleted_at で 構成
- 同義語: ルール / RRULE row
- 禁止語: スケジュール (= 曖昧、 「予定」 か 「ルール」 か 区別不能)
- 使う場面: コード/Issue/PR で 「定期予定」 機能のデータ実体を指す
- 例: `recurrenceRuleRepository.createRecurrenceRule({...})` で 1 行 insert
- 関連: ADR-0056 D2 (schema 定義) / `src/db/recurrenceRuleRepository.ts` (新規 Sess78 PR-3)

### RRULE / Recurrence Rule String

- 定義: RFC 5545 で 定義された 繰り返しルール文字列。 例 `FREQ=WEEKLY;BYDAY=MO`、 `FREQ=MONTHLY;BYMONTHDAY=15`
- 同義語: RFC 5545 RRULE / iCalendar RRULE
- 使う場面: `recurrence_rules.rrule` 列値、 `rrule` npm lib (jakubroztocil/rrule) で展開
- 例: `FREQ=DAILY` (毎日) / `FREQ=WEEKLY;BYDAY=MO,WE,FR` (月水金) / `FREQ=MONTHLY;INTERVAL=3` (3 ヶ月ごと)
- 関連: ADR-0056 D2 / [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10) / [rrule npm lib](https://github.com/jakubroztocil/rrule)

### EXDATE / 例外日

- 定義: recurrence_rule の `exdates` 列 (JSON array of YYYY-MM-DD)。 「この 1 件だけ skip」 操作で 該当日が追加される
- 同義語: 例外日 / exception date
- 使う場面: ⋮ 編集 dialog 「この 1 件だけ削除」 で exdates に追加 + 該当 event soft-delete
- 例: `["2026-06-22", "2026-07-13"]` (この 2 日は recurring 由来 events 生成しない)
- 関連: ADR-0056 D6 (3 択 dialog 'this' scope) / RFC 5545 EXDATE 仕様

### detached event / 切り離し event

- 定義: recurring 由来 event が個別編集された結果、 元 rule から「切り離された」 event。 `events.recurrence_rule_id` を NULL にする + 編集内容で update
- 同義語: 単独化された event
- 使う場面: ⋮ 編集 dialog 「この 1 件だけ編集」 (= 'this' scope) を 「skip + 個別 event 化」 として実装する選択肢の用語
- 例: 6/22 の水やり予定を 個別に「メモ追加」 編集 → recurrence_rule_id を NULL に + メモ update、 元 rule の exdates に 6/22 追加
- 関連: ADR-0056 D6 / Google Calendar API recurringEventId pattern
- 正（どこが真実？）：
