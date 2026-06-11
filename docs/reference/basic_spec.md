# 基本仕様書（BonsaiLog / 盆栽手帳）

> Diátaxis: Reference（事実 / 何ができるかを最小粒度で固定）

- **Doc Type**: Reference（Diátaxis）
- **対象**: 実装者 / レビュア / テスト設計 / 将来の運用者
- **目的**: 「BonsaiLog が何をするか」をズレにくい粒度で"正"として置く（= 実装・テスト・運用の共通言語）
- **正（Source of Truth）**:
  - 依存関係 / SDK / バージョン: `package.json`（本書に固定記載しない）
  - 受け入れ条件（合否）: Jest テスト（`__tests__/` 配下）+ Maestro E2E（`maestro/flows/`）
  - UI の正: design_system.md + docs/mockups/（ADR が正、R-16。本書に UI 細部を書きすぎない）
  - 意思決定の理由: ADR（`docs/adr/`）
  - 前提 / 制約の一枚岩: `docs/reference/constraints.md`
- **更新トリガ**: 仕様変更 PR で「本書 or テスト or ADR」のどれを更新したか説明できない場合は NG

---

## 序章：この文書は何か（小中学生にもわかる説明）

この文書は **「BonsaiLog アプリが何をできて何をできないかを、誰が読んでも同じに理解できるように書いた説明書」** です。

- 作る人（エンジニア）の「実装のものさし」
- チェックする人（レビュア）の「合格判定の基準」
- テストを書く人（QA）の「テストすべき対象のリスト」
- 5 年後のメンバーの「なぜこの機能があるんだっけ？の辞書」

書くのは「何が起きるか」の事実だけ。「なぜそうしたか」「どう実装するか」は別の場所（ADR や実装コード）にあります。

---

## 1. プロダクト概要

### 1.1 一言で

**BonsaiLog** は、**樹種 × 作業履歴を、鉢 1 本ずつ一生分記録する、オフライン完結の盆栽台帳**モバイルアプリ。

### 1.2 コア価値（不変条件）

1. **提供価値**: ユーザーは 1 本 1 本の盆栽の樹種・購入日・作業履歴・写真を永続記録できる。AI による推奨や判定は行わず、ユーザー自身の判断を記録する台帳として機能する。
2. **データ**: 基本は**完全オフラインで成立**する（ネットワークは課金・広告のためだけに使う）。
3. **プライバシー**: 個人情報（氏名・メール・住所）を取得しない。データは端末ローカルのみ。
4. **AI 非搭載**: ユーザーの盆栽に対して AI が診断・同定・提案を**しない**（医療類似リスク回避と差別化のため）。
5. **多言語**: 19 言語で文字化け / レイアウト崩れがない。
6. **世代継承可能**: 端末買い替え・将来のユーザーへの引き継ぎを想定した記録形式。

### 1.3 想定ユースケース

- **U-A（高橋さん 62 歳・日本）**: 父から継承した盆栽 25 本の作業履歴を鉢の前で 1 タップ記録、自分で計画した予定をタイムラインで管理する。
- **U-B（Marcus 35 歳・米国ポートランド）**: 屋内盆栽 6 本の写真を時系列で管理し、 個別 PDF レポートで Instagram 投稿用に書き出す。 針金がけ日から外し時期が自動表示される。
- **U-C（盆栽園スタッフ）**: 顧客樹の作業履歴を記録し、PDF で紙の記録として出力する。

### 1.4 スコープ（v1 / 将来）

#### v1（MVP）

- **F-01 盆栽の登録・管理**
- **F-02 作業履歴記録**（「最後の水やりから N 日」 テキスト表示を含む、 ADR-0039）
- **F-07 針金がけ記録・外し時期表示**
- **F-08 写真管理**
- **F-09 検索・タグ**
- **F-10 エクスポート（CSV / PDF）**
- **F-11 お引っ越し機能（デバイス移行）**
- **F-12 多言語対応（19 言語）**
- **F-13 課金（サブスク月額 / 年額 + 買切）**
- **F-14 Home 下部バナー広告（Free のみ）**
- **F-15 ダークモード / 屋外モード**
- **F-16 ローカル通知**
- **F-17 作業カレンダー**（予定 + 記録の月次表示、 PlanScreen 統合カレンダー）
- ローカル保存（SQLite + AsyncStorage + SecureStore）

#### 将来（v1 では含めない。明確に除外する）

- **クラウド同期 / アカウント / ログイン**（理由: 完全ローカルを価値とするため）
- **ユーザー間通信 / コミュニティ / チャット**（理由: 個人情報・投稿モデレーション・訴訟リスク）
- **AI 画像同定 / AI 診断 / AI ケア提案**（理由: 医療類似リスク、誤同定で枯死責任転嫁リスク）
- **病害虫診断 / 農薬推奨**（理由: 医療類似、農薬取締法）
- **販売マーケットプレイス / 盆栽売買**（理由: 商取引・古物営業法）
- **リアルタイム通信 / ライブ配信**
- **温湿度センサー直結制御**（読み取りインポートは v1.1+ 検討）
- **SNS への直接投稿ボタン**（画像エクスポート経由に限定）
- **リワード広告 / インタースティシャル広告 / 全画面動画広告**（理由: UX 毀損、継続率低下）
- **RTL 完全対応（アラビア語・ヒブライ語・ペルシャ語）**（v1.3+ で対応）
- **ホームウィジェット / Apple Watch / Wear OS**
- **継承モード（前世代記録と自記録の接続）**（v1.1+ で対応、v1 はデータ構造だけ用意）
- **盆栽の家系図（挿し木系譜）**（v1.1+ で対応）
- **展示会出品機能**（PDF 出力のみ v1、管理機能は v2+）

---

## 2. 用語

用語の定義は本節とコード（`src/db/schema.ts` の EVENT_TYPES ほか）を正とする。

- **盆栽 (Bonsai)**: アプリで管理する樹木 1 本。写真・作業履歴・メモを持つ親エンティティ。
- **樹種 (Species)**: 黒松・真柏・Ficus retusa など。学名を主キー、各言語の通称を副項目として持つ。
- **作業 (Event / Care Event)**: 水やり・剪定・針金がけ・植替え・施肥・葉刈りなど 14 種の記録単位（SoT は `src/db/schema.ts` EVENT_TYPES）。1 つの盆栽に時系列で紐付く。
- **通知 (Notification)**: 作業予定のローカル通知（F-16、ADR-0014）。**ユーザー手動設定のみ**で生成される（"reminder" は禁止語 = constraints §5-2）。
- **お引っ越し (Device Migration)**: 旧端末から新端末へ全データ（DB + 写真）を ZIP + Share Sheet で転送する機能（暗号化なし、ADR-0007）。
- **Pro（プレミアム）**: 課金済みの状態。`premium` Entitlement で識別。
- **樹形スタイル (Style)**: Chokkan（直幹）/ Moyogi（模様木）/ Shakan（斜幹）/ Kengai（懸崖）等の分類。
- **継承モード (Inheritance Mode)**: 先代の盆栽作業履歴を自記録と接続表示する機能（v1.1+）。

---

## 3. 対応プラットフォーム

- **iOS**: 15.1 以上（Expo SDK 55 要件）
- **Android**: Expo SDK 55 の要件に従う（正は Expo 公式 + `package.json`）
- **Xcode**: 26 以上（開発・ビルドに必須）
- **Node.js**: 22.0.0 以上（`engines.node` に固定）
- **パッケージマネージャ**: pnpm 10.23.0

### 3.1 New Architecture のみ対応

- React Native の Legacy Architecture は Expo SDK 55 で**完全廃止**。New Architecture（Fabric / TurboModules）が強制適用。Legacy 前提のサードパーティ依存を追加してはいけない。

### 3.2 時刻・タイムゾーン依存

