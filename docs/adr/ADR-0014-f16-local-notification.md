---


# ADR-0014: F-16 ローカル通知（当日まとめ + 水やり繰り返しの 2 系統 / 7 日ローリング / Free 全公開）

- Status: Accepted
- Date: 2026-04-30
- Deciders: @doooooraku
- Related:
  - 上書き対象: `functional_spec.md` §21（F-16 詳細仕様）— チャネル削減 / 7 日ローリング / 既定値刷新
  - 上書き対象: `functional_spec.md` §12（F-07）— 装着期間経過通知 → アプリ内事実表示、trigger.date バグ修正
  - 連動: ADR-0008（events STI + Drizzle + ULID + status + datetime ラッパー）/ ADR-0011（記録のみ哲学 + オンボーディング）/ ADR-0007（F-11 ZIP に AsyncStorage 含む）/ ADR-0013（F-04 ヒートマップ）
  - 影響先: ADR-0011 オンボーディング Step 4 → 5 拡張（Step 5 = 通知設定、画像通り）
  - 既存資産: `expo-notifications ^55.0.14`（package.json 既存、最新 55.0.20）
  - 添付画像: `スクリーンショット 2026-04-30 172610.png`（作業予定カレンダー S-08）/ `スクリーンショット 2026-04-30 173225.png`（04 NOTIFICATION チュートリアル）
  - Issue: #<TBD>

---

## Context（背景：いま何に困っている？）

- 現状：
  - F-16 は `functional_spec.md` §21 で「水やり/施肥/消毒/針金外し」の 4 種チャネルが提案されているが、ADR-0011 で F-03（樹種別作業タイミング推奨）が削除済 → 自動水やり/施肥/消毒通知の根拠が消えた。
  - F-07 装着期間経過通知（6 週後）が `functional_spec.md` §12 で記載されているが、ユーザー判断で「経過後に通知が来るのは鬱陶しい」 → アプリ内表示に変更したい。
  - 既存 §21.3.3 `enforceIosLimit` の sort ロジックが DATE trigger 専用 → CALENDAR/WEEKLY 混在で破綻するバグ。
  - 既存 §12.3.3 で `trigger.date: payload.scheduled_unwire_at`（string）が NG → expo-notifications は `Date | number` のみ受理。
  - 旧設計「盆栽 × 作業 × 日付」単位の通知 → 100 本盆栽 × 5 作業/日 = 500 通知で iOS 64 件上限を簡単に超過。
  - 通知 OFF→ON 切替で水やり時刻設定が初期化される懸念（仕様未明確）。
- 困りごと：
  1. **iOS 64 件上限**: 旧設計だと 100 本 × 5 作業 = 500 通知で破綻、複雑な抑制ロジックが必要。
  2. **シニア UX**: 100 本の盆栽園プロが 1 日 100 通知受信 → 通知センター煩雑化、シニア (高橋 62 歳) が圧倒される。
  3. **「気遣い型」哲学との整合**: 装着期間経過通知が「鬱陶しい」とユーザーフィードバック → 削除が必要。
  4. **メモリ最小化原則**: ADR-0008 で確立した「必要な時に必要な分だけ」を通知予約期間にも適用したい。
  5. **海外旅行時の TZ 対応**: 日本→ハワイで通知時刻がずれる懸念。
  6. **既存仕様書のバグ**: §21.3.3 / §12.3.3 のサンプルコード 2 箇所修正必須。
  7. **オンボーディング統合**: ADR-0011 既存 4 ステップに通知設定を統合する方法が未定義（添付画像 04 NOTIFICATION で Step 5 化が示唆）。
- 制約/前提：
  - `docs/reference/constraints.md` §1-1（Local-first、リモート Push 禁止）
  - `docs/reference/constraints.md` §1-4（AI / 推奨機能 NG、ユーザー指定日時 + 事実通知のみ OK）
  - `docs/reference/constraints.md` §5-2（UI 禁止語: 診断 / 判定 / 推奨 / べき / reminder / tracker / alert）
  - `docs/reference/constraints.md` §3-1（19 言語 LTR、Hermes Intl 動作）
  - `docs/reference/personas.md`（4 ペルソナ）
  - `.claude/recurrence-prevention.md` R-1〜R-12
  - ADR-0008 §events STI + Drizzle + datetime ラッパー（TZ 3 層防御）
  - ADR-0011 §「気遣い型」哲学、オンボーディング 4 ステップ、F-07 改良方針
  - ADR-0007 F-11 ZIP に AsyncStorage 含む
  - 既存依存: `expo-notifications ^55.0.14`（package.json 既存）

---

## Decision（決めたこと：結論）

F-16 を以下の構成で実装する。

### 通知の 2 系統

