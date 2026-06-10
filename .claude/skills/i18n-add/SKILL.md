---
name: i18n-add
description: Add a new translation key to all 19 locale files.
user-invocable: true
argument-hint: "["key.name" "English value"]"
---

# /i18n-add — 翻訳キー追加

ユーザーが「翻訳キー X を追加して」「i18n キーを追加」と言ったらこの手順に従う。

## 入力

- 追加するキー名（例: `home.welcomeMessage`）
- 日本語または英語の文字列
- 動的な値があれば変数名（例: `{{count}}`）

## 手順

### 1. ベース言語ファイル（en.ts）に追加

`src/core/i18n/locales/en.ts` を開き、適切なセクションコメント（`// --- Settings ---` 等）の下に追加。

```ts
const baseEn = {
  // 既存のキー...

  // --- New section or existing section ---
  myFeature: 'My new feature',
  myFeatureWithVar: 'You have {{count}} items',
};
```

### 2. 全 18 言語ファイルに同じキーを追加

**baseEn フォールバックに頼らない**。`...baseEn` が依存するスプレッドがあると、未翻訳キーが「存在する」と判定されて検出できない。

対象ファイル（19 個）:

- `en.ts` (base)
- `ja.ts` / `fr.ts` / `es.ts` / `de.ts` / `it.ts` / `pt.ts` / `ru.ts`
- `zh-Hans.ts` / `zh-Hant.ts` / `ko.ts` / `hi.ts` / `id.ts`
- `th.ts` / `vi.ts` / `tr.ts` / `nl.ts` / `pl.ts` / `sv.ts`

各ファイルで明示的に翻訳を追加（自然な訳になるよう注意）。

### 3. TranslationKey 型が自動更新されることを確認

```bash
pnpm type-check
```

### 4. 翻訳漏れ / 未使用キーをチェック

```bash
pnpm i18n:check
```

期待される結果:

- 0 missing
- 0 unused（実装で使われている場合）

### 5. UI で実際に使う

```tsx
import { useTranslation } from '@/src/core/i18n/i18n';

const { t } = useTranslation();
return <Text>{t('myFeature')}</Text>;
// または変数付き
return <Text>{t('myFeatureWithVar', { count: 5 })}</Text>;
```

## キー命名ルール

- **camelCase**: `home.welcomeMessage`（snake_case 禁止）
- **ネストは最大 3 階層**: `screen.section.element`
- **動的変数は `{{変数名}}`**: `'You have {{count}} items'`
- **同じ意味のキーを 2 つ作らない**: 既存キーを再利用

## ラテン文字言語の注意

以下の言語はアクセント記号を必ず使う（ASCII-only は不自然）:

- `fr`（à â é è ê ë î ï ô ù û ü ÿ ç）
- `es`（á é í ó ú ñ ¿ ¡ ü）
- `de`（ä ö ü ß）
- `pt`（á à â ã é ê í ó ô õ ú ç）
- `it`（à è é ì ò ù）
- `nl`（地名等で必要に応じて）
- `pl`（ą ć ę ł ń ó ś ź ż）
- `tr`（ç ğ ı ö ş ü）
- `vi`（多数のダイアクリティカルマーク）
- `sv`（å ä ö）

## 完了基準

- [ ] 全 19 言語ファイルにキーが追加された
- [ ] `pnpm i18n:check` が 0 missing
- [ ] `pnpm type-check` が pass
- [ ] 実装で `t('keyName')` が使われている
