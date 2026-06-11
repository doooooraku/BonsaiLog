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

### Sess98 追補 2 (2026-06-11): D2/D3/D6 を改訂 — マイルストーン打ち止めを撤廃し無限ループ化

**背景 (user レビュー 3 指摘、同日)**:

1. D2 のマイルストーン列 (10/30/75/150/300) は **生涯 5 回で打ち止め** — 300 件到達後の長期ユーザーには一生出ない。「上限まで使い切る」目的と矛盾
2. iOS の年 3 回/端末は「使い切る」設計になっていない (マイルストーン枯渇後は年 0 回)
3. ダイアログがキャンセルされた場合のカウント方針が未定義 → **事実: 表示/キャンセル/送信の別は Android・iOS ともアプリから一切検知不可** (API は何も返さない仕様)。「キャンセルならノーカウントで再依頼」は実装不可能。代わりに機会を消費しない設計 (ループ) で吸収する

**改訂後 Decision (D2'/D3'/D6'。D1/D4/D5/D7 は変更なし)**:

- **D2' ループ条件**: マイルストーン列を撤廃。累計 logged events **10 件で初回試行** → 以降は「**前回試行から +10 件**」のたびに何度でも (生涯上限なし)。増分条件が「今も使い込んでいる = 満足度シグナル」を毎回担保し、キャンセルされても次の周期で自動再試行される
- **D3' platform 別 cooldown (固定)**: 逓増 (30→60→90 日) を撤廃。**Android = 30 日固定** (Play quota の公式例示 ≒ 月 1 回に張り付いて使い切る)、**iOS = 122 日固定** (365 ÷ 3 回 ≒ 122 日で年 3 回を分散して確実に使い切る。30 日にすると年初 3 ヶ月で 3 枠を消費し残り 9 ヶ月沈黙するため分散が優位)
- **D6' iOS**: D3' の 122 日で年 3 回をフル消化する設計に変更 (旧「逓増で 3 回前後に収束」は枯渇バグがあり撤回)

**頻度の見え方 (Android)**: 盆栽園プロ (月 100 件超) ≒ 毎月 / 愛好家 (月 10 件) ≒ 1〜2 ヶ月に 1 回 / ライト (月 2〜3 件) ≒ 3〜4 ヶ月に 1 回。実表示はさらに Play quota で間引かれる。

**永続化の変更**: `lastMilestone` → `countAtLastRequest` (直近試行時点の累計数)。旧 shape を含む配布ビルドは存在しないため migration なし (persist version 2 のみ)。

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