1. **水やり繰り返し通知**（DAILY trigger × 1〜5 件）: ユーザーが Settings で時刻指定、毎日同じ時刻に発火
2. **当日まとめ通知**（DATE trigger × 0〜7 件）: 毎日朝 7:00 (Settings で変更可) に発火、当日の planned events が N 件あれば「N 件の作業予定があります」を配信
3. **装着期間経過通知は削除**: アプリ内事実表示で代替（盆栽詳細 → 針金一覧で「装着期間 6 週 3 日 (経過済)」表示）

### 通知数の上限管理

4. **7 日先までローリング予約**: 当日 + 6 日先まで、最大 7 件 + 水やり 5 件 = **最大 12 件**（iOS 64 件上限の 1/5 で余裕）
5. **再予約タイミング**: **アプリ起動時 (`AppState=active`) のみ**（シンプル原則、複雑な再予約ロジック不要）
6. **`enforceIosLimit` 削除**: 12 件で iOS 上限の 1/5 のため不要

### 通知文言（19 言語ローカライズ、禁止語チェック必須）

7. **当日まとめ通知本文**:
   - 0 件: 通知発火しない（キャンセル）
   - 1 件以上: 「N 件の作業予定があります」（M1: 件数のみ、シンプル最優先）
8. **水やり通知本文**: 「水やりの時間です」（案 A、絵文字なし、中立）
9. **タイトル共通**: `BonsaiLog`（固定）
10. **禁止文言**:
    - ❌「水やりが必要です」「水やりすべきです」「水やりを忘れています」
    - ❌「N 件の作業をお忘れなく」「やってください」
    - ✅「N 件の作業予定があります」「水やりの時間です」（事実 / 中立）

### Android 通知チャネル

11. **2 チャネル構成**:
    - `WATERING` — 水やり繰り返し通知、importance DEFAULT
    - `DAILY_SUMMARY` — 当日まとめ通知、importance DEFAULT
12. **`Application.onCreate()` 相当のタイミングで作成**（権限要求より前）

### iOS interruption level

13. **`.active` 固定**（`.timeSensitive` / `.critical` 不採用、Focus 突破しない）

### Android 14 SCHEDULE_EXACT_ALARM

14. **要求しない**: AndroidManifest に追加せず、inexact alarm で動作（Doze で最大 15 分遅延許容）

### TZ 対応（現地時刻自動切替）

15. **`Intl.DateTimeFormat().resolvedOptions().timeZone` で現在の TZ 取得**（ADR-0008 datetime ラッパー `getTzIana()` 流用）
16. **アプリ起動時に現在の TZ で通知再予約**: 海外旅行時も自動で現地時刻に追従
17. **DST 対応**: BonsaiLog は朝 7:00 / 夕 17:00 等の通常時間帯のみ → DST 境界（深夜 2-3 時）を踏まない、特別対応不要

### 通知許可拒否時の挙動

18. **何もしない（C3）**: ユーザーが OS Settings → BonsaiLog → 通知 → ON で復活。アプリ内に「設定を開く」誘導ボタンは置かない（押し付けがましさ排除）。

### F-11 端末買い替え時

19. **自動 OS 許可リクエスト（D2）**: F-11 ZIP に AsyncStorage 含む（ADR-0007）→ 通知設定は引き継がれる → 引継ぎ後初回起動で OS 通知許可リクエスト発火

### 予定/盆栽削除時の通知連動

20. **invalidator パターンで自動再生成（E1）**:
    - 予定削除時: `invalidateBonsaiNotifications(bonsaiId)` → 該当日の planned events 再集計 → 通知再予約（0 件ならキャンセル）
    - 盆栽削除時: 該当盆栽の全 planned events 削除 → invalidator 経由で通知再生成
    - F-02 30 日ゴミ箱から復元時: 同様に通知再予約

### 通知タップ後の遷移（G1）

21. **直接「作業予定カレンダー」(S-08) に遷移**: ホーム経由しない、当日選択状態で開く
22. **戻るボタンでホームタブに復帰**: 画面スタックにホームを事前 push、シニア戻る迷子防止
23. **完全停止状態タップ復元**: `getLastNotificationResponseAsync()` で取りこぼし防止 + `clearLastNotificationResponseAsync()` で二重ナビ防止
24. **水やり通知タップ**: 同じく作業予定カレンダー (当日選択) に遷移、統一動線
25. **Deep Link スキーム**: `bonsailog://calendar?date=YYYY-MM-DD`

### 「作業予定カレンダー」画面（S-08、独立画面、N1）

