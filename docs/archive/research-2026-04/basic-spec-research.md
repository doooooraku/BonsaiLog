# BonsaiLog basic_spec.md 作成のための一次情報調査報告書

**調査実施日:** 2026-04-23
**対象:** BonsaiLog（盆栽ケア記録アプリ）詳細設計フェーズ
**確定技術スタック:** Expo SDK 55 / React Native 0.83.4 / React 19.2.5 / Tamagui 1.144.4 / Zustand 5.0.12 / expo-sqlite 55.0.15 / react-native-purchases 9.6.6 / react-native-google-mobile-ads 16.0.0 / expo-router 55.0.13

**エビデンス信頼度凡例:**

- **L1** = 一次情報（公式ドキュメント / 公式リリースノート / 公式 GitHub / 規格文書）
- **L2** = 二次情報（権威ある技術ブログ / 主要OSSメンテナ / 大手プラットフォーマー）
- **L3** = 三次情報（個人ブログ / コミュニティ記事 / 推定）

---

## エグゼクティブ・サマリー — 最優先決定事項

1. **Expo SDK 55 は Legacy Architecture 完全廃止**。New Architecture（Fabric / TurboModules）のみ。Xcode 26 必須、iOS 最低 15.1、Node 20.19.4+。（L1）
2. **SQLite スキーマ:** 単一 `events` テーブル + `type TEXT` の STI (Single Table Inheritance) 設計。日時は ISO 8601 UTC TEXT + `tz_offset_min INTEGER`。写真は **相対パスのみ保存**（iOS Application Container UUID が TestFlight↔App Store 間・再インストール時に変化するため）。
3. **RevenueCat:** Entitlement 1 つ（`premium`）+ Offering 1 つ + Package 3 つ。**Lifetime は必ず Non-Consumable IAP として登録**（Consumable 誤設定で復元不能）。`react-native-purchases` は 9.15+ への更新を推奨。
4. **19 言語対応:** Phase 1 は ja/en/zh-Hans/zh-Hant/it/es の 6 言語で世界盆栽市場の約 70% カバー。zh-Hant は OpenCC `s2twp.json` で zh-Hans から自動生成。`compatibilityJSON: 'v4'` 必須（ru/pl の 4 形 plural 対応）。
5. **AdMob:** Anchored Adaptive Banner + UMP + ATT 順序厳守。`tagForChildDirectedTreatment: false`（General Audience）、`maxAdContentRating: 'PG'`。Zaim 公式ケーススタディで eCPM が Android +48% / iOS +27%。
6. **アクセシビリティ:** シニア 30% 前提で本文 18pt 最小、タップ領域 48pt 最小（プライマリ 56pt）、コントラスト AAA (7:1) 目標。屋外モード手動切替必須。
7. **テスト:** テストピラミッド 70/20/10、ドメイン層カバレッジ 95%。Maestro + EAS Build（Android APK）+ macOS runner（iOS）で E2E 自動化。
8. **引っ越し機能:** WebRTC DataChannel + QR による ECDH 鍵交換 + AES-256-GCM + SQLite ファイル丸ごとコピー方式を推奨。500MB を約 80 秒で転送可能。

---

## 調査1: Expo SDK 55 / React Native 0.83 最新仕様

### 1-1. Expo SDK 55 Breaking Changes（L1）

**出典:** https://expo.dev/changelog/sdk-55 / 取得日 2026-04-23

| 項目               | 値                                                               |
| ------------------ | ---------------------------------------------------------------- |
| React Native       | 0.83.1（指定の 0.83.4 は 19.2 系パッチ）                         |
| React              | 19.2.0（ユーザ指定 19.2.5 は 19.2.x 系パッチとして互換、L3推定） |
| Xcode 最小         | **26**（必須）                                                   |
| Node.js            | `^20.19.4`, `^22.13.0`, `^24.3.0`, `^25.0.0`                     |
| iOS 最小           | 15.1（SDK 56 で 16.4 へ引き上げ予定）                            |
| Android Target SDK | edge-to-edge は Android 16+ で必須                               |

**⚠️ 重要な破壊的変更（すべて L1）:**

- **Legacy Architecture 完全廃止** → `newArchEnabled` config 削除。New Architecture のみ。
- `app.json` の `notification` キー削除 → `expo-notifications` config plugin へ移行必須。
- `expo-av` 削除 → `expo-video` / `expo-audio` へ。
- `eas update` は `--environment` フラグ必須化（CI 修正要）。
- `experiments.reactCanary` フラグ削除、`EXPO_USE_FAST_RESOLVER` 廃止。
- **新デフォルトテンプレートは `/src/app` ディレクトリ構造**（旧 `/app` から変更）。
- `expo-router`: `ExpoRequest`/`ExpoResponse` 削除 → 標準 `Request`/`Response` 採用。

**⚠️ 既知の問題:**