- リマインダー計算・作業履歴記録は**端末のローカル時刻とタイムゾーン**に依存する。
- DB には **UTC ISO 8601 TEXT + tz_offset_min INTEGER** で保存する（§5 参照）。表示時のみローカル変換。

### 3.3 デバイスフットプリント想定

- ストレージ: 初回インストール ~80MB、典型ユーザー 1 年運用で +200MB（写真中心）。
- メモリ: Hermes 前提で実行時 ~150-250MB。
- 画面幅: 320px（iPhone SE 第 1 世代）〜 430px（Pro Max）想定。タブレットは表示可能だが最適化は v2+。

---

## 4. 機能要件（F）

> 受け入れ条件（合否）は Jest / Maestro テストで固定する。本書は「境界」と「ルール」を持つ。

---

### F-01 盆栽の登録・管理

1 本 1 本の盆栽を鉢ごとに追加・編集・並び替え・アーカイブする機能。

#### できること

- 盆栽の追加（名前、樹種、購入日、入手元メモ、樹形スタイル、鉢情報）
- 盆栽の編集（全項目）
- 盆栽の並び替え（手動ドラッグ / 登録日 / 樹齢 / 名前）
- 盆栽の**アーカイブ**（削除ではなく非表示、履歴は保持）
- アーカイブからの復元
- カバー写真の設定（登録済み写真から選択）

#### できないこと（明示）

- **完全削除**（理由: 誤操作でのデータ損失防止。物理削除は `PRAGMA foreign_keys = ON` 下で CASCADE するため、アーカイブに限定）
- **共有・譲渡**（理由: v1 はユーザー間通信なし。v1.1+ の継承モードは同一ユーザー内のみ）
- **盆栽の複製**（理由: 複製すると履歴の主体が曖昧になる。v2+ で「挿し木登録」として別機能化検討）

#### 受け入れ条件（テストで担保）

- `__tests__/features/bonsai/`（form utils / card / photo CRUD）で検証
- `maestro/flows/bonsai-list.yml` / `g4-bonsai-new.yml` で E2E 検証
- 主要シナリオ: 新規追加 → 一覧表示 → 編集 → アーカイブ → 復元 → 一覧からの消失・復帰

---

### F-02 作業履歴記録

1 本の盆栽に対する作業（水やり・剪定・針金・植替え等）をワンタップ記録する。

#### できること

- **作業種別の選択**（14 種、SoT は `src/db/schema.ts` の `EVENT_TYPES`）
- ワンタップ記録（既定値: 現在時刻のみ）
- 所要時間の記録（任意）
- 作業時の写真添付（Free 3 枚/記録、 Pro は安全上限 10 枚/記録 = `MAX_PHOTOS_PER_EVENT`）
- 自由メモ（テキスト、上限 2,000 文字）
- 作業履歴の編集・削除
- **作業の時系列タイムライン表示**（日付降順、種別アイコン付き）

#### できないこと（明示）

- **AI による「この作業が必要です」提案**（理由: 原則 P2「診断しない、記録する」）
- **他ユーザーの作業コピー**（理由: ユーザー間通信なし）

> 補足: 複数盆栽への同日一括記録は BulkLog (Sess79-80) で対応済み。過去日への記録も日付指定で 1 件ずつ可能。

#### 受け入れ条件（テストで担保）

- `__tests__/features/event/`（EventRow / chips / grouping）
- `maestro/flows/log-event.yml` / `work-log-edit.yml`
- 主要シナリオ: 水やりワンタップ記録 → タイムライン表示 → 写真添付付き剪定記録 → 編集 → 削除

---

### F-04 水やり履歴の可視化 — 撤廃 (ADR-0039、 2026-05-22)

詳細は [ADR-0039](../adr/ADR-0039-watering-heatmap-removal.md) を参照。 維持は「最後の水やりから N 日」 テキストのみ (F-02 内)。

---

### F-05 — 撤廃 (Sess19-3 2026-05-21、 ADR-0011 Amend)

F-05 ID は 2 度再利用された後に完全撤廃。 v1 「リマインダー分散 (時期計算)」 は ADR-0011 (推奨機能撤廃) で削除、 v2 「気遣い型予定確認ポップアップ」 は Sess19-3 で user 真意「ユーザーは承知の上で行っているので不要、 うっとうしい」 により削除。 詳細は [ADR-0011](../adr/ADR-0011-remove-recommendations-keep-record-only.md) の Sess19-3 追記を参照。

---

### F-07 針金がけ記録・外し予定日時の F-02 統合（ADR-0011 / ADR-0014）

針金がけ日を記録時、ユーザーが任意で「外す予定日時」を入力できる。F-02 status='planned' に統合され、F-16 当日まとめ通知に含まれる。装着期間経過は**アプリ内事実表示のみ**（通知発火なし、ADR-0014）。

#### できること

- 針金がけ作業の記録（対象枝の部位タグ、針金サイズ mm、写真）
- ユーザー任意の「外す予定日時」入力 → F-02 status='planned' (種別 'unwiring') として自動登録
- F-16 当日まとめ通知に「N 件の作業予定があります」として集約配信
- **装着期間アプリ内表示**: 盆栽詳細 → 針金一覧で「装着期間: X 週 Y 日 (経過済 / あと N 週 / 完了)」表示
- 外し記録 (unwiring event) で該当針金をクローズ、F-02 planned event もキャンセル
- 未外しの針金一覧（全盆栽横断）

#### できないこと（明示、ADR-0014 で削除）

- **装着期間経過通知の発火**（ユーザーフィードバック「6 週後通知が鬱陶しい」 → アプリ内表示のみで代替）
- **個別の針金外し通知**（F-02 当日まとめに統合）
- **食い込み判定**（AI 非搭載）
- **樹種別標準経過週数からの自動外し時期計算**（ADR-0011「記録のみ」哲学、推奨機能 NG）
- **針金再利用の最適化提案**

#### 受け入れ条件（テストで担保）

- `__tests__/features/wiring/wiringDuration.test.ts`（装着期間計算）
- 主要シナリオ: 針金記録 + 外す予定日時入力 → F-02 planned event 自動登録 → 当日 F-16 まとめ通知に集約 → 外し記録 → 針金クローズ + F-02 planned キャンセル

---

### F-08 写真管理

盆栽 1 本ごとに写真を時系列保存する (相対パス + EXIF + サムネイル)。

> **Sess58 撤廃**: 「年次タイムライン画像生成 (12 ヶ月 × 1 枚で縦長 PNG、 Pro 限定)」 は実装ゼロの幽霊機能だったため撤廃。 PR #51 (P2-02 Phase 0) で企画されたが実装されず、 ADR-0020 (Claude Design 採用) で「作業履歴チップに統合」 されてさらに形態変更、 i18n key (paywallFeatureYearlyTimeline) と Paywall 比較表 / Settings bullet の表示残骸が景品表示法 / Apple Review 2.3.1 リスクとして発覚 (議論セッション中、 user 指摘)。 詳細は ADR-0009 Sess58 Amendment 参照。

#### できること

- 写真の添付（カメラ / ライブラリ）、EXIF からの撮影日自動取得
- **相対パス保存**（§5 重要ルール参照）
- サムネイル自動生成（`cacheDirectory` 配下）
- 写真の並び替え（撮影日 / 登録順 / 手動）
- 写真単体の削除

#### できないこと（明示）

- **絶対パスの DB 保存**（理由: iOS Application Container UUID 変化問題、§5 参照）
- **クラウドアップロード**（理由: 完全ローカル）
- **AI による「成長スコア」判定**（理由: 原則 P2）
- **Free プランでの 4 枚目以降の登録**（Free は 3 枚/本上限、Pro は無制限）
- **年次タイムライン画像生成** (Sess58 撤廃)

#### 受け入れ条件（テストで担保）