26. **配置**: F-02 タイムラインタブ内に「カレンダー表示」ボタン → 独立画面として push
27. **画面構造**（添付画像 1 通り）:
    - 月単位カレンダー（月送り `<` `>`）
    - 各日付下に dot 表示（1 件 = `•`、2 件 = `••`、3+ 件 = `•••`）
    - 今日のセル枠線ハイライト（`#238B45` 緑）
    - 選択日タップで下部に「○月○日 (今日) ・ N 件」+ 作業リスト
    - 作業リスト各行: `[アイコン] [盆栽名] [作業名] [記録ボタン]`
    - 右上に屋外モード切替アイコン（F-15 連動、ADR-0015 で**全画面ヘッダー右上に拡張**確定。S-08 だけでなく全画面で統一配置、48×48dp タッチ領域、`accessibilityLabel="屋外モードを切り替える"`、ワンタップで `theme.mode` を `outdoor` ⇄ 前回モードに切替）
28. **タブバーへの追加なし**: 4 タブ維持（Home / 盆栽 / タイムライン / Settings）、タブ肥大化防止
29. **F-04 ヒートマップとの役割分離**: F-04 = 水やり実績 1 年俯瞰、S-08 = 全作業予定 + 実績の月単位カレンダー

### Settings 画面構造

30. **通知マスタートグル**: ON/OFF
31. **通知 ON 時のみ表示されるサブセクション**:
    - **水やり通知**: 「1 日 N 回」(1〜5)、各時刻 (OS 標準タイムピッカー)、「+水やりの時間を追加」ボタン、各時刻行に削除ボタン
    - **当日まとめ通知**: 通知時刻 (OS 標準タイムピッカー、デフォルト 07:00、24 時間制限なし)
32. **設定状態保持**: AsyncStorage キー (`notification.master`, `notification.watering.times`, `notification.summary.time`) で永続化、通知 OFF→ON 切替で前回設定復元

### 時刻入力 UI

33. **OS 標準タイムピッカー** (`@react-native-community/datetimepicker`): iPhone アラーム / Android 標準と同じ UI、シニア学習済

### 水やり通知の最大数

34. **5 回まで** (H3): UI 5 行表示限界、朝/昼/夕/夜 + 予備で実用上十分

### Vacation モード

35. **採用しない（V3）**: OS 標準 Settings の通知 OFF で代替

### 通知音 / 振動

36. **OS デフォルト固定（S1）**: カスタム音なし、振動 OS 標準

### F-02 status='planned' 連動

37. **自動加算（P1）**: F-02 で予定登録 → 該当日の当日まとめ通知に自動加算（追加操作なし）
38. **F-07「外す予定日時」も F-02 status='planned' に統合（F1）**: 種別 `'unwiring'`、occurred_at_utc = 外す予定日 → 当日まとめ通知に含まれる

### 水やり以外の作業の時刻記録

39. **日付のみ記録（H2）**: 剪定/針金確認/施肥等は日付のみ、時刻入力なし。シニア入力負担最小化、業界標準（Apple リマインダー時刻オプショナル）と整合。
40. **DB 上の表現**: `occurred_at_utc` を当日 00:00 UTC + tz_offset_min で表現

### チュートリアル統合（ADR-0011 改訂、Step 5 拡張）

41. **ADR-0011 オンボーディング 4 ステップ → 5 ステップに拡張**:
    - Step 1: 盆栽の登録（既存）
    - Step 2: 作業の水やり記録（既存）
    - Step 3: タイムライン（既存）
    - Step 4: ヒートマップの読み方（ADR-0013 既存）
    - **Step 5: 通知設定（新規、ADR-0014）** — 添付画像 2「04 NOTIFICATION」通り
42. **Step 5 画面構造**（画像 2 通り）:
    - アイコン: 🔔 ベル
    - タイトル: 「通知で水やりを忘れない」
    - 本文: 「作業タイミングの目安を通知でお知らせします。通知はオフにもできます。いつでも設定から変更可能です。」
    - メインボタン: 「通知を有効にする」（緑）
    - サブリンク: 「あとで」
43. **Step 5 ユーザー行動 3 パターン**:
    - 「通知を有効にする」→ OS 通知許可リクエスト → 許可後 Step 5-B 水やり時刻設定 → 「始める」→ 完了
    - 「あとで」→ 通知 OFF 状態でオンボーディング完了
    - OS 拒否 → 「通知を有効にしませんでした」トースト 1 秒 → 完了
44. **Step 5-B 水やり時刻設定画面**:
    - アイコン: 💧
    - タイトル: 「水やり通知の設定」
    - 質問 1: 「1 日に何回、水やりしますか?」（ドロップダウン 1〜5、デフォルト 1）
    - 質問 2: 「水やりの時刻は?」（OS 標準タイムピッカー、デフォルト 07:00）
    - 複数回選択時: 「2 回目の時刻は?」追加表示
    - メインボタン: 「始める」（緑）
45. **チュートリアル再閲覧時**: Settings → ヘルプ → 「チュートリアルを再表示」、許可済なら Step 5-A「通知をオン中です」+ 「水やり時刻を変更」ボタン

### チュートリアルスキップ時の通知初期設定（K1）