- Hermes V1 を Android monorepo で使用するのは非推奨（[react-native-releases#1235](https://github.com/reactwg/react-native-releases/issues/1235)）。
- React 19.2.0 に RSC Critical Security Vulnerability あり。RN は直接影響しないが、他パッケージ併用時は 19.2.1+ へ更新必要。
- Expo Go for SDK 55 はストア未公開（2026-04-23 時点、iOS は自前 TestFlight 推奨）。

### 1-2. React Native 0.83 の特徴（L1）

**出典:** https://reactnative.dev/blog/2025/12/10/react-native-0.83 / 取得日 2026-04-23

- **ユーザ向け破壊的変更ゼロ**（0.82 からコード変更不要）。
- React 19.2 採用 → `<Activity>` API、`useEffectEvent` フック利用可。
- **React Native DevTools 全面刷新**（スタンドアロンアプリ、Network inspection、Performance tracing）。
- Web Performance API がステーブル化、IntersectionObserver Canary。
- Hermes artifacts が RN から独立発行。

### 1-3. expo-sqlite 55.x API 完全リファレンス（L1）

**出典:** https://docs.expo.dev/versions/latest/sdk/sqlite/ / 取得日 2026-04-23

**主要 API:**

| API                                                | 用途                                                    |
| -------------------------------------------------- | ------------------------------------------------------- |
| `SQLite.openDatabaseAsync(name)`                   | 非同期オープン                                          |
| `<SQLiteProvider databaseName onInit useSuspense>` | React Context Provider                                  |
| `useSQLiteContext()`                               | DB 取得フック                                           |
| `db.runAsync(sql, params)`                         | INSERT/UPDATE/DELETE、`{lastInsertRowId, changes}` 返却 |
| `db.getFirstAsync<T>(sql, params)`                 | 単一行                                                  |
| `db.getAllAsync<T>(sql, params)`                   | 全行                                                    |
| `db.getEachAsync<T>(sql, params)`                  | AsyncIterableIterator（大量データ用）                   |
| `db.prepareAsync(sql)`                             | Prepared Statement                                      |
| `db.withTransactionAsync(async fn)`                | トランザクション                                        |
| `db.withExclusiveTransactionAsync(async fn)`       | 排他トランザクション                                    |
| **`db.sql\`...\``**                                | **SDK 55 新：Tagged template literals API**             |

**⚠️ SDK 55 新機能:**

- **SQLite Inspector DevTools Plugin**（`shift+m` でメニュー）。
- **SQLCipher** サポート（`useSQLCipher: true`）。
- **sqlite-vec / libSQL 拡張** サポート。
- **Tagged Template Literals API** による型安全なクエリ。

**WAL モード + 推奨 PRAGMA 設定:**

```typescript
const db = await SQLite.openDatabaseAsync('bonsai.db');
await db.execAsync(`
  PRAGMA journal_mode = WAL;       -- 並行読み書き性能向上
  PRAGMA synchronous = NORMAL;     -- WAL モードで安全
  PRAGMA foreign_keys = ON;        -- 既定OFFなので必須
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -32000;      -- 32MB キャッシュ
`);
```

**マイグレーション（公式 user_version パターン, L1）:**

```typescript
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';

async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;
  const { user_version: currentDbVersion } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  ) ?? { user_version: 0 };

  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      -- 初期スキーマ作成
    `);
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export default function App() {
  return (
    <SQLiteProvider databaseName="bonsai.db" onInit={migrateDbIfNeeded} useSuspense>
      <Root />
    </SQLiteProvider>
  );
}
```

**⚠️ 注意:** `withTransactionAsync` は外部の並行クエリを巻き込む可能性あり。厳密な分離が必要なら `withExclusiveTransactionAsync` を使用。

**性能インパクト（L2, dbpro.app計測値）:** 1,000件個別 INSERT は約 5 秒、トランザクション内では約 100ms（50倍高速化）。

### 1-4. expo-notifications 55.x（L1）

**出典:** https://docs.expo.dev/versions/latest/sdk/notifications/ / 取得日 2026-04-23

**Android 13+ POST_NOTIFICATIONS 権限（最重要）:**

- 公式警告: **通知チャネル作成後でないと権限プロンプトが表示されない**。`setNotificationChannelAsync()` を `getExpoPushTokenAsync()` より先に呼ぶ必要。
- Android 12+（API 31+）で正確な時刻通知を使う場合 `SCHEDULE_EXACT_ALARM` 権限を AndroidManifest に追加必要。

**iOS Critical Alerts:** `allowCriticalAlerts` オプションは Apple の特別な entitlement 承認が必要。

**⚠️ 重要な制限:** `CALENDAR` trigger は **iOS のみ**。Android では例外発生（[#8996](https://github.com/expo/expo/issues/8996), [#30577](https://github.com/expo/expo/issues/30577)）。盆栽のリマインダーは `DAILY` / `WEEKLY` / `DATE` trigger を使う。

```typescript
// Daily trigger の例
await Notifications.scheduleNotificationAsync({
  identifier: 'bonsai-daily-reminder',
  content: { title: '盆栽の水やり時間です 🌿', body: '今日のケアをチェック' },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: 8,
    minute: 0,
  } as Notifications.DailyTriggerInput,
});
```

**SDK 53+ 新通知ハンドラ形式:**

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // 旧 shouldShowAlert から分離
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

### 1-5. expo-router 5.x（L1）

**出典:** https://docs.expo.dev/router/introduction/ 他 / 取得日 2026-04-23

**File-based routing 規約:**

- SDK 55 既定: `src/app/` ルート。
- `index.tsx` = 既定ルート、`_layout.tsx` = レイアウト、`(group)` = URL 非影響グループ、`[param].tsx` = 動的ルート、`+not-found.tsx` = 404。
- **Typed Routes**: `app.json` の `experiments.typedRoutes: true` で `expo-env.d.ts` 自動生成、`<Link href>` が静的型付け。

**BonsaiLog 推奨ディレクトリ構造:**

```
src/app/
├── _layout.tsx              # SQLiteProvider + NotificationProvider
├── (tabs)/
│   ├── _layout.tsx          # NativeTabs（SDK 55 新）
│   ├── index.tsx            # ホーム
│   ├── plants.tsx
│   ├── care.tsx
│   └── settings.tsx
├── plants/
│   ├── [id]/
│   │   ├── _layout.tsx      # Stack
│   │   ├── index.tsx
│   │   └── edit.tsx
│   └── new.tsx              # presentation: 'modal'
├── care/
│   └── log-[id].tsx
├── +not-found.tsx
```

**SDK 55 新機能:** Native Tabs API、Apple Zoom transition（iOS 既定）、Stack.Toolbar（iOS）、SplitView（実験）、Colors API、**iOS 26+ Liquid Glass form sheet 自動採用**。

---

## 調査2: SQLite スキーマ設計ベストプラクティス

### 2-1. 基本設計決定（結論）

| 項目             | 決定                                                   | 根拠                                       |
| ---------------- | ------------------------------------------------------ | ------------------------------------------ |
| イベントモデル   | **Single Table Inheritance**（`events` + `type TEXT`） | 80%以上の属性が共通、クエリ性能最適        |
| type enum 型     | **TEXT** + `CHECK (type IN (...))`                     | 可読性、拡張性。ストレージ差は20万行で数MB |
| 日時保存         | **ISO 8601 UTC TEXT + tz_offset_min INTEGER**          | SQLite公式推奨、辞書順=時系列順            |
| 主キー           | **TEXT (UUID v4)**                                     | 将来の同期対応                             |
| 写真保存         | **相対パスのみ**（`documentDirectory` 配下）           | iOS Application Container UUID 変化問題    |
| 全文検索         | **FTS5 + `trigram` tokenizer**                         | expo-sqlite 50+ で有効、日本語対応         |
| マイグレーション | **`PRAGMA user_version` 前進型**、ダウングレード非対応 | SQLite公式パターン                         |

### 2-2. 写真の相対パス保存（最重要）

**出典（L1）:**

- [Expo GitHub Issue #4261](https://github.com/expo/expo/issues/4261): "FileSystem.documentDirectory changes between TestFlight and App Store version"
- [Expo GitHub Issue #32788](https://github.com/expo/expo/issues/32788): Expo メンテナが UUID 変化を再現確認

**問題の本質:** iOS Data Container UUID は以下で変化する:

- アプリの再インストール
- **TestFlight ↔ App Store 間の遷移**
- 一部の iOS アップデート/復元
- シミュレータのアプリ再配置

**例:** `file:///.../Application/551A7DC4-.../Documents/` → `file:///.../Application/873087EC-.../Documents/`

**必須対応:** DB には `photos/bonsai_<id>/<timestamp>-<uuid>.jpg` のような相対パスのみ保存、読み出し時に毎回 `FileSystem.documentDirectory + relative_path` で絶対 URI を組み立てる。

**ディレクトリ選択:** `documentDirectory`（永続、iCloud バックアップ対象）を写真原本に使用。`cacheDirectory` はサムネイル用途のみ（OS 自動削除あり）。

### 2-3. 完全 DDL サンプル（主要テーブル）