- `__tests__/features/photos/photoLimit.test.ts`（Free 3 枚制限）/ `photoOrchestrator.test.ts`
- `__tests__/photoRepository.test.ts`（相対パス保存）
- 主要シナリオ: 写真 1 枚追加 → 相対パス保存確認 → 再インストールでも表示可能 / Free で 4 枚目追加 → 課金プロンプト表示

---

### F-09 検索・タグ

盆栽名・樹種・メモを 3 段組みで並列検索 + ユーザー定義タグで AND フィルタ (ADR-0008 / functional_spec §14、Free / Pro 全機能利用可)。

#### できること

- **3 段組み検索結果表示**（盆栽名 LIKE + 樹種名 19 言語通称 LIKE + 作業メモ FTS5 trigram MATCH、Things 3 / Apple Notes 業界標準）
- **作業メモの全文検索**（FTS5 + trigram tokenizer、`detail=column` で容量 54% 削減 + column filter 維持、2 文字以上）
- **検索結果ハイライト**（FTS5 snippet 関数で `<b>` 強調）
- ユーザー定義タグの付与（例: `#展示会候補` `#ベランダ` `#要注意`、case-insensitive + NFC 正規化で重複防止）
- 1 盆栽あたり最大 10 タグ、タグ名最大 32 文字、アプリ全体タグ数制限なし
- 盆栽編集画面で **最近使われた 3 タグ候補チップ**（直近 30 日 INSERT 上位 3 件）
- Home 上部にタグチップ（使用頻度順、上位 10 + 「もっと見る」）、複数選択で AND フィルタ
- テキスト + タグ AND フィルタ同時適用可
- 検索履歴（AsyncStorage、最大 20 件 FIFO、削除可）
- 検索バー Home 上部 + `/search` 全画面遷移、検索画面に戻ると結果保持
- Settings → タグ管理でタグ rename
- 検索結果に盆栽サムネイル (F-08 cover_photo) 表示
- event タップで盆栽詳細 + 該当 event ハイライト
- シニア UX: 検索バー高 48dp+、フォント 17pt+、debounce 300ms、タッチ 48×48dp
- 19 言語ローカライズ (placeholder「盆栽名・樹種・メモで検索」、0 件「該当する記録はありません」)

#### できないこと（明示）

- **1 文字検索**（trigram tokenizer の制約、UI で「2 文字以上」ガイド表示）
- **アーカイブ済盆栽の検索**（archived_at IS NOT NULL 除外、Y1）
- **ゴミ箱 events の検索**（deleted_at IS NOT NULL 除外、Y2、Settings → ゴミ箱から個別検索）
- **events.payload_json の検索**（構造化データはタグで代替、Y3）
- **音声検索 / ファジー検索**（v1 は単純部分一致）
- **クラウド横断検索**（完全ローカル、constraints §1-1）
- **タグの色設定**（v1.0 で実装しない、灰色チップ統一、v1.x 候補）
- **タグの階層構造** (`#parent/child` Bear 風、シニア UX 重視で v1.x 候補)

#### 受け入れ条件（テストで担保）

- `__tests__/features/search/`（grouping / history）+ `__tests__/db/`（FTS5）
- `maestro/flows/search-flow.yml`（Home 検索バー → /search → 結果タップ → 戻るで検索画面復帰）
- 主要シナリオ: 「黒松」検索 → 樹種・盆栽名・メモの 3 段組み表示 / メモに「根腐れ」5 件 → snippet で `<b>根腐れ</b>` 強調 / タグ「#展示会候補」追加で 5 本フィルタ → AND 「#ベランダ」追加で 2 本に絞り込み

---

### F-10 エクスポート（CSV / PDF）

全データを CSV・PDF 形式でエクスポートする。**Pro 限定** (ADR-0009 / ADR-0011 / ADR-0016、Free でタップ → Paywall)。Repolog 既存実装流用 (3 段階フォールバック + タイムアウト + ストレージチェック + カスタムエラー)。7 画面構成 (Hub / Options / Progress / Share / Preview×3)。個別盆栽選択機能 v1.0 採用 (Y4)。詳細は ADR-0016 を正とする。

#### できること

- **CSV エクスポート 3 種**（盆栽一覧 / 作業履歴 / 樹種別サマリ、UTF-8 BOM + CRLF + RFC 4180、写真関連列なし）
- **PDF エクスポート 2 種**（個別盆栽レポート / 全盆栽リスト、A4 縦、3 段階フォールバック、CJK フォント明示）
- **Restore Purchases ボタン**（§12 Apple 規約対応）の独立配置は F-13 に記載
- CSV インポート（v1 は独自フォーマット .csv のみ、Excel/Notion 互換性は努力目標）
- エクスポートファイルの iOS Share Sheet / Android Intent での共有

#### できないこと（明示）

- **任意のフォーマット編集**（理由: 復元可能性確保。固定スキーマのみ）
- **パスワード付き PDF**（v1 は暗号化なし、v1.1+ 検討）
- **Excel .xlsx 直接出力**（理由: ライブラリサイズ増。CSV で代替）

#### 受け入れ条件（テストで担保）

- `__tests__/features/export/`（csv / pdf / hub / preview / reliability、14 ファイル）
- 主要シナリオ: 10 本の盆栽 × 50 件作業を CSV 出力 → UTF-8 BOM 確認 → Excel で文字化けなし

---

### F-11 お引っ越し機能（デバイス移行）

旧端末から新端末へ全データを **ZIP + Share Sheet 方式**で移行する（ADR-0007 が正。当初の QR + WebRTC + AES-256 暗号化案は ADR-0007 で棄却済み）。クラウド非経由・Free / Pro とも利用可。

#### できること

- **バックアップ ZIP の作成**（`manifest.json` + `photos/` + DB スナップショット。DB は `VACUUM INTO` で無ロック取得）
- **Share Sheet / SAF で任意の保存先へ書き出し**（iCloud Drive / Google Drive / メール等、保存先はユーザー選択・ユーザー責任）
- **ZIP からの復元**（`schema_version` 厳格一致チェック、マージは追記のみ = ID 重複はスキップ）
- 写真は相対パス維持で再配置（新端末の `documentDirectory` 配下）
- **クロスプラットフォーム**（iOS ↔ Android 互換）
- 写真は長辺 2048px にリサイズして同梱（サイズ上限 200MB）

#### できないこと（明示）

- **暗号化**（ADR-0007: 位置情報を持たないため PII リスクなし。UI で「クラウド保存時はユーザー責任」を明示）
- **端末間の直接通信転送**（QR / WebRTC / Bluetooth / AirDrop — ADR-0007 で実装コスト・シニア UX を理由に棄却）
- **完全置換モード**（v1 は追記マージのみ、置換は v1.1+ 検討）
- **部分転送・差分転送**（v1 は全データのみ）

#### 受け入れ条件（テストで担保）

- `__tests__/features/backup/` + `__tests__/backupCoverage.test.ts` / `__tests__/backupImportPlanner.test.ts`
- `maestro/flows/backup-screen-reach.yml`（画面到達。2 端末クロス転送は手動 E2E 必須 = constraints §9）
- 主要シナリオ: 旧端末でバックアップ作成 → Share Sheet で保存 → 新端末で復元 → 全データ + 写真表示

---

### F-12 多言語対応

19 言語で UI・樹種名・作業名を提供する。

#### できること

- 対応言語: **en, ja, fr, es, de, it, pt, ru, zh-Hans, zh-Hant, ko, th, id, vi, hi, tr, nl, pl, sv**（§7 参照）
- 初回起動時の**端末 locale 自動検出**
- 設定画面での**手動言語切替**（即時反映、再起動不要）
- pt は **pt-BR 基準**
- zh-Hant 含む 18 言語は **各言語 native UX writer ペルソナの手動翻訳**（ADR-0033 D1、機械翻訳単独使用は禁止）
- **複数形対応**（独自 i18n システム。可変数値は `{count}` placeholder + 言語別文字列で表現）
- **数値・日付・通貨**は `Intl` API で各 locale に自動フォーマット

#### できないこと（明示）