46. **通知マスタートグル: OFF 初期化**: スキップユーザーは「最小限で始めたい」想定、通知は明示的に ON 操作で動作開始
47. **後で Settings で個別 ON 時のデフォルト値**:
    - 水やり通知: 1 回 / 朝 07:00
    - 当日まとめ通知: 朝 07:00

### 装着期間経過のアプリ内事実表示（旧 F-07 通知の代替）

48. **盆栽詳細画面 → 針金一覧セクション**:
    - 各針金 event に対して「装着期間: X 週 Y 日 (経過済)」表示
    - 6 週未経過: 「装着期間: 3 週 (あと 3 週)」
    - 外し記録あり: 「装着期間: 8 週 (完了)」
49. **通知発火なし**: ユーザーが自発的にアプリを開いて確認する設計

### F-04 ヒートマップとの連携

50. **連携なし**: F-04 = 記録の表示、F-16 = 通知。F-04 から「X 日水やり来てません」のような判定通知は出さない（constraints §1-4 / §5-2）

### Free / Pro

51. **全機能 Free**（F-04 と整合、ADR-0009 Pro メリット 4 つ「写真∞ / CSV / PDF / QR / 広告無」で訴求）

### 適用範囲

52. v1.0 から全プラン（Free / Pro 両方）で全機能利用可。

---

## Decision Drivers（判断の軸）

- Driver 1: **「記録のみ」哲学の貫徹**（ADR-0011） — 判定 / 推奨ゼロ、ユーザー指定日時 + 事実通知のみ
- Driver 2: **シンプル第一**（CLAUDE.md §2 コア原則） — 7 日ローリング、enforceIosLimit 削除、Vacation モード不採用、Settings 構造シンプル化
- Driver 3: **シニア UX 最優先**（高橋 62 歳） — 1 日 1 通知集約、OS 標準ピッカー、設定状態保持、戻る迷子防止
- Driver 4: **メモリ最小化**（CLAUDE.md §2 影響を最小化する） — 7 日ローリング = 最大 12 件、必要な時に必要な分だけ
- Driver 5: **全ペルソナ ◎ 評価** — 4 ペルソナ × 全論点で ✕ ゼロ
- Driver 6: **業界標準準拠** — Apple リマインダー時刻オプショナル、Apple Health 事実通知、Streaks「気遣い型」、iPhone 純正リマインダー命令形回避
- Driver 7: **コスト 0** — 既存 expo-notifications 使用、新規ライブラリなし、外部 API 0 円

---

## Alternatives considered（他の案と却下理由）

### Option A: 既存仕様 §21 維持（盆栽 × 作業 × 日付単位、4 チャネル、自動推奨通知）

- 概要: 100 本盆栽 × 5 作業/日で 500 通知、iOS 64 件超過、enforceIosLimit 複雑ロジック必須
- 良い点: 既存仕様流用
- 悪い点: ADR-0011 で自動推奨削除済、シニア UX 破綻、iOS 上限管理複雑
- 却下理由: ADR-0011 哲学不整合、ユーザー方針「シンプル化 + 集約」と矛盾

### Option B: ローリング期間 30 日

- 概要: 30 日先まで予約、最大 35 件
- 良い点: 1 ヶ月放置耐性
- 悪い点: メモリ消費 (3KB)、CLAUDE.md §2「メモリ最小」原則違反
- 却下理由: ユーザー方針「7 日で十分」採用

### Option C: ローリング期間 1 日（当日のみ）

- 概要: 当日 1 件のみ予約、最軽量
- 良い点: メモリ最小、1 件のみ
- 悪い点: 翌日アプリ未起動なら通知止まる
- 却下理由: ライト層 (月 1 回起動) 対応不可

### Option D: 装着期間経過通知を維持

- 概要: F-07 改良の装着期間 6 週後通知を実装
- 良い点: 針金外し忘れ防止
- 悪い点: ユーザー判断「6 週後通知が鬱陶しい」、シニア UX 劣化
- 却下理由: アプリ内事実表示で代替（押し付けがましさ排除）

### Option E: Vacation モード採用

- 概要: Settings に「通知一時停止」トグル
- 良い点: 旅行中の通知制御
- 悪い点: OS 標準 Settings の通知 OFF で代替可、機能重複
- 却下理由: シンプル原則、OS 標準で十分

### Option F: 個別盆栽通知（F-07 個別通知維持）

- 概要: F-07「外す予定日時」を個別通知発火（旧仕様）
- 良い点: 針金通知の即時性
- 悪い点: 通知件数増、iOS 64 件リスク復活
- 却下理由: 当日まとめに統合（F1）でシンプル化

### Option G: 水やり以外も時刻入力必須

- 概要: 剪定/針金確認/施肥等も時刻入力
- 良い点: 細かい予定管理
- 悪い点: シニア入力負担、Apple リマインダー業界標準と乖離
- 却下理由: 水やり以外は日付のみで十分（H2）

### Option H: 通知拒否時に Settings ボタン誘導