```typescript
// src/db/schema.ts
export const DDL_V1 = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- 樹種マスタ
CREATE TABLE IF NOT EXISTS species (
  id                INTEGER PRIMARY KEY,
  scientific_name   TEXT    NOT NULL UNIQUE,
  common_ja         TEXT,
  common_en         TEXT,
  care_profile_json TEXT    CHECK (care_profile_json IS NULL OR json_valid(care_profile_json)),
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

-- 盆栽本体
CREATE TABLE IF NOT EXISTS bonsai (
  id              TEXT    PRIMARY KEY,
  name            TEXT    NOT NULL,
  species_id      INTEGER REFERENCES species(id) ON DELETE SET NULL,
  acquired_on     TEXT    CHECK (acquired_on IS NULL OR acquired_on LIKE '____-__-__'),
  style           TEXT    CHECK (style IN ('chokkan','moyogi','shakan','kengai','han_kengai',
                                            'bunjin','ishitsuki','sokan','kabudachi','yose_ue','other')
                                  OR style IS NULL),
  pot_info_json   TEXT    CHECK (pot_info_json IS NULL OR json_valid(pot_info_json)),
  notes           TEXT,
  cover_photo_id  TEXT,
  archived_at     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_bonsai_archived ON bonsai(archived_at) WHERE archived_at IS NULL;

-- イベント（STI: 作業履歴）
CREATE TABLE IF NOT EXISTS events (
  id             TEXT    PRIMARY KEY,
  bonsai_id      TEXT    NOT NULL REFERENCES bonsai(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL CHECK (type IN (
                   'watering','pruning','wiring','unwiring','repotting',
                   'fertilizing','pest_control','disease_treatment',
                   'leaf_trimming','defoliation','deshoot','candle_cut',
                   'moss_care','position_change','observation','photo','other')),
  occurred_at    TEXT    NOT NULL
                   CHECK (occurred_at LIKE '____-__-__T__:__:%Z'),
  tz_offset_min  INTEGER NOT NULL DEFAULT 0
                   CHECK (tz_offset_min BETWEEN -840 AND 840),
  duration_min   INTEGER CHECK (duration_min IS NULL OR duration_min >= 0),
  payload_json   TEXT    CHECK (payload_json IS NULL OR json_valid(payload_json)),
  note           TEXT,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

-- 主要クエリ用インデックス
CREATE INDEX IF NOT EXISTS idx_events_bonsai_date
  ON events(bonsai_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_date
  ON events(type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_bonsai_type_date
  ON events(bonsai_id, type, occurred_at DESC);

-- 写真（相対パスのみ保存）
CREATE TABLE IF NOT EXISTS photos (
  id            TEXT    PRIMARY KEY,
  bonsai_id     TEXT    REFERENCES bonsai(id) ON DELETE CASCADE,
  event_id      TEXT    REFERENCES events(id) ON DELETE CASCADE,
  relative_path TEXT    NOT NULL UNIQUE,    -- ★絶対URIを保存しない
  mime_type     TEXT    NOT NULL DEFAULT 'image/jpeg',
  width         INTEGER,
  height        INTEGER,
  byte_size     INTEGER,
  sha256        TEXT,
  taken_at      TEXT,
  exif_json     TEXT    CHECK (exif_json IS NULL OR json_valid(exif_json)),
  ordinal       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (bonsai_id IS NOT NULL OR event_id IS NOT NULL)
) STRICT;

-- リマインダー（部分インデックスで active 絞込み高速化）
CREATE TABLE IF NOT EXISTS reminders (
  id               TEXT    PRIMARY KEY,
  bonsai_id        TEXT    NOT NULL REFERENCES bonsai(id) ON DELETE CASCADE,
  type             TEXT    NOT NULL,
  title            TEXT    NOT NULL,
  due_at           TEXT    NOT NULL,
  recurrence_rule  TEXT,   -- RFC5545 RRULE
  notify_offset_min INTEGER NOT NULL DEFAULT 0,
  notification_id  TEXT,
  completed_at     TEXT,
  linked_event_id  TEXT    REFERENCES events(id) ON DELETE SET NULL,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_reminders_due_active
  ON reminders(due_at) WHERE completed_at IS NULL;

-- FTS5（trigram tokenizer で日本語対応）
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  note,
  type UNINDEXED,
  bonsai_id UNINDEXED,
  content='events',
  content_rowid='rowid',
  tokenize='trigram'
);

-- FTS 自動同期トリガー
CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(rowid, note, type, bonsai_id)
  VALUES (new.rowid, new.note, new.type, new.bonsai_id);
END;
`;
```

### 2-4. FTS5 日本語対応の詳細

**出典:** [expo/expo PR #27738](https://github.com/expo/expo/pull/27738) / 取得日 2026-04-23

- expo-sqlite SDK 50 以降 FTS3/4/5 が**デフォルト有効**。追加設定不要。
- ⚠️ `unicode61` tokenizer は CJK（日本語・中国語・韓国語）で空白がないため、全文が 1 トークンになってしまう。
- **解決策:** `trigram` tokenizer（SQLite 3.34+ 内蔵）。部分文字列検索可能。
- **ただし 2 文字以下は引けない** → UI で「2 文字以上で検索」とガイド。

### 2-5. インデックス設計原則（L1 SQLite Query Optimizer Overview）

- 等値制約（`=`, `IN`）の列を先、範囲（`<`, `>`, `BETWEEN`）を最後に。
- `(bonsai_id=?, occurred_at BETWEEN ? AND ?)` なら `(bonsai_id, occurred_at)` 順が正解。
- `PRAGMA optimize` を close 前に実行し `sqlite_stat1` に統計保存、クエリプランナー精度向上。

---

## 調査3: 多言語対応（i18n）

### 3-1. 技術スタック確定

| ライブラリ                                  | バージョン | 用途                   |
| ------------------------------------------- | ---------- | ---------------------- |
| `expo-localization`                         | ~55.x      | device locale 検出     |
| `i18next`                                   | ^25.x      | コア                   |
| `react-i18next`                             | ^15.x      | React バインディング   |
| `@formatjs/intl-pluralrules/polyfill-force` | 最新       | Hermes iOS 用 polyfill |
| `@react-native-async-storage/async-storage` | -          | user override 永続化   |

**⚠️ 重要設定:** `compatibilityJSON: 'v4'` を**必ず指定**。これがないと ru が 4 形 plural に対応できない（i18next-icu Issue #9 で既知）。

### 3-2. 盆栽愛好家の多い国ランキング（L1/L2）

| 順位  | 国                                                                                                                                                  | 根拠数値                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1     | 日本                                                                                                                                                | Nippon Bonsai Association 約 6,500 名、167 active chapters |
| 2     | 中国                                                                                                                                                | 全国盆景協会多数、2013 Jin Tan 世界大会開催                |
| 3     | イタリア                                                                                                                                            | UBI 約 2,000 名、77 クラブ、**欧州最大**                   |
| 4     | 米国                                                                                                                                                | ABS、BCI、数百のローカルクラブ                             |
| 5     | スペイン                                                                                                                                            | AEB（1982〜）、欧州最古級                                  |
| 6     | 台湾                                                                                                                                                | 世界盆景大会常連                                           |
| 7     | 韓国                                                                                                                                                | WBFF 会長 Kim Sae Won 氏                                   |
| 8-10  | ドイツ/インドネシア/オーストラリア                                                                                                                  | EBA 加盟、2024 Regional WBC、AABC                          |
| 11-20 | ブラジル、マレーシア（2026 WBC 開催）、インド、フランス（2018 Mulhouse 145,000 来場）、ベトナム、オランダ、タイ、フィリピン、ポーランド、南アフリカ |

### 3-3. 19 言語翻訳優先度マトリクス

| 優先度      | 言語                 | 市場価値 | 実装コスト | 備考                                                               |
| ----------- | -------------------- | -------- | ---------- | ------------------------------------------------------------------ |
| **P0 必須** | ja                   | 10       | 2          | 発祥国、開発者自言語                                               |
| P0          | en                   | 10       | 1          | 国際共通語                                                         |
| P0          | zh-Hans              | 9        | 3          | 中国本土、penjing 文化                                             |
| P0          | zh-Hant              | 7        | 2          | **OpenCC で簡→繁自動生成（コスト半減）**                           |
| P0          | it                   | 8        | 3          | UBI 2,000 名、欧州最大                                             |
| P0          | es                   | 8        | 3          | AEB、ラテン全域                                                    |
| P1 高       | de / fr / pt-BR / ko | 7        | 4          | 高 ARPU、仏独伊スペイン盆栽シーン                                  |
| P2 中       | ru / pl              | 6        | **7**      | **4 形 plural 最難関**                                             |
| P2          | nl / tr / id         | 5-6      | 2-4        |                                                                    |
| P3 低       | th / vi / hi / sv    | 3-6      | 3-8        | **th は lineBreakStrategyIOS 必須**、hi は Devanagari フォント検証 |

**pt は pt-BR を基本とする決定:** ブラジル 215M 話者 + 英語習熟度 5% + ゲーム市場世界 5 位。pt-PT は v2.0 以降で追加。

### 3-4. 実装コード（TypeScript）

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '@formatjs/intl-pluralrules/polyfill-force';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/ja';
import '@formatjs/intl-pluralrules/locale-data/ru';
import '@formatjs/intl-pluralrules/locale-data/pl';
// ... 19 言語分

export const SUPPORTED = [
  'en',
  'ja',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'ru',
  'zh-Hans',
  'zh-Hant',
  'ko',
  'hi',
  'id',
  'th',
  'vi',
  'tr',
  'nl',
  'pl',
  'sv',
] as const;

function pickLocale(tag: string, code: string) {
  if (code === 'zh') {
    if (/Hant/i.test(tag) || /(TW|HK|MO)/i.test(tag)) return 'zh-Hant';
    return 'zh-Hans';
  }
  return SUPPORTED.includes(code as any) ? code : 'en';
}

export async function initI18n() {
  const override = await AsyncStorage.getItem('@bonsailog/locale');
  const device = getLocales()[0];
  const lng = override ?? pickLocale(device?.languageTag ?? 'en', device?.languageCode ?? 'en');

  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: { 'zh-Hant': ['zh-Hans', 'en'], default: ['en'] },
    supportedLngs: SUPPORTED,
    compatibilityJSON: 'v4', // ★ru/pl の 4 形 plural 対応に必須
    interpolation: { escapeValue: false },
  });
}
```

