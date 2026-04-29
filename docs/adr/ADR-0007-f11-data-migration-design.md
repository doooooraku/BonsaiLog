---


# ADR-0007: F-11「お引っ越し機能」の設計を Repolog 方式 (ZIP + Share Sheet) に変更し、Expo SDK 55 新 API + react-native-zip-archive で実装する

- Status: Accepted
- Date: 2026-04-29
- Deciders: @doooooraku
- Related:
  - 上書き対象: `functional_spec.md` §16 (旧設計: QR + WebRTC + AES-256-GCM + ECDH P-256 + HKDF-SHA256)
  - 連動: ADR-0005 (iOS 暗号化エクスポートコンプライアンス) — `usesNonExemptEncryption: false` を維持できる前提
  - 参考: Repolog 実装 (`/home/doooo/04_app-factory/apps/Repolog/src/features/backup/`)
  - Issue: [#12](https://github.com/doooooraku/BonsaiLog/issues/12)

---

## Context（背景：いま何に困っている？）

- 現状：
  - `functional_spec.md` §16 で F-11 を「QR コード + WebRTC P2P + AES-256-GCM + ECDH P-256 + HKDF-SHA256 + DTLS の 4 層暗号化」として定義していた。
  - これに伴い暗号化スタック (`@noble/curves` + `@noble/hashes` + `expo-crypto` の AES-GCM) と WebRTC ライブラリ + QR スキャナの導入が前提だった。
- 困りごと：
  1. **実装コストが過大**: 暗号化 4 層 + P2P + QR は v1.0 ローンチを大幅に遅延させる。
  2. **テスト容易性が極めて低い**: 2 端末 + 同一 Wi-Fi (AP isolation 不可) + WebRTC + QR スキャンを E2E でカバー困難 → 手動テスト前提。
  3. **シニアペルソナ (高橋さん 62 歳) で UX 厳しい**: 「同一 Wi-Fi」「QR を両端末で同時操作」が前提条件として多すぎる。
  4. **iOS 暗号化フラグ ADR-0005 と整合判断が再必要**: 強い暗号 (AES-256-GCM, ECDH P-256) を使う場合、米国輸出規制の `usesNonExemptEncryption: false` の見直しが必要になる可能性。
  5. **既存資産 (Repolog) の流用が検討から漏れていた**: 同チーム先行アプリ Repolog が既に「ZIP + Share Sheet 方式」を実装済み (`backupService.ts` 381 行 + `backupImportPlanner.ts` 67 行 + `BackupScreen.tsx` 193 行)。
- 制約/前提：
  - `docs/reference/constraints.md` §1-1 ローカル志向 (Local-first) — クラウド経由は哲学に反する。
  - `docs/reference/constraints.md` §5 セキュリティ — 個人特定情報を含めない (位置情報は USDA Hardiness Zone 単位、F-06 で確定)。
  - `product_strategy.md` §3-1 🩹10 「お引っ越し機能」は v1.0 ローンチ機能。
  - `product_strategy.md` 高橋さん 62 歳ペルソナで「お引っ越し機能必須」と要請あり (MoSCoW: Should → 実質 Must 昇格)。

---

## Decision（決めたこと：結論）

- 決定：F-11 の設計を以下の通り変更する。
  1. **方式**: Repolog 完全踏襲。`manifest.json` + `photos/` + `bonsai.db` (SQLite VACUUM INTO スナップショット) を **ZIP** に格納し、`expo-sharing.shareAsync()` で Share Sheet 経由でユーザーに渡す。インポートは新 API `File.pickFileAsync({ type: ['application/zip'] })` でファイル選択 → ZIP 解凍 → 検証 → 復元。
  2. **暗号化**: なし (生 JSON + 生 JPEG)。位置情報は USDA Hardiness Zone レベルのみ保持 (F-06)、PII を含めない方針 (constraints.md §5) と整合。
  3. **マージポリシー**: 追記のみ (Append)。ID 重複はスキップ。置換モードは v1.0 では実装しない (v1.1 以降で UX フィードバック次第)。
  4. **schema_version**: 厳格一致のみ (`!== 1` で拒否)。マイグレータ API (`migrate(manifest: ManifestV1): ManifestV2`) を v1.0 時点で予約する。
  5. **ライブラリ**:
     - `expo-file-system` (SDK 55 同梱、新 API: `Paths.document`, `Paths.cache`, `File`, `Directory`, `File.pickFileAsync`)
     - `expo-sharing` (SDK 55 同梱)
     - `react-native-zip-archive@7.0.2` (固定ピン、`pnpm.overrides` で transitive 経由のアップグレードを禁止)
  6. **採用しない**: `@noble/curves` / `@noble/hashes` / `expo-crypto` (暗号化用途) / WebRTC / QR コードスキャナ / `expo-document-picker` (新 API `File.pickFileAsync` で代替)。
  7. **写真リサイズ**: 長辺 **2048 px** にリサイズしてから ZIP に格納 (`expo-image-manipulator` 使用)。バックアップサイズ 200 MB ハード制限。
  8. **DB スナップショット**: SQLite `VACUUM INTO 'backup-<ts>.db'` で書き出し → ZIP に同梱。本体 DB をロックしない。
  9. **cacheDirectory 後始末**: `Sharing.shareAsync()` 完了後に `File.delete()` で必ず手動削除。
- 適用範囲：v1.0 から全プラン (Free / Pro 両方) で利用可能。

---

## Decision Drivers（判断の軸：何を大事にした？）

- Driver 1: **実装コスト最小化** — Repolog の既存実装を新 API で書き直すだけで完結する設計を選択。
- Driver 2: **シニアペルソナ UX** — Share Sheet → 「ファイルに保存」/「メールで送る」/「LINE で送る」が標準 OS UI で 1 タップ。QR + 同一 Wi-Fi 制約を撤廃。
- Driver 3: **将来の保守コスト最小化** — `expo-file-system/legacy` の削除予告に備え、初期から新 API ベースで構築。
- Driver 4: **iOS 暗号化フラグ整合性** — AES-256-GCM 等のカスタム暗号を排除し、ADR-0005 (`usesNonExemptEncryption: false`) を維持。
- Driver 5: **クロスプラットフォーム互換** — ZIP は iOS / Android で標準対応、機種変フローで OS 跨ぎが可能。

---

## Alternatives considered（他の案と却下理由）

### Option A: 当初設計 (QR + WebRTC + AES-256-GCM + ECDH P-256)

- 概要：4 層暗号化 + P2P 転送 + QR で鍵交換。
- 良い点：強いセキュリティ、クラウド非経由 (純 Local-first)。
- 悪い点：実装コスト過大、テスト困難、シニア UX 厳しい、ADR-0005 見直しが必要。
- 却下理由：実装コスト vs 価値で見合わない。位置情報を Zone 単位で持つため強い暗号は過剰。

### Option B: SQLite `.db` ファイル + 写真フォルダを別々に Share

- 概要：DB と写真フォルダを 2 つに分けて Share。
- 良い点：圧縮ライブラリ不要。
- 悪い点：シニアが 2 ファイル管理で混乱必発。インポート時の整合性検証が困難。
- 却下理由：高橋さんペルソナで詰む。

### Option C: JSON Bundle (写真 Base64 埋め込み)

- 概要：単一 JSON ファイルに写真を Base64 で埋め込み。
- 良い点：ファイル 1 個で完結。
- 悪い点：+33% 容量膨張、OOM 必発 (盆栽 50 樹 × 写真 3 枚で容易に 100MB 超)。
- 却下理由：`react-native-zip-archive` の 200MB 推奨上限を超える。

### Option D: Cloud-relay (Firebase / Supabase の一時バケット経由)

- 概要：クラウドに一時アップロード → URL 共有。
- 良い点：UX シンプル。
- 悪い点：Local-first 哲学違反、運用費発生、サービス退役リスク。
- 却下理由：constraints.md §1-1 と矛盾。

### Option E: AirDrop / Nearby Share + ZIP

- 概要：ZIP は作るが転送は OS 機能任せ。
- 良い点：実装コスト最小。
- 悪い点：iOS ↔ Android クロス転送不可。
- 却下理由：機種変ユースケースの半分 (OS 跨ぎ) を捨てることになる。

### Option F: legacy API のまま実装 (Repolog 踏襲)

- 概要：`expo-file-system/legacy` で書く。
- 良い点：Repolog のコードをそのままコピペできる、最速。
- 悪い点：SDK 56〜58 のいずれかで legacy 削除予告 → 再移行が発生。Repolog と BonsaiLog で同じ移行作業が 2 回発生する。
- 却下理由：将来コスト過大。

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 実装コストが従来案比で 3〜5 倍削減 (暗号化 + WebRTC + QR スタックが消える)。
- E2E テストが Maestro でカバー可能に (画面到達 + Share Sheet 起動)。Repolog の `__tests__/backupImportPlanner.test.ts` を移植して純粋関数の単体テスト確保。
- ADR-0005 (`usesNonExemptEncryption: false`) を変更不要、米国輸出規制まわりのオーバーヘッドを避けられる。
- 機種変フローが 6 タップで完結 (旧端末 3 + 新端末 3) — シニアにも分かりやすい標準 OS UI。
- 依存パッケージ最小: 暗号化 3 個 + WebRTC + QR + `expo-document-picker` を全て排除し、`react-native-zip-archive` 1 個を新規追加するのみ。

### Negative（辛い/副作用）

- **暗号化なし**: ユーザーが ZIP をクラウド (iCloud Drive / Google Drive) に保存した場合、第三者がアクセスする可能性。UI で「バックアップは暗号化されません。クラウドに保存する場合はパスワードで保護されたフォルダにご保管ください」を明示する責任がある。
- **写真リサイズ**: 長辺 2048 px にリサイズするため、原寸保存ではなくなる。盆栽愛好家の高解像度ニーズには応えられないが、200MB 制限のためトレードオフとして受容する。
- **`react-native-zip-archive` の New Architecture 対応未公式**: コミュニティ動作確認 (Issue #330) はあるが公式に "Untested"。BonsaiLog の RN 0.83 New Arch 環境で問題が出る可能性。6 ヶ月ごとの Issue #330 進捗監視が必要。
- **`File.pickFileAsync` API の安定性が浅い**: SDK 55 で導入直後 → 将来の API 変更リスク。影響箇所を 1 ファイル (BackupImportScreen の Picker 呼び出し) に限定する設計で吸収。
- **マージは追記のみ**: 「機種変で全置換したい」UX 要件が後から出る可能性 → v1.1 で置換モード追加を検討。

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/functional_spec.md` §16 を本 ADR の方針に書き換え (約 175 行 → 50 行程度に圧縮)。
- [ ] `docs/explanation/product_strategy.md` §3-1 🩹10 の「QR コード + 暗号化バックアップ」記述を「ZIP ファイル + Share Sheet (暗号化なし、ユーザー責任)」に修正。
- [ ] `docs/explanation/product_strategy.md` L111 MoSCoW 表で F-11 を「Should → Must」昇格、§9-3 の v1.3 暗号化記述を削除。
- [ ] `docs/reference/constraints.md` に追記: 「F-11 のテストは手動前提 (2 端末必要)、E2E は画面到達のみ」「バックアップは暗号化なし、ユーザー責任モデル」「写真リサイズ長辺 2048px、200MB ハード制限」。
- [ ] `package.json` に `react-native-zip-archive@7.0.2` 追加 (固定ピン、`^` `~` 不可)。`pnpm.overrides` で transitive 強制ピン。
- [ ] `package.json` から `@noble/curves`, `@noble/hashes` の追加候補を削除 (元々未追加なので no-op)。
- [ ] Repolog の `backupService.ts` / `backupImportPlanner.ts` / `BackupScreen.tsx` を BonsaiLog 用に移植 (legacy → 新 API 変換)。
- [ ] `Issue #330` (zip-archive New Arch 完全対応) を **6 ヶ月ごとに watch**。停滞時は自前 Expo Modules ラッパーへの撤退路を ADR で別途検討。
- [ ] Maestro `flows/backup-screen-reach.yml` を移植。
- [ ] Jest 単体テスト: `__tests__/backupImportPlanner.test.ts` 移植。
- [ ] UI コピー定義: 「バックアップは暗号化されません」警告文を i18n 19 言語に展開。
- [ ] `docs/reference/tasks/lessons.md` に「同種機能は先行アプリの実装を流用検討する」を追記 (本 ADR の根本原因対応)。

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - Jest: `__tests__/backupImportPlanner.test.ts` (Repolog 由来の純粋関数テスト) を移植 — マージプラン構築・schema_version 検証・写真欠損検知。
  - Maestro: `maestro/flows/backup-screen-reach.yml` (画面到達のみ、Share Sheet 起動の手前まで)。
- 手動チェック（必要最小限）：
  - 手順:
    1. 旧端末 (iOS) で盆栽 5 樹 + 各 3 枚写真を登録 → 「バックアップを作成」→ Share Sheet → iCloud Drive に保存。
    2. 新端末 (Android) で iCloud Drive アプリで ZIP をダウンロード → BonsaiLog で「バックアップから復元」→ ファイル選択 → 復元。
    3. 盆栽 5 樹 + 各 3 枚写真が復元されている。`schema_version` 不一致 ZIP を読ませてエラーが出る。
    4. cacheDirectory に ZIP の残骸が残っていない (`adb shell ls /data/data/.../cache/`)。
  - 期待結果: 全項目成功。

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - v1.0 ローンチ時に F-11 を含む。MoSCoW Must 昇格を `product_strategy.md` で反映。
  - リリースノート (`fastlane/metadata/`) に「バックアップ・復元機能を搭載しました」を追記 (19 言語)。
- ロールバック方針：
  - F-11 を v1.0.x のホットフィックスで無効化する場合、`BackupScreen` への遷移を Settings 画面から非表示化 (Feature Flag は使用しない、UI 側でハードコード非表示)。
  - 既に作成された ZIP ファイルはユーザー側に残るため、別バージョンでの復元保証は schema_version 厳格一致で担保。
- 検知方法：
  - Sentry でバックアップ・復元のエラーレートを監視 (`BackupError.code` 別: `unsupported` / `invalid` / `schema` / `share`)。
  - ストアレビューで「お引っ越し」「バックアップ」「復元」キーワード監視 (Repolog 由来 lessons.md パターン)。

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` (関連章: §1-1 Local-first, §5 セキュリティ)
- reference: `docs/reference/functional_spec.md` §16 (要書き換え)
- reference: `docs/reference/basic_spec.md` §F-11
- explanation: `docs/explanation/product_strategy.md` §3-1 🩹10, L111 MoSCoW, L194-204 デバイス移行
- 連動 ADR: `docs/adr/ADR-0005-ios-encryption-compliance.md`
- 既存資産: `/home/doooo/04_app-factory/apps/Repolog/src/features/backup/backupService.ts`
- 既存資産: `/home/doooo/04_app-factory/apps/Repolog/src/features/backup/backupImportPlanner.ts`
- 既存資産: `/home/doooo/04_app-factory/apps/Repolog/src/features/backup/BackupScreen.tsx`
- PR: #<TBD>
- Issue: [#12](https://github.com/doooooraku/BonsaiLog/issues/12)
- External docs:
  - [expo-file-system (latest) - Expo Docs](https://docs.expo.dev/versions/latest/sdk/filesystem/)
  - [expo-file-system CHANGELOG (PR #44359 copy/move async 化)](https://github.com/expo/expo/blob/main/packages/expo-file-system/CHANGELOG.md)
  - [expo-sharing - Expo Docs](https://docs.expo.dev/versions/latest/sdk/sharing/)
  - [react-native-zip-archive 7.0.2 - npm](https://www.npmjs.com/package/react-native-zip-archive)
  - [react-native-zip-archive Issue #330 (New Architecture migration)](https://github.com/mockingbot/react-native-zip-archive/issues/330)
  - [react-native-zip-archive Issue #340 (v7.1.0 Android build break)](https://github.com/mockingbot/react-native-zip-archive/issues/340)
  - [SQLite VACUUM INTO snapshot backup (Ståldal 2025-07)](https://www.staldal.nu/tech/2025/07/14/sqlite-backup/)
  - [Day One Export — JSON+media ZIP (業界先行例)](https://dayoneapp.com/guides/tips-and-tutorials/exporting-entries/)

---

## Notes（メモ：任意）

### 6 ヶ月レビュー責務

`react-native-zip-archive` Issue #330 (New Architecture 完全対応) の進捗を **2026-10-29 までに再確認**。停滞時の撤退路:

1. `react-native-zip-archive` のフォーク + Expo Modules ラッパー自作。
2. RN コミュニティの代替 ZIP ライブラリ (Nitro Modules / TurboModule 対応) への移行。

撤退路発動の判断基準:

- `react-native-zip-archive` が 12 ヶ月更新なし、または
- BonsaiLog の RN/Expo メジャー upgrade で動作不能、または
- New Architecture 必須化 (Old Architecture サポート終了) が公式アナウンスされ、`react-native-zip-archive` が未対応のまま。

### v1.1 以降の拡張候補 (本 ADR の対象外)

- パスワード付 ZIP (AES-256) — `react-native-zip-archive` 7.0.2 で `zipWithPassword` / `unzipWithPassword` 対応済み。
- マージモード切替 (追記 / 完全置換)。
- `schema_version` v2 マイグレータ実装。
- バックアップの定期通知 (リマインダー)。

### Repolog との同期方針

Repolog は SDK 54 + legacy API のまま運用中。BonsaiLog の新 API 移植コードを Repolog に逆移植するかは別途判断 (Repolog の再移行コストを誰が払うか次第)。
