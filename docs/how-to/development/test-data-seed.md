# 開発用テストデータ seed — 実行手順

> **このファイルのロール**: 開発中の実機テストで「写真 + 樹齢 + コメント豊富な盆栽データ」を 1 タップ投入する手順。
> 実装は `src/dev/seedTestData.ts` (アプリ内 dev シード、旧 T1-4 案 1)。

最終更新: 2026-06-11 (Doc-Truth Audit バッチ⑤ — 現行手順へ書き直し)

---

## 現在の手順 (1 タップ投入)

1. **Dev Build** (または `EXPO_PUBLIC_SEED_FORCE=1` でビルドした preview-local-apk) でアプリを起動
2. **設定タブ → 開発者セクション** を開く (`__DEV__` または `EXPO_PUBLIC_SEED_FORCE=1` のときのみ表示、`src/dev/DevSettingsSection.tsx`)
3. 「テストデータ投入」をタップ — 日本語版 `seedTestData()` / 英語版 `seedTestDataEn()` (Marcus ペルソナ向け) の 2 種

### 投入される内容 (両言語で同規模)

- **盆栽 11 件** (active 10 + archived 1)。先頭 3 件は「父の黒松 / 母の五葉松 / お師匠の真柏」(Maestro flow 互換のため名前固定)
- **写真 9 枚** (「銘品の真柏 / Heirloom Juniper」が 3 枚で Free 上限テスト用)
- **タグ 8 件** (prefix 3 種 + place、言語別)
- **作業履歴: 全種別カバー** (watering / pruning / wiring / repotting / fertilizing ほか)
- **edge cases**: archived 1 / ゴミ箱 events 2 / 期日超過 planned 2
- **フル装備盆栽 1 本** (Sess49 追補4): 全基本情報 + 全 14 作業種別を各フル payload + 各作業に写真 2 枚 — EventRow 写真表示と PDF 複数ページ検証用

### 再投入

seed は **idempotent** (既存 active 盆栽があれば skip)。再投入したい場合は開発者セクションの「全データ削除」→「テストデータ投入」の順で実行する。

---

## 経緯 (要約)

- 2026-05-10 (T1-4): 実機の BonsaiCard が placeholder でスカスカ表示 → 標準テストデータの投入手段を 3 案比較し、当初は案 3 (Maestro flow 経由) を推奨
- 方針変更: `expo-image-picker` の OS picker (アプリ外画面) を Maestro が制御できないと判明 → **案 1 (アプリ内 dev シードボタン) を採用・実装** (`src/dev/seedTestData.ts`)。Maestro flow は seed を行わず UI 検証に専念
- Sess10 PR-1/2: 11 盆栽 + 2 言語 pack (`SeedLangPack` / `SEED_PACK_JA` / `SEED_PACK_EN`) へ拡充
- 3 案比較の全文は本ファイルの git 履歴 (2026-05-10 版) を参照

---

## 関連

- `src/dev/seedTestData.ts` — seed 本体 (データ定義含む)
- `src/dev/DevSettingsSection.tsx` — 起動 UI (開発者セクション)
- `docs/how-to/development/dev_vs_preview_builds.md` — Dev / Preview build の使い分け (`EXPO_PUBLIC_SEED_FORCE` の文脈)
