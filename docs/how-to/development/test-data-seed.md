# 開発用テストデータ seed — 方針 + 実行手順 (T1-4)

> **このファイルのロール**: 開発中の実機テストで「写真 + 樹齢 + コメント豊富な盆栽データ」を投入するための **方針文書 + 手順**。本セッション T1-4 で方針確定、本格実装は別 Issue で対応。

最終更新: 2026-05-10 (T1-4、Tier 1a 基盤整備)

---

## 背景

実機の BonsaiCard が **placeholder のまま** でスカスカ表示 (本セッション 2026-05-10 ユーザー指摘):

- mockup: 写真 220h hero + 樹齢 35 年 + コメント「葉色やや薄め、潅水量を増やす」
- 実機: 名前「テスト」「BァckPine」+ 樹形「chokkan」のみ (写真 placeholder、樹齢無し、コメント無し)

→ **テストデータが薄い** ため、mockup 整合の視覚比較が困難。標準テストデータを定義 + 投入手段を確立する。

---

## 方針: 3 案比較

### 案 1: アプリ内シードボタン (`__DEV__` モード限定)

設定タブに「開発者: テストデータ投入」ボタン (`__DEV__` 時のみ表示)。タップで:

- `createBonsai` × 3 (父の黒松 / 母の五葉 / お師匠の真柏)
- `addPhoto` × 3 (assets/seed/ の placeholder 画像)
- `createEvent` × 12 (各盆栽 4 件の作業履歴)
- `createTag` × 3 + `addEventTags` (タグ #要注意 @ベランダ #展示会候補)

**メリット**:

- アプリ内で完結、Node 環境不要
- 既存 repository API そのまま使える
- 何度でもタップ可能 (UPSERT or DELETE THEN INSERT)

**デメリット**:

- 設定画面に開発者用ボタン追加 (UI 複雑化、`__DEV__` 制御要)
- 写真添付機能 (Expo Image Picker) が T2-2 必須

### 案 2: Node.js から SQLite 直接書き込み (better-sqlite3)

`scripts/seed-test-data.ts` で Node.js + better-sqlite3 で `.db` ファイル生成、`assets/seed/dev-data.db` に commit。アプリ初回起動時に `__DEV__` && データ無し時のみコピー。

**メリット**:

- アプリ UI 変更不要
- 1 度生成して commit、再生成不要
- 開発者は何もしなくて良い (初回起動で自動投入)

**デメリット**:

- better-sqlite3 を pnpm 追加 (devDependencies)
- expo-sqlite と schema 互換性確保が必要
- Drizzle migration v6 後の schema 変更で .db 再生成必要
- DB 直接書き込みは型安全性低い

### 案 3: Maestro flow で UI 経由投入 ⭐ (推奨)

`maestro/flows/seed/seed-test-bonsai.yml` で UI 操作を自動化。実機で開発者が `maestro test ...` 実行で 3 件投入。

**メリット**:

- 実機の UI を完全再現 (本物の DB 状態)
- Maestro 既存の verify:maestro で構文 lint
- 編集画面 BottomSheet 化 (T2-1) 後も同じ flow で対応可
- 写真は Image Picker UI 経由で投入可能 (T2-2 後)

**デメリット**:

- 実機接続必須 (ExpoGo or Dev Client)
- 30 ステップ程度の flow 記述 (1-2 時間)

---

## 推奨: 案 3 (Maestro 経由)

**理由**:

1. 既存の verify:maestro と整合 (R-22 ルール、Maestro 2.0 構文 lint)
2. UI 完全動線 (T2-1 BottomSheet 化後も自動対応)
3. 案 1/2 のような UI 改修や DB 直接書き込みのリスクなし

### 実装は別 Issue (本 T1-4 スコープ外)

本 PR では **方針文書化のみ**。実装は **Issue #N (別 sprint)** で:

- maestro/flows/seed/seed-test-bonsai.yml 新規
- 標準テストデータ 3 件 (name / species / style のみ、写真と樹齢は T2-2/T2-3 後に拡張)
- assets/seed/ ディレクトリ + placeholder 画像 (T2-2 写真機能で利用)
- 実行手順文書

---

## 標準テストデータ (3 件、案 3 で投入予定)

| #   | name         | species (将来)     | style              | 樹齢 (T2-3 後) | tags (将来)                   |
| --- | ------------ | ------------------ | ------------------ | -------------- | ----------------------------- |
| 1   | 父の黒松     | 黒松 (kuromatsu)   | chokkan (直幹)     | 35 年 (推定)   | #要注意 @ベランダ #展示会候補 |
| 2   | 母の五葉     | 五葉松 (goyomatsu) | moyogi (模様木)    | 12 年          | (なし)                        |
| 3   | お師匠の真柏 | 真柏 (shimpaku)    | hankengai (半懸崖) | 45 年          | #展示会候補                   |

各盆栽に作業履歴 4 件以上 (水やり / 剪定 / 針金がけ / 施肥 / 消毒 等) を投入し、HistoryTab の表示テストが可能に。

---

## 実行手順 (案 3 実装後の想定)

```bash
# 前提: 実機接続 + ExpoGo or Dev Client 起動 + Metro server 稼働
# 実機 IP / port adb reverse tcp:8081 tcp:8081 済

cd /home/doooo/04_app-factory/apps/BonsaiLog
maestro test maestro/flows/seed/seed-test-bonsai.yml
```

**コマンド意味**:

- `maestro test`: Maestro CLI で flow 実行
- `maestro/flows/seed/seed-test-bonsai.yml`: 実行する flow ファイル (3 件登録手順を記述)

---

## 関連

- T1-4 (本 PR): 方針文書化 + Issue 起票
- T2-1 (Tier 2): 編集画面 BottomSheet 化 → seed flow 更新必要
- T2-2 (Tier 2): 写真追加 UI → assets/seed/ placeholder 画像活用
- T2-3 (Tier 2): 樹齢 / 購入日 等の追加フィールド → seed データ拡張
- ADR-0020 §画面マップ row 5/8 (本 seed で BonsaiCard / 編集画面の整合性検証可能に)
- principles.md 「カード/リスト UI 整合性」(BonsaiCard 3 階層検証の前提)