### 3-5. 翻訳ファイル構造

**フォーマット:** JSON（i18next v4 形式）、ネスト + 名前空間分割。

```
src/i18n/locales/
├── en/
│   ├── common.json      # OK/Cancel/Save
│   ├── care.json        # 水やり・剪定・植替
│   ├── tree.json        # 樹種名
│   └── log.json
├── ja/ (同構造)
```

**plural の例（ru 4 形）:**

```json
{
  "tree_watered_one": "Полит {{count}} бонсай",
  "tree_watered_few": "Полито {{count}} бонсая",
  "tree_watered_many": "Полито {{count}} бонсаев",
  "tree_watered_other": "Полито {{count}} бонсая"
}
```

**TMS 推奨:** **SimpleLocalize**（key 数課金、言語不問で定額）か POEditor。本格展開時 Crowdin。

---

## 調査4: RevenueCat 課金実装

### 4-1. SDK 状況

**最新版:** `react-native-purchases@9.15.2`（2026-04-07）。ユーザー指定の 9.6.6 は動作するが**更新推奨**。v9 系は Google Play Billing Library v8 対応。

### 4-2. Offering / Package / Entitlement 設計（BonsaiLog 推奨）

**Entitlement 1 つのみ:** `premium`
**Offering 1 つのみ:** `default`
**Packages 3 つ:**

| Package ID     | iOS Product              | Android Product | 価格 JP / US    | 種類                                      |
| -------------- | ------------------------ | --------------- | --------------- | ----------------------------------------- |
| `$rc_monthly`  | `bonsailog_pro_monthly`  | 同              | ¥500 / $4.99    | Auto-Renewable Subscription               |
| `$rc_annual`   | `bonsailog_pro_yearly`   | 同              | ¥3,980 / $39.99 | Auto-Renewable Subscription               |
| `$rc_lifetime` | `bonsailog_pro_lifetime` | 同              | ¥9,800 / $79.99 | **Non-Consumable IAP / One-time Product** |

### 4-3. Lifetime 実装の重大注意点

**⚠️ Apple:** 必ず Non-Consumable IAP として App Store Connect に登録。有効期限設定不可（永久）。Consumable 誤設定すると顧客が復元できず返金・サポート案件化。

**⚠️ Android:** One-time Product として登録し、**RevenueCat Dashboard でも non-consumable として設定**（v9 SDK は consumable だと自動消費し、復元不能）。

**⚠️ Google Play Billing v8 変更:** 期限切れサブスクリプション・消費済み一時購入のクエリ API が削除。誤設定リスクが以前より高い。

### 4-4. 実装コード（完全版）

```typescript
// src/services/revenuecat.ts
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

export const ENTITLEMENT_ID = 'premium';

class PurchasesService {
  private configured = false;

  async configure(appUserID: string | null = null) {
    if (this.configured) return;
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_RC_IOS_KEY!,
      android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY!,
      web: process.env.EXPO_PUBLIC_RC_WEB_KEY!,
    });

    Purchases.configure({ apiKey: apiKey!, appUserID });
    this.configured = true;
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return this.isPremium(customerInfo);
    } catch (e: any) {
      if (e.userCancelled) return false;
      throw e;
    }
  }

  async restorePurchases(): Promise<boolean> {
    const info = await Purchases.restorePurchases();
    return this.isPremium(info);
  }

  async checkPremiumStatus(): Promise<boolean> {
    // オフラインファーストのための SDK キャッシュ依存
    const info = await Purchases.getCustomerInfo();
    return this.isPremium(info);
  }

  isPremium(info: CustomerInfo): boolean {
    return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  }
}
```

### 4-5. 2025-2026 Apple / Google ポリシー

**Apple（L1/L2/L3）:**

- Small Business Program: 年 $1M 未満は 15%（新規アプリは自動適用）。
- **Epic Games 判決の影響（2025-04-30）**: 米国 App Store のみ外部リンク/決済が許可。非米国（日本含む）は従来通り IAP 必須。
- **日本 Mobile Software Competition Act（2025-12-18 施行）**: Apple は 2026-03-17 までに新条件への同意を要求中。
- **⚠️ 必須:** Restore Purchases ボタンを Settings と Paywall 両方に配置（Guideline 3.1.1 違反で審査拒否）。

**Apple App Store Connect 価格:** 2023 年以降「Tier 1〜87」システム廃止、**900 price points** に。$0.29〜$10,000、$0.99 縛り解除。基本は「米国を base region に設定し自動 equalize」、日本 ¥500 固定が必須なら個別 custom price。

### 4-6. オフラインファースト対応

**出典（L1）:** https://www.revenuecat.com/blog/engineering/introducing-offline-entitlements/

