# 基本仕様書（BonsaiLog / 盆栽手帳）

> Diátaxis: Reference（事実 / 何ができるかを最小粒度で固定）

- **Doc Type**: Reference（Diátaxis）
- **対象**: 実装者 / レビュア / テスト設計 / 将来の運用者
- **目的**: 「BonsaiLog が何をするか」をズレにくい粒度で"正"として置く（= 実装・テスト・運用の共通言語）
- **正（Source of Truth）**:
  - 依存関係 / SDK / バージョン: `package.json`（本書に固定記載しない）
  - 受け入れ条件（合否）: Jest テスト（`__tests__/` 配下）+ Maestro E2E（`maestro/flows/`）
  - UI の正: Figma（リンクで参照。本書に UI 細部を書きすぎない）
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
- **U-B（Marcus 35 歳・米国ポートランド）**: 屋内盆栽 6 本の写真年次タイムラインを自動整理、針金がけ日から外し時期が自動表示される。
- **U-C（盆栽園スタッフ）**: 顧客樹の作業履歴を記録し、PDF で紙の記録として出力する。

### 1.4 スコープ（v1 / 将来）

#### v1（MVP）

- **F-01 盆栽の登録・管理**
- **F-02 作業履歴記録**（「最後の水やりから N 日」 テキスト表示を含む、 ADR-0039）
- **F-05 リマインダー分散**
- **F-07 針金がけ記録・外し時期表示**
- **F-08 写真管理（年次タイムライン）**
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

詳細は [`glossary.md`](./glossary.md) を正とする。本書では以下 10 語のみ定義する。

- **盆栽 (Bonsai)**: アプリで管理する樹木 1 本。写真・作業履歴・メモを持つ親エンティティ。
- **樹種 (Species)**: 黒松・真柏・Ficus retusa など。学名を主キー、各言語の通称を副項目として持つ。
- **作業 (Event / Care Event)**: 水やり・剪定・針金がけ・植替え・施肥・葉刈り・病害虫対処などの記録単位。1 つの盆栽に時系列で紐付く。
- **リマインダー (Reminder)**: 次回作業の予定通知。**ユーザー手動設定のみ**で生成される。
- **分散 (Distribution)**: 複数の樹の作業が同じ週に集中しないようずらすアルゴリズム。
- **初期ガイド (Starter Guide)**: 新規盆栽登録時に生成される、最初の 30 日分の作業カレンダー。
- **お引っ越し (Device Migration)**: 旧端末から新端末へ全データ（DB + 写真）を暗号化転送する機能。
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

- `__tests__/features/bonsai/create.test.ts` で検証
- `__tests__/features/bonsai/archive.test.ts` で検証
- `maestro/flows/add_bonsai.yaml` で E2E 検証
- 主要シナリオ: 新規追加 → 一覧表示 → 編集 → アーカイブ → 復元 → 一覧からの消失・復帰

---

### F-02 作業履歴記録

1 本の盆栽に対する作業（水やり・剪定・針金・植替え等）をワンタップ記録する。

#### できること

- **作業種別の選択**（最大 16 種、§10 盆栽静的 DB の `event_type` に準拠）
- ワンタップ記録（既定値: 現在時刻のみ）
- 所要時間の記録（任意）
- 作業時の写真添付（複数枚、最大 10 枚/作業）
- 自由メモ（テキスト、上限 2,000 文字）
- 作業履歴の編集・削除
- **作業の時系列タイムライン表示**（日付降順、種別アイコン付き）

#### できないこと（明示）

- **AI による「この作業が必要です」提案**（理由: 原則 P2「診断しない、記録する」）
- **作業の遡及一括登録**（理由: 初期ガイド生成と衝突する。手動で 1 件ずつは可）
- **他ユーザーの作業コピー**（理由: ユーザー間通信なし）

#### 受け入れ条件（テストで担保）

- `__tests__/features/event/create.test.ts`
- `__tests__/features/event/timeline.test.ts`
- `maestro/flows/log_watering.yaml`
- 主要シナリオ: 水やりワンタップ記録 → タイムライン表示 → 写真添付付き剪定記録 → 編集 → 削除

