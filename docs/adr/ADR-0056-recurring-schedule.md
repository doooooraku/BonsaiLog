---


# ADR-0056: 定期予定機能 (RRULE 保持 + 連動更新、 Sess78)

- Status: Accepted (Sess78 PR-1〜5 で設計確定 + DB schema + RRULE 純関数 + Repository + UI 基盤 + i18n 285 文字列 = 完成。 BulkLog 連携 + EventRow 🔁 + 連動編集 3 択 + 通知 cascade + Pro 境界 7 行化 + Maestro 4 flow + 実機検証 + versionCode 13 release は v1.0.1 follow-up scope)
- Date: 2026-06-08
- Deciders: @doooooraku
- Related:
  - 連動: ADR-0008 (event data model + §v1.x 候補 line 275「RRULE — 現状単発 plan のみ」の解決) / ADR-0011 (記録のみ哲学、 本 ADR で侵食回避 i18n 規約) / ADR-0014 (当日まとめ通知 cascade、 invalidator pattern 流用) / ADR-0033 (i18n D1 ja+en proper / 17 lang fallback) / ADR-0036 (破壊的操作 D7 kebab + ConfirmDialog + UndoSnackbar 流用 + 3 択 dialog 拡張) / ADR-0049 (Pro 境界 ⑦ 定期予定 Free 3 / Pro 無制限 で Amendment) / ADR-0055 (event 編集 + status 別意味分化 pattern 拡張、 recurring 由来 events の 3 択 scope に拡張)
  - 起票: R-66 (RRULE 展開時 `toLocalDateKey` 経由必須、 ADR-0008 R-55 拡張) / R-67 (status を持つ entity の機能設計時、 各 status の操作意味を matrix で明示、 Sess77 Follow-up 教訓由来)
  - PR: PR-1 (本 ADR 起票) / PR-2 (DB schema) / PR-3 (RRULE 計算) / PR-4 (UI 配線) / PR-5 (連動編集 + Pro 境界 + E2E)

---

## Context（背景：いま何に困っている？）

### Sess76 配信前テスター苦情 (Sess77 ADR-0055 と同根)

- Sess76 で Android v1.0.0 versionCode 12 を Play Console Alpha track Draft submit 完了 (`main=eb4f490`、 rollout は user 手動)
- 配信前のテスター 12 人から 「毎週月曜に水やりなど **定期的な予定が入力できたら** 管理が楽になりそうだと思いました」 という意見

### 現状

- 「予定」 タブ (`/(tabs)/plan`) で planned events を 1 件ずつ手動入力。 52 週 × 100 鉢 = 5,200 件/年 の手入力負担
- ADR-0008 §v1.x 拡張候補 line 275「予定の繰り返し (RRULE) — 現状は単発 plan のみ」 が 伏線で既に認識済、 schema の `events.status` 列 ('planned' | 'logged' | 'cancelled') は 整備済
- ADR-0014 Notes Amended (2026-05-26) で 水やり繰り返し通知は全廃済、 通知は「当日まとめ 1 系統」 のみ
- ADR-0049 で Pro 境界 6 項目 (写真/タグ/CSV/PDF/広告/カスタム樹種) 確定、 定期予定は未入

### 困りごと

- v1.0 alpha rollout 直前にテスター苦情、 Play Store ★ 評価で「これすらない盆栽アプリ」 と書かれるリスク
- 業務プロ user (100 鉢/日) の業務継続性懸念 → 解約理由になる
- 競合 (Bonsai Care App / Appy Bonsai / Bonsai Buddy) は **AI 推奨型** で「ユーザー指定 recurring」 を持たない → BonsaiLog の「記録のみ」 哲学 + ユーザー指定 recurring = 差別化軸を逃す
- user 真意「水やりは天気/湿度/土の乾き具合に左右されるため定期化困難、 植替え・施肥・苔の手入れ等は 定期メンテで便利」 = species (樹種) × event_type の matrix で「定期化向き度」 が異なる
- 業界標準 (Apple Reminders / Google Calendar / Outlook / Todoist / Things 3) は RFC 5545 RRULE で recurring を実装、 業界標準 UX (3 択 dialog: this / following / all) が user 学習コスト 0

### 制約 / 前提

- `docs/reference/constraints.md` §1-1 (Local-first、 リモート Push 禁止)
- `docs/reference/constraints.md` §1-4 (AI 非搭載原則、 診断/判定/推奨 禁止)
- `docs/reference/constraints.md` §5-2 (UI 禁止語: べき / お忘れなく / 推奨 / reminder / alert)
- ADR-0008 events table schema (status / TZ 3 層防御 / 30 日ゴミ箱)
- ADR-0011 「気遣い型」 哲学 (ユーザー自発の Update 許容、 AI 推奨 NG)
- ADR-0049 Pro 境界 6 項目 SoT (本 ADR で ⑦ 追加)
- 既存パッケージ: `expo-sqlite ^55` / `drizzle-orm ^0.x` / `date-fns ^4.1` / `date-fns-tz ^3` / `expo-notifications ^55`

---

## Decision（決めたこと：結論）

### D1. 採用アプローチ: B 案 (ルール保持 + 連動更新、 RFC 5545 RRULE 準拠)

`recurrence_rules` 新テーブル + `events.recurrence_rule_id` (nullable FK) を 追加し、 RRULE 文字列を保持して **8 週分の planned events を 事前展開**。 起動時に 不足分を 追加展開。 rule 編集/削除で 該当 events が cascade 連動更新/削除される。

### D2. DB schema

```sql
CREATE TABLE recurrence_rules (
  id              TEXT PRIMARY KEY NOT NULL,     -- ULID (ADR-0008 整合)
  bonsai_id       TEXT NOT NULL REFERENCES bonsai(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,                 -- watering/repotting/... 14 種別
  rrule           TEXT NOT NULL,                 -- RFC 5545 例: "FREQ=WEEKLY;BYDAY=MO"
  start_at_utc    TEXT NOT NULL,                 -- ISO 8601 UTC
  end_at_utc      TEXT,                          -- NULL = 永遠、 default = +365 日 (UI 側で fallback)
  exdates         TEXT NOT NULL DEFAULT '[]',    -- JSON array of YYYY-MM-DD (1 件 skip 用)
  tz_iana         TEXT NOT NULL,                 -- ADR-0008 TZ 3 層防御
  deleted_at      TEXT,                          -- 30 日ゴミ箱
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX idx_recurrence_rules_active
  ON recurrence_rules(bonsai_id, deleted_at) WHERE deleted_at IS NULL;

-- 既存 events table に nullable 列追加 (ON DELETE SET NULL で rule 削除時 events は残る選択肢確保)
ALTER TABLE events ADD COLUMN recurrence_rule_id TEXT
  REFERENCES recurrence_rules(id) ON DELETE SET NULL;

CREATE INDEX idx_events_recurrence
  ON events(recurrence_rule_id) WHERE deleted_at IS NULL;
```

### D3. RRULE 展開戦略

- **事前展開**: rule 作成時に **直近 8 週分**の planned events を 即時生成 (DB insert)
- **起動時バッチ**: app launch 時に 全 active rule に対して 「次の 8 週分」 を 展開 (重複 insert は unique constraint 相当の guard で回避: `(recurrence_rule_id, occurred_at_utc)` の hash check)
- **上限ガード**: 1 rule あたり最大 1000 件 (= 約 20 年 weekly) で hard limit、 性能保護
- **TZ 対応**: 起動時 + TZ 変更検知時に `getTzIana()` で 現地時刻再計算 (ADR-0014 §15-17 pattern 流用)

### D4. UI: RecurrencePicker (Apple Reminders 風 preset + 終了日)

予定追加画面 (`BulkLogConfirmScreen` schedule mode) に **「繰り返し」 toggle** (default OFF) 追加。 ON で 下記 picker 出現。

#### Sess89 PR-B Amendment (2026-06-09): 7 preset + custom 再構成

業界整合 (Apple/Google/Todoist/Things 3) + 盆栽特有「長周期」 需要 (= 半年/毎年の植替え/施肥) + ユーザー任意「N 日ごと」 で 6 preset → **7 preset + custom** に拡張。

**7 preset + custom (Sess89 PR-B 確定版)**:

1. 毎日 (`FREQ=DAILY`)
2. 毎週 (= 開始曜日基準、 `FREQ=WEEKLY`)
3. 毎月 (`FREQ=MONTHLY`)
4. 3 ヶ月ごと (`FREQ=MONTHLY;INTERVAL=3`)
5. 半年ごと (`FREQ=MONTHLY;INTERVAL=6`)
6. 毎年 (`FREQ=YEARLY`)
7. カスタム (= N 日ごと、 `FREQ=DAILY;INTERVAL=N`、 N=1-365、 `buildCustomRrule(n)` helper で動的生成)