- `Purchases.getCustomerInfo()` は SDK キャッシュから即時返却、オフラインでも `entitlements.active` 判定可能。
- アクティブな entitlement は最大 3 日のオフライングレースピリオド。
- **⚠️ 注意:** Offline Entitlements 機能は one-time purchase（Lifetime）では動作しない。RC サーバダウン時に Lifetime 購入は失敗する（実害は低い）。

### 4-7. ⚠️ ポリシー違反リスクまとめ

| 項目                          | リスク                       | 対策                                     |
| ----------------------------- | ---------------------------- | ---------------------------------------- |
| Lifetime を consumable で登録 | 復元不可、顧客離反、審査拒否 | Non-Consumable / One-time non-consumable |
| Restore Purchases ボタン欠如  | App Store 審査拒否           | Settings と Paywall に配置               |
| 日本ストアで外部決済促進      | 審査拒否                     | 日本向けは IAP のみ                      |
| appUserID に email 使用       | GDPR 違反、推測可能          | UUID v4 使用                             |
| Family Sharing 後から無効化   | Apple 側で revert 不可       | 最初から方針固定                         |

---

## 調査5: AdMob 広告実装

### 5-1. SDK 状況

**最新:** `react-native-google-mobile-ads@16.2.2`（2025-03-10）。**Large Anchored Adaptive Banner** 追加、**Anchored Adaptive Banner Sizing に deprecation ノート追加**。

### 5-2. Zaim 事例（公式 L1）

**出典:** https://admob.google.com/intl/ja/home/resources/zaim-boosts-ecpm-up-to-forty-eight-percent-admob-adaptive-banners/ / 取得日 2026-04-23

- **Android eCPM: +48%**（他の広告ソリューション比）
- **iOS eCPM: +27%**（AdMob 非レスポンシブバナー比）
- **Android CTR: +33%**
- 広告掲載率: ほぼ 100%
- ⚠️ 注意: 比較対象が Android と iOS で異なる。

**推奨:** `BannerAdSize.ANCHORED_ADAPTIVE_BANNER` 一択。Smart Banner は deprecated。

### 5-3. Family Policy / 子供向けコンテンツ判定

**BonsaiLog は "General Audience" に該当**（盆栽・園芸は大人の趣味）。

```typescript
await mobileAds().setRequestConfiguration({
  maxAdContentRating: MaxAdContentRating.PG, // 家族向け
  tagForChildDirectedTreatment: false, // 重要
  tagForUnderAgeOfConsent: false,
});
```

**⚠️ 違反リスク:** `tagForChildDirectedTreatment: true` と `tagForUnderAgeOfConsent: true` の同時 true 禁止。COPPA 違反は AdMob アカウント停止・高額罰金リスク。

### 5-4. 完全実装（ATT + UMP + Banner）

```typescript
// lib/ads/consentManager.ts
import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

export async function initializeAdsConsentFlow() {
  // STEP 1: iOS ATT
  let isATTAuthorized = false;
  if (Platform.OS === 'ios') {
    const { status: current } = await getTrackingPermissionsAsync();
    if (current === 'undetermined') {
      const { status } = await requestTrackingPermissionsAsync();
      isATTAuthorized = status === 'granted';
    } else {
      isATTAuthorized = current === 'granted';
    }
  }

  // STEP 2: UMP Consent
  const consentInfo = await AdsConsent.requestInfoUpdate();
  if (consentInfo.status === AdsConsentStatus.REQUIRED && consentInfo.isConsentFormAvailable) {
    await AdsConsent.showForm();
  }
  const { canRequestAds } = await AdsConsent.getConsentInfo();

  // STEP 3: Mobile Ads SDK 初期化
  if (canRequestAds) {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
  }

  return { canRequestAds, isATTAuthorized };
}
```

**app.json 設定:**

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXX~XXX",
          "iosAppId": "ca-app-pub-XXX~XXX",
          "userTrackingUsageDescription": "あなたの盆栽ライフに合わせた広告を配信するために、この識別子が使用されます。許可しなくてもアプリは通常通りご利用いただけます。"
        }
      ]
    ]
  }
}
```

### 5-5. ATT Opt-in 率と eCPM（L2）

- Adjust 2025-Q2: 業界平均 **35%**（プロンプト表示済ユーザー基準）、Singular Q2 2024: グローバル即時 opt-in **13.85%**。
- Tenjin/CAS 2025: 2019 iOS 63% / Android 37% → 2024-2025 ほぼ逆転（Android > iOS）。ATT 影響。
- 園芸・ホビーカテゴリ日本向け: バナー iOS eCPM 目安 **¥50-¥150（$0.4-$1.2）**（L3 推定）。

---

## 調査6: テスト戦略（Jest + Maestro）

### 6-1. 技術スタック

- **jest-expo v55** + `transformIgnorePatterns` で `expo-router / react-native-purchases / react-native-reanimated` 追加。
- **@testing-library/react-native v14**（React 19 必須、`render` / `fireEvent` が async 化）。
- **Maestro**（Java 17+）+ EAS Build（`e2e` profile）+ macOS runner（iOS）+ Maestro Cloud（Android）。

### 6-2. Expo モジュール モック戦略

```typescript
// jest/setupAfterEnv.ts
import '@testing-library/react-native/extend-expect';

// AsyncStorage（公式 mock）
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
}));

// react-native-purchases
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn(async () => ({ current: { availablePackages: [] } })),
    purchasePackage: jest.fn(async () => ({
      customerInfo: { entitlements: { active: { premium: { isActive: true } } } },
    })),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
  },
}));
```

**expo-sqlite モック戦略:** `expo-sqlite-mock`（実 SQLite、統合テスト用）+ `jest.mock`（純粋モック、単体テスト用）の 2 層構成。

### 6-3. Maestro フロー例（盆栽追加）

```yaml
# .maestro/flows/add_bonsai.yaml
appId: dev.bonsailog.app
name: Add new bonsai from home screen
tags: [smoke, critical]
---
- launchApp: { clearState: true, clearKeychain: true }
- runFlow: ../subflows/skip_onboarding.yaml
- tapOn: { id: 'fab-add-bonsai' }
- tapOn: { id: 'input-bonsai-name' }
- inputText: '黒松 #001'
- hideKeyboard
- tapOn: { id: 'select-species' }
- tapOn: '黒松'
- tapOn: { id: 'button-save-bonsai' }
- assertVisible: { id: 'bonsai-list-item', text: '黒松 #001' }
- takeScreenshot: { path: 'after_add_bonsai' }
```

### 6-4. 分散アルゴリズムの Property-Based Testing

```typescript
// src/domain/scheduling/__tests__/distribute.pbt.test.ts
import fc from 'fast-check';
import { distributeReminders } from '../distribute';

describe('distributeReminders properties', () => {
  it('不変条件: 同一週に max 件以下', () => {
    fc.assert(
      fc.property(fc.array(taskArb, { maxLength: 100 }), (tasks) => {
        const out = distributeReminders(tasks, 3);
        const byWeek = new Map<number, number>();
        for (const t of out) {
          const wk = differenceInCalendarWeeks(t.scheduledDate, new Date('2026-01-01'));
          byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
        }
        for (const [, c] of byWeek) expect(c).toBeLessThanOrEqual(3);
      }),
      { numRuns: 200, seed: 42 },
    );
  });
});
```

**設計原則:** `distributeReminders` は**純粋関数**、`Math.random()` / `Date.now()` を内部で呼ばない、seed を引数で受ける。

### 6-5. テストピラミッド推奨

```
           ┌─────────────┐
           │   Maestro   │  10%  Critical user journeys
           ├─────────────┤
           │  RTL UI     │  20%  コンポーネント/画面
           ├─────────────┤
           │    Jest     │  70%  ドメイン/純粋関数
           └─────────────┘