---

### F-04 水やり履歴の可視化 — 撤廃 (ADR-0039、 2026-05-22)

詳細は [ADR-0039](../adr/ADR-0039-watering-heatmap-removal.md) を参照。 維持は「最後の水やりから N 日」 テキストのみ (F-02 内)。

---

### F-05 「気遣い型」予定確認ポップアップ

ユーザーが 1 日に 6 件目の予定を登録しようとした時に、「無理のない範囲で進めてくださいね」とソフトに声かけする。

#### できること

- 同一日に 5 件以上の予定がある状態で、6 件目登録時にポップアップ表示
- ポップアップ文言: 「この日は既に 5 件の予定があります。無理のない範囲で進めてくださいね 🌱」
- 「そのまま登録」がデフォルト操作
- 「今後表示しない」を選択した後は発火しない（永続化）
- Settings → 通知設定 → 「予定が多い時の確認ポップアップ」トグルで OFF 可能

#### できないこと（明示）

- **強制ブロック**（理由: あくまで確認、登録は通す）
- **「予定が多すぎます」「分散しましょう」等の押し付けがましい文言**（理由: 寄り添う UX）
- **自動で予定を書き換える**（理由: 記録のみ哲学、ユーザーの予定を勝手に動かさない）

#### 受け入れ条件（テストで担保）

- `__tests__/features/reminders/popupTrigger.test.ts`
- `maestro/flows/popup_5_events.yml`
- 主要シナリオ: 同一日に 5 件記録 → 6 件目登録 → ポップアップ表示 → 「今後表示しない」 → 7 件目登録時は発火しない

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

- `__tests__/features/wiring/record.test.ts`
- `__tests__/features/wiring/scheduledPlanned.test.ts`（F-02 統合）
- `__tests__/features/wiring/weeksElapsedDisplay.test.ts`（アプリ内表示）
- 主要シナリオ: 針金記録 + 外す予定日時入力 → F-02 planned event 自動登録 → 当日 F-16 まとめ通知に集約 → 外し記録 → 針金クローズ + F-02 planned キャンセル

---

### F-08 写真管理（年次タイムライン）

盆栽 1 本ごとに写真を時系列保存し、年次タイムライン画像を自動生成する。

#### できること

- 写真の添付（カメラ / ライブラリ）、EXIF からの撮影日自動取得
- **相対パス保存**（§5 重要ルール参照）
- サムネイル自動生成（`cacheDirectory` 配下）
- **年次タイムライン画像生成**（12 ヶ月 × 1 枚で縦長 PNG、Pro 限定、Instagram 縦長サイズ）
- 写真の並び替え（撮影日 / 登録順 / 手動）
- 写真単体の削除

#### できないこと（明示）

- **絶対パスの DB 保存**（理由: iOS Application Container UUID 変化問題、§5 参照）
- **クラウドアップロード**（理由: 完全ローカル）
- **AI による「成長スコア」判定**（理由: 原則 P2）
- **Free プランでの 4 枚目以降の登録**（Free は 3 枚/本上限、Pro は無制限）

#### 受け入れ条件（テストで担保）

- `__tests__/features/photo/add.test.ts`
- `__tests__/features/photo/relative_path.test.ts`
- `__tests__/features/photo/free_limit.test.ts`
- `__tests__/features/photo/yearly_timeline.test.ts`（Pro 限定）
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

- `__tests__/features/search/multiSearch.test.ts`（3 段組み + 各セクション集計）
- `__tests__/features/search/fts5Snippet.test.ts`（trigram + snippet ハイライト）
- `__tests__/features/search/tagFilter.test.ts`（AND フィルタ + name_normalized 重複防止）
- `__tests__/features/search/tagLimit.test.ts`（1000/5000/10000 タグ性能計測、TG1 限界把握）
- `maestro/flows/search_flow.yml`（Home 検索バー → /search → 結果タップ → 戻るで検索画面復帰）
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

