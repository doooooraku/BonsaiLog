# ADR-0006: アプリ内レビュー促進のタイミング設計

- Status: Accepted
- Date: 2026-04-29
- Deciders: @doooooraku
- Related: constraints / product strategy

---

## Context（背景：いま何に困っている？）

- 現状：アプリにレビューを依頼する仕組みがない。
- 困りごと：星評価は不満ユーザーの自発投稿だけで形成されやすく、ASO で不利。
- 制約/前提：
  - ローカル完結（`docs/reference/constraints.md`）を維持
  - Apple HIG / Google Play ポリシーに準拠

---

## Decision（決めたこと：結論）

- 決定：ユーザーがコア価値を体験した直後（ハッピーモーメント）に、`expo-store-review` の OS 標準ダイアログを条件付きで呼ぶ。
- 条件例:
  - **Free ユーザー**: 累計操作 N 回目で 1 度だけ
  - **Pro ユーザー**: 累計操作 M 回目で 1 度だけ
  - 1 ユーザーあたり生涯**最大 2 回**（Free フラグと Pro フラグを独立管理）
- **自前モーダルや前段プレ確認は置かない**（Apple の "review gating" 議論を回避し、OS 標準 UI を素直に呼ぶ）。

> **Note**: 上記「条件例」の回数固定 (生涯最大 2 回 / Free・Pro フラグ) は Sess98 Amendment で撤廃。現行の正は下記 Amendment の D1〜D7。

### Sess98 Amendment (2026-06-11): 回数固定撤廃 — 「品質は自前 gate、頻度は OS quota」使い切り型へ改訂

**背景**: 前作 Repolog で「生涯 2 回固定」の依頼設計の結果、獲得レビューが 1 件に留まった。根本原因 = OS 側に既に頻度制御 (quota) があることを 1 次調査せず、二重に保守的な自前制限を課したこと。レビュー数最大化のため、自前 gate は「いつ出すか (品質)」に専念し、「何回出すか (頻度)」は OS quota に任せる分担へ改訂する。

**1 次情報 (2026-06-11 確認)**:

