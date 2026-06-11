# P-13: レビュー依頼機能の標準実装 (次 app 移植用)

- **渡す先**: Claude Code (新アプリのリポジトリで)
- **タイミング**: コア機能 (記録/保存系) が動き始めた後ならいつでも。リリース前までに 1 回
- **目的**: BonsaiLog で確立したレビュー依頼設計 (ADR-0006 Sess98 Amendment + 追補 2) を、再調査・再議論ゼロで新アプリに移植する
- **背景**: Repolog の反省 (生涯 2 回固定 → レビュー 1 件)。app-factory 全アプリで標準装備とする

---

## 指示 (ここから下をそのまま Claude Code に渡す)

レビュー依頼機能 (in-app review) を実装してください。
BonsaiLog で確立済みの標準設計の移植です。新規の設計議論は不要、以下の確定仕様に従ってください。

### このアプリ固有の設定 (ここだけ毎回書き換える)

1. コアイベント (= ハッピーモーメント): 「`{CORE_EVENT}` の保存成功直後」
   ※ このアプリの中心価値が成功した瞬間。例: BonsaiLog なら「作業記録の保存」
2. 累計カウント: `{COUNT_SOURCE}` (例: ◯◯テーブルの件数。削除済み・ゴミ箱は除く)
3. 配線地点: コアイベントの保存成功 path (該当ファイルは自分で特定して報告すること)
4. 設定画面: 「アプリを評価する」行を追加する画面

### 確定済み設計 (1 次情報確認済み 2026-06-11、再調査不要)

- 公式の事実: Google Play の quota は非公開 time-bound (実効 ≒ 月 1 回)、超過時は黙って非表示。iOS は年 3 回/端末。表示/キャンセル/送信の別は両 OS とも検知不可。「評価する」ボタンから In-App Review API を呼ぶのは Google 公式が禁止 (ボタンには Play Store 直リンクを使う)。事前アンケート (review gating) も禁止
- 設計分担: 「いつ出すか (品質)」= 自前 gate、「何回出すか (頻度)」= OS quota 任せ。自前の年間/生涯 cap は置かない (無限ループ)
- 発火条件 (すべて AND):
  - a. 累計コアイベント >= 10 件 (初回の信頼ライン)
  - b. 初回起動から 3 日以上経過
  - c. 2 回目以降: 前回試行から +10 件増加
  - d. 2 回目以降: 前回試行から Android 30 日 / iOS 122 日 (= 365÷3) 経過
- 「requestReview() を呼んだ = 試行」として記録 (キャンセル検知は不可能。ループ設計なのでキャンセルされても次周期で自動再試行され、機会は失われない)

### 実装要件

- expo-store-review を使用 (通信ゼロ・PII ゼロ、local-first 安全)
- 判定は RN/Expo import ゼロの純粋関数に切り出し、Jest で境界値テスト (9/10 件、3 日保護、29/30 日、121/122 日、+9/+10 件、打ち止めなしの確認)
- 試行履歴は zustand + AsyncStorage persist。⚠️ hydration 完了前に初回起動時刻を書くと起点が毎起動で前進する race があるので、onFinishHydration を待つ bootstrap 関数経由で root layout から初期化すること
- 保存成功 path から fire-and-forget (保存・画面遷移をブロックしない、失敗は warn のみ)
- 設定画面に「アプリを評価する」行: `market://details?id=<package>` → web fallback。In-App Review API は呼ばない。i18n 全言語ぶん追加
- ADR 起票 (この設計を記録) + 機能仕様書があれば該当セクション追記

### 参照実装 (port 元、まずこれを Read して構造を踏襲)

- `/home/doooo/04_app-factory/apps/BonsaiLog/src/features/review/reviewPolicy.ts`
- `/home/doooo/04_app-factory/apps/BonsaiLog/src/features/review/maybeRequestReview.ts`
- `/home/doooo/04_app-factory/apps/BonsaiLog/src/features/review/openStoreListing.ts`
- `/home/doooo/04_app-factory/apps/BonsaiLog/src/stores/reviewStore.ts`
- `/home/doooo/04_app-factory/apps/BonsaiLog/__tests__/features/review/reviewPolicy.test.ts`
- 設計の経緯: 同 repo `docs/adr/ADR-0006-in-app-review-trigger.md`

### 既知の罠 (踏まないこと)

- ダイアログは Play Store からインストールしたビルドでしか表示されない (Dev Build / ローカル APK は無反応 = 実機目視はテスタートラック配布後)
- クローズドテスターは公開レビューを投稿できない (効果は本番公開後)
- レイヤー規約があるなら注意: BonsaiLog では services→db/stores が禁止だったため orchestrator は features 層に置いた

---

## 変数

| 変数             | 意味                                            | 例 (BonsaiLog の場合)                         |
| ---------------- | ----------------------------------------------- | --------------------------------------------- |
| `{CORE_EVENT}`   | アプリの中心価値が完了するイベント              | 作業記録                                      |
| `{COUNT_SOURCE}` | 累計件数の取得元 (削除済み除外の条件も明記する) | events テーブル (status='logged'、ゴミ箱除く) |

## 運用メモ

- アプリごとの本質的判断は `{CORE_EVENT}` の選定 1 点のみ。「そのアプリの中心価値が完了した瞬間」を 1 つ選ぶ
- 閾値 (10 件 / +10 件 / 30 日 / 122 日) は標準値。変えたくなったら本ファイルと port 元 ADR の両方を更新すること
