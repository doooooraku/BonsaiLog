# ADR-0006: アプリ内レビュー促進のタイミング設計

- Status: Proposed
- Date: YYYY-MM-DD
- Deciders: @your-handle
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

- [ ] リリース後にストアレビューをモニタリングし、閾値を調整
- [ ] 将来的に設定画面への「アプリを評価する」受動エントリを検討

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
