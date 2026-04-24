# ADR-0005: iOS 暗号化エクスポートコンプライアンス（usesNonExemptEncryption: false）

- Status: Proposed
- Date: YYYY-MM-DD
- Deciders: @your-handle

---

## Context（背景：いま何に困っている？）

- 現状：App Store Connect にビルドをアップロードすると、毎回「Missing Compliance」（暗号化コンプライアンス情報の未入力）が表示され、手動対応が必要。
- 困りごと：CI/CD 自動提出のブロッカーになっている。
- 制約/前提：米国輸出管理規則（EAR）に基づき、Apple は全アプリに暗号化の使用状況を申告させる。

---

## Decision（決めたこと：結論）

- 決定：`app.json` の `expo.ios.config.usesNonExemptEncryption` を **`false`** に設定する。
- 適用範囲：iOS ビルド全体

---

## Decision Drivers（判断の軸：何を大事にした？）

- CI/CD 自動提出の実現（手動対応を排除）
- EAR 準拠の正確性
- ストア審査リスクの最小化

---

## Alternatives considered（他の案と却下理由）

### Option A: `true` に設定し、毎回コンプライアンス書類を提出

- 概要：安全側に倒す
- 良い点：免除対象の判断ミスリスクがゼロ
- 悪い点：毎回 2 営業日の遅延。CI/CD との相性が悪い
- 却下理由：自動化の敵

### Option B: 未設定のまま毎回手動対応

- 概要：現状維持
- 良い点：何もしなくてよい
- 悪い点：自動化不可、手動の手間
- 却下理由：保守コストが高い

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 「Missing Compliance」手動対応が不要
- CI/CD 自動 TestFlight 提出が可能になる

### Negative（辛い/副作用）

- 暗号化ライブラリ追加時に再評価を忘れると EAR 違反リスク

### Follow-ups（後でやる宿題）

- [ ] 暗号化ライブラリ追加時の再評価ルールを `coding_rules.md` に記載
- [ ] `pnpm config:check` で `usesNonExemptEncryption` 設定を自動検証

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：`pnpm config:check` が通ること
- 手動チェック：
  - 手順：TestFlight にビルドを提出
  - 期待結果：「Missing Compliance」が表示されない

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：なし（`app.json` の変更のみ）
- ロールバック方針：`usesNonExemptEncryption` を削除して revert
- 検知方法：TestFlight 提出時に手動確認

---

## Links（関連リンク：正へ寄せる）

- [Apple: ITSAppUsesNonExemptEncryption](https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption)
- [Apple: Complying with Encryption Export Regulations](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations)
- [BIS: Encryption Policy Guidance](https://www.bis.doc.gov/index.php/policy-guidance/encryption)
- [Expo: app.json config](https://docs.expo.dev/versions/latest/config/app/)

---

## Notes（メモ：任意）

### 判定基準

以下の暗号使用は全て EAR Category 5 Part 2 Note 4 の免除対象:

| 技術                 | 暗号の種類        | EAR 分類          |
| -------------------- | ----------------- | ----------------- |
| HTTPS 通信           | OS 標準の TLS/SSL | 免除（Note 4）    |
| expo-secure-store    | OS 標準の AES-256 | 免除（Note 4(c)） |
| expo-sqlite          | 暗号化なし        | 該当なし          |
| 独自暗号アルゴリズム | なし              | 該当なし          |

### 再評価トリガー

以下の変更があった場合、この決定を再評価する:

- SQLCipher、E2E 暗号化、VPN 暗号などの暗号化ライブラリ追加
- 独自の暗号アルゴリズム実装
- メディエーション広告ネットワーク追加（独自暗号を含む可能性）