- **RTL 完全レイアウト**（理由: v1 は LTR のみ、RTL は v1.3+）
- **アラビア語**（理由: RTL 対応とセットなので v1.3+）
- **ユーザー独自言語追加**（v1 は 19 言語固定）
- **機械翻訳リアルタイム生成**（翻訳ファイルは事前ビルド済み、Claude Code で生成）

#### 受け入れ条件（テストで担保）

- `__tests__/i18n.test.ts`（locale 検出・fallback・key 整合）
- `scripts/i18n-check.mjs`（CI で全言語キー存在確認、不足があれば失敗）
- `scripts/i18n-audit.mjs`（未使用キー・ハードコード文字列検出）
- 主要シナリオ: 端末を `pl` で起動 → 全画面ポーランド語 → 「3 件の盆栽」が `3 bonsai` の正しい複数形で表示

**絶対ルール**: user-visible な**全て**の文字列は `src/core/i18n/` の翻訳キー経由で表示する。直接文字列を JSX に書いた場合、`i18n:audit` スクリプトで検出され CI が失敗する。

---

### F-13 課金（サブスク＋買切）

月額・年額サブスクリプション + Lifetime 買切で Pro 機能を解放する。

> **Pro 機能 7 項目の境界 SoT**: [ADR-0049](../adr/ADR-0049-pro-feature-boundary-v1.md) (Sess58 確定 6 項目 + Sess78 ⑦ 定期予定 + Sess101 グループ単位化)。

#### できること

- **Free プラン**: 基本機能、 写真 3 枚/本、 作業記録写真 3 枚/記録、 タグ 3 個、 カスタム樹種樹形 3 件、 定期予定 3 グループ、 エクスポートなし、 バナー広告表示
- **Pro プラン**: 全機能、 写真無制限、 作業記録写真 10 枚/記録 (安全上限)、 タグ無制限、 カスタム樹種樹形無制限、 定期予定無制限、 エクスポートあり、 広告非表示
- 3 つの購入オプション: **月額 / 年額 (割引訴求) / 買切 Lifetime (Non-Consumable IAP / One-time Product)**。価格はストア Console + RevenueCat Offering が正 (本書に固定しない)
- **Restore Purchases ボタン**: Settings 画面と Paywall 画面の**両方**に配置（Apple 規約 3.1.1）
- **RevenueCat の `premium` Entitlement** で Pro 判定
- オフラインでも SDK キャッシュで Pro 判定可能（最大 3 日グレースピリオド）

#### できないこと（明示）

- **Free と Pro の機能クロスオーバー**（一部 Pro 機能を Free 公開しない）
- **3 プラン以外のカスタム価格**（App Store Connect の price points から選択、v1 は固定）
- **Family Sharing**（v1 は個人購入のみ、v1.1+ 検討）
- **外部決済リンク（Stripe 等）**（日本ストアでは Apple/Google 規約により不可）
- **サブスクリプションの手動継続判定**（必ず RevenueCat SDK で判定、独自キャッシュ厳禁）

#### 受け入れ条件（テストで担保）

- `__tests__/features/pro/`（purchase / champion / restore 系）
- `maestro/flows/paywall-to-purchase.yml`
- 主要シナリオ: Free ユーザーが Pro 機能タップ → Paywall → 年額購入 → Pro 機能解放 → 再インストール → Restore → Pro 復元

**重要**: Lifetime は必ず **Non-Consumable**（iOS）/ **One-time Product + 非消費設定**（Android）として登録。Consumable 誤設定は復元不能・審査拒否リスク。

---

### F-14 Home 下部バナー広告

Free プランのホーム画面下部にアダプティブバナー広告を表示する。

#### できること

- **Home 画面最下部のみ**にバナー表示（他画面には出さない）
- **Anchored Adaptive Banner**（高さ 50-60dp、画面幅に自動適合）
- 起動後 **3 秒以上経過後**に初回表示
- **「広告」ラベル**を常時表示（小さくグレー、誠実性）
- **広告周囲 16dp 以上の余白**（シニア誤タップ防止。バナーに閉じるボタンは存在しない）
- **UMP（User Messaging Platform）による同意フロー**（GDPR / CCPA 対応）
- **iOS ATT（App Tracking Transparency）プロンプト**（ATT → UMP → AdMob 初期化の順）
- **センシティブカテゴリ全拒否**（ギャンブル・アルコール・出会い系・成人向け）
- **Pro プランでは完全非表示**（`maxAdContentRating: PG`, `tagForChildDirectedTreatment: false`）

#### できないこと（明示）

- **インタースティシャル広告**（理由: UX 毀損、継続率低下）
- **リワード広告**（v1 は採用せず）
- **全画面動画広告 / 起動時広告（App Open Ad）**（理由: シニアの誤タップ被害リスク）
- **詳細画面・一覧画面への広告配置**（理由: 鉢の美しさを損なう、UX 原則）
- **広告内容のカスタムターゲティング**（v1 は AdMob 自動配信のみ）
- **Pro 契約者への広告表示**（完全非表示、課金価値の明快化）

#### 受け入れ条件（テストで担保）

- `__tests__/adService.test.ts` / `__tests__/adServiceBehavior.test.ts`（Pro 非表示・デモID切替・段階ゲート）
- `maestro/flows/pro-no-ads.yml`（Pro でバナー非表示）
- `maestro/flows/att-dialog.yml` / `ump-consent-eea.yml`
- 主要シナリオ: 初回起動 → ATT プロンプト → UMP 同意フォーム → Home にバナー表示 → 詳細画面では非表示 → Pro 購入 → バナー完全消失

---

### F-15 ダークモード / 屋外モード

4 mode (Auto / Light / Dark / Outdoor) でテーマを切り替える (ADR-0015、Free / Pro 全機能利用可)。Material 3 baseline + 屋外モード緑単色 #1B5E20 + 全画面ヘッダー右上太陽アイコン。

#### できること

- **システム / ライト / ダーク**の 3 択（既定: システム）
- **屋外モード**の手動切替（**全画面ヘッダー右上太陽アイコン** + Settings、48×48dp タッチ領域、OA1）
- 屋外モードは**コントラスト AAA (7:1)** 達成、accent `#1B5E20` (緑単色、9.7:1)、文字 `#000000` (21:1) (OC1、青系撤回)
- ダークモードは**Material 3 baseline `#121212`** (BD1、shadow 視認 + eye strain 軽減、純黒/独自値撤回)
- アニメーション 200ms、reduced motion 設定時 0ms (A1)
- F-08 写真自体は変更なし、UI 枠のみテーマ追従 (Y3、PH1)
- AsyncStorage `theme.mode` 永続化、F-11 引継ぎで移行 (Y10)
- ESLint `no-direct-hex-in-jsx` ルールで直 hex 禁止、theme.color 参照強制 (EL1)

#### できないこと（明示）

- **環境光センサ連動の自動屋外モード**（理由: 誤判定が多い。手動のみ）
- **ユーザー定義カラーテーマ**（v1 は 3 モードのみ、v2+ で検討）
- **画面ごとの個別テーマ**（全画面統一）

#### 受け入れ条件（テストで担保）

- `__tests__/core/themeResolver.test.ts`（mode 解決）+ ESLint `no-color-hex-literal-in-stylesheet`（直 hex 構造防止、`__tests__/eslint/`）
- 主要シナリオ: システム設定ダーク → アプリもダーク / 手動で屋外 ON → コントラスト AAA / reduced motion ON → 遷移瞬時

---

### F-16 ローカル通知

作業予定をローカル通知で配信する（仕様の正は ADR-0014）。

#### できること