```

**カバレッジ目標:**

```json
{
  "coverageThreshold": {
    "global": { "lines": 80, "branches": 70 },
    "src/domain/**": { "lines": 95, "branches": 90 },
    "src/lib/**": { "lines": 90, "branches": 85 },
    "src/features/**": { "lines": 70, "branches": 60 }
  }
}
```

### 6-6. E2E 必須クリティカルフロー

1. オンボーディング（言語選択 → 通知許可 → 最初の盆栽追加）
2. 盆栽追加
3. 作業記録
4. リマインダー（通知タップ → deep link）
5. 購入（ペイウォール → 機能解放 → 復元）

---

## 調査7: アクセシビリティ（WCAG AA 準拠）

### 7-1. 最優先実装値

| 項目                    | 値                                  | 根拠                            |
| ----------------------- | ----------------------------------- | ------------------------------- |
| 本文フォント最小        | **16pt**（シニア向け 18pt）         | NN/g、シニア 30% 前提           |
| タップ領域最小          | **48×48pt**（プライマリ 56pt）      | HIG 44 + Material 48 の厳しい方 |
| タップ間隔              | **8pt 以上**                        |                                 |
| テキストコントラスト    | **4.5:1**（AAA 目標 7:1）           | WCAG 2.2 1.4.3 / 1.4.6          |
| UI コントラスト         | **3:1**                             | WCAG 2.2 1.4.11                 |
| `maxFontSizeMultiplier` | **2.0**                             | AX3 まで完全サポート            |
| アニメ持続時間          | **200-400ms**（reduced motion → 0） | シニア配慮                      |

### 7-2. BonsaiLog 推奨カラーパレット（ライトテーマ）

| 用途            | HEX       | vs #FFFFFF | 判定  |
| --------------- | --------- | ---------- | ----- |
| 文字（本文）    | `#1A1A1A` | 17.4:1     | AAA   |
| 文字（補助）    | `#4A5568` | 8.7:1      | AAA   |
| Primary（緑）   | `#0F5132` | 9.6:1      | AAA   |
| Secondary（青） | `#0F4C75` | 9.7:1      | AAA   |
| Warning         | `#B45309` | 5.0:1      | AA    |
| Danger          | `#B91C1C` | 6.1:1      | AAA   |
| Border          | `#6B7280` | 4.8:1      | AA UI |

**屋外ハイコントラスト（手動切替）:** 文字 `#000000`（21:1 最大）、Primary `#000080`（15.3:1）。

### 7-3. 屋外 UX 対応

**輝度環境（L2）:** 直射日光 100,000 lux、屋外常用 600 nit 以上必要、直射下 1000-1500 nit 推奨。2025-2026 フラッグシップは標準 1000-1500 nit、HBM 2000-3000 nit。

**実装:**

```typescript
// hooks/useOutdoorMode.ts
import * as Brightness from 'expo-brightness';

export function useOutdoorMode() {
  const [isOutdoor, setIsOutdoor] = useState(false);
  useEffect(() => {
    const check = async () => {
      const { brightness } = await Brightness.getSystemBrightnessAsync();
      setIsOutdoor(brightness >= 0.85);
    };
    const interval = setInterval(check, 30_000);
    check();
    return () => clearInterval(interval);
  }, []);
  return isOutdoor;
}
```

**⚠️ 手動切替必須**（環境光センサは誤判定する）。

### 7-4. Tamagui アクセシビリティ対応コンポーネント

```typescript
// components/A11yButton.tsx
import { Button, type ButtonProps } from 'tamagui';
import { PixelRatio } from 'react-native';

type A11yButtonProps = ButtonProps & {
  label: string;       // 必須化
  hint?: string;
  busy?: boolean;
};

export const A11yButton = ({ label, hint, busy, ...rest }: A11yButtonProps) => {
  const fontScale = PixelRatio.getFontScale();
  const minHeight = fontScale > 1.3 ? 64 : 48;  // シニア時自動強化

  return (
    <Button
      {...rest}
      minHeight={minHeight}
      minWidth={minHeight}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ busy, disabled: rest.disabled }}
    />
  );
};
```

### 7-5. シニア向け UX チェックリスト

- 本文フォント 18pt 以上、タッチ領域 48pt 以上（プライマリ 56pt）
- 色コントラスト AAA 目標、色以外でも情報伝達（アイコン+テキスト）
- スワイプ/ピンチに代替ボタン必ず提供
- 長押し 500ms 以下、または代替
- Undo 機能（削除系操作に必須）、確認ダイアログ（破壊的アクション）
- フォントスケール AX5（310%）で破綻しないレイアウト
- 自動ログアウトなし、セッション 1 時間以上

### 7-6. カラーブラインド対応（D 型が最多 6%、全男性 8%）

**Okabe-Ito パレット（D/P 型対応）:**

```typescript
export const colorblindSafe = {
  orange: '#E69F00',
  skyBlue: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  vermillion: '#D55E00',
  reddishPurple: '#CC79A7',
  black: '#000000',
};
```

**盆栽リスト水やり緊急度:** NG「赤=至急、緑=OK のみ」→ OK「色+アイコン（⚠️ / ✓）+テキスト（"3 日前"）」。

---

## 調査8: 盆栽静的 DB 設計

### 8-1. 主要10樹種の月別作業タイミング