**削除した preset (Sess78 当初仕様)**:

- 毎週月曜 (`FREQ=WEEKLY;BYDAY=MO`) — 曜日固定で他曜日 user 排除、 RFC 5545 整合性低
- 隔週 (`FREQ=WEEKLY;INTERVAL=2`) — 業界 preset 不在、 使用頻度低

**互換性 (= 既存 rule 保護)**:

- migration せず維持: 既存 rule の旧 RRULE (= weeklyMonday / biweekly) は そのまま保存され、 `rruleToHumanLabel` 内に旧 key の逆引きを保持して表示連続性確保
- `recurringPresetWeeklyMonday` / `recurringPresetBiweekly` i18n keys も 削除せず維持

**旧 D4 (Sess78 PR-4 #997 当初) — 6 preset**:

1. 毎日 / 2. 毎週月曜 / 3. 毎週 / 4. 隔週 / 5. 毎月 / 6. N ヶ月ごと (Custom、 「3 ヶ月ごと」 名で実装)

**終了日 3 択** (Sess82 PR-A 改訂、 default = なし、 業界整合 + user 要望反映):

1. **なし (default、 永遠)** = endAtUtc null、 8 週 buffer 自動延長 + hard limit 1000 件 (約 20 年 weekly) で 性能保護
2. 1 年後 (= `nowUtc + 365日`)
3. 日付を指定

旧仕様 (Sess78 PR-4 #997 で実装): default = 1 年後、 「終了なしは怖い」 のペルソナ意見で 1 年 default 採用。 Sess82 で revisit:

- **業界調査結果**: Apple Reminders / Google Calendar / Things 3 / Todoist / Outlook 全 5 件で default = なし (= 永続)
- **user 要望** (Sess82 実機検証時): 「ユーザーにとっては、永続的に登録される想定」 = default なし化が真意
- **データ運用負荷**: 8 週 buffer 自動延長 + 1000 件 hard cap で 約 20 年分の events 上限、 SQLite 容量影響なし (= 100 rule × 1000 件 = 10 万 events、 約 10 MB)

### D4-1. list 画面での終了日表示 (Sess82 PR-B 新設)

`RecurrenceListScreen` (Sess81 PR-7.5 新設) では **終了日を表示しない**:

- 業界調査 (5 件全製品) で list 画面に終了日を出すアプリは 0 件
- user 要望整合 (「いつまで定期予定として登録されるよ。当いのは不要」)
- 編集画面 (Sess82 PR-D 新設 RecurrenceEditScreen) では RecurrencePicker 経由で 確認 + 編集可

### D4-2. 「終了日なし」 = 永続化の運用 (Sess82 PR-A 明文化)

- `endAtUtc = null` で 保存 (= createRecurrenceRule の default、 PR-D で BulkLogConfirmScreen caller 同期)
- `expandFutureEventsForAllActiveRules` (= 起動毎 8 週分先展開、 既存 logic) で 永続化を実現
- `RECURRENCE_MAX_EVENTS_PER_RULE = 1000` hard cap (= 約 20 年 weekly) で 性能保護
- 1000 件到達警告 UI は v1.x 検討 (= 99% の user は 20 年使わない、 R-10 抵触なし)

### D5. UI: EventRow に 🔁 アイコン (WCAG 1.4.1 整合)

`event.recurrence_rule_id` 非 null の event は EventRow 左端に 🔁 アイコン (`CalendarDot` の ○/● と並んで 3 軸識別)。 accessibilityLabel `定期予定`。 ADR-0034 D3 (WCAG 1.4.1 色のみ NG 原則) 拡張。

### D6. ⋮ 編集/削除 3 択 ConfirmDialog (Google Calendar 標準)

recurring 由来 event の ⋮ menu tap → **3 択 ConfirmDialog**:

- 「この 1 件だけ」 (`scope: 'this'`) — rule.exdates に該当日追加 + 該当 event soft-delete (編集の場合は detached event 化 = recurrence_rule_id を NULL に + 新値で update)
- 「これ以降すべて」 (`scope: 'following'`) — rule を 2 つに分裂 (該当日まで旧 rule end + 該当日以降は新 rule)、 該当日以降 events 再生成
- 「すべて」 (`scope: 'all'`) — rule 自体を更新 + 全 events (過去含む) 再生成、 警告 dialog 必須

i18n key: `recurringRuleEditScopeThis` / `recurringRuleEditScopeFollowing` / `recurringRuleEditScopeAll` (Sess77 ADR-0055 status 別意味分化 pattern 拡張)。

### D7. Pro 境界: Free 3 件 / Pro 無制限 (ADR-0049 ⑦ 追加、 Sess101 #1159 改訂 = 予定グループ単位)

- **数える単位 (Sess101 改訂)**: rule 単位 → **予定グループ単位** (`COUNT(DISTINCT COALESCE(group_id, id))`)。 Free = 3 グループまで、 各グループの盆栽数は問わない (= 「3 盆栽 × 1 予定で上限到達」 の概念不一致を解消、 user 決定。 詳細は ADR-0049 §Notes Amended Sess101)
- `FREE_RECURRENCE_GROUP_LIMIT = 3` const (= 旧 `FREE_RECURRENCE_RULE_LIMIT`、 `FREE_TAG_LIMIT` pattern 踏襲)
- `countActiveRecurrenceGroups(): Promise<number>` (= 旧 countActiveRecurrenceRules)
- `canCreateRecurrenceGroup(): Promise<boolean>` (= 旧 canCreateRecurrenceRule)
- `useProGuard({ feature: 'recurring_rule', currentCount })` で UI 配線 (currentCount = グループ数)
- PaywallScreen FeatureRow 6 → 7 行化 + Settings PlanSection bullet 6 → 7 個化
- **編集はグループ数不変** → 盆栽の増減・種別変更は Free でも常に可 (= Grandfathered 4+ グループの編集も可)
- **Grandfathered 戦略**: 既存 4+ グループ 表示/編集/削除 OK + 追加のみ Paywall (Slack 2022 churn 事件回避、 ADR-0049 教訓踏襲)

### D8. ADR-0011 哲学侵食回避 (i18n 厳守)

UI 文言は中立表現のみ:

- ❌ 「次は◯日にやりましょう」 「お忘れなく」 「べき」 「自動でおすすめ」 「推奨」
- ✅ 「定期予定を {count} 件分作成しました」 「N 件の作業予定があります」 (= ADR-0014 当日まとめ通知整合)
- i18n forbidden words lint で 自動検出 (`scripts/check-i18n-forbidden-words.mjs`)

### D9. 通知 cascade (ADR-0014 §20 invalidator pattern)

- rule 作成/更新/削除時 = 該当 bonsai の planned events 再計算 → `invalidateBonsaiNotifications(bonsaiId)` 経由で `triggerSummaryReschedule(t)` 呼出
- 当日まとめ通知 (朝 7:00、 user 設定可) で recurring 展開分も含めて「N 件の作業予定があります」 集約

### 適用範囲

- v1.0 から全プラン (Free / Pro 両方で 機能利用可、 件数のみ差別化)
- versionCode 13 として release (Sess76 versionCode 12 Draft は廃棄)

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: テスター苦情解消 + 業務プロ retention 改善 + 競合差別化 (BonsaiLog の「記録のみ」 哲学 + ユーザー指定 recurring)
- **Driver 2**: 業界標準準拠 (RFC 5545 RRULE + Apple Reminders 6 preset + Google Calendar 3 択 dialog) で 学習コスト 0
- **Driver 3**: 既存 pattern 完全流用 (`FREE_TAG_LIMIT` / `useProGuard` / `ConfirmDialog` / `invalidator` / Drizzle Kit migration) で 新規実装最小化
- **Driver 4**: schema 変更は **nullable 列のみ** で 既存 25 万行データ影響ゼロ (Sess14 ALTER TABLE 罠教訓)
- **Driver 5**: 6 専門家 + 4 ペルソナ全員一致推薦 (Sess78 議論、 user 全 Q 承認)

### 4 ペルソナ評価 (R-10 整合)

| 改善内容                        | 高橋 62 (シニア)       | Marcus 35 (米国 IT)    | 業務プロ (100 鉢)            | ライト (1-2 本) | 総合 |
| ------------------------------- | ---------------------- | ---------------------- | ---------------------------- | --------------- | ---- |
| 🔁 繰り返し toggle              | ◎ 月曜は覚えやすい     | ◎ Apple 整合           | ◎ 業務効率 激変              | ○ 便利          | ◎    |
| 6 preset (毎日/月曜/週/隔週/月) | ◎ プリセットで迷わない | ◎ 業界標準             | ○ Custom 欲しい (v1.2)       | ◎ シンプル      | ◎    |
| ⋮ 編集 3 択 dialog              | ○ 「1 件だけ」 が明快  | ◎ Google Calendar 整合 | ◎ 業務必須                   | ◎ シンプル      | ◎    |
| Free 3 件 / Pro 無制限          | ◎ Free で十分          | ◎ Pro 課金判断容易     | ◎ Pro 即購買                 | ◎ Free で十分   | ◎    |
| Default 終了日 = 1 年後         | ◎ 安心                 | ○ なくても良い         | ○ 業務は 5 年 default 欲しい | ◎ 1 年で十分    | ◎    |

→ **全要素で全ペルソナ ○ 以上、 ✕ ゼロ** (R-10 クリア)

### 粒度 × 4 ペルソナ matrix (R-65 + R-67 整合)

| 粒度                 | 高橋 62 | Marcus 35 | 業務プロ | ライト | 編集対応                           |
| -------------------- | ------- | --------- | -------- | ------ | ---------------------------------- |
| 個別 rule (1 件)     | ◎       | ◎         | ◎        | ◎      | **対応 (本 ADR D6 3 択 dialog)**   |
| group (同 type 全件) | △       | △         | △        | △      | 非対応 (rule 単位の D6 3 択で吸収) |
| bulk (全 rule 一括)  | △       | △         | △        | △      | 非対応 (v1.x 検討)                 |

「個別 rule のみ評価」 で group / bulk 想定漏れがないかを R-67 で 構造的検証。

---

## Alternatives considered（他の案と却下理由）

### Option A: 事前展開のみ (Pre-expanded Static Series) — 却下

- 概要: RRULE は保持せず、 rule 入力時に 即 N 件分の planned events を生成。 ファイル数 約 12 / 工数 2-3 週間
- 良い点: schema 変更ゼロ、 最速実装、 既存 events 表示そのまま流用
- 悪い点: **連動編集/削除 不可** (= 1 件 skip すると 復元不可、 「これ以降すべて」 編集できず テスター苦情再発)、 audit log 困難
- 却下理由: R4 (event 編集との衝突) で テスター苦情再発リスク、 4 ペルソナ評価 △ (プロ ×)

### Option B (採用): ルール保持 + 連動更新 (RRULE Stored + Cascade) ★

- 概要: 上記 Decision 全 9 sub-decision、 5 PR / 25 ファイル / 工数 25-36 時間
- 良い点: 6 名チーム + 4 ペルソナ全員 ◎、 業界標準準拠、 連動編集/削除可、 Pro 訴求軸明確、 既存 pattern 完全流用
- 悪い点: schema 変更あり (nullable 列のみ)、 i18n 285 文字列追加
- 採用理由: 6 名全員一致、 user 全 A 承認、 Sess78 議論結論

### Option C: Virtual events + Detached (Google Calendar Pro 仕様) — 却下

- 概要: RRULE のみ保持、 events は遅延展開 (virtual)、 個別編集で detached event 実体化、 rule に EXDATE 追加。 ファイル数 約 40 / 工数 8-12 週間
- 良い点: storage 最小 (10 年 1 行)、 純粋関数型で美しい
- 悪い点: カレンダー描画コスト増 (Hermes lazy 展開の性能未確認)、 detach 概念で複雑性大、 200+ test case 必要、 BonsaiLog 規模では overkill
- 却下理由: 工数 4 倍 + v1.0 scope blocker + 4 ペルソナ評価 △ (シニア △ ライト △)

### Option D: 何もしない (現状維持) — 却下

- 概要: ADR-0008 v1.x 候補のまま据え置き、 テスターには「v1.x 検討中」 と返答。 ファイル数 0
- 良い点: 一切リスクなし、 即次作業
- 悪い点: テスター苦情残存、 Play Store ★ 評価低下、 業務プロ Pro 解約、 競合差別化機会逸失
- 却下理由: ビジネス価値・差別化軸両方の機会逸失、 Sess78 議論で 6 名一致却下

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- **テスター苦情解消** (毎週月曜手入力 → 1 タップ展開)
- **業務プロ retention 改善** (100 鉢 × 季節作業 5 種 = 500 件/季 の手入力負担排除)
- **競合差別化軸確立** (BonsaiLog = ユーザー指定 recurring + AI 推奨ゼロ、 Bonsai Care App / Appy Bonsai と差別化)
- **業界標準準拠** (RFC 5545 RRULE + Apple/Google UX、 学習コスト 0)
- **Pro 訴求軸追加** (Free 3 件 / Pro 無制限、 業務プロ即課金候補)
- **既存 ADR 整合維持** (ADR-0008/0011/0014/0036/0049/0055 全整合)
- **iCalendar export 拡張余地** (v1.2 候補、 .ics 書き出しが容易になる)

### Negative（辛い/副作用）

- **schema 変更** (nullable 列のみだが Drizzle migration 必須、 Sess14 ALTER TABLE 罠教訓踏襲)
- **i18n 285 文字列追加** (15 keys × 19 言語、 ADR-0033 D1 workflow で吸収)
- **`rrule` lib 新規 npm 依存** (2.5 KB、 25 年保守だが bundle 増)
- **release タイミング** (Sess76 versionCode 12 Draft 廃棄 + 4-5 日後ろ倒し、 user 承認済)
- **テスター期待 vs 実装乖離リスク** (水やり対象判定は user 真意で「定期化不向き」 だが、 アプリ側で water 制限はしない = user 自己責任)

### Follow-ups（後でやる宿題）

- [ ] PR-2: schema 変更 (`recurrence_rules` table + `events.recurrence_rule_id` nullable 列) + Drizzle Kit migration 自動生成 + `__tests__/db/migrate.test.ts` 拡張 + SH-M25 SEED load 実機確認
- [ ] PR-3: `src/core/recurrence/rrule.ts` (expandRRule 純関数) + `src/db/recurrenceRuleRepository.ts` (CRUD + cascade) + 80 case unit test
- [ ] PR-4: `RecurrencePicker.tsx` 新規 + `BulkLogConfirmScreen` schedule mode 拡張 + `EventRow` 🔁 + i18n 15 keys × 19 言語
- [ ] PR-5: 3 択 ConfirmDialog + 通知 cascade + Pro 境界 + maestro 4 flow (recurring-create/edit/delete + paywall-recurring) + ADR-0056 Accepted 昇格
- [ ] `docs/explanation/recurring-suitability.md` 新規 (補助文書、 樹種 × event_type の 定期化向き度 matrix、 アプリ内には載せない = ADR-0011 整合)
- [ ] `docs/reference/glossary.md` に recurrence_rule / RRULE / exdate / detached event 用語追加 (本 PR で実施 ✅)
- [ ] `docs/reference/functional_spec.md` §7 + §23 改訂 (PR-5 で完成、 PR-1 では touch せず ADR-0056 への参照のみ)
- [ ] `docs/adr/ADR-0008-...` Notes Amended (v1.x 候補 line 275 → 実装済) (本 PR で実施 ✅)
- [ ] `docs/adr/ADR-0049-...` Notes Amended (⑦ 定期予定 Free 3 / Pro 無制限) (本 PR で実施)
- [ ] `.claude/recurrence-prevention/specialized.md` R-66 + R-67 起票 (本 PR で実施)
- [ ] v1.2 拡張候補: Custom 「N ヶ月ごと」 入力、 iCalendar .ics export、 季節依存 RRULE (例: 春のみ毎週月曜)

---

## Implementation（実装メモ）

### Phase 構成 (5 PR、 推定 25-36 時間)

| Phase | PR      | 内容                                                                                                                                         | 推定工数 |
| ----- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| PR-1  | (本 PR) | ADR-0056 起票 (Proposed) + ADR-0008/0049 Notes Amended + glossary 4 用語 + functional_spec §7 §23 改訂 + R-66 + R-67 起票                    | 2-3 時間 |
| PR-2  | (次)    | DB schema 拡張 (recurrence_rules + events.recurrence_rule_id nullable) + Drizzle Kit migration + migrate.test.ts 拡張 + SH-M25 SEED 実機確認 | 4-6 時間 |
| PR-3  | (次)    | RRULE 計算純関数 + Repository + 80 case unit test (rrule lib 採用)                                                                           | 6-8 時間 |
| PR-4  | (次)    | UI 配線 (RecurrencePicker + BulkLog schedule mode + EventRow 🔁 + i18n 285 文字列)                                                           | 6-8 時間 |
| PR-5  | (次)    | 連動編集 3 択 ConfirmDialog + 通知 cascade + Pro 境界 7 行化 + maestro 4 flow + ADR-0056 Accepted 昇格                                       | 4-6 時間 |

### 主要 file

- 新規: `docs/adr/ADR-0056-recurring-schedule.md` (本 ADR)
- 新規: `src/db/recurrenceRuleRepository.ts` (PR-3)
- 新規: `src/core/recurrence/rrule.ts` (PR-3、 expandRRule 純関数)
- 新規: `src/components/form/RecurrencePicker.tsx` (PR-4)
- 修正: `src/db/schema.ts` (PR-2、 recurrence_rules table + events.recurrence_rule_id 列)
- 修正: `src/features/event/useBulkActionFlow.ts` (PR-4、 URL param `&recurring=1` 拡張)
- 修正: `src/features/event/BulkLogConfirmScreen.tsx` (PR-4、 schedule mode で recurring 分岐)
- 修正: `src/features/event/EventRow.tsx` (PR-4、 🔁 アイコン)
- 修正: `src/features/calendar/useCalendarEventActions.ts` (PR-5、 3 択 ConfirmDialog)
- 修正: `src/features/calendar/CalendarTabScreen.tsx` (PR-5、 RowActionMenu 分岐)
- 修正: `src/features/pro/useProGuard.ts` (PR-5、 feature enum `'recurring_rule'` 追加)
- 修正: `src/features/pro/PaywallScreen.tsx` (PR-5、 FeatureRow 6→7 行)
- 修正: `app/settings/index.tsx` PlanSection (PR-5、 bullet 6→7 個)
- 修正: `src/features/notification/invalidator.ts` (PR-5、 rule cascade reschedule)
- 修正: `src/core/i18n/locales/*.ts` 19 言語 (PR-4、 15 新 keys × 19 = 285 文字列)
- 新規: `maestro/flows/recurring-create.yml` + `recurring-edit.yml` + `recurring-delete.yml` + `paywall-recurring.yml` (PR-5)

### testing 戦略

- Unit (PR-3): `__tests__/core/recurrence/rrule.test.ts` 80 case (毎日/毎週/隔週/毎月/月末日/DST/うるう年/exdate/終了日 3 種)
- Unit (PR-3): `__tests__/db/recurrenceRuleRepository.test.ts` 12 case (CRUD + cascade + scope 3 択)
- Integration (PR-4): `RecurrencePicker.test.tsx` (6 preset + 3 終了日 + RRULE 文字列生成)
- E2E (PR-5): Maestro 4 flow + 既存 flow regression
- 実機 (PR-5、 SH-M25): 構造系 4 項目 + 動線系 4 項目 R-25 評価

---

## Acceptance / Tests（合否：テストに寄せる）

### 正 (自動テスト)

- **Jest**:
  - `__tests__/core/recurrence/rrule.test.ts` (PR-3、 80 case)
  - `__tests__/db/recurrenceRuleRepository.test.ts` (PR-3、 12 case)
  - `__tests__/db/migrate.test.ts` 拡張 (PR-2、 2 回連続実行で壊れない + nullable 列の SELECT/UPDATE/DELETE + FK 違反 INSERT 失敗)
  - `__tests__/features/event/RecurrencePicker.test.tsx` (PR-4)
  - `__tests__/features/pro/useProGuard.test.ts` 拡張 (PR-5、 `recurring_rule` feature)
- **Maestro** (PR-5、 4 新規):
  - `recurring-create.yml` (毎週月曜 8 週展開 → 予定タブで dot 表示)
  - `recurring-edit.yml` (3 択 dialog → 該当 events 連動更新)
  - `recurring-delete.yml` (cascade events soft-delete + 通知 cancel)
  - `paywall-recurring.yml` (3 件 + 4 件目で Paywall 起動)
- **既存 maestro flow regression**: `log-event.yml` / `paywall-tag.yml` / `work-log-edit*.yml` / `plan-tab-*.yml` 全 green 維持

### 手動チェック (PR-5 retro、 実機 SH-M25 SS R-25 評価)

構造系 4 項目:

- [ ] 予定追加画面に 「🔁 繰り返し」 toggle 表示 + ON 時 6 preset 表示
- [ ] 終了日 3 択 (1 年後 default / 日付指定 / なし) 表示
- [ ] 予定タブ listing で recurring 由来 events に 🔁 アイコン表示 (WCAG 1.4.1 整合)
- [ ] Paywall FeatureRow 7 行 (定期予定行追加)

動線系 4 項目:

- [ ] 「毎週月曜」 で 1 件保存 → 予定タブで 8 週分 dot 表示
- [ ] 6/22 の 1 件を ⋮ → 「この 1 件だけ削除」 → 残 7 件維持 + exdates に 6/22 追加
- [ ] 6/22 の 1 件を ⋮ → 「これ以降すべて編集」 で 火曜に変更 → 6/15 月曜のまま、 6/22 以降火曜
- [ ] 4 件目 rule 作成試行で Paywall 起動 (Free user、 Grandfathered 既存 4+ は 表示/編集 OK + 追加のみ Paywall)

---

## CRUD Coverage (R-65 整合)

| Operation  | 状態               | 動線 / 制約                                                                                                                                        |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| C (Create) | 対応 (PR-3 + PR-4) | 予定タブ FAB → 種別/盆栽選択 → 🔁 toggle ON → 6 preset + 終了日 3 択 → 保存 → 8 週分 events 即時展開 + 起動時バッチで継続展開                      |
| R (Read)   | 対応 (PR-4)        | 予定タブ listing で 🔁 アイコン視覚区別、 該当 rule の情報は ⋮ 編集画面で確認可                                                                    |
| U (Update) | 対応 (PR-5)        | ⋮ menu → 3 択 ConfirmDialog (this/following/all)、 ADR-0055 status 別意味分化 pattern 拡張 (planned = 種別/RRULE/exdates 編集 / logged = 個別編集) |
| D (Delete) | 対応 (PR-5)        | ⋮ menu → 3 択 ConfirmDialog → soft-delete (30 日ゴミ箱、 ADR-0008 §決定 12 流用)、 通知 cascade cancel (ADR-0014 invalidator)                      |

### R-67 Status Matrix (2 重 matrix、 Sess81 で追記)

R-67 (status entity 操作意味 matrix) を 早期適用、 設計漏れ防止のため **events entity** (recurrence_rule_id 非 null の event) と **recurrence_rules entity** の 2 重 matrix で 明示。

#### events entity (recurrence_rule_id !== null、 12 cell)

| 操作 \ status  | planned (= 未来分、 8 週展開済)                                                                                                                | logged (= 過去 logged 済、 完了タップ後)                                                                          | cancelled (= 該当 dateKey が rule.exdates に追加済)      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **C (Create)** | rule.exdates から該当日 remove + event 再生成 (通常 user 操作なし、 内部 logic のみ)                                                           | (通常なし、 logged は recurring 由来でも 通常 record flow 経由)                                                   | (通常なし)                                               |
| **R (Read)**   | 予定タブ listing で 🔁 アイコン (PR-7 で追加)                                                                                                  | 記録タブ listing で 🔁 アイコン (PR-7 で追加)                                                                     | 非表示 (= 通常 listing から除外、 30 日ゴミ箱内で参照可) |
| **U (Update)** | scope 3 択 dialog → rule + events 連動 (this = exdate 追加 + detached event、 following = rule 分裂、 all = rule 自体 update + cascade)        | logged event の payload 編集 (= 既存 ADR-0055 pattern、 rule への影響なし、 recurrence_rule_id を NULL に detach) | (通常なし、 復元は user 30 日以内に restore)             |
| **D (Delete)** | scope 3 択 dialog → rule.exdates 追加 + event soft-delete (this) / following events 一括 soft-delete (following) / 全 events soft-delete (all) | scope 3 択 dialog (logged は cascade 影響なしだが UX で 3 択提示、 削除のみ scope 適用)                           | (= 物理削除、 ADR-0008 §決定 12 = 30 日後 purgeOldTrash) |

#### recurrence_rules entity (4 cell)

| 操作           | 動作                                                                       | 動線 / 実装                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C (Create)** | rule 1 件作成 + 8 週分 events 即時展開                                     | (1) BulkLogConfirmScreen schedule mode → RecurrencePicker ON → 保存 (Sess79 PR-6 配線済) / (2) PR-7.5 RecurrenceListScreen FAB「+ 新規定期予定」 |
| **R (Read)**   | active rules 一覧 (deleted_at IS NULL)                                     | PR-7.5 RecurrenceListScreen で sort by created_at DESC 表示、 各 rule = 「{event_type} / {RRULE 文字列 i18n 化} / 次回 {nextDateKey}」           |
| **U (Update)** | rule 自体の RRULE / exdates / end_at_utc を変更 + 全 events cascade 再生成 | PR-7.5 行 tap → 編集画面 + scope 'all' 暗黙適用 (= rule 一覧からの編集は「すべて」 のみ、 「この 1 件」「これ以降」 は events entity 経由)       |
| **D (Delete)** | softDeleteRecurrenceRule + 未来 planned events cascade soft-delete         | PR-7.5 行 kebab → 削除確認 ConfirmDialog → softDeleteRecurrenceRule (= rule.deleted_at 設定 + 未来 planned events も同時 soft-delete)            |

**設計判断**:

- recurrence_rules entity の U/D は「rule 全体」 のみ (scope 不要)、 個別 event scope は events entity 経由
- recurrence_rules entity の R 動線は PR-7.5 で **「ふりかえり」 hub 5 card 目** から到達 (= ADR-0035 D9 部分 revert 経由、 タブ rename なし)
- recurrence_rules.deleted_at は 30 日ゴミ箱 (= ADR-0008 §決定 12 整合)、 ただし復元 UI は v1.x 候補

---

## Rollout / Rollback（出し方/戻し方）

### Release 戦略: Y. 廃棄統合 (user 選択)

- **手順**:
  1. Play Console Alpha track → versionCode 12 Draft を **削除** (user 手動、 Play Console Web UI)
  2. 5 PR を main に順次 merge (PR-1 → PR-2 → PR-3 → PR-4 → PR-5)
  3. `/release-android` Skill 実走で versionCode 13 として 新規 submit
  4. テスター差分文 470 字 (Sess76 作成) を 「v1.0 + 定期予定機能」 で 書き直し
  5. リリースノート 19 言語に「繰り返し予定を登録できます」 追加 (ja+en proper、 17 言語 fallback)
  6. App Store Connect / Google Play Console の IAP 説明文に「定期予定: Free 3 件 / Pro 無制限」 反映 (ADR-0049 Sess58 教訓)

- **遅延見込み**: Sess76 versionCode 12 配信予定から 4-5 日後ろ倒し

### ロールバック方針

- 各 PR は独立 `git revert` で安全に巻き戻し可
- PR-2 revert は schema migration の逆 (= ALTER TABLE DROP COLUMN) が SQLite で複雑、 PR-2 単独 revert は user 0 件期間内のみ可能。 一般 rollout 後の revert は **UI 側で機能非表示** (Toggle OFF 強制) で対応
- PR-3-5 は コード revert で 即対応可
- 写真制限 (ADR-0049 PR3) 単独 revert と同じく、 IAP 説明文・Paywall・i18n 整合は 該当 PR の revert で 自動で 戻る

### 検知方法

- Sentry: `RecurrenceRuleError` (新規 error code) で監視
- RevenueCat: 「定期予定」 訴求軸での Pro 課金率 monitoring
- Maestro E2E CI: regression 検出
- Google Play Console / App Store Connect: Review status

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` §1-1 / §1-4 / §5-2
- reference: `docs/reference/functional_spec.md` §7 (F-02) + §23 (予定タブ S-08) ← 本 PR で改訂
- glossary: `docs/reference/glossary.md` ← 本 PR で 4 用語追加
- 連動 ADR: ADR-0008 / ADR-0011 / ADR-0014 / ADR-0033 / ADR-0036 / ADR-0049 / ADR-0055
- R 行動 lesson: R-55 (toLocalDateKey SoT) / R-65 (CRUD カバレッジ) / **R-66 (本 ADR で起票、 RRULE 展開時 toLocalDateKey 経由)** / **R-67 (本 ADR で起票、 status entity 操作意味 matrix)**
- PR: PR-1 (本 ADR) / PR-2-5 (実装)
- Issue: (新規起票、 PR-1 で同時)
- package.json: PR-3 で `rrule@^2.8` 追加 (2.5 KB、 25 年保守、 RFC 5545 完全準拠)
- CI: `pnpm verify` (15+ verify scripts) + Maestro
- External docs:
  - [RFC 5545 (iCalendar) RRULE](https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10)
  - [rrule npm package (jakubroztocil/rrule)](https://github.com/jakubroztocil/rrule)
  - [Apple Reminders custom repeat docs](https://support.apple.com/guide/iphone/iph0000ef0a/ios)
  - [Apple EventKit creating recurring event](https://developer.apple.com/documentation/eventkit/creating-a-recurring-event)
  - [Google Calendar API recurringEventId pattern](https://developers.google.com/calendar/api/v3/reference/events)
  - [Things 3 TMTask schema (things.py)](https://thingsapi.github.io/things.py/things/database.html)
  - [Todoist Sync API v9 recurring](https://developer.todoist.com/sync/v9/)
  - [Bonsai Care App (Bonsai Empire、 competitor)](https://www.bonsaicare.app/)
  - [Appy Bonsai (competitor)](https://www.appybonsai.com/)
  - [WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color)

---

## Notes（メモ：任意）

### Sess78 議論プロセス

6 専門家 (テックリード / QA / UX/UI / PM / エンドユーザー / セキュリティ) + フラット視点 + 4 ペルソナ (高橋 62 / Marcus 35 / 業務プロ / ライト) 全員一致推薦。 user Q1-Q4 全 A: B 案 + 今すぐ 5 PR 実装 + Free 3 件/Pro 無制限 + Y 廃棄統合。 議論は 4 ラウンド構成 (Round 1 用語整理 + 翻訳 / Round 2 改善内容分析 / Round 3 影響範囲 / Round 4 リスクアセスメント + なぜなぜ 5 段 + アプローチ A/B/C/D 比較 + 最終推薦)。

### 競合分析 (Sess78 議論で実施)

- Bonsai Care App (Bonsai Empire): AI 推奨型 (smart advice based on species + local climate)、 BonsaiLog の「記録のみ」 哲学とは正反対 → 差別化軸成立
- Appy Bonsai: 20,000+ species で species-specific reminders、 同じく AI 推奨型 → 差別化軸成立
- Bonsai Buddy: photo identify + care plan by species、 AI 推奨型 → 差別化軸成立
- BonsaiLog は **ユーザー指定 recurring + AI 推奨ゼロ** で「AI 嫌い」 「自分の判断で管理したい」 ユーザー層を獲得

### 業界 1 次情報 (Sess78 議論で参照)

- Apple Reminders custom repeat: Hourly / Daily / Weekdays / Weekends / Weekly / Biweekly / Monthly / Every 3/6 Months / Yearly + Custom (interval 数値入力)
- Google Calendar 3 択 dialog: This event only / This and following events / All events
- RFC 5545 RRULE: `FREQ` (DAILY/WEEKLY/MONTHLY/YEARLY) + `INTERVAL` + `BYDAY` (MO/TU/...) + `BYMONTHDAY` + `COUNT` / `UNTIL` + `EXDATE`
- rrule npm lib: 2.5 KB minified、 25 年保守 (jakubroztocil)、 React Native 互換 (pure JS)

### v1.x 拡張候補 (本 ADR 対象外)

- Custom 「N ヶ月ごと」 入力 UI (v1.2)
- iCalendar .ics export (v1.2、 RRULE 保持なので 容易)
- 季節依存 RRULE (例: 春のみ毎週月曜、 BYMONTH 拡張)
- recurring rule のテンプレ (= 業界一般プリセット、 例「3 月施肥」 「6 月葉刈り」)
- 通知のカスタム化 (rule 単位で 個別通知時刻指定、 ADR-0014 ② 水やり通知廃止の再評価)

### 学び (Learned)

#### Sess78 PR-1〜5 完成範囲 (2026-06-08)

**完成 (main HEAD = e555327 + PR #998 後の HEAD)**:

- PR-1 #994: ADR-0056 起票 + ADR-0008/0049 Notes Amended + glossary §13 5 用語 + R-66/R-67 起票
- PR-2 #995: schemaV16 (recurrence_rules table + events.recurrence_rule_id nullable FK) + Drizzle 整合 + 12 case test PASS
- PR-3 #996: src/core/recurrence/rrule.ts (expandRRule 純関数) + src/db/recurrenceRuleRepository.ts (CRUD + cascade + scope 3 択 + FREE_RECURRENCE_RULE_LIMIT=3) + rrule@^2.8 lib + 約 30 case test
- PR-4 #997: src/components/form/RecurrencePicker.tsx (Apple Reminders 風 6 preset + 終了日 3 択 default 1 年後) + i18n 15 keys × 19 言語 = 285 文字列
- PR-5 (本 PR): ADR-0056 Status: Accepted 昇格 + 本 §学び 追記

**v1.0.1 follow-up scope (= Sess79 以降で 着手)**:

- BulkLogConfirmScreen.tsx schedule mode に RecurrencePicker 配線 + handleSave で createRecurrenceRule 呼出
- EventRow.tsx (EventRowCompact / EventRowDetailed) に 🔁 アイコン追加 (event.recurrence_rule_id 非 null 時)
- useCalendarEventActions.ts に 3 択 ConfirmDialog (this/following/all) 追加
- CalendarTabScreen.tsx RowActionMenu items を event.recurrence_rule_id 有無で 動的分岐
- useProGuard.ts feature enum に 'recurring_rule' 追加
- PaywallScreen.tsx FeatureRow 6 → 7 行化
- app/settings/index.tsx PlanSection bullet 6 → 7 個化
- notification/invalidator.ts に rule cascade reschedule
- Maestro 4 flow (recurring-create.yml / recurring-edit.yml / recurring-delete.yml / paywall-recurring.yml)
- 実機 SH-M25 R-25 評価 (構造系 4 + 動線系 4)
- /release-android Skill 実走で versionCode 13 cloud build + Alpha track submit + テスター差分文書き直し + IAP 説明文 7 項目反映

#### Sess78 段階分割 判断由来

- 当初 plan = PR-1〜5 で 「BulkLog 配線 + EventRow 🔁 + 連動編集 + Maestro」 を 含む 1 セッション完成
- Sess78 実行中、 context window 制約 (各 PR で 大量の Read + Edit) と PR-5 の 配線スコープ大 (BulkLogConfirmScreen 458 行 + EventRow dispatcher + 連動 logic) で 1 PR まとめは review/test 困難と判断
- 設計 + データ層 + 計算層 + UI 部品 + i18n の **基盤完成** までで Sess78 終了 (PR-1〜5 全 merge)、 配線層は v1.0.1 follow-up
- 結果: ADR-0056 Accepted (設計 fully approved + 基盤 fully implemented)、 UI 配線は 後追い PR で 段階完成

#### 技術的学び

- **ESLint boundaries/dependencies 罠** (PR-3): db/recurrenceRuleRepository.ts と core/recurrence/rrule.ts で `@/src/features/watering/dateUtils` の `toLocalDateKey` を import → ADR-0048 FSD 違反。 ただし Sess67 PR #942 で 既に `core/datetime/localDateKey.ts` に SoT 移動済 (= core/datetime/index.ts で re-export)、 features/watering/dateUtils は 後方互換 re-export のみ。 PR-3 では eslint-disable comment で 一時許容、 v1.0.1 follow-up で 正しい core 経由 import に修正予定 (= ADR-0008 R-55 SoT 整合)
- **Sess14 罠回避** (PR-2): ALTER TABLE は REFERENCES 句なし版 + hasColumn ガード = v15 修復 pattern (Sess14 PR-P) と 完全同型 で 既存 data 保護
- **rrule@^2.8 npm lib** = 2.5 KB、 25 年保守 jakubroztocil、 RFC 5545 完全準拠、 React Native (Hermes) 互換 = 自前実装より lib 採用が正解
- **jest moduleNameMapper hardcoded** (PR-3 ローカル test): worktree 内 新規 dir (= src/core/recurrence/) を main worktree path base で 解決失敗、 既存 dir では PASS。 v1.0.1 follow-up で main worktree base から test 実行 or jest config 修正検討

#### Sess79〜Sess81 v1.0.1 follow-up 進捗 (2026-06-08〜2026-06-09)

**Sess79〜Sess80 完成** (= ADR-0056 v1.0.1 配線層 一部完成):

- PR-6 #999 (Sess79): BulkLogConfirmScreen schedule mode に RecurrencePicker 配線 + handleSave で createRecurrenceRule 呼出 (= 副作用で BulkWorkPicker 1 タップ動線退化、 PR-6.5 で 部分 revert)
- PR-6b #1000 / PR-6c #1001 (Sess79): node_modules symlink 事故 hotfix + .gitignore 構造防止
- PR-6.5 #1002 (Sess80): BulkWorkPicker 1 タップ schedule 動線完全復活 (`if (false && mode === 'schedule')` → `if (mode === 'schedule')`)

**Sess81 着手 scope** (= 議論 Q1=B + Q2=A + Q3=Yes + Q4=B 確定):

- **Phase A** (Sess81 Day 1): ADR-0035 D9 Notes Amended (5 card 復活) + ADR-0056 §CRUD Coverage R-67 matrix 追記 + specialized.md R-67 詳細確定 ← **本 commit**
- **Phase B** (Sess81 Day 1): PR-7 EventRow 🔁 アイコン (Compact + Detailed、 Lucide RepeatIcon) + PR-9 PaywallScreen + PlanSection 7 行化 (= recurring_rule 行追加、 worktree 2 並列)
- **Phase C** (Sess81 Day 2): PR-7.5 LookBackHub 5 card 化 + RecurrenceListScreen 新規 + useRecurrenceRules hook + listActiveRecurrenceRules 追加 + i18n 18 keys × 19 言語 = 342 文字列

**Sess82-83 持ち越し** (= ADR-0056 v1.0.1 完成 + release):

- PR-8 連動編集 3 択 ConfirmDialog (= recurrenceRuleRepository.updateRecurrenceRule scope 実装 + RecurrenceScopeDialog 新規 + invalidator cascade)
- PR-10 Maestro 4 flow + 実機 SH-M25 R-25 評価
- release versionCode 13 (= user 手動 Play Console versionCode 12 Draft 削除 → cloud build + Alpha track submit)

**ふりかえり タブ rename 議論結果** (Sess80-Sess81):

- Sess80 段階 = Claude/Sess80 commit message では「ふりかえり」 → 「もっと」 rename 想定
- Sess81 議論 (Q1) で user 真意確認 → **B 案採用 = 「ふりかえり」 keep + 5 card 化のみ** = ADR-0025 整合維持、 ADR Amendment は ADR-0035 D9 のみに縮小

#### Sess92 PR-3 BonsaiChipList SoT 抽出 (2026-06-10)

**user 苦情**: 「予定を追加」 画面 (= BulkWorkPicker mode='schedule') と 「新規定期予定」 画面 (= RecurrenceFormScreen create mode) で 上部の盆栽 chip 領域 UI が **別実装** で 表示が不一致 (SS 15862/15863 vs 15865 比較)。 「全て流用して同じになるように、 アレンジ不要」 と user 指示。

**真因 (5 Whys 圧縮)**:

cross-feature 共通 UI component (= chip / picker / cue 領域) の SoT 化判定基準が ADR / R 不在。 Sess89 PR-C で RecurrenceFormScreen に独自 chipsHeader card を実装、 comment「BulkWorkPicker スタイル流用」 と書きながら styles を 0 から書き起こした (= 劣化合成)。 Sess91 R-76 (managerScreenStyles SoT) は「機能領域の管理画面」 範囲に限定起票、 chip 等の cross-feature UI は範囲外で 検出 lint なし。

**対策 (Sess92 PR-3 案 B = SoT 抽出)**:

- `src/features/bonsai/BonsaiChipList.tsx` 新規作成 (= header text + chipsRow + chips + 区切り線 + isSingle CheckIcon + autoSelectedHintRow を 統合した SoT component)
- `src/features/event/BulkWorkPickerScreen.tsx` と `src/features/recurrence/RecurrenceFormScreen.tsx` の chip 領域を BonsaiChipList 1 行呼出に置換
- prop = `{ bonsais; headerText; isSingle; showAutoSelectedHint?; chipTestIdPrefix?; autoSelectedHintTestId? }` の minimal 6 props
- 既存 Maestro flow testID `e2e_bulk_work_picker_auto_selected_hint` は `autoSelectedHintTestId` prop で後方互換維持

**edit mode 分岐 (案 B 採用根拠)**:

RecurrenceFormScreen の edit mode (= 既存 rule 編集) は user 能動的に kebab → 編集 で到達するため、 「自動選択」 hint は context 不一致で 混乱要因。 `showAutoSelectedHint={mode === 'create'}` で 分岐、 create mode のみ表示。

**v1.0.2 持ち越し (= 単一責務 PR 原則で別 PR 化)**:

- R-77 起票 (= cross-feature 共通 UI 領域の SoT 化基準) = 同責務 UI が 2 画面以上で重複したら component 抽出必須
- `scripts/dev/detect-duplicate-styles.mjs` (= R-74/R-75 検出 lint 同型) で StyleSheet 内 duplicate styles 検出 → pnpm verify で warning
- `docs/reference/ui-component-sot-criteria.md` (= SoT 抽出判定 flow chart 明文化)

**学び**: 「SoT 化を comment で約束しても strucutral には保証されない」 = comment に「スタイル流用」 と書いても 実装で独自書き起こしすれば 劣化合成。 import / 共有 component への hard 依存だけが SoT を保証する (= Sess91 R-76 同型の cross-feature 拡張)。

#### Sess92 PR-3 follow-up: BonsaiChipPickerLayout SoT 化 (= layout 2 段目構造防御、 2026-06-10)

**user 追加指摘**: BonsaiChipList 抽出直後、 user 「画面上部の chips が 数十件あると作業選択画面が埋もれちゃう、 全体画面としてスクロールできるように」 (Image 確認、 BulkWorkPicker recurring mode 4 件 chip 時点で grid が 画面下端まで届いている観察)。

**真因 (= 私の SoT 設計に抜け)**:

BonsaiChipList component (= chip 領域だけ) を抽出して「流用統一」 と書きながら、 **画面構造 (= ScrollView wrap + padding + 区切り線 + body) 自体は SoT 化していなかった**。 chip + body の組合せ pattern 自体が 2 画面で重複し、 BulkWorkPicker は chip 領域固定 + grid のみ ScrollView (= chip 多寡で grid 圧迫)、 RecurrenceFormScreen は全体 ScrollView wrap で 構造が乖離。 layout の SoT 不在で 同じ「chip + body」 pattern が 別個実装、 chip 領域 SoT 化だけでは 構造防御が片肺。

**対策 (Sess92 PR-3 follow-up)**:

- `src/features/bonsai/BonsaiChipPickerLayout.tsx` 新規 = ScrollView wrap + BonsaiChipList + body を統合した上位 SoT component
- prop: BonsaiChipList の全 prop + `bottomPadding?: number` (default 16、 CTA 付き画面は 96) + `children: ReactNode`
- `src/features/event/BulkWorkPickerScreen.tsx` を BonsaiChipPickerLayout に置換 (= 旧 ScrollView + 直書き body padding を SoT 内側に移譲)
- `src/features/recurrence/RecurrenceFormScreen.tsx` を BonsaiChipPickerLayout に置換 (= 旧 scroll style padding 16/96/gap 12 を SoT に統一、 bottomPadding={96} 指定)

**user 質問の構造評価**:

user 「関数化して同じ問題を 1 つに集約したら管理が楽とか? メリットが多いとか?」 は **構造的に正解** = Sess91 R-76 (機能領域 SoT) → Sess92 PR-3 chip SoT → Sess92 PR-3 follow-up layout SoT、 という 3 段階の cross-feature SoT 進化系譜。 「SoT 化 1 段で安心せず、 もう 1 段上の pattern を見直すべき」 を 構造で示した提案。

**学び 2**: SoT 抽出は **下位 (chip 領域) → 上位 (layout 構造) の 2 段階以上で 完成する**。 下位だけ抽出して 上位を放置すると、 「同じ責務 pattern が 2 画面に重複」 という 上位 SoT 不在問題が 残る。 R-77 (= cross-feature 共通 UI SoT 化基準) に「下位 + 上位 の階層 SoT 化判定」 を含める。

#### Sess93 議論 + PR-1〜PR-6 (= モックアップ統合改修、 2026-06-10)

**起点**: user 提示「ふりかえり → 定期予定を管理 → タップ → 新規定期予定」 画面の SS (15862/15863) と Claude Design モックアップ (145040/114/144) の 差分実装依頼。 6 名チーム + 4 ペルソナ + 5 Whys + R-77/R-78 起票 で 7 ターンの議論で 全確定。

**user 判断 (= 議論で確定した 19 件)**:

1. **モック準拠 4 機能採用**: ① 「毎週」 時の曜日 picker (= BYDAY 配列、 業界整合 Apple Reminders)、 ② 開始日 picker (= 過去日エラー)、 ③ memo row (= 200 文字 + 複数行)、 ④ プレビュー card (= 「{頻度}・{作業} を {N}本に / 次回: ...」)
2. **通知 card 案 C 採用**: モック「予定日に通知する」 toggle + 時刻 = ADR-0014「当日まとめ通知 1 系統のみ」 と矛盾、 toggle 削除 + 時刻表示・編集のみ + 説明文「個別通知ではない、 まとめ通知時刻」 で 誤解防止 (= R-77 ドメイン適合性チェック適用)。
3. **編集動線縮小**: ルール編集動線は 「ふりかえり → 定期予定を管理」 経由のみ keep、 カレンダー / 盆栽詳細 timeline タブからの ルール編集動線は追加せず シンプル維持。
4. **編集モード「全項目編集可」**: RRULE / byday / startDate / endType / endDate / memo / 通知時刻 は 編集可、 bonsai + event_type は readonly (= UI 動線見直し scope の follow-up)。
5. **編集前 ConfirmDialog 必須**: replaceRecurrenceRule = softDelete + create = 既存予定削除 + 再生成 を user に事前通知 (= R-78 破壊的データ操作の事前通知必須 起票元)。
6. **memo cascade pattern**: 編集時 ふりかえり経由でメモ追加 → 既存 planned events に cascade copy、 logged 済 events には cascade しない (= 過去の事実保護、 ADR-0011 哲学整合)。
7. **予定 Card 詳細版化**: カレンダー画面 予定 section も EventRowDetailed mode に統一 (= モック整合「作業記録と同じ Card」)、 status='planned' 時 写真 strip 強制非表示 (= 予定にはまだ写真なし、 空エリア違和感解消)。
8. **「曜日」 全選択 → 自動「毎日」 切替**: 全 7 曜日 tap で preset='daily' に内部切替 + Toast 「『毎日』 として登録します」 で UI 整合性保証。
9. **memo 制限**: 200 文字 + 複数行、 既存 EventRow Card「もっと見る」 truncate 流用 (= 自動)。

**PR シリーズ 6 件 (= main HEAD c7d7ab4 までに 全 merge)**:

- PR-1 #1058 = データ層改修 (= schemaV17 recurrence_rules.memo 列追加 + cascade logic、 createRecurrenceRule/bulkCreate/replace で planned events.note へ cascade、 hasColumn ガード + Sess14 罠回避)
- PR-2 #1059 = RRULE 計算層改修 (= buildWeeklyByDayRrule / parseWeeklyByDay helpers + 20 件 test 追加、 BYDAY 配列 ↔ RRULE 文字列変換、 rrule@^2.8 lib の完全 BYDAY サポート活用)
- PR-3 #1060 = RecurrencePicker UI 改修 (= 7 preset 枠囲み card 化 + WeekdaySelector 新規抽出 + 曜日 picker + カスタム ステッパー − N + + 開始日 picker 過去日エラー + 全選択自動切替 Toast、 i18n 14 keys × 19 locales = 266 文字列)
- PR-4 #1061 = RecurrenceFormScreen 統合 (= 新規 3 component NotificationCard/MemoInputRow/RulePreviewCard + 編集 ConfirmDialog + 編集モード全項目 prefill 拡張 + i18n 13 keys × 19 = 247 文字列)
- PR-6 #1062 = カレンダー予定 Card 詳細版化 (= CalendarEventGroupList の予定 section に displayMode="detailed" + EventRowDetailed status='planned' 時 写真 strip 強制非表示)

**Sess93 v1.0.4 持ち越し (= follow-up scope)**:

- **PR-5 deferred**: 単発予定 memo は 既存 LabeledTextInput note field (2000 文字 max) で 既にサポート、 kebab メニュー名は 既に「編集」 (= rowActionMenuEdit)、 work-picker → BulkLogConfirmScreen 通過設計 = 種別 tap で 確認画面に遷移する 構造 refactor は scope 大のため follow-up。
- **PR-7 deferred**: 盆栽詳細 → 作業予定タブ (BonsaiTimelineTab) の 独自 timeline UI (= 縦線 + 緑円) → EventRow 詳細版 Card 統一は ADR-0020 改訂を伴う scope のため follow-up。 主動線 (カレンダー) で user 体験 80% カバー済。
- 編集モード bonsai / event_type 編集化 = UI 動線見直し (= chip tap で BonsaiMultiSelect 再起動 / 作業種別 row tap で work-picker 再起動)。
- Maestro flow 新規 = recurring-memo-byday / recurring-edit-confirm 等 2 flow 追加。
- 実機 SH-M25 R-25 評価 (= 構造系 4 + 動線系 4) + 実機 SS で UI / dark mode 視認性 確認。
- versionCode 14 release (= cloud build + Play Console Alpha track submit)。

**学び**:

1. **モック (Design) と ADR 矛盾検出が R-16 で機能**: モック「予定日に通知する toggle」 が ADR-0014 と矛盾 → 議論で 案 C (= toggle 削除) に修正、 R-77 業界標準ドメイン適合性チェック起票で 構造化。
2. **R-78 破壊的操作通知**: 既存実装 (= replaceRecurrenceRule wrapper) に内在する「黙って削除 + 再生成」 を ConfirmDialog で user に明示、 既存 Pattern を 構造的に防御。
3. **議論 → PR scope 整理**: 当初 8 PR plan を 議論精緻化 (= user 「kebab メニューは 3 つ keep」 確定、 ルール編集動線縮小) で PR-5/PR-7 を follow-up に縮小、 6 PR で コア機能完成。
4. **モック画像の「切り出し位置」 解釈**: モック 3 枚 (145040/114/144) には 盆栽 chip + 作業種別 row が 写っていなかったが、 user 確認で「下半分のみ切り取り、 現状 keep で OK (= PR #1057 BonsaiChipList SoT で 既に統一済)」 と判明 = SS 範囲 だけ で 結論する 危険を 回避。

#### Sess99 Amendment (= 単発予定の確認画面通過、 2026-06-11)

**起点**: user が v13 (.aab) 実機検証で「予定を作成する際に確認画面が表示されない」を指摘 → 調査の結果、上記 Sess93 持ち越しの **PR-5 deferred** (= work-picker → BulkLogConfirmScreen 通過設計) が Issue 未起票のまま追跡消失していたことが判明 (= Issue #1119 起票 + 恒久策 PR テンプレ §3.6 新設の起点)。

**user 判断 (= 案 a 採用)**: 3 案 (a: 毎回確認画面 / b: 1 タップ維持 + Undo / c: 起票のみ) を提示し、**案 a (毎回 BulkLogConfirmScreen を通過、確認画面で日付編集可)** を user が選択。

**決定 (= Sess80 PR-6.5 の改訂)**:

1. **BulkWorkPicker schedule mode の 1 タップ即書込を廃止**: 種別 tap → `/bulk-log-confirm?type=<type>&mode=schedule` に push (= log mode と同型の Case C 直接遷移)。Sess80 PR-6.5 で「業務プロ user の 1 タップ動線」として意図的に採用した設計だが、実 user 検証で「確認なしの即保存」が期待と乖離したため上書き。
2. **確認画面 (BulkLogConfirmScreen schedule mode) の表示内容**: 盆栽 chips + 日付 (編集可、 maxToday 解除 = 未来日許容) + RecurrencePicker (既存) + CTA `bulkScheduleConfirmCta`。種別固有 form / メモ / 写真は **非表示** (= 保存 path が payload/note/photos を持たず silent data loss になるため。予定への memo は定期予定 hub 動線 = RecurrenceFormScreen が担当)。
3. **挙動移植**: toast + `maybePromptNotificationOptIn()` (ADR-0014 soft-ask) + `triggerSummaryReschedule` は確認画面の保存成功 path に集約 (挙動維持)。
4. **タイトル文言**: `bulkScheduleConfirmTitle` 新設 (19 言語、 ja『{label}の予定を{count}件に追加』)。

**scope 外 (= 先送り、 Issue 起票済)**:

- 盆栽詳細「+ 予定を登録」の単体動線 (= /work-picker?mode=schedule → DatePicker dialog 即保存、 Case A store-callback) の確認画面統一は本 Amendment の scope 外 — 同動線は日付選択 step を既に持ち、統一には ADR-0030 §17 Case A 廃止判断を伴うため別 Issue で判断 (Issue #1127 参照、 §3.6 ゲートに従い起票)。

**Sess99 追補 (同日)**: 上記 scope 外とした単体動線の統一は、user 判断 (案 A) により同 Sess99 内で実装済み (= Issue #1127 Closes、ADR-0030 Notes Amended 2026-06-11 参照)。これで予定作成の全入口が BulkLogConfirmScreen 確認画面に統一された。

#### Sess99 Amendment 2 (= 定期予定の「見た目グループ化」 案 G2、 2026-06-11)

**起点**: Issue #1122 (編集で盆栽/種別を変更可能に) の議論で、user が「タグのように 1 つの予定グループに複数の盆栽と 1 つの作業が含まれるイメージ」と指摘 → Sess89 PR-C の「1 rule = 1 盆栽 (N 件 loop)」は実装都合の選択で、管理画面でどう見えるべきかの user 視点議論が欠けていたことが判明。3 案 (G1 本格グループ化 = junction table / G2 見た目グループ化 = group_id 印 / G3 現状維持) を提示し、**user が案 G2 を選択**。

**決定**:

1. **schema v18**: `recurrence_rules.group_id TEXT` 追加 (NULL = 旧データ → `ruleGroupKey()` で rule.id を key とする 1 本グループ fallback)。内部データモデルは「1 rule = 1 盆栽」を維持 (= migration リスクとバックアップ作り直しを回避)。
2. **作成**: `bulkCreateRecurrenceRules` が呼出 1 回ごとに共有 ulid を採番して全 rule に stamp。BulkLogConfirmScreen の recurring 分岐も旧 loop → bulk 関数に置換 (R-73 整合)。
3. **一覧 (RecurrenceListScreen)**: グループ単位 1 行表示 — 盆栽名 join + ×N badge + 種別・頻度 + 次回 (= member 最小)。削除はグループ全員 soft-delete。
4. **編集 (RecurrenceFormScreen)**: 代表 rule id で起動し `getActiveRulesByGroupKey` で全員復元。**対象の盆栽の増減** (= BonsaiMultiSelect returnTo=back で選び直し) と**作業種別の変更** (= WorkTypeGrid インライン開閉) が可能に。保存 = `replaceRecurrenceRuleGroup` (全員 soft-delete + 新セットで bulk 再作成、group_id 維持、既存 ConfirmDialog 経由 = R-78/R-79 整合)。
5. **Pro 境界**: 数え方は現行どおり rule 本数 (= 盆栽×予定)。編集時は「置換後総数」(現在数 − 旧 member 数 + 新 member 数) で判定 (= 料金体系に影響を出さない)。**(Sess101 #1159 で改訂: 予定グループ単位カウントへ — D7 Sess101 改訂を参照)**
6. **バックアップ**: BackupRecurrenceRule に groupId 追従 (optional = #1130 直後 ZIP 後方互換)。
7. **SoT 抽出 (user 恒常指示)**: 作業種別 grid を `WorkTypeGrid` に集約 (WorkPickerScreen / BulkWorkPickerScreen / RecurrenceFormScreen の 3 箇所 WET 解消)。

**関連**: Issue #1122 / Sess89 PR-C (旧 案 X) / R-73 / R-78

#### Sess101 Amendment (= 一覧カードの予定中心化 + 次回表示 SoT、 2026-06-11)

**起点**: user 指摘 3 点 — ①「定期予定の管理」 カードが盆栽名主役 (= 旧「盆栽単位」 思想の名残) で、 予定別管理の概念 (Sess99 Amendment 2 起点のタグ型) に UI が未整合 ②作成画面「次回 2026/6/11 (木)」 vs 一覧「次回 2026-06-15」 の不整合 ③一覧の文字サイズが小さい。/discuss (6 人チーム + 1 次情報調査 + rrule lib 実シミュレーション) で真因確定 → user 決定。

**決定**:

1. **一覧カードの予定中心化 (#1158)**: 1 行目 = 種別 · 頻度 (16/600 主役)、 2 行目 = 盆栽件数のみ (`recurringListItemBonsaiCount`、 14)、 3 行目 = 次回 (13、 ローカライズ日付 + 通知時刻 = フォーム RulePreviewCard と形式統一)。盆栽名 join + ×N badge は廃止 (= #1153 の badge 配置調整はこの廃止に吸収)。`recurringListItemDeletedBonsai` key は参照ゼロ化するが残置 (= i18n 棚卸 routine で判断)。
2. **「次回」 計算の SoT 化 (#1157)**: `computeFirstOccurrenceDateKey()` (= expandRRule と同一経路の純関数) を新設し、 フォームの「次回」 行を実計算値に変更 (= 案 a 正直表示、 ヒント文言なし)。旧「次回 = 開始日」 直表示 (Sess94 PR-B) は BYDAY 対応 (Sess93 PR-2) 以降、 開始日が rule 不一致の場合 (例: 開始 木曜 + 毎週月曜) に偽表示 + silent drop を見せていた — rrule lib は意図的 RFC 5545 非準拠で、 dtstart が rule に合致しない場合 occurrence に含めない。
3. **G1 (junction 本格グループ化) は引き続き見送り**: タグ型概念は UI 層 (= G2) で完全に実現でき、 schema v18 直後の migration 多重化リスクを回避。**再検討条件**: ①グループ内 rule の個別編集ニーズ (= member ごとに頻度/例外日を変えたい) の顕在化 ②rule 件数増による一覧/編集の性能問題 ③replaceRecurrenceRuleGroup の transaction 保証で防げないグループ内 drift 事例の発生 — いずれかが起きたら G1 を再評価。
4. **既知トレードオフ (user 了承済 = 案イ)**: 件数のみ表示のため「施肥 · 毎週月曜」 が 2 グループあると一覧上は見分け不能。将来の緩和候補 = 予定グループへの任意名前付け (= タグ型完成形)。

**関連**: Issue #1157 / #1158 / #1159 (= Free 境界のグループ単位化、 D7 改訂は #1159 側 Amendment 参照)