- `__tests__/features/export/csv.test.ts`
- `__tests__/features/export/pdf.test.ts`
- `__tests__/features/export/free_limit.test.ts`（Free はエクスポート不可）
- 主要シナリオ: 10 本の盆栽 × 50 件作業を CSV 出力 → UTF-8 BOM 確認 → Excel で文字化けなし

---

### F-11 お引っ越し機能（デバイス移行）

旧端末から新端末へ全データを暗号化転送する。クラウド非経由。

#### できること

- **QR コードによる鍵交換**（ECDH P-256 + HKDF-SHA256）
- **WebRTC DataChannel による LAN 転送**（同一 Wi-Fi 前提、STUN/TURN サーバ非依存）
- **AES-256-GCM でペイロード暗号化**（expo-crypto の SDK 55 新 API）
- **SQLite DB ファイル丸ごとコピー**（`wal_checkpoint(FULL)` 後）
- 写真の相対パス維持（新端末の `documentDirectory` 配下に再配置）
- 転送進捗の%表示と推定残り時間
- 失敗時の手動リトライ

#### できないこと（明示）

- **クラウド経由転送**（理由: 完全ローカル原則）
- **Bluetooth / AirDrop 経由転送**（理由: サイズ上限・速度・iOS/Android 相互運用性）
- **部分転送・差分転送**（v1 は全データ置換のみ、v1.2+ 検討）
- **異なる OS 間転送**（v1 は iOS→iOS / Android→Android のみ、iOS↔Android は v1.1+）
- **Expo Go での動作**（理由: WebRTC が EAS Dev Build 必須）

#### 受け入れ条件（テストで担保）

- `__tests__/features/migration/ecdh_handshake.test.ts`
- `__tests__/features/migration/aes_gcm.test.ts`
- `__tests__/features/migration/wal_checkpoint.test.ts`
- `maestro/flows/migration_same_wifi.yaml`（実機必須、CI ではスキップ）
- 主要シナリオ: 旧端末で QR 表示 → 新端末でスキャン → 同一 Wi-Fi 下で 500MB 転送 ~80 秒で完了 → 新端末で全データ表示

---

### F-12 多言語対応

19 言語で UI・樹種名・作業名を提供する。

#### できること

- 対応言語: **en, ja, fr, es, de, it, pt, ru, zh-Hans, zh-Hant, ko, th, id, vi, hi, tr, nl, pl, sv**（§7 参照）
- 初回起動時の**端末 locale 自動検出**
- 設定画面での**手動言語切替**（即時反映、再起動不要）
- pt は **pt-BR 基準**
- zh-Hant は **OpenCC `s2twp.json` による zh-Hans からの自動生成ベース**、後で人手微修正
- **ICU plural 形式**（ru / pl の 4 形、ar の 6 形に対応できる形式で保管）
- **数値・日付・通貨**は `Intl` API で各 locale に自動フォーマット

#### できないこと（明示）

- **RTL 完全レイアウト**（理由: v1 は LTR のみ、RTL は v1.3+）
- **アラビア語**（理由: RTL 対応とセットなので v1.3+）
- **ユーザー独自言語追加**（v1 は 19 言語固定）
- **機械翻訳リアルタイム生成**（翻訳ファイルは事前ビルド済み、Claude Code で生成）

#### 受け入れ条件（テストで担保）

- `__tests__/i18n/locale_detection.test.ts`
- `__tests__/i18n/plural_ru.test.ts`
- `__tests__/i18n/plural_pl.test.ts`
- `scripts/i18n-check.mjs`（CI で全言語キー存在確認、不足があれば失敗）
- `scripts/i18n-audit.mjs`（未使用キー・ハードコード文字列検出）
- 主要シナリオ: 端末を `pl` で起動 → 全画面ポーランド語 → 「3 件の盆栽」が `3 bonsai` の正しい複数形で表示

**絶対ルール**: user-visible な**全て**の文字列は `src/core/i18n/` の翻訳キー経由で表示する。直接文字列を JSX に書いた場合、`i18n:audit` スクリプトで検出され CI が失敗する。