- **当日まとめ通知**（DATE trigger、7 日ローリング予約）: 当日の planned events を「N 件の作業予定があります」に集約、0 件の日は発火しない
- **水やり繰り返し通知**（DAILY trigger）: 毎日同時刻、1 日 1〜5 回まで、全盆栽共通
- 通知タップで**作業予定カレンダー（S-08）当日選択状態**へ遷移
- **通知チャネル 2 系統**（Android 8+: `WATERING` / `DAILY_SUMMARY`、importance は全 DEFAULT）
- **TZ 変更時の現地時刻自動再予約**（アプリ起動時、ADR-0014 B1）
- Onboarding Step 5 で許可導線（スキップ時は通知 OFF 既定）

#### できないこと（明示、ADR-0014 / ADR-0011）

- **SCHEDULE_EXACT_ALARM 権限の要求**（inexact alarm で十分、最大 15 分遅延は許容。「介入しない」哲学整合 = constraints 準拠）
- **CALENDAR trigger**（iOS のみ対応で Android 非対応のため不採用）
- **プッシュ通知（サーバ起点）**（サーバなし、完全ローカル）
- **Critical Alerts / timeSensitive**（Apple の特別 entitlement、盆栽用途では不要）
- **盆栽個別の水やり時刻設定**（全盆栽共通のみ）
- **Vacation モード**（OS 標準の通知 OFF で代替）

#### 受け入れ条件（テストで担保）

- `__tests__/features/notification/`
- `maestro/flows/notification-off-on.yml` / `notification-summary-tap.yml` / `settings-notifications.yml`
- 主要シナリオ: 予定登録 → 翌朝の当日まとめ通知に集約 → タップで予定カレンダー当日表示

---

## 5. データモデル（概要）

> 詳細は `src/db/schema.ts` を正とする。本書はエンティティの存在と関係のみ定義する。

### 5.1 主要エンティティ

- **`species`**（樹種マスタ、静的データ）
  - `id, scientific_name, common_ja, common_en, care_profile_json, created_at, updated_at`
- **`species_names`**（樹種通称、19 言語対応）
  - `species_id, locale, common_name`
- **`bonsai`**（盆栽本体、親エンティティ）
  - `id (UUID TEXT), name, species_id, acquired_on, style, pot_info_json, notes, cover_photo_id, archived_at, created_at, updated_at`
- **`events`**（作業履歴、STI: Single Table Inheritance）
  - `id (UUID TEXT), bonsai_id, type, occurred_at (ISO UTC TEXT), tz_offset_min, duration_min, payload_json, note, created_at, updated_at`
- **`photos`**（写真、子エンティティ、ON DELETE CASCADE）
  - `id, bonsai_id, event_id, relative_path (★絶対URIを保存しない), mime_type, width, height, byte_size, sha256, taken_at, exif_json, ordinal, created_at`
- **`recurrence_rules`**（定期予定ルール、RFC 5545 RRULE、ADR-0056）
  - `id (ULID), bonsai_id, event_type, rrule, start_at_utc, end_at_utc, exdates, group_id, deleted_at`
- **`tags`** / **`bonsai_tags`**（ユーザー定義タグ、多対多）
- **`bonsai_species_custom`** / **`bonsai_styles_custom`**（カスタム樹種・樹形、ADR-0026）
- **`events_fts`**（FTS5 仮想テーブル、trigram tokenizer、`note` 検索用）

> テーブルの完全な定義は `src/db/schema.ts` を参照（旧構想の `reminders` テーブルは作られていない — 通知は ADR-0014、繰り返しは `recurrence_rules`）。

### 5.2 重要ルール（絶対条件）

1. **写真・音声等のファイルパスは、必ず相対パスで保存する。絶対パスを DB に保存してはいけない。**
   - 理由: iOS の Application Container UUID が TestFlight↔App Store 間・再インストール時に変化する（Expo Issue #4261, #32788 で公式確認済み）。
   - 実装: `src/db/filePathUtils.ts` の `toRelative()` / `toAbsolute()` を経由すること。直接 `FileSystem.documentDirectory + ...` を書いてはいけない。
2. **日時は UTC ISO 8601 TEXT + tz_offset_min INTEGER で保存する。**
   - 表示時のみ `tz_offset_min` または端末ローカルでの変換を行う。
3. **主キーは TEXT (UUID v4)**。将来のデータ移行・同期対応のため（AUTOINCREMENT INTEGER を使わない）。
4. **`PRAGMA foreign_keys = ON` は起動時に必ず実行する**（既定で OFF のため）。
5. **`PRAGMA journal_mode = WAL` + `synchronous = NORMAL`** を起動時設定。
6. **マイグレーションは `PRAGMA user_version` で管理**、前進型のみ（ダウングレード非対応）。

### 5.3 STI（Single Table Inheritance）採用理由

- 作業種別（water / prune / wire / repot / fertilize 等）は**80% 以上の属性が共通**（`occurred_at`, `note`, `photos`）。
- 種別固有の詳細は `payload_json` に格納（例: wiring なら `{"wire_size_mm": 2, "body_part": "trunk"}`）。
- 種別テーブル分離は不要、クエリ複雑化を避ける。

### 5.4 インデックス設計

- `idx_events_bonsai_date`（`bonsai_id, occurred_at DESC`）: 盆栽詳細タイムライン
- `idx_events_type_date`（`type, occurred_at DESC`）: 種別横断履歴
- `idx_events_bonsai_type_date`（`bonsai_id, type, occurred_at DESC`）: 樹木別種別履歴
- インデックスの完全な一覧は `src/db/schema.ts` を正とする

---

## 6. 非機能要件（NFR）

### 6.1 UX / 性能

