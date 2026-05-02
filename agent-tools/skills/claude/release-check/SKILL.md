---
name: release-check
description: Run pre-release final checks (CI, tests, env, ads, billing, store).
user-invocable: true
argument-hint: '[--ios / --android / --all (デフォルト: --all)]'
---

# /release-check — リリース前最終チェック

ユーザーが「リリース前チェック」「ストア提出前にチェック」と言ったらこの手順に従う。

## 自動チェック（コマンド実行）

```bash
pnpm verify
```

内部で実行されるもの:

1. `pnpm lint` — ESLint
2. `pnpm type-check` — `tsc --noEmit`
3. `pnpm format:check` — Prettier
4. `pnpm test` — Jest
5. `pnpm i18n:check` — 翻訳キー整合性
6. `pnpm config:check` — Expo 設定検証

追加チェック:

```bash
pnpm metadata:check          # ASC メタデータ検証
npx expo-doctor               # Expo 健全性
gh run list --limit 5         # 直近 CI 結果
```

## 手動チェックリスト

### コード

- [ ] `main` ブランチが最新で CI が全グリーン
- [ ] バージョン番号を更新（`app.json` の `version` + EAS の `buildNumber` / `versionCode`）
- [ ] 不要な `console.log` / デバッグコードを削除
- [ ] `.env` の値が本番用になっている（テスト用 ID が残っていない）
- [ ] CHANGELOG / リリースノートを準備

### 広告（該当する場合）

- [ ] **テスト広告 ID が残っていない**ことを確認（`grep -r 'ca-app-pub-3940256099942544' src/`）
- [ ] 本番広告ユニット ID に切り替え済み
- [ ] `app-ads.txt` が公開済み
- [ ] UMP 同意フローがテスト済み（EEA 想定）

### 課金（該当する場合）

- [ ] サブスクリプション商品が ASC / GPC で「承認済み」
- [ ] RevenueCat のプロダクション API キーが設定済み
- [ ] サンドボックステスト全パターン完了（購入 / 復元 / 解約 / 期限切れ）
- [ ] ペイウォール画面に **復元ボタン**がある（Apple 審査必須）
- [ ] 利用規約リンクがペイウォールに表示されている

### ストア掲載

- [ ] 全言語のストアテキストが最新（`fastlane/metadata/`）
- [ ] スクリーンショットが最新（4 枚以上）
- [ ] フィーチャーグラフィック（1024x500）が最新
- [ ] プライバシーポリシー URL が有効
- [ ] 利用規約 URL が有効

### iOS 固有

- [ ] `app.json` の `usesNonExemptEncryption: false`
- [ ] `privacyManifests` 設定済み
- [ ] iPad サポート設定（必要に応じて）

### Android 固有

- [ ] `versionCode` が前回より大きい
- [ ] 12 人テスター要件を満たしている（個人アカウントの場合）

## 警告レベル

| 状態        | 表示                           |
| ----------- | ------------------------------ |
| 全項目 OK   | ✅ リリース可能                |
| 1 項目 NG   | ⚠ 1 件の懸念 — 確認後に再実行 |
| 2 件以上 NG | ❌ リリース不可 — 修正必須     |

## 制約

- このスキルは **読み取り専用**。修正はしない（ユーザーの判断で別途実施）
- 不明な項目があれば「不明」と報告し、推測しない
