# P-04: UI 実装（Claude Design → Claude Code）

- **渡す先**: Claude Code
- **タイミング**: Claude Design のハンドオフバンドル受取後
- **前提**: ロジック層（Repository / Service / Store）が先にマージ済み（Claude Code 単独運用、同じセッションで両層実装可）

---

## 指示

Claude Design から受け取ったハンドオフバンドルを
React Native (Expo Router) + UI ライブラリで実装してください。

## 参照

- Claude Design のハンドオフバンドル（画面画像 + コンポーネント仕様）
- `{PROJECT_ROOT}/docs/reference/functional_spec.md` の該当画面セクション
- `{PROJECT_ROOT}/docs/how-to/development/coding_rules.md`（UI の責務範囲）
- 既存の類似画面: {あれば `app/xxx.tsx`}

## 実装ルール

### レイアウト

- Claude Design のモックに忠実に。推測でデザインを変えない
- 画面幅 320px〜428px で崩れないこと
- ダークモード対応必須（テーマトークンを使う）

### コンポーネント設計

- `app/` 配下は薄く保つ（ロジックは別セッションで実装済みの `src/` を import）
- 文字列直書き禁止 → i18n キー経由
- `testID` を主要な操作要素に付与（Maestro E2E テスト用）

### データバインディング

- 別セッションで実装した Store / Repository を import して使う
- 自前でデータ取得ロジックを書き直さない

### 状態表示

以下の 4 状態を必ず実装する:

- **loading**: データ読み込み中の表示
- **error**: エラー発生時のメッセージ + リトライ導線
- **empty**: データ 0 件時の空状態表示
- **success**: 通常のデータ表示

### ナビゲーション

- 遷移元: {どの画面から来るか}
- 遷移先: {どの画面に行くか}
- 遷移方法: `router.push` / `router.replace` / `router.back`

## 完了条件

- [ ] Claude Design のモックと目視一致
- [ ] ダークモード表示崩れなし
- [ ] 4 状態（loading / error / empty / success）実装済み
- [ ] 文字列直書きゼロ（全て i18n キー経由）
- [ ] `pnpm lint` + `pnpm type-check` パス