---

### F-13 課金（サブスク＋買切）

月額・年額サブスクリプション + Lifetime 買切で Pro 機能を解放する。

#### できること

- **Free プラン**: 基本機能、写真 3 枚/本、タイミング計算なし、エクスポートなし、バナー広告表示
- **Pro プラン**: 全機能、写真無制限、タイミング計算あり、エクスポートあり、広告非表示
- 3 つの購入オプション:
  - **月額**: ¥500 / $4.99
  - **年額**: ¥3,980 / $39.99（月額比 33% OFF 訴求）
  - **買切（Lifetime）**: ¥9,800 / $79.99（**Non-Consumable IAP / One-time Product**）
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

- `__tests__/features/purchase/buy_monthly.test.ts`
- `__tests__/features/purchase/buy_annual.test.ts`
- `__tests__/features/purchase/buy_lifetime.test.ts`
- `__tests__/features/purchase/restore.test.ts`
- `maestro/flows/paywall_to_purchase.yaml`
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
- **X ボタン 48dp 以上、周囲 16dp 余白**（シニア誤タップ防止）
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

- `__tests__/features/ads/visibility.test.ts`（Pro ならバナー非表示）
- `__tests__/features/ads/placement.test.ts`（Home 画面のみに表示）
- `__tests__/features/ads/ump_consent.test.ts`
- `__tests__/features/ads/att_order.test.ts`（ATT → UMP → AdMob 初期化）
- `maestro/flows/first_launch_consent.yaml`
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

- `__tests__/features/theme/system_mode.test.ts`
- `__tests__/features/theme/outdoor_mode.test.ts`
- `__tests__/features/theme/contrast_aaa.test.ts`（WCAG 2.2 検証）
- 主要シナリオ: システム設定ダーク → アプリもダーク / 手動で屋外 ON → コントラスト AAA / reduced motion ON → 遷移瞬時

---

### F-16 ローカル通知

作業リマインダーをローカル通知で配信する。

#### できること

- **DAILY / WEEKLY / DATE trigger** でのスケジュール（iOS/Android 共通）
- 通知タップで**deep link** により該当盆栽の作業画面へ直接遷移
- **通知チャネル設定**（Android 13+ 必須）を `getExpoPushTokenAsync` より先に実行
- **SCHEDULE_EXACT_ALARM 権限**（Android 12+、正確な時刻配信用）
- 通知許可の**再要求フロー**（一度拒否されても設定画面への誘導）
- 通知履歴（端末内、最大 30 日）

#### できないこと（明示）

- **CALENDAR trigger**（理由: iOS のみ対応、Android 非対応なので採用不可）
- **プッシュ通知（サーバ起点）**（理由: サーバなし、完全ローカル）
- **Critical Alerts**（理由: Apple の特別 entitlement 承認必須、盆栽用途では不要）
- **通知スヌーズ機能**（v1 は再スケジュールのみ、v1.1+ で検討）

#### 受け入れ条件（テストで担保）

- `__tests__/features/notification/schedule.test.ts`
- `__tests__/features/notification/channel_android.test.ts`
- `__tests__/features/notification/deep_link.test.ts`
- `maestro/flows/notification_permission.yaml`
- 主要シナリオ: 盆栽登録 → 水やり通知スケジュール → 明日 8:00 に通知配信 → タップで該当盆栽の作業画面へ

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
- **`reminders`**（リマインダー、将来予定）
  - `id, bonsai_id, type, title, due_at, recurrence_rule (RFC5545 RRULE), notify_offset_min, notification_id, completed_at, linked_event_id, created_at`
- **`tags`** / **`bonsai_tags`**（ユーザー定義タグ、多対多）
- **`events_fts`**（FTS5 仮想テーブル、trigram tokenizer、`note` 検索用）

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
- `idx_reminders_due_active`（`due_at` where `completed_at IS NULL`）: 未完了リマインダー

---

## 6. 非機能要件（NFR）

### 6.1 UX / 性能

