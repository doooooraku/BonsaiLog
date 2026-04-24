# ADR-0002: 収益モデルの選択（広告 + サブスクリプション）

- Status: Proposed
- Date: YYYY-MM-DD
- Deciders: @your-handle
- Related: constraints / reference

---

## Context（背景：いま何に困っている？）

- 現状：アプリの収益化方針が未確定。
- 困りごと：Free ユーザーの収益柱と Pro の価値差別化を明確にする必要がある。
- 制約/前提：
  - `docs/reference/constraints.md` の広告・課金に関する記述

---

## Decision（決めたこと：結論）

- 決定：AdMob バナー広告を Free のみに表示し、Pro はサブスクリプション（広告ゼロ）で収益化する。`react-native-google-mobile-ads` を採用。
- 適用範囲：v1.x / Free プランのみ広告表示

---

## Decision Drivers（判断の軸：何を大事にした？）

- SDK の保守性と実績（React Native 向けの主流ライブラリ）
- Pro で広告ゼロを保証できる構成
- テスト広告 / 本番広告の切り替えが容易
- Expo 環境でも Config Plugin で運用可能

---

## Alternatives considered（他の案と却下理由）

### Option A: サブスクリプションのみ（広告なし）

- 概要：Free は機能制限のみ、広告なし
- 良い点：UX が良い、実装がシンプル
- 悪い点：Free ユーザーからの収益がゼロ
- 却下理由：Free ユーザー層からの収益柱が必要

### Option B: 広告のみ（サブスクなし）

- 概要：全ユーザーに広告表示
- 良い点：有料課金の実装が不要
- 悪い点：ヘビーユーザーの満足度低下、単価の天井が低い
- 却下理由：Pro ユーザーの広告ゼロ体験を確保したい

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- Free で収益化が成立
- Pro は広告ゼロを徹底できる

### Negative（辛い/副作用）

- SDK 設定（App ID / 審査 / 同意フロー）が必要
- リリース時に広告 ID の注入ミスが起きやすい

### Follow-ups（後でやる宿題）

- [ ] EU/EEA 向け同意フロー（UMP）の実装
- [ ] AdMob 審査前チェックの整備
- [ ] `docs/how-to/development/admob_advertising_setup.md` の手順に従ってセットアップ

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：対象なし（UI / SDK 実装）
- 手動チェック：
  - 手順：Free でホーム画面を開き広告表示を確認 / Pro で広告が出ないことを確認
  - 期待結果：Free のみバナー表示、Pro は非表示

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：AdMob App ID / 広告ユニット ID の環境変数注入が必要
- ロールバック方針：広告コンポーネントを外して再リリース
- 検知方法：手動テスト / ストア審査

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`
- External docs:
  - https://docs.page/invertase/react-native-google-mobile-ads
  - https://developers.google.com/admob/android/test-ads
  - https://developers.google.com/admob/ios/test-ads

---

## Notes（メモ：任意）

- 本番は環境変数で広告 ID を注入し、開発はテスト ID を使う。
- `.env` に `ADMOB_IOS_APP_ID`, `ADMOB_IOS_BANNER_ID`, `ADMOB_ANDROID_APP_ID`, `ADMOB_ANDROID_BANNER_ID` を定義する。