各樹種の主要ポイントを抜粋（完全表は [bonsaiempire.com/tree-species/](https://www.bonsaiempire.com/tree-species/) 等 L2 参照）:

- **黒松（Pinus thunbergii）:** 2-flush pine。植替 2-3月（芽膨張前）、芽切り 6-7月、針金 10-2月。
- **五葉松（Pinus parviflora）:** 1-flush pine、芽切り不可。植替 3-4月、針金 10-2月。
- **真柏（Juniperus chinensis var. sargentii）:** 芽摘みは指（ハサミ厳禁、切口褐色化）。植替 3月、針金 9-2月。
- **モミジ（Acer palmatum）:** 春の剪定禁止（樹液出血）。植替 2-3月、葉刈り 6月、針金 11-2月。
- **皐月（Rhododendron indicum）:** カヌマ土必須、石灰嫌い。植替は花後 6月、針金 11月。
- **Ficus retusa:** 室内盆栽（15°C 以上）。植替・剪定・針金は成長期 4-8月。
- **Chinese Elm（Ulmus parvifolia）:** 半落葉、強健。植替 2-3月、剪定通年。
- **Juniperus procumbens nana:** 屋内厳禁。指で芽摘み、針金 9-2月。
- **Portulacaria afra:** 多肉、植替後 1-2週水やり禁止、凍結致命的。
- **Olive（Olea europaea）:** 地中海性。植替 3月、強剪定は晩冬 1-2月、Peacock's Eye 病注意。

### 8-2. 気候帯判定ロジック

**USDA Hardiness Zone 2023 版（L1）:**

- 1991-2020 年データ基準、13,412 観測点、800m×800m グリッド。
- 2023 版では約半数の地域が半ゾーン暖かく変化。
- 公式 API なし → 低解像度ラスター（~3MB）をアプリバンドルにプリベイク。

**IANA timezone → 国コード → 緯度推定（L1）:**

```typescript
// zone1970.tab をパース、静的テーブル化
import { DateTime } from 'luxon';

const tz = DateTime.local().zoneName; // "Asia/Tokyo"
const { countryCode, lat, lon } = TZ_TABLE[tz]; // { JP, 35.65, 139.74 }

function determineClimateZone(location) {
  const lat = location.hasExplicitLatLon
    ? location.latLon.lat
    : COUNTRY_CENTROIDS[countryCodeFromTz(getIANATimezone())].lat;

  const hemisphere = lat >= 0 ? 'north' : 'south';
  const usdaZone = USDA_RASTER_LOOKUP(lat, lon) ?? approximateFromLatitude(lat);
  const climateType =
    Math.abs(lat) < 23.5
      ? 'tropical'
      : Math.abs(lat) < 35
        ? 'subtropical'
        : Math.abs(lat) < 50
          ? 'temperate'
          : 'boreal';

  return { usdaZone, hemisphere, climateType };
}
```

**南北半球季節反転:**

```typescript
function adjustMonthForHemisphere(month: number, lat: number): number {
  return lat < 0 ? ((month - 1 + 6) % 12) + 1 : month;
}
```

### 8-3. 樹種名の多言語対応

**主キー:** 学名（`Pinus thunbergii`）。GBIF `/species/match` API で正規化。

**推奨データソース優先順:**

1. **Wikidata P1843**（最も網羅的、多言語通称）
2. **GBIF Vernacular Names API**（信頼性スコア付き）
3. Wikipedia langlinks（MediaWiki API）

**例（黒松の 19 言語表記の一部、L1/L2）:**

- ja: 黒松 / クロマツ
- en: Japanese Black Pine
- zh-Hans: 黑松 / zh-Hant: 黑松
- ko: 곰솔 / 흑송
- de: Japanische Schwarzkiefer
- fr: Pin noir du Japon
- es: Pino negro japonés
- it: Pino nero giapponese

### 8-4. データサイズ見積もり

| コンポーネント                                | 合計        |
| --------------------------------------------- | ----------- |
| species（50樹種）                             | 25 KB       |
| species_names（50 × 19言語 × 1.5通称）        | 114 KB      |
| species_tasks（50 × 13タスク × 12月 × 2半球） | 780 KB      |
| アイコン（SVG）                               | 150 KB      |
| USDA Zone raster（低解像度）                  | 3 MB        |
| IANA TZ → 国 → 緯度                           | 40 KB       |
| **gzip 後 JSON**                              | **~1.2 MB** |

**配布戦略:** アプリバンドルに prebuild SQLite を同梱（expo-asset 経由）、リモート更新は S3 CDN + EAS Update で差分配信。

---

## 調査9: お引っ越し機能（デバイス移行）

### 9-1. 推奨アーキテクチャ: WebRTC + QR + AES-256-GCM

**決定理由:**

1. クラウド依存回避（同一 Wi-Fi で host candidate 直接接続、STUN/TURN 不要）
2. 500MB を約 80 秒で転送可能（Wi-Fi 実効 50Mbps+）
3. iOS/Android 両対応（Wi-Fi Direct は Android のみで除外）
4. DTLS（WebRTC 標準）+ AES-256-GCM（アプリ層）の二重暗号化
5. **Expo SDK 55 の新 expo-crypto AES API** を活用

### 9-2. 転送方式比較

| 方式                   | 速度            | iOS 対応 | Android 対応 | 推奨度     |
| ---------------------- | --------------- | -------- | ------------ | ---------- |
| **WebRTC DataChannel** | 高（LAN 速度）  | ✅       | ✅           | ★★★★★      |
| TCP Socket + mDNS      | 高              | ✅       | ✅           | ★★★★       |
| Wi-Fi Direct           | 高              | ❌       | ✅           | ★★         |
| BLE                    | 低（〜100KB/s） | ✅       | ✅           | ★          |
| QR 本体転送（16分割）  | 極小            | ✅       | ✅           | ✗ 容量不足 |

**QR 容量（L1 Denso Wave）:** Version 40 バイナリ EC=L で 2,953 bytes、Structured Append 最大 16 分割 → 理論最大 ~47KB。**鍵交換専用で使用**。

### 9-3. 暗号化方式

**⚠️ SDK 55 重要変更:** expo-crypto が **AES-256-GCM をネイティブサポート**（`aesEncryptAsync` / `aesDecryptAsync`）。外部暗号ライブラリ依存を最小化。

**鍵交換フロー:**

```
1. 新デバイス: ECDH P-256 キーペア生成（@noble/curves）
2. 新デバイス: 公開鍵 + SDP + IP + ポート を QR 表示（~1-2KB、単一QRで十分）
3. 旧デバイス: QR スキャン → ECDH で共有秘密算出
4. HKDF-SHA256 で AES-256-GCM 鍵導出
5. Local Network で暗号化 ZIP 送信
```

### 9-4. エクスポート形式

**単一 .bonsailog.zip パッケージ（AES-256-GCM 暗号化）:**

```
bonsailog-export-2026-04-23.enc
├── manifest.json         ← バージョン・整合性情報
├── bonsai.db             ← SQLite DB 全体（~8MB）
└── photos/
    ├── 001_abc123.jpg
    └── ...
```

**SQLite DB ファイルを丸ごとコピーする利点:**

- スキーマ再構築不要 → 完全な状態保存
- `expo-file-system` で `${documentDirectory}SQLite/bonsai.db` を直接コピー可能
- ⚠️ 事前に **`PRAGMA wal_checkpoint(FULL);`** 必須（-wal ファイル取り残し防止）

**manifest.json 例:**

```json
{
  "format_version": "1.0",
  "app_version": "2.3.1",
  "schema_version": 5,
  "exported_at": "2026-04-23T14:30:00+09:00",
  "stats": { "bonsai_count": 50, "event_count": 10234, "photo_count": 487 },
  "integrity": { "db_sha256": "a1b2c3..." }
}
```

### 9-5. 実装工程見積もり

| フェーズ                              | 工数           |
| ------------------------------------- | -------------- |
| Expo Dev Build 基盤                   | 0.5 日         |
| エクスポート（DB+写真→ZIP+暗号化）    | 2 日           |
| QR シグナリング UI                    | 1 日           |
| WebRTC 接続・DataChannel              | 3 日           |
| チャンク送受信・bufferedAmount 制御   | 2 日           |
| 受信・復号・DB 置換・マイグレーション | 2 日           |
| エラーハンドリング・UI ポリッシュ     | 2 日           |
| テスト（iOS/Android 実機）            | 2 日           |
| **合計**                              | **約 14.5 日** |

### 9-6. ⚠️ 重要注意事項

1. **Expo Go では動作不可** → EAS Dev Build 必須。
2. iOS Local Network 権限必須（`NSLocalNetworkUsageDescription`）。
3. WebRTC 完全オフラインには host candidate のみ使用、AP isolation 環境では失敗。
4. SDK 55 + expo-camera バーコードスキャン問題（[#44491](https://github.com/expo/expo/issues/44491)）事前検証要。
5. 部分再開（resume）は実装工数大、v1 は「失敗時やり直し」で運用可能。

---

## 調査10: 類似アプリ仕様書事例

本調査はサブエージェント起動エラーのため未実施。**未取得**。

参考として一般的な推奨事項のみ記載:

- **Day One**（ジャーナリング）、**Obsidian Sync**（ノート）、**Notesnook**（暗号化ノート）のエクスポート仕様が JSON + 添付ファイルパターンの実例として参考になる（L3）。
- Diátaxis Reference 文書の優良事例としては Django / Python / Rust の公式ドキュメントが Diátaxis フレームワーク準拠（L2）。
- Expo 公式サンプル: [github.com/expo/examples](https://github.com/expo/examples)、React Native 公式の [expo/router](https://github.com/expo/expo/tree/main/apps/router-e2e) 等が構造の参考。

詳細は別途個別調査推奨。

---

## 主要参照URL一覧（すべて 2026-04-23 取得）

### L1（一次情報）

| URL                                                                                                                | 内容                               |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| https://expo.dev/changelog/sdk-55                                                                                  | Expo SDK 55 公式リリースノート     |
| https://reactnative.dev/blog/2025/12/10/react-native-0.83                                                          | RN 0.83 公式blog                   |
| https://docs.expo.dev/versions/latest/sdk/sqlite/                                                                  | expo-sqlite docs                   |
| https://docs.expo.dev/versions/latest/sdk/notifications/                                                           | expo-notifications docs            |
| https://docs.expo.dev/versions/latest/sdk/localization/                                                            | expo-localization docs             |
| https://docs.expo.dev/versions/latest/sdk/crypto/                                                                  | expo-crypto docs（AES-GCM 新対応） |
| https://docs.expo.dev/versions/latest/sdk/filesystem/                                                              | expo-file-system docs              |
| https://docs.expo.dev/router/introduction/                                                                         | Expo Router                        |
| https://www.sqlite.org/fts5.html                                                                                   | SQLite FTS5 仕様                   |
| https://www.sqlite.org/lang_altertable.html                                                                        | ALTER TABLE 制約                   |
| https://www.sqlite.org/optoverview.html                                                                            | Query Optimizer                    |
| https://github.com/expo/expo/pull/27738                                                                            | FTS 3/4/5 デフォルト有効化 PR      |
| https://github.com/expo/expo/issues/4261                                                                           | iOS documentDirectory UUID 変化    |
| https://github.com/expo/expo/issues/32788                                                                          | UUID 変化再現確認                  |
| https://www.revenuecat.com/docs/                                                                                   | RevenueCat 公式ドキュメントハブ    |
| https://github.com/RevenueCat/react-native-purchases/releases                                                      | SDK リリース                       |
| https://developer.apple.com/app-store/review/guidelines/                                                           | App Store Review Guidelines        |
| https://developer.android.com/google/play/billing                                                                  | Play Billing Library               |
| https://docs.page/invertase/react-native-google-mobile-ads                                                         | AdMob RN SDK                       |
| https://developers.google.com/admob/ump                                                                            | UMP 公式                           |
| https://admob.google.com/intl/ja/home/resources/zaim-boosts-ecpm-up-to-forty-eight-percent-admob-adaptive-banners/ | Zaim 公式ケーススタディ            |
| https://www.w3.org/WAI/WCAG22/quickref/                                                                            | WCAG 2.2                           |
| https://reactnative.dev/docs/accessibility                                                                         | RN アクセシビリティ                |
| https://developer.apple.com/design/human-interface-guidelines/accessibility                                        | Apple HIG                          |
| https://m3.material.io/                                                                                            | Material Design 3                  |
| https://docs.maestro.dev/                                                                                          | Maestro                            |
| https://jestjs.io/docs/jest-object                                                                                 | Jest                               |
| http://oss.callstack.com/react-native-testing-library/                                                             | RNTL                               |
| https://fast-check.dev/                                                                                            | Property-Based Testing             |
| https://planthardiness.ars.usda.gov/                                                                               | USDA Zone Map                      |
| https://www.iana.org/time-zones                                                                                    | IANA TZ                            |
| https://techdocs.gbif.org/en/openapi/v1/species                                                                    | GBIF Species API                   |
| https://www.qrcode.com/en/about/version.html                                                                       | QR 容量公式                        |

### L2（二次情報）

| URL                                                                    | 内容                          |
| ---------------------------------------------------------------------- | ----------------------------- |
| https://www.adjust.com/blog/att-opt-in-rates-2025/                     | ATT opt-in 率データ           |
| https://tenjin.com/blog/ad-mon-gaming-2025/                            | iOS/Android 広告収益シフト    |
| https://www.bonsaiempire.com/tree-species/                             | 樹種別ケアガイド              |
| https://www.nngroup.com/articles/usability-for-senior-citizens/        | シニアユーザビリティ          |
| https://www.wbffbonsai.org/                                            | 世界盆栽友好連盟              |
| https://www.i18next.com/misc/json-format                               | i18next JSON フォーマット     |
| https://webrtc.github.io/samples/src/content/datachannel/filetransfer/ | WebRTC データチャネルサンプル |

---

## 未取得情報・今後の課題

1. **RN 0.83.4 / React 19.2.5 の具体的パッチ変更点**: 19.2 系列として互換扱い、正確な変更内容は [facebook/react-native releases](https://github.com/facebook/react-native/releases) で個別確認推奨。
2. **類似アプリ仕様書事例（調査10）**: サブエージェント起動エラーのため未実施。
3. **日本盆栽協会 月別作業 DB**: 協会 Web は展示会告知中心で非公開。書籍（『盆栽春秋』『近代盆栽』、藤岡友宏教本）を一次情報として手動抽出必要。
4. **App Store / Google Play 地域別 DL 比率の具体数値**: Sensor Tower / data.ai 有料レポートが一次、本調査では一般的傾向のみ記載。
5. **Apple Developer Forums での iOS Container UUID 変化の一次投稿 URL**: Expo issue #4261 内で引用されているが、Apple 側 DTS 投稿の直接 URL は未特定。
6. **expo-sqlite 55.x の組込み SQLite 正確なバージョン**: PR #27738 時点で 3.45+、実機で `SELECT sqlite_version();` 確認推奨。

---

## 結論と次ステップ

本調査により、BonsaiLog の basic_spec.md（Diátaxis Reference 文書）作成に必要な一次情報はほぼ全て揃った。特に**最重要 3 領域（Expo SDK 55 / SQLite スキーマ / RevenueCat）は実装即着手可能な粒度で詳述**した。

**次ステップ推奨:**

1. 本報告書をベースに basic_spec.md の章立てを確定（各調査項目を対応章へマッピング）。
2. 不足樹種データ（榎・橅・Carmona 等）は書籍・盆栽協会教本から手動抽出。
3. 調査10（仕様書事例）は別途単発調査で補完。
4. 実装開始前に、Expo SDK 55 の具体的パッチバージョン（特に RN 0.83.4 / React 19.2.5）をリリースノートで再確認。
5. AdMob / RevenueCat の管理画面設定は実装と並行してセットアップ（広告 ID / Product ID の発行が先行工程）。

本報告書は 2026-04-23 時点の最新一次情報に基づく。Expo SDK や各 SDK は月次で変化するため、実装着手前に必ず公式 CHANGELOG の最終バージョンを再確認すること。