- **起動時間**: コールドスタート < 3 秒（中堅端末、2022 年以降機種）
- **主要操作のレスポンス**: < 200ms（タップ → 視覚フィードバック）
- **SQLite クエリ**: 盆栽一覧 50 件表示 < 100ms、作業履歴 500 件表示 < 300ms
- **写真ロード**: サムネイル < 500ms、原本 < 1.5 秒
- **データロード時の進捗表示**: 1 秒を超える操作にはインジケーター
- **FlashList 前提**: 50 件以上のリストは `@shopify/flash-list` を使う（`FlatList` 不可）

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
- **`compatibilityJSON: 'v4'` を必ず指定**（ru / pl の 4 形 plural 対応のため）
- **ICU plural 形式**を使用（ru: 4 形、pl: 4 形、ja/zh/ko/th/vi: 1 形）
- **zh-Hant 自動生成**: OpenCC `s2twp.json` で zh-Hans から自動生成、人手微修正
- **数値・日付・通貨**: `Intl.NumberFormat` / `Intl.DateTimeFormat` で locale 自動フォーマット
- **Hermes iOS の plural 対応**: `@formatjs/intl-pluralrules/polyfill-force` を起動時 import 必須

### 7.1 翻訳ファイル構造

```
src/core/i18n/locales/
├── en/
│   ├── common.json
│   ├── bonsai.json
│   ├── care.json
│   ├── species.json  (樹種名の通称)
│   └── ...
├── ja/ (同構造)
├── zh-Hans/ (同構造)
├── zh-Hant/ (同構造、OpenCC 自動生成ベース)
...
```

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

| プラン | 価格            | 内容                                                                                        |
| ------ | --------------- | ------------------------------------------------------------------------------------------- |
| Free   | ¥0 / $0         | 樹木無制限登録、写真 3 枚/本、タイミング計算なし、エクスポートなし、Home 下部バナー広告あり |
| 月額   | ¥500 / $4.99    | 全機能、写真無制限、タイミング計算あり、エクスポートあり、広告なし                          |
| 年額   | ¥3,980 / $39.99 | 全機能、月額比 **33% OFF** 訴求                                                             |
| 買切   | ¥9,800 / $79.99 | 全機能、永久、広告なし（Lifetime = **Non-Consumable IAP** として登録）                      |

### 8.2 Free / Pro 差分

| 機能                           | Free     | Pro                                          |
| ------------------------------ | -------- | -------------------------------------------- |
| 盆栽登録数                     | 無制限   | 無制限                                       |
| 写真 1 本あたり                | 3 枚まで | 無制限                                       |
| 作業履歴記録                   | 可       | 可                                           |
| リマインダー分散（F-05）       | 簡易版   | 完全版                                       |
| 年次タイムライン画像（F-08）   | 不可     | 可                                           |
| CSV / PDF エクスポート（F-10） | 不可     | 可                                           |
| お引っ越し機能（F-11）         | **可**   | **可**（データ保護は基本権利、有料化しない） |
| Home 下部バナー広告            | 表示     | **完全非表示**                               |

詳細は `constraints.md` を正とする。

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
- **X（閉じる）ボタン**: **48dp 以上**、右上（シニア誤タップ防止）
- **セーフエリア**: 広告周囲 **16dp 以上の余白**
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

- **v1.0 初期**: アプリバンドルに prebuild SQLite を同梱（`expo-asset` 経由）
- **更新**: S3 CDN + EAS Update で差分配信（樹種追加）
- **サイズ目安**: 全樹種 + 名称 19 言語 = **gzip 後 ~150KB**
- **出典**: 盆栽教本（藤岡友宏『盆栽入門』、近代盆栽、Bonsai Empire Tree Species Guide 等）、**各エントリに出典併記**

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

```
global:          lines 80, branches 70
src/domain/**:   lines 95, branches 90
src/lib/**:      lines 90, branches 85
src/features/**: lines 70, branches 60
```

### 11.3 F 番号 → テストパス逆引き表