- **起動時間**: コールドスタート < 3 秒（中堅端末、2022 年以降機種）
- **主要操作のレスポンス**: < 200ms（タップ → 視覚フィードバック）
- **SQLite クエリ**: 盆栽一覧 50 件表示 < 100ms、作業履歴 500 件表示 < 300ms
- **写真ロード**: サムネイル < 500ms、原本 < 1.5 秒
- **データロード時の進捗表示**: 1 秒を超える操作にはインジケーター
- **リスト描画**: `FlatList` を使用 (`keyExtractor` 必須、 必要に応じて `getItemLayout` で最適化)。 `@shopify/flash-list` は Phase 7 (PR #901) で死 deps として撤去済

### 6.2 アクセシビリティ（最低ライン）

- **タップ領域**: 48×48pt 以上（プライマリアクションは 56pt、シニア配慮）
- **フォントサイズ最小**: 本文 16pt、シニア向けキー画面 18pt
- **`maxFontSizeMultiplier`**: 2.0（AX5 で 310% まで対応）
- **重要文言**: アイコンだけにせずラベル併記（原則 P5）
- **ダークモード対応**: system / light / dark + 屋外（F-15）
- **コントラスト比**: WCAG AA（4.5:1）必須、AAA（7:1）目標、UI 要素 3:1
- **カラーブラインド対応**: 色のみで情報伝達せず、アイコン・テキスト・パターン併用
- **reduced motion 設定対応**: アニメーション 200-400ms → 0ms へ短縮

### 6.3 セキュリティ / プライバシー

- **個人情報（氏名 / メール / 電話 / 住所）をアプリ要件として取得しない**
- **課金情報はストアが管理し、アプリは保持しない**
- **API キー / シークレットは `.env` から読み込み、コードに直書きしない**
- **ログに PII を出さない**（特に AdMob ID、購入 transaction ID）
- **SecureStore 使用用途**: RevenueCat appUserID の UUID、AdMob consent status のみ
- **SQLite 暗号化**: v1 は未実装、v1.1+ で `useSQLCipher: true` オプション検討
- **Local Network 権限**（iOS）: F-11 お引っ越し機能でのみ要求

詳細: [`constraints.md`](./constraints.md)

### 6.4 オフライン完結性

- **ネットワーク不在でも全ての基本操作が成立する**
- ネットワークが必要なのは以下のみ:
  - 初回 RevenueCat 設定 & 購入処理（F-13）
  - AdMob バナー配信（F-14、Free のみ）
  - Pro 状態の定期検証（RevenueCat SDK、最大 3 日グレースピリオド）
- **上記以外のすべての画面・操作**で「ネットワークエラー」が表示されてはいけない

### 6.5 バッテリー消費

- **バックグラウンド処理最小化**: ローカル通知スケジュール以外、バックグラウンドで動作しない
- **位置情報を一切取得しない**（constraints §1-3）
- **Push 受信なし**（サーバ非依存のため）

### 6.6 ストレージ使用量

- **初回インストール**: ~80MB
- **想定 1 年運用**: +200MB（写真中心）
- **警告閾値**: 本体 +500MB で設定画面に「ストレージ使用量」表示と古い写真の整理ガイド

---

## 7. 多言語対応

- **対応言語（19 言語）**:
  - en（英語）, ja（日本語）, fr（フランス語）, es（スペイン語）, de（ドイツ語）, it（イタリア語）, pt（ポルトガル語、pt-BR 基準）, ru（ロシア語）, zh-Hans（中国語簡体字）, zh-Hant（中国語繁体字）, ko（韓国語）, hi（ヒンディー語）, id（インドネシア語）, th（タイ語）, vi（ベトナム語）, tr（トルコ語）, nl（オランダ語）, pl（ポーランド語）, sv（スウェーデン語）
- **レイアウトは LTR のみ**（RTL は v1 スコープ外）
- **全ての user-visible な文字列は `src/core/i18n/` の翻訳キーを経由する**
- **翻訳キー追加時は 19 言語ファイル全てに明示的に追加**（baseEn フォールバックに頼らない、`i18n:check` CI で担保）
- 翻訳は独自 i18n システム（zustand store + `locales/<lang>.ts`、i18next 不使用）。SoT は `src/core/i18n/i18n.ts`
- 複数形・可変表現は `{count}` 等の placeholder で言語別に表現（複雑な plural 形は文言設計で回避）
- 翻訳の品質方針: 18 言語 native UX writer ペルソナ手動翻訳（ADR-0033 D1、機械翻訳単独使用は禁止）
- **数値・日付・通貨**: `Intl.NumberFormat` / `Intl.DateTimeFormat` で locale 自動フォーマット

### 7.1 翻訳ファイル構造

```
src/core/i18n/locales/
├── en.ts          (baseEn = 型の正、TranslationKey を export)
├── ja.ts          (SoT 文言)
├── fr.ts ... sv.ts (計 19 ファイル、1 言語 1 ファイルのフラット構造)
```

- key は 19 ファイル全てに明示的に存在させる（`pnpm i18n:check` が CI で強制）

### 7.2 翻訳禁止リスト（全言語で日本語音訳維持）

以下の盆栽専門用語は全言語で **日本語音訳のまま表示**する（世界共通用語）:

`bonsai, niwaki, karikomi, nebari, jin, shari, kokedama, yamadori, mame, shohin, akadama, kusamono, sabamiki, bunjin, ishizuki`

樹形スタイル名も同様: `Chokkan, Moyogi, Shakan, Kengai, Han-Kengai, Bunjin-gi, Sokan, Kabudachi, Yose-ue`

樹種の学名（`Pinus thunbergii` 等）はラテン語のまま全言語共通。

### 7.3 追加言語の検討（v2+）

- **ar（アラビア語）**: v1.3 で RTL 対応とセットで追加予定
- **uk（ウクライナ語）**: EU 盆栽シーン拡大次第
- **cs（チェコ語）**: ポーランドに近接、中欧市場
- **fa（ペルシャ語、RTL）**: v1.3 以降、RTL 実装完了後
- **he（ヘブライ語、RTL）**: v1.3 以降、RTL 実装完了後

---

## 8. 収益モデル

### 8.1 プラン

| プラン | 内容                                                                 |
| ------ | -------------------------------------------------------------------- |
| Free   | 樹木無制限登録、Free 制限（§8.2 の 7 項目）、Home 下部バナー広告あり |
| 月額   | 全機能（Pro）                                                        |
| 年額   | 全機能（Pro）、月額比の割引訴求                                      |
| 買切   | 全機能（Pro）、永久（Lifetime = **Non-Consumable IAP** として登録）  |

> **価格はストア（App Store Connect / Google Play Console）+ RevenueCat Offering が正**。本書に金額を固定記載しない（アプリはコードに価格を持たず実行時に RevenueCat から取得する。constraints §0-3「ズレやすい情報を抱え込まない」と同思想）。

### 8.2 Free / Pro 差分

Pro 機能 **7 項目**の境界 SoT は **[ADR-0049](../adr/ADR-0049-pro-feature-boundary-v1.md)** を正とする (Sess58 確定 6 項目 + Sess78 Amendment ⑦ 定期予定 + Sess101 Amendment でグループ単位化)。

| 機能                                          | Free                            | Pro                                          |
| --------------------------------------------- | ------------------------------- | -------------------------------------------- |
| 盆栽登録数                                    | 無制限                          | 無制限                                       |
| ① 基本情報写真 (1 本あたり)                   | **3 枚まで**                    | 無制限                                       |
| ② タグ作成 (rename は無制限)                  | **3 個まで**                    | 無制限                                       |
| ③ 作業記録写真 (1 記録あたり、 表示は全 Free) | **3 枚まで**                    | **10 枚まで** (安全上限)                     |
| ④ CSV / PDF エクスポート (5 種類、 F-10)      | 不可                            | 可                                           |
| ⑤ Home 下部バナー広告 (F-14)                  | 表示                            | **完全非表示**                               |
| ⑥ カスタム樹種・樹形 作成                     | **マスタ 5 種 + カスタム 3 件** | 無制限                                       |
| ⑦ 定期予定 (予定グループ単位、 ADR-0056 D7)   | **3 グループまで**              | 無制限                                       |
| 作業履歴記録 + 全期間閲覧                     | 可                              | 可 (GDPR Art.20 で全 Free 必須)              |
| お引っ越し機能 (F-11)                         | **可**                          | **可** (データ保護は基本権利、 有料化しない) |

詳細は `constraints.md` §2-2 および ADR-0049 を正とする。 既存ユーザーの 4+ データは Grandfathered (表示 OK + 削除 OK + 追加のみ Paywall) で保護する。

### 8.3 Entitlement / Offering 設計（RevenueCat）

- **Entitlement**: `premium`（1 つのみ）
- **Offering**: `default`（1 つのみ）
- **Packages**:
  - `$rc_monthly` → iOS `bonsailog_pro_monthly` / Android 同
  - `$rc_annual` → iOS `bonsailog_pro_yearly` / Android 同
  - `$rc_lifetime` → iOS `bonsailog_pro_lifetime`（Non-Consumable）/ Android 同（One-time Product、非消費）
- **appUserID**: 初回起動時に生成する UUID v4（SecureStore 保存）、メール・電話使用禁止（GDPR 対応）

---

## 9. 広告（AdMob）

### 9.1 基本方針

- **Free プランのみ**広告表示、Pro は**完全非表示**
- **Home 画面最下部のみ**、他画面（詳細・設定・Paywall 等）には出さない
- **Anchored Adaptive Banner** を採用（Smart Banner は deprecated）
- Zaim 公式ケース: Android eCPM +48%、iOS eCPM +27% の実績（2025-2026）

### 9.2 実装順序（厳守）

起動時に以下の順序で必ず実行:

1. **iOS ATT (App Tracking Transparency) 許可要求**（iOS のみ）
2. **UMP (User Messaging Platform) 同意フォーム**（GDPR / CCPA 対応）
3. **Mobile Ads SDK 初期化**（`mobileAds().initialize()`）
4. **BannerAd コンポーネントのレンダリング**

この順序が崩れると広告配信率が低下・ポリシー違反リスク。

### 9.3 設定値（固定）

- `maxAdContentRating`: `PG`（家族向け）
- `tagForChildDirectedTreatment`: `false`（General Audience、BonsaiLog は大人の趣味）
- `tagForUnderAgeOfConsent`: `false`
- **センシティブカテゴリ全拒否**: ギャンブル・アルコール・出会い系・成人向け

### 9.4 UI 配置ルール

- **位置**: Home 画面 tabBar の上（iOS HIG / Material 準拠）
- **サイズ**: Anchored Adaptive Banner（高さ 50-60dp）
- **表示タイミング**: アプリ起動後 **3 秒以上経過後**
- **セーフエリア**: 広告周囲 **16dp 以上の余白**（シニア誤タップ防止。AdMob バナーに閉じるボタンは存在しないため、余白で防御）
- **「広告」ラベル**: 常時表示（小さくグレー、誠実性）

### 9.5 ポリシー違反防止チェックリスト

- [ ] 広告が誤ってタップされやすい位置にない
- [ ] 広告クリックで強制的に外部ブラウザに飛ばない（規定の挙動のみ）
- [ ] ATT 非許諾ユーザーにもパーソナライズなし広告を配信
- [ ] UMP 同意が拒否された場合、`canRequestAds = false` を尊重
- [ ] Pro 購入時に即座に広告領域が消える
- [ ] `tagForChildDirectedTreatment: true` と `tagForUnderAgeOfConsent: true` を同時 `true` にしない（COPPA 違反）

詳細: [`constraints.md`](./constraints.md) セクション「AdMob / UMP / ATT」

---

## 10. 盆栽静的 DB

### 10.1 樹種マスタ

- **件数**: **5 種**を v1.0 で同梱（ADR-0026 で 50 → 5 種に物理削減、 カスタム入力主軸へ転換）
- **代表樹種 (5 種)**: 黒松 (Pinus thunbergii) / モミジ (Acer palmatum) / イチョウ (Ginkgo biloba) / 梅 (Prunus mume) / 真柏 (Juniperus chinensis)
- **主キー**: 学名（`scientific_name`、例: `Pinus thunbergii`）
- **通称 19 言語**: `species_names` テーブル、locale × species_id 複合主キー
- **拡張**: ユーザーは `bonsai_species_custom` table 経由でカスタム樹種を追加可能 (Sess13 PR-H で実装済)。 マスタは「最頻出 5 種」 のみ、 残りはカスタム入力で個別性を表現する設計
- **関連**: `docs/adr/ADR-0026-master-data-reduction-and-custom-first.md`

### 10.2 データ配布戦略

- **同梱方式**: `src/db/seedSpecies.ts` の seed データをマイグレーション内で INSERT（prebuild SQLite / expo-asset / S3 CDN は不使用）
- **更新**: アプリリリース（seed 追加 + migration）で配布
- **出典**: 盆栽教本（藤岡友宏『盆栽入門』、近代盆栽、Bonsai Empire Tree Species Guide 等）

---

## 11. 受け入れ条件の見つけ方（テスト索引）

### 11.1 テストピラミッド

```
┌───────────────┐
│   Maestro     │  10%  Critical user journeys（maestro/flows/）
├───────────────┤
│ RTL UI / Comp │  20%  コンポーネント/画面（__tests__/components/, screens/）
├───────────────┤
│     Jest      │  70%  ドメイン/純粋関数（__tests__/domain/, lib/）
└───────────────┘
```

### 11.2 カバレッジ目標（`package.json > jest.coverageThreshold` で強制）

実体は `package.json > jest.coverageThreshold` が正（現状: global statements 20。引き上げは Issue #1143 で棚卸しとセット判断）。

### 11.3 F 番号 → テストパス逆引き表

| F 番号      | Jest パス                                                       | Maestro フロー                                                  |
| ----------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| F-01        | `__tests__/features/bonsai/**`                                  | `maestro/flows/bonsai-list.yml` / `g4-bonsai-new.yml`           |
| F-02        | `__tests__/features/event/**`                                   | `maestro/flows/log-event.yml`                                   |
| F-04 (撤廃) | `__tests__/features/watering/`（「最後の水やりから N 日」のみ） | –                                                               |
| F-07        | `__tests__/features/wiring/**`                                  | –                                                               |
| F-08        | `__tests__/features/photos/**`                                  | `maestro/flows/add_photo.yaml`                                  |
| F-09        | `__tests__/features/search/**`                                  | –                                                               |
| F-10        | `__tests__/features/export/**`                                  | –                                                               |
| F-11        | `__tests__/features/backup/**` + `__tests__/backup*.test.ts`    | `maestro/flows/backup-screen-reach.yml`（2 端末転送は手動 E2E） |
| F-12        | `__tests__/i18n.test.ts` + `scripts/i18n-check.mjs`             | –                                                               |
| F-13        | `__tests__/features/pro/**`                                     | `maestro/flows/paywall-to-purchase.yml`                         |
| F-14        | `__tests__/adService*.test.ts`                                  | `maestro/flows/att-dialog.yml` / `ump-consent-eea.yml`          |
| F-15        | `__tests__/core/themeResolver.test.ts`                          | –                                                               |
| F-16        | `__tests__/features/notification/**`                            | `maestro/flows/notification-off-on.yml` 等                      |

### 11.4 必須 CI ゲート

PR マージ前に `pnpm verify` が全 green であること（gate 構成は `package.json > scripts.verify` が正。CI も同一の 1 step）。

### 11.5 絶対違反禁止の語彙（UI テキスト）

AdMob 禁止カテゴリ抵触・医療類似判定リスク回避のため、**UI テキストに以下の禁止語を使わない**:

- **禁止**: 診断 / 判定 / 推奨 / べき / 危険 / 病気 / 治療 / reminder / tracker / alert （medical）
- **許可**: 記録 / 履歴 / 整理 / 参考 / 目安 / テンプレート / log / journal / record / 台帳

`i18n:audit` スクリプトで禁止語を検出、CI で失敗させる。

---

## 12. 参考

- [`product_strategy.md`](../explanation/product_strategy.md): なぜこのアプリを作るか、痛み×機能対応表
- [`constraints.md`](./constraints.md): 前提 / 制約 / 不変条件
- [`functional_spec.md`](./functional_spec.md): UI と状態の詳細（ある場合）
- [`docs/adr/`](../adr/): 意思決定の履歴
- [`docs/adr/ADR-0033-i18n-translation-policy.md`](../adr/ADR-0033-i18n-translation-policy.md): 翻訳方針（18 言語手動翻訳 + 翻訳禁止リスト）
- `pnpm i18n:check` / `pnpm i18n:audit`: 翻訳検証・監査（実体は `scripts/i18n-check.mjs` / `scripts/i18n-audit.mjs`）
- `src/db/schema.ts`: SQLite スキーマの正
- `src/db/filePathUtils.ts`: 相対パス変換ユーティリティ

---

## 付録 A: 小中学生向け用語ミニ辞典

- **Diátaxis**（ディアタクシス）: ドキュメントを 4 つに分ける考え方。Tutorial（使い方）/ How-to（手順）/ Reference（事実）/ Explanation（考え方）。本書は Reference。
- **Reference 文書**: 「何ができる」を事実として書く説明書。
- **ADR**（Architecture Decision Record）: 「なぜこう決めたか」を残す日記。
- **design_system.md / docs/mockups/**: 画面の見た目の「正解」が置いてある（token / pattern SoT + ClaudeDesign mockup。ADR が正、R-16）。
- **Jest**: JavaScript のテストを書く道具。
- **Maestro**: アプリを自動で操作してテストする道具。
- **SQLite**: アプリの中で使える小さなデータベース。Excel の賢い版。
- **WAL（Write-Ahead Logging）**: SQLite の書き込み方法のひとつ。同時に読み書きしても壊れにくい。
- **FTS5**: SQLite の全文検索機能。メモの中身を検索できる。
- **trigram tokenizer**: 3 文字ずつ区切って検索する仕組み。日本語にも使える。
- **UUID**（Universally Unique Identifier）: 世界で唯一の番号。他と被らない ID。
- **ISO 8601**: 日時の書き方の国際規格。`2026-04-23T10:30:00Z` のような形式。
- **STI**（Single Table Inheritance）: 似た種類のデータを 1 つの表にまとめて、種類だけ列で区別する設計。
- **FK**（Foreign Key）: 表と表をつなぐ鍵。親が消えたら子も消える仕組み。
- **CASCADE**: 親が消えたら子も一緒に消す指定。
- **i18n**: internationalization の略（i と 18 文字と n）。多言語対応のこと。
- **ICU plural**: 「1 個」「2 個」「5 個」などの複数形を言語ごとに正しく表示する仕組み。
- **ATT**（App Tracking Transparency）: iOS の「追跡してもいい？」と聞くダイアログ。
- **UMP**（User Messaging Platform）: Google の広告の「同意する？」と聞く仕組み。
- **Entitlement**: 課金で解放された権利。「Pro 権」みたいなもの。
- **Non-Consumable IAP**: 1 回買ったらずっと使えるアプリ内購入。Lifetime はこれ。
- **Hermes**: React Native の JavaScript エンジン。速くて軽い。
- **Expo Dev Build**: Expo Go より多くの機能を使えるビルド版。
- **EAS Build**: Expo のクラウドビルドサービス。
- **WCAG AA / AAA**: ウェブアクセシビリティのレベル。AAA が最も厳しい。
- **MoSCoW 法**: 優先度を Must / Should / Could / Won't で分類する方法。

---

## 付録 B: package.json 主要スクリプトの意味

本プロジェクトの `package.json > scripts` に定義されたコマンドの意味:

| コマンド                       | 何をする                                     | いつ使う                    |
| ------------------------------ | -------------------------------------------- | --------------------------- |
| `pnpm dev` / `pnpm start`      | Expo 開発サーバ起動                          | 普段の開発                  |
| `pnpm android`                 | Android 実機・エミュレータでビルド実行       | Android 動作確認            |
| `pnpm ios`                     | iOS シミュレータでビルド実行                 | iOS 動作確認                |
| `pnpm lint`                    | コードスタイルチェック（ESLint）             | PR 作成前                   |
| `pnpm type-check`              | TypeScript 型エラーチェック                  | PR 作成前                   |
| `pnpm test`                    | Jest テスト実行                              | PR 作成前                   |
| `pnpm test:e2e`                | Maestro E2E テスト実行                       | 主要フロー確認時            |
| `pnpm i18n:audit`              | 翻訳キーの未使用・ハードコード検出           | i18n 変更後                 |
| `pnpm i18n:check`              | 19 言語すべての翻訳キー一致検証              | PR 作成前                   |
| `pnpm config:check`            | `.env` や app.json の必須項目検証            | ビルド前                    |
| `pnpm format:check`            | Prettier フォーマット確認                    | PR 作成前                   |
| `pnpm format:fix`              | Prettier 自動整形                            | 整形ズレ時                  |
| `pnpm verify`                  | 全 gate 連結（構成は `scripts.verify` が正） | **PR 前の最終確認**         |
| `pnpm prebuild`                | Expo prebuild（ネイティブコード生成）        | 初回 / ネイティブ依存追加時 |
| `pnpm build:android`           | Android AAB ビルド（本番）                   | ストア提出前                |
| `pnpm build:android:apk:local` | Android 開発用 APK ローカルビルド            | 実機テスト配布              |
| `pnpm build:android:aab:local` | Android 本番用 AAB ローカルビルド            | ストア提出準備              |
| `pnpm metadata:check`          | ストアメタデータ 19 言語整合性検証           | ストア提出前                |
| `pnpm dev:android`             | Android 開発モード起動（カスタムスクリプト） | Android 開発                |
| `pnpm ump:check`               | UMP 同意フォーム構成検証                     | 広告機能変更後              |
| `pnpm debug:start/stop/status` | デバッグセッション管理                       | トラブルシュート            |
| `pnpm monitor`                 | リアルタイムモニタリング起動                 | パフォーマンス確認          |

**補足**: `pnpm prepare` は `git config core.hooksPath .githooks` を実行し、Git フックを `.githooks` に向ける。`npm install` 時に自動実行される。

---

## 付録 C: F 番号対応の痛み × 機能 × データ根拠

`product_strategy.md v2.0 §3` との対応:

| F 番号                | 痛み #                          | 実データ根拠                                                   |
| --------------------- | ------------------------------- | -------------------------------------------------------------- |
| F-01, F-02, F-08      | 🩹8 紙の帳面が読めなくなる      | 高橋さん型ペルソナの現実                                       |
| F-04 (撤廃, ADR-0039) | 🩹2 健康問題の 98% が水やり由来 | Bonsai Direct 公式 (「最後の水やりから N 日」のみ F-02 に残置) |
| F-07                  | 🩹6 針金食い込み永久傷          | Marcus 実例、BonsaiNut 多数                                    |
| F-09                  | 🩹9 Excel / Notion 管理面倒     | BonsaiNut「Notion で自作」                                     |
| F-10                  | 🩹8, 🩹9                        | 展示会出品・青色申告の実需                                     |
| F-11                  | 🩹10 スマホ買い替え不安         | 高橋さん 62 歳の直接懸念                                       |
| F-14                  | 🩹11 広告誤タップ               | シニア 30% 占める BonsaiLog 前提                               |
| AI 非搭載（原則 P2）  | 🩹5 AI 誤同定 → ケアズレ        | PictureThis「15 本全部初回誤り」、Greg「半数誤同定」           |

---

## 付録 D: 仕様変更時の必須チェックリスト

仕様変更 PR 作成時、以下を満たすこと（`.github/PULL_REQUEST_TEMPLATE.md` に組込推奨）:

```markdown
## 変更内容

（1 行で）

## 影響範囲

- [ ] 本書（basic_spec.md）を更新する必要があるか？
- [ ] product_strategy.md を更新する必要があるか？（価値・境界に影響する場合のみ）
- [ ] ADR を書くべき意思決定があるか？
- [ ] 関連テスト（Jest / Maestro）は追加・更新したか？
- [ ] 多言語ファイル 19 言語すべて更新したか？（`pnpm i18n:check` 通過）
- [ ] constraints.md の更新は不要か？

## テスト

- [ ] `pnpm verify` 通過
- [ ] Maestro E2E 必要なら実機確認済
- [ ] Pseudo-localization で画面崩れなし

## ストア影響

- [ ] Apple / Google 審査への影響を考慮したか？
- [ ] メタデータ 19 言語（`pnpm metadata:check`）影響なし？
- [ ] 広告・課金の規約違反リスクはないか？
```

---

## 付録 E: 将来追加検討中の機能（v1.1+ ロードマップ）

| バージョン | 追加機能                                                | 対応する戦略書 § |
| ---------- | ------------------------------------------------------- | ---------------- |
| v1.1       | 継承モード（先代記録と自記録の接続）                    | 🩹7              |
| v1.1       | タイ語ローカライズ強化（word-break 専用実装）           | §9-3             |
| v1.1       | Family Sharing（Apple）                                 | §7-3             |
| v1.2       | ヒンディー語ローカライズ強化（Devanagari フォント同梱） | §9-3             |
| v1.2       | 差分・部分転送（お引っ越し）                            | §3-1 F-11        |
| v1.3       | アラビア語 + RTL 完全対応                               | §9-3             |
| v1.3       | SQLCipher による SQLite 暗号化                          | §6-3             |
| v2.0       | 盆栽の家系図（挿し木系譜）                              | §11-8            |
| v2.0       | 温湿度センサーインポート                                | §1-4             |
| v2.0       | 展示会出品管理機能                                      | §1-4             |

これら v1.1+ 機能は**現時点では仕様書に含めず**、各リリースタイミングで本書に追記する。v1 のスコープを冷酷に守ることが個人開発継続の条件（事業メンター指摘）。
