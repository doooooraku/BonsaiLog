# Lessons: 通知 (F-16 / ADR-0014)

## カテゴリ: 「機能が動かない」 は未配線 (デッドコード) を疑う

- **何が起きたか**: 通知リニューアル (2026-05-26、 ADR-0014 Amended) の調査で、 ②水やり繰り返し通知の予約関数 `rescheduleWateringNotifications` (scheduler.ts) が **定義のみでアプリのどこからも呼ばれていない**と判明。 設定画面に ON/OFF トグルは存在し state も保存されるが、 その state を読んで通知を予約するコードが無く、 **通知は 1 通も発火しない**状態だった。
- **根本原因**: UI (トグル) と副作用 (scheduler 呼出) の配線が欠落したまま「実装済」と扱われていた。 トグルが存在する = 機能が動く、 と誤認しやすい。
- **ルール**: 「この機能が動かない / 削除して良いか」 を判断する前に、 **end-to-end の配線**を grep で確認する。 具体的には「設定 state を読む箇所」 → 「副作用 (schedule/API) を呼ぶ箇所」 の経路が繋がっているかを追う。 削除時はこの確認で「実は誰も使えていない」 と分かれば低リスクで消せる (Pattern A、 cross-import ゼロなら 1 PR 削除)。
- **検証 grep 例**: `grep -rn "rescheduleWateringNotifications" app/ src/` → 定義 1 件 + 呼出 0 件ならデッドコード。

## カテゴリ: 通知許可は「いつ聞くか」 が opt-in 率を決める (contextual soft-ask)

- **何が起きたか**: 旧オンボーディング Step 5 は**初回起動時** (盆栽 0・予定 0 = 通知価値が伝わる前) に OS 許可ダイアログを直撃していた。 ADR-0014 Amended で「初めて予定を登録した瞬間 (= 通知が欲しい瞬間) に soft-ask モーダルで聞き、 受け取るを押した時だけ OS 許可を出す」 に変更。
- **根本原因 / 制約**: iOS の通知許可ダイアログは**自動表示が生涯 1 回のみ** (`canAskAgain=false` 後は設定アプリ誘導しか手がない)。 最も価値の伝わらない瞬間に一発勝負を撃つのは opt-in 率を下げる。
- **ルール**: 通知/権限の取得は「pre-permission soft-ask → ユーザーが受諾 → 初めて OS 許可」 の 2 段で、 **ユーザーが価値を実感した文脈**で聞く。 通知/権限系 ADR では「OS 許可のタイミング / soft-ask 有無 / iOS 再プロンプト不可制約」 を必須検討項目にする (ADR-0014 Amended 恒久策)。
- **一次情報**:
  - [Apple Developer — Asking permission to use notifications](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications)
  - [expo/expo #20072 — Repeated iOS notification permission requests not possible](https://github.com/expo/expo/issues/20072)
  - 業界データ: 文脈起点 soft-ask の opt-in 率 ≈ 89% vs 初回一律 prompt 40〜45%

## カテゴリ: 単一トグル化はデフォルト値で起動時副作用が変わる

- **何が起きたか**: 通知を 1 系統に集約しトグルを 1 つにする際、 「`notificationMasterEnabled` (デフォルト true) を残し summary を消す」 と起動時 `triggerSummaryReschedule` が `requestNotificationPermission` に到達し **OS 許可ダイアログが起動時に暴発**する罠があった。
- **ルール**: opt-in を soft-ask に寄せる設計では、 通知トグルは**デフォルト OFF** のフラグ (`notificationDailySummaryEnabled`) を単一の真実の源として残す。 OFF default なら起動時 reschedule は cancel 分岐に入り permission を要求しない。
- **検証**: 実機で「新規インストール → オンボーディングを進める → 起動直後に OS 許可ダイアログが出ない」 ことを必ず確認する。