| F 番号 | Jest パス                                                                                                 | Maestro フロー                                               |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| F-01   | `__tests__/features/bonsai/**`                                                                            | `maestro/flows/add_bonsai.yaml`                              |
| F-02   | `__tests__/features/event/**`                                                                             | `maestro/flows/log_watering.yaml`                            |
| F-04   | `__tests__/features/care/aggregateWatering.test.ts` + `daysSinceWatering.test.ts` + `heatmapData.test.ts` | `maestro/flows/watering_heatmap.yml` + `watering_filter.yml` |
| F-05   | `__tests__/domain/schedule/distribute.{test,pbt.test}.ts`                                                 | –                                                            |
| F-07   | `__tests__/features/wiring/**`                                                                            | –                                                            |
| F-08   | `__tests__/features/photo/**`                                                                             | `maestro/flows/add_photo.yaml`                               |
| F-09   | `__tests__/features/search/**`                                                                            | –                                                            |
| F-10   | `__tests__/features/export/**`                                                                            | –                                                            |
| F-11   | `__tests__/features/migration/**`                                                                         | `maestro/flows/migration_same_wifi.yaml`（実機のみ）         |
| F-12   | `__tests__/i18n/**` + `scripts/i18n-check.mjs`                                                            | –                                                            |
| F-13   | `__tests__/features/purchase/**`                                                                          | `maestro/flows/paywall_to_purchase.yaml`                     |
| F-14   | `__tests__/features/ads/**`                                                                               | `maestro/flows/first_launch_consent.yaml`                    |
| F-15   | `__tests__/features/theme/**`                                                                             | –                                                            |
| F-16   | `__tests__/features/notification/**`                                                                      | `maestro/flows/notification_permission.yaml`                 |

### 11.4 必須 CI ゲート