- Google Play In-App Review API ([公式](https://developer.android.com/guide/playcore/in-app-review)):
  - quota は**非公開** ("The specific value of the quota is an implementation detail, and it can be changed by Google Play without any notice")
  - time-bound quota。"calling the launchReviewFlow method more than once during a short period of time (for example, less than a month) might not always display a dialog" — 実効はおおむね月 1 回程度と読める
  - 超過時はエラーなく**黙って表示されないだけ**。表示有無のフィードバックは取得不可
  - 「評価する」ボタン等の CTA から本 API を呼ぶことは**公式が明示的に禁止** (quota 切れで無反応 = 壊れた UX)。CTA には Play Store 直リンクを使えと公式指示
- Apple ([公式](https://developer.apple.com/documentation/storekit/requesting-app-store-reviews)): 年 **3 回 / 端末** のハードリミット (365-day period)

**新 Decision**:

- **D1 トリガー地点**: 作業記録の保存成功直後 (単体 `WorkLogConfirmScreen` / 一括 `BulkLogConfirmScreen` の log mode 成功 path)。コア価値 = 記録、の成功体験と直結する唯一のハッピーモーメント
- **D2 マイルストーン条件**: 累計 logged events 数が **10 / 30 / 75 / 150 / 300 件**に到達したとき (到達済み最大マイルストーンを永続化し、同一マイルストーンでは 1 回のみ試行)。使うほど機会が増える = 行動シグナルによる満足度推測 (review gating ではない)
- **D3 逓増 cooldown**: 試行ごとに前回試行から **30 → 60 → 90 日** (4 回目以降 90 日固定) の間隔を必須とする。長期ユーザーへの慢性的表示を防ぐ
- **D4 ネガティブゲート**: 初回起動から 3 日未満は出さない (ライトユーザーの離脱期保護)
- **D5 Android の頻度制御**: 自前の年間/生涯 cap は**置かない**。頻度は Play の quota に任せる。表示有無は検知不可のため「呼び出した = 試行」として cooldown のみ更新する
- **D6 iOS (将来展開時)**: 年 3 回/端末のハードリミットがあるため同ロジックをそのまま使う (D3 逓増 cooldown により年間試行は自然に 3 回前後へ収束し、浪費しない)
- **D7 設定画面の受動導線**: 「アプリを評価する」行を設定画面に追加し、**Play Store 直リンク** (`market://details?id=...` → web fallback) で開く。In-App Review API は呼ばない (上記公式禁止事項)。旧 Follow-up「受動エントリを検討」はこれで解決
- 旧 Decision の「自前モーダル・前段プレ確認 (review gating) を置かない」「対価付与・誘導文言をしない」は**維持**

**実装形**: 純粋関数 `shouldRequestReview(stats)` (Jest 境界値テスト) + AsyncStorage 永続化 (`bonsailog-review` 系キー) + 保存成功 path から `maybeRequestReview()` を fire-and-forget 呼び出し (保存・遷移をブロックしない)。

**検証上の注意**:

- Android のダイアログは **Play Store からインストールされたビルドのみ**表示される (Dev Build / ローカル APK では無反応)。Maestro E2E 不可。検証は Jest + 内部テストトラックでの目視
- クローズドテスト中のテスターは公開レビューを投稿できないため、レビュー数として効くのは**本番昇格後**
- 効果計測: 表示有無は取得不可のため、KPI は「Play Console のレビュー数推移」の手動モニタのみ。閾値 (D2/D3) の調整は Follow-up

---

## Decision Drivers（判断の軸：何を大事にした？）

1. **ハッピーモーメントで聞く**: コア機能の成功直後が最も自然な接点
2. **Local-first を壊さない**: `expo-store-review` はネットワーク通信ゼロ・PII 送信ゼロ
3. **実装コスト最小**: 純粋関数 `shouldRequestReview()` を切り出して Jest で境界条件を網羅
4. **ストア審査リスク最小**: 誘導文言・対価付与・カスタム UI 偽装を全て回避

---

## Alternatives considered（他の案と却下理由）

### Option A: 自前プレ確認モーダル → 分岐

- 概要：「お役に立っていますか？」→ Yes のときだけ OS API
- 良い点：不満ユーザーのガス抜き、平均星評価が上がりやすい
- 悪い点：19 言語の翻訳キー追加、Apple の "review gating" リスク
- 却下理由：コスト対効果が悪い

### Option B: 設定画面に「アプリを評価する」のみ（受動）

- 概要：ユーザーが任意に開く
- 良い点：完全に受動で副作用ゼロ
- 悪い点：コンバージョン率が極端に低い
- 却下理由：ASO 改善の目的を達成できない

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 「成功した時しか聞かれない」設計でユーザー体験への悪影響が最小
- i18n 追加ゼロ（OS が言語を自動選択）
- 純粋関数を切り出すことで境界条件を Jest で完全に押さえられる

### Negative（辛い/副作用）

- iOS の `SKStoreReviewController` には年間最大 3 回のハードリミットがあり、実際にダイアログが表示される保証はない
- TestFlight ビルドではダイアログは表示されない（Apple の仕様）

### Follow-ups（後でやる宿題）

- [ ] リリース後にストアレビューをモニタリングし、閾値 (Sess98 Amendment D2/D3) を調整
- [x] 設定画面への「アプリを評価する」受動エントリ → Sess98 Amendment D7 で採用 (Play Store 直リンク)

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - Jest: `shouldRequestReview()` の境界値テスト（count = N-1/N/N+1、フラグ on/off、プラン跨ぎ）
  - `pnpm verify` が通ること
- 手動チェック：
  - 手順：アプリをクリーンインストールし、コア操作を N 回実行
  - 期待結果：N 回目で 1 度だけダイアログ表示、以降は静か

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：なし（ストア申告メタデータへの影響なし）
- ロールバック方針：`maybeRequestReview()` 呼び出しを削除すれば即座に無効化
- 検知方法：ストアレビューを定期的に手動確認

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`
- expo-store-review: https://docs.expo.dev/versions/latest/sdk/storereview/
- Apple HIG (Ratings & Reviews): https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews
- Google Play In-App Review API: https://developer.android.com/guide/playcore/in-app-review

---

## Notes（メモ：任意）

- iOS TestFlight では `SKStoreReviewController.requestReview()` は UI を表示しない（Apple の仕様）。検証は App Store Production 版か Xcode dev ビルドでのみ可能。
- 試行成否（実際にダイアログが表示されたか）はクライアント側では取得できないため、「呼び出した＝試行済み」としてフラグを立てる。
- 閾値（N, M）はアプリのコア機能に応じて調整する。例: ドキュメント生成成功、タスク完了、データエクスポート成功など。