- 概要: アプリ内に「設定を開く」ボタン常設
- 良い点: シニア向け迷子防止
- 悪い点: ユーザー判断「アプリの設定画面開いて通知 ON すれば十分、押し付けがましさ排除」
- 却下理由: ユーザー方針「何もしない (C3)」採用

---

## Consequences（結果）

### Positive（嬉しい）

- 「記録のみ」哲学を完全貫徹、constraints §1-4 / §5-2 と整合
- 全ペルソナで全要素 ○ 以上、✕ ゼロ
- iOS 64 件上限問題を**完全解消**（最大 12 件で 1/5 余裕）
- メモリ消費最小化（7 日ローリング = 約 1.2KB）
- シニア UX 最強化（1 日 1 通知集約、OS 標準ピッカー、戻る迷子防止）
- バンドル増ゼロ（既存 expo-notifications 使用）
- Vacation モード削除でコード削減
- 装着期間経過通知削除でロジック削減 + シニア UX 向上
- 当日まとめ通知 → 作業予定カレンダー直接遷移で動線最短
- F-11 引継ぎ自動化で買い替え後も動作継続

### Negative（辛い/副作用）

- **7 日連続未起動で通知停止**: ライトユーザー (月 1 回起動) は 7 日後から通知ゼロ → ユーザーアプリ開いた瞬間自動復活で吸収
- **ローリング再予約処理**: 起動時に最大 12 件再予約、約 100ms 程度の処理時間（許容範囲）
- **通知本文「N 件の作業予定があります」**: どの盆栽の何の作業か通知本文に書けない → タップで作業予定カレンダー詳細確認で吸収
- **オンボーディング Step 増（4 → 5）**: シニア疲労リスク → 各 Step 単機能化 + スキップボタン必須で吸収
- **Hermes Intl 不安定リスク**: 19 言語月名 / 曜日名で `RangeError` → @formatjs polyfill 追加で対応（ADR-0008 同様）
- **iOS 16 SIGTRAP (Issue #45095)**: 実機検証で iOS 17+ 必須化 or polyfill 追加判断

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/functional_spec.md` §21 全面書き換え（チャネル 2 種、7 日ローリング、enforceIosLimit 削除、既定値刷新、AC 書換、Deep Link スキーム追記）
- [ ] `docs/reference/functional_spec.md` §12 装着期間経過通知 → アプリ内事実表示に変更、trigger.date バグ修正（`new Date(...)`）、§12.6 AC 書換
- [ ] `docs/reference/functional_spec.md` §22 画面遷移マップに「通知タップ → 作業予定カレンダー (S-08)」追加
- [ ] `docs/reference/functional_spec.md` §23 Deep Link 仕様に `bonsailog://calendar?date=YYYY-MM-DD` 追加
- [ ] `docs/reference/basic_spec.md` Free/Pro 表から「針金外し時期アラート Free=手動のみ / Pro=自動通知」削除
- [ ] `docs/reference/basic_spec.md` F-07 セクション「外し時期接近アラート（通知、Pro 限定）」を「装着期間アプリ内表示」に書き換え
- [ ] `docs/reference/glossary.md` に追加: 当日まとめ通知 / 7 日ローリング予約 / DAILY trigger / DATE trigger / iOS 64 件上限 / Notification Channel / interruption level / Doze モード / SCHEDULE_EXACT_ALARM / 現地時刻自動切替 / 作業予定カレンダー (S-08) / Step 5 通知 / 装着期間アプリ内表示
- [ ] `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` オンボーディング 4 ステップ → 5 ステップに拡張、Step 5 = 通知設定（画像 2 反映）
- [ ] `package.json` への追加: `@react-native-community/datetimepicker`（OS 標準タイムピッカー、実装 PR で実施）
- [ ] `src/features/notification/scheduleSummary.ts` 新規実装（7 日ローリング、aggregateByDay 集計、純関数化）
- [ ] `src/features/notification/scheduleWatering.ts` 新規実装（DAILY trigger 1〜5 件管理）
- [ ] `src/features/notification/persistSettings.ts` 新規実装（AsyncStorage 永続化、OFF→ON 復元）
- [ ] `src/core/queries/invalidators.ts` に `invalidateBonsaiNotifications(bonsaiId)` 追加
- [ ] `src/screens/CalendarScreen.tsx` 新規実装（S-08 作業予定カレンダー、月単位 + dot + 当日選択）
- [ ] `src/screens/onboarding/Step5Notification.tsx` 新規実装（画像 2 通り）
- [ ] `src/screens/onboarding/Step5BWateringTime.tsx` 新規実装（水やり時刻設定）
- [ ] テスト: `__tests__/features/notification/scheduleSummary.test.ts`, `scheduleWatering.test.ts`, `persistSettings.test.ts`, `deepLink.test.ts`, `i18nForbiddenWords.test.ts`
- [ ] Maestro: `maestro/flows/notification_permission.yaml`, `notification_summary_tap.yaml`, `watering_settings.yaml`, `notification_off_on.yaml`, `onboarding_notification.yaml`
- [ ] Phase 0 PoC: iOS 16 SIGTRAP 実機検証、Android 14 SCHEDULE_EXACT_ALARM 拒否時動作、Hermes Intl 19 言語月名動作、完全停止状態タップ Deep Link、DST 切替日動作
- [ ] F-07 既存 Issue #24 に「装着期間経過通知 → アプリ内表示変更」コメント追加
- [ ] `docs/reference/tasks/lessons.md` に「通知設計はメモリ最小化 + シンプル原則を優先、7 日ローリングで iOS 上限を構造的に回避」追記

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト

- **Jest 単体テスト**:
  - `__tests__/features/notification/scheduleSummary.test.ts`
    - 7 日ローリング予約: 起動時に当日 + 6 日先まで予約
    - 該当日 0 件: 通知キャンセル
    - 該当日 N 件: 「N 件の作業予定があります」予約
    - TZ 変更時 (現地時刻 7:00): 再予約成功
  - `__tests__/features/notification/scheduleWatering.test.ts`
    - DAILY trigger 1〜5 件登録
    - 5 回上限到達: 6 件目登録で「最大 5 回」エラー
    - 削除: 該当時刻の trigger キャンセル
  - `__tests__/features/notification/persistSettings.test.ts`
    - AsyncStorage 永続化: マスター OFF→ON で水やり時刻復元
  - `__tests__/features/notification/deepLink.test.ts`
    - 通知タップで `bonsailog://calendar?date=YYYY-MM-DD` 生成
    - getLastNotificationResponseAsync で完全停止状態復元
  - `__tests__/features/notification/i18nForbiddenWords.test.ts`
    - 「水やりが必要」「やってください」等が i18n キーに含まれない
- **Maestro E2E**:
  - `maestro/flows/notification_permission.yaml`: 権限プロンプト → 許可
  - `maestro/flows/notification_summary_tap.yaml`: 通知タップ → 作業予定カレンダー (S-08) 当日選択状態で開く → 戻るでホーム復帰
  - `maestro/flows/watering_settings.yaml`: 水やり時刻 1 件追加 → 削除 → 5 回上限テスト
  - `maestro/flows/notification_off_on.yaml`: マスター OFF → ON で設定保持確認
  - `maestro/flows/onboarding_notification.yaml`: Step 5 「通知を有効にする」 → Step 5-B 水やり時刻設定 → 「始める」

### 手動チェック（Phase 0 PoC 必須）

- 実機 Pixel 7 / iPhone 13:
  - iOS 16 で SIGTRAP (expo-notifications Issue #45095) 確認
  - Android 14 で SCHEDULE_EXACT_ALARM 拒否時に通知発火するか
  - Hermes Intl 19 言語月名動作 (`Intl.DateTimeFormat`)
  - 完全停止状態タップ → Deep Link 復元
  - DST 切替日 (3 月 / 11 月) の動作
  - 海外 TZ 切替 (シミュレータで TZ 変更)
- iOS:
  - VoiceOver 通知本文読み上げ
  - Dynamic Type 最大設定でレイアウト維持
- Android:
  - TalkBack 通知本文読み上げ
  - fontScale 最大設定
  - Doze モード強制 (`adb shell dumpsys deviceidle force-idle`) で通知発火確認

### F-16 受け入れ条件

- [ ] 通知 ON で水やり時刻 1〜5 件設定可
- [ ] 水やり通知が指定時刻に発火、本文「水やりの時間です」
- [ ] 当日まとめ通知が朝 7:00 (デフォルト) に発火、本文「N 件の作業予定があります」
- [ ] 通知タップで作業予定カレンダー (S-08) が当日選択状態で開く
- [ ] 戻るボタンでホームタブ復帰
- [ ] 通知マスター OFF→ON で水やり時刻設定が保持される
- [ ] 海外 TZ 変更時に現地時刻で通知発火
- [ ] 予定削除/盆栽削除時に通知が自動再生成
- [ ] F-11 引継ぎ後に OS 通知許可リクエスト発火
- [ ] 装着期間経過通知が発火しない (アプリ内表示のみ)
- [ ] 「水やりが必要」等の判定語が UI に出ない (CI `pnpm i18n:forbidden`)
- [ ] 19 言語ローカライズ (`pnpm i18n:check` 0 missing)
- [ ] iOS pending 通知が 12 件以下
- [ ] チュートリアル Step 5「通知を有効にする」/「あとで」/OS 拒否の 3 パターン動作
- [ ] チュートリアルスキップ時に通知マスター OFF 初期化

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - F-01 / F-08 / F-02 マージ後に F-16 マージ（ADR-0008 events 基盤に依存）
  - F-07 (#24) より先に F-16 共通基盤マージ推奨
  - リリースノートに「予定をまとめてお知らせします」「水やりの時間を毎日通知できます」を 19 言語で追記
- ロールバック方針：
  - F-16 を v1.0.x ホットフィックスで無効化する場合、UI 側で通知マスター強制 OFF + Step 5 スキップ（DB 影響なし）
  - 装着期間経過通知の復活は v1.x ADR で再評価
- 検知方法：
  - Sentry: `NotificationScheduleError` 監視
  - Sentry: iOS 64 件超過警告 (理論上発生しないが監視)
  - ストアレビュー: 「通知が来ない」「通知うるさい」「設定がわからない」キーワード監視
  - DAU: 通知タップ経由のカレンダー画面 DAU
  - F-11 引継ぎ後の通知許可率モニタリング

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-1 / §1-4 / §5-2 / §3-1 / §8 F-16 ID)
- reference: `docs/reference/basic_spec.md` (§F-16 / §F-07 / Free/Pro 表 — 本 ADR で書換)
- reference: `docs/reference/functional_spec.md` (§21 F-16 / §12 F-07 / §22 / §23 — 本 ADR で書換)
- reference: `docs/reference/personas.md`（4 ペルソナ評価）
- glossary: `docs/reference/glossary.md`（追加用語多数、本 ADR Follow-up）
- 行動 lesson: `.claude/recurrence-prevention.md` (R-1〜R-12)
- 連動 ADR:
  - `docs/adr/ADR-0007-f11-data-migration-design.md` (F-11 ZIP に AsyncStorage 含む)
  - `docs/adr/ADR-0008-f02-event-data-model.md` (events STI + Drizzle + ULID + status + datetime ラッパー)
  - `docs/adr/ADR-0009-f13-revenuecat-billing.md` (Pro メリット不変)
  - `docs/adr/ADR-0010-f14-admob-banner-design.md` (広告位置不変)
  - `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` (記録のみ哲学 + オンボーディング Step 4 → 5 拡張、本 ADR で改訂)
  - `docs/adr/ADR-0013-f04-watering-visualization.md` (F-04 ヒートマップ、F-16 との役割分離)
- 影響 Issue: 後日 #<TBD>（F-16 メイン Issue）、#24（F-07 改良に「装着期間経過通知 → アプリ内表示変更」コメント）
- PR: #<TBD>
- Issue: #<TBD>
- 添付画像 (議論ベース、ローカルファイル):
  - 作業予定カレンダー S-08: `/mnt/c/Users/doooo/Downloads/スクリーンショット 2026-04-30 172610.png`
  - 04 NOTIFICATION チュートリアル: `/mnt/c/Users/doooo/Downloads/スクリーンショット 2026-04-30 173225.png`
- External docs:
  - [expo-notifications 公式](https://docs.expo.dev/versions/latest/sdk/notifications/)
  - [expo-notifications npm 55.0.20](https://www.npmjs.com/package/expo-notifications)
  - [expo-notifications CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-notifications/CHANGELOG.md)
  - [Issue #45095 iOS 16 SIGTRAP](https://github.com/expo/expo/issues/45095)
  - [iOS UNUserNotificationCenter](https://developer.apple.com/documentation/usernotifications/)
  - [iOS UNNotificationInterruptionLevel](https://developer.apple.com/documentation/usernotifications/unnotificationcontent/interruptionlevel)
  - [Android POST_NOTIFICATIONS](https://developer.android.com/develop/ui/views/notifications/notification-permission)
  - [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
  - [Android 14 SCHEDULE_EXACT_ALARM](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
  - [Android Doze](https://developer.android.com/training/monitoring-device-state/doze-standby)
  - [Apple HIG Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)
  - [Material Design 3 Notifications](https://m3.material.io/components/notifications/overview)
  - [Streaks 公式](https://streaks.app/)
  - [Habitify 公式](https://habitify.me/)
  - [iPhone 純正リマインダー](https://support.apple.com/guide/iphone/iph0000ef0a/ios)
  - [Apple Health Activity Rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings)
  - [@react-native-community/datetimepicker](https://github.com/react-native-datetimepicker/datetimepicker)

---

## Notes（メモ）

### 議論経緯（4 ラウンド）

1. ラウンド 1: 旧仕様 §21 (盆栽 × 作業 × 日付単位) 維持の検討 → ユーザー指摘「集約方式へ」
2. ラウンド 2: 当日まとめ 1 通知 + 水やり繰り返し設計 → ユーザー指摘「装着期間経過通知うざい」「iOS 上限はメモリ最小で」
3. ラウンド 3: 装着期間経過削除 + 7 日ローリング + 通知タップ → 作業予定カレンダー → 添付画像 2 枚反映、Vacation V3 確定
4. ラウンド 4: 現地時刻取得方法 + チュートリアル Step 5 図解 + 通知タップ直接遷移 (G1) 確定

### 4 ペルソナ評価マトリクス（最終構成）

| 要素                        | 高橋 62 歳      | Marcus 35 歳 | 盆栽園プロ       | ライト       | 総合 |
| --------------------------- | --------------- | ------------ | ---------------- | ------------ | ---- |
| 当日まとめ 1 通知           | ◎               | ◎            | ◎ 100 本対応     | ◎            | ◎    |
| 水やり繰り返し 1-5 回       | ◎               | ○            | ◎ 業務時刻       | ◎            | ◎    |
| 装着期間経過アプリ内表示    | ◎ うざくない    | ○            | ◎ 100 本通知ゼロ | ◎            | ◎    |
| 通知タップ → カレンダー直接 | ◎ 動線最短      | ◎            | ◎                | ○            | ◎    |
| 戻るでホーム復帰            | ◎ 迷子なし      | ◎            | ◎                | ○            | ◎    |
| 7 日ローリング              | ○ 週 1 起動 OK  | ◎            | ◎ 毎日起動       | ○ ライト想定 | ○    |
| 現地時刻自動切替            | ◎ 海外旅行 OK   | ◎            | ◎                | ◎            | ◎    |
| 通知拒否で何もしない (C3)   | ○ Settings 復活 | ◎            | ◎                | ◎            | ◎    |
| 通知 OFF→ON 設定保持        | ◎ 必須          | ◎            | ◎                | ◎            | ◎    |
| OS 標準タイムピッカー       | ◎ 学習済        | ◎            | ○                | ◎            | ◎    |
| 水やり最大 5 回             | ◎ 朝夕 2 回     | ○ 1 回       | ◎ 2 回           | ○ 1 回       | ◎    |
| Vacation 不採用 (V3)        | ○ OS 学習済     | ◎            | ○                | ◎            | ◎    |
| Step 5 通知チュートリアル   | ◎ 画像で安心    | ○ あとで     | ○ あとで         | ◎ ガイド必要 | ◎    |
| Step 5-B 水やり時刻設定     | ◎ デフォルト OK | ◎            | ◎                | ◎            | ◎    |
| スキップ時 OFF 初期化 (K1)  | ○               | ◎            | ○                | ◎            | ◎    |
| 全機能 Free                 | ◎ Pro 加入不要  | ○            | ○                | ◎            | ◎    |

→ **全要素で全ペルソナ ○ 以上、✕ ゼロ**（R-10 クリア）。

### v1.x 拡張候補（本 ADR 対象外）

- 水やり時刻のカスタム音 (Pro 限定)
- Vacation モード (開始/終了日時指定)
- 通知ヒストリー画面 (アプリ内、過去通知一覧)
- 個別盆栽の水やり時刻 (現状は全盆栽共通)
- ホームウィジェット (constraints §4 非ゴール 14、v1.x 再評価)
- iOS Provisional Notification (静かな通知、初期は採用しない)
- 月単位の通知サマリーレポート (週末に「今週 N 件の作業実施」)

### ADR-0018 オンボーディング統合フロー (Notes 追記、2026-05-02)

**ADR-0018 で本 ADR の Step 5 通知設定 (§41-47) を機能チュート 5 ステップ最後に位置付け、システム部 (Splash / Welcome / 言語選択) + 機能チュート 5 ステップ = 8 画面のオンボーディング統合フローとして確定。本 ADR の Decision 部分 (Step 5 / Step 5-B / 3 行動パターン / スキップ時 OFF 初期化) は変更なし、ADR-0018 で位置付けのみ追加定義。**

- 詳細は `docs/adr/ADR-0018-onboarding-flow-integration.md` §⑩ 参照
- 影響: Issue #26 (オンボーディング 4 ステップ) を 8 画面構成に改訂
- 連動: ADR-0011 §86-106 (機能チュート 5 ステップ既定) も ADR-0018 で統合参照
- 再閲覧時の Step 5 状態保持: 本 ADR §45 既定踏襲 (ADR-0018 §61 で再確認)

### Repolog との差分

- Repolog (前作) は通知機能なし、BonsaiLog 新規設計
- Repolog 由来の `useLiveQuery` パターン（ADR-0008）は通知 invalidator にも適用

### lessons.md 追記候補

- 「通知設計はメモリ最小化 + シンプル原則を優先、7 日ローリングで iOS 上限を構造的に回避」
- 「集約方式（1 日 1 通知）はシニア UX とパフォーマンスを両立、盆栽数・作業数を考慮しないシンプル設計」
- 「装着期間経過通知のような『事実通知』も鬱陶しいフィードバックがあれば削除し、アプリ内表示で代替する判断もあり得る」
- 「通知タップ後の動線は『直接遷移 + 戻るでホーム復帰』がシニア UX◎、画面スタックにホーム事前 push で実現」