PR マージ前に以下 8 スクリプトが全て green であること（`pnpm verify` で一括実行）:

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm format:check`
4. `pnpm test`
5. `pnpm i18n:check`（19 言語キー完全一致検証）
6. `pnpm config:check`
7. `pnpm metadata:check`（App Store / Google Play メタデータ 19 言語整合性）
8. `pnpm ump:check`（UMP 同意フォーム構成検証）

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
- [`glossary.md`](./glossary.md): 用語の正
- [`docs/adr/`](../adr/): 意思決定の履歴
- [`docs/i18n/translation_guide.md`](../i18n/translation_guide.md): Claude Code 翻訳プロンプトテンプレート
- `scripts/validate_i18n.py`: 翻訳検証スクリプト
- `scripts/i18n-audit.mjs`: 翻訳キー監査
- `src/db/schema.ts`: SQLite スキーマの正
- `src/db/filePathUtils.ts`: 相対パス変換ユーティリティ

---

## 付録 A: 小中学生向け用語ミニ辞典

- **Diátaxis**（ディアタクシス）: ドキュメントを 4 つに分ける考え方。Tutorial（使い方）/ How-to（手順）/ Reference（事実）/ Explanation（考え方）。本書は Reference。
- **Reference 文書**: 「何ができる」を事実として書く説明書。
- **ADR**（Architecture Decision Record）: 「なぜこう決めたか」を残す日記。
- **Figma**: デザインツール。画面の見た目の「正解」が置いてある。
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
- **ECDH**: 2 つの端末が安全に秘密鍵を共有する数学的な方法。
- **HKDF**: 鍵から別の鍵を作る関数。
- **AES-256-GCM**: データを暗号化する方法。強くて速い。
- **WebRTC DataChannel**: 端末同士が直接データをやり取りする技術。
- **Hermes**: React Native の JavaScript エンジン。速くて軽い。
- **Expo Dev Build**: Expo Go より多くの機能を使えるビルド版。
- **EAS Build**: Expo のクラウドビルドサービス。
- **WCAG AA / AAA**: ウェブアクセシビリティのレベル。AAA が最も厳しい。
- **MoSCoW 法**: 優先度を Must / Should / Could / Won't で分類する方法。

---

## 付録 B: package.json 主要スクリプトの意味

本プロジェクトの `package.json > scripts` に定義されたコマンドの意味:

| コマンド                       | 何をする                                                   | いつ使う                    |
| ------------------------------ | ---------------------------------------------------------- | --------------------------- |
| `pnpm dev` / `pnpm start`      | Expo 開発サーバ起動                                        | 普段の開発                  |
| `pnpm android`                 | Android 実機・エミュレータでビルド実行                     | Android 動作確認            |
| `pnpm ios`                     | iOS シミュレータでビルド実行                               | iOS 動作確認                |
| `pnpm lint`                    | コードスタイルチェック（ESLint）                           | PR 作成前                   |
| `pnpm type-check`              | TypeScript 型エラーチェック                                | PR 作成前                   |
| `pnpm test`                    | Jest テスト実行                                            | PR 作成前                   |
| `pnpm test:e2e`                | Maestro E2E テスト実行                                     | 主要フロー確認時            |
| `pnpm i18n:audit`              | 翻訳キーの未使用・ハードコード検出                         | i18n 変更後                 |
| `pnpm i18n:check`              | 19 言語すべての翻訳キー一致検証                            | PR 作成前                   |
| `pnpm config:check`            | `.env` や app.json の必須項目検証                          | ビルド前                    |
| `pnpm format:check`            | Prettier フォーマット確認                                  | PR 作成前                   |
| `pnpm format:fix`              | Prettier 自動整形                                          | 整形ズレ時                  |
| `pnpm verify`                  | lint + type-check + format + test + i18n + config 一括実行 | **PR 前の最終確認**         |
| `pnpm prebuild`                | Expo prebuild（ネイティブコード生成）                      | 初回 / ネイティブ依存追加時 |
| `pnpm build:android`           | Android AAB ビルド（本番）                                 | ストア提出前                |
| `pnpm build:android:apk:local` | Android 開発用 APK ローカルビルド                          | 実機テスト配布              |
| `pnpm build:android:aab:local` | Android 本番用 AAB ローカルビルド                          | ストア提出準備              |
| `pnpm metadata:check`          | ストアメタデータ 19 言語整合性検証                         | ストア提出前                |
| `pnpm dev:android`             | Android 開発モード起動（カスタムスクリプト）               | Android 開発                |
| `pnpm ump:check`               | UMP 同意フォーム構成検証                                   | 広告機能変更後              |
| `pnpm debug:start/stop/status` | デバッグセッション管理                                     | トラブルシュート            |
| `pnpm monitor`                 | リアルタイムモニタリング起動                               | パフォーマンス確認          |

**補足**: `pnpm prepare` は `git config core.hooksPath .githooks` を実行し、Git フックを `.githooks` に向ける。`npm install` 時に自動実行される。

---

## 付録 C: F 番号対応の痛み × 機能 × データ根拠

`product_strategy.md v2.0 §3` との対応:

| F 番号               | 痛み #                          | 実データ根拠                                         |
| -------------------- | ------------------------------- | ---------------------------------------------------- |
| F-01, F-02, F-08     | 🩹8 紙の帳面が読めなくなる      | 高橋さん型ペルソナの現実                             |
| F-04                 | 🩹2 健康問題の 98% が水やり由来 | Bonsai Direct 公式                                   |
| F-05                 | 🩹3 リマインダー日付集中        | Bonsai Care App 実レビュー「2/23 と 3/23 に集中」    |
| F-07                 | 🩹6 針金食い込み永久傷          | Marcus 実例、BonsaiNut 多数                          |
| F-09                 | 🩹9 Excel / Notion 管理面倒     | BonsaiNut「Notion で自作」                           |
| F-10                 | 🩹8, 🩹9                        | 展示会出品・青色申告の実需                           |
| F-11                 | 🩹10 スマホ買い替え不安         | 高橋さん 62 歳の直接懸念                             |
| F-14                 | 🩹11 広告誤タップ               | シニア 30% 占める BonsaiLog 前提                     |
| AI 非搭載（原則 P2） | 🩹5 AI 誤同定 → ケアズレ        | PictureThis「15 本全部初回誤り」、Greg「半数誤同定」 |

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
