# scripts/i18n/

Sess20 PR-0-2 (ADR-0033 D3 連携) で `/tmp/apply-i18n-phase1a.mjs` を本番昇格。

## apply-translation.mjs

17 言語 locale ファイル (`src/core/i18n/locales/{lang}.ts`) の指定 key 値を一括置換するスクリプト。

### Usage

```bash
# 通常実行
pnpm i18n:apply path/to/translations.json

# Dry-run (書き込まず、 何が変わるか確認)
pnpm i18n:apply path/to/translations.json --dry-run

```

### Input JSON schema

```json
{
  "_comment": "任意の説明文 (例: Phase 1a 翻訳、 各言語プロペルソナ手動翻訳)",
  "translations": {
    "<i18n key>": {
      "en": "...",
      "fr": "...",
      "es": "...",
      "de": "...",
      "it": "...",
      "pt": "...",
      "nl": "...",
      "sv": "...",
      "pl": "...",
      "ru": "...",
      "zhHans": "...",
      "zhHant": "...",
      "ko": "...",
      "hi": "...",
      "id": "...",
      "th": "...",
      "vi": "...",
      "tr": "..."
    }
  }
}
```

- **17 言語**: ja は SoT で含めない (含めると schema error)
- **i18n key**: `src/core/i18n/locales/{lang}.ts` に既存の key (新規追加は `pnpm i18n:add-key` で別途)
- **placeholder**: `{type}` / `{count}` / `{days}` 等は各言語で維持必須 (将来 placeholder check 拡張予定)

### 翻訳禁止リスト連携 (ADR-0033 D3)

ADR-0033 D3 「翻訳禁止リスト」 (bonsai / niwaki / karikomi / nebari / jin / shari / kokedama / yamadori / mame / shohin / akadama / kusamono / sabamiki / bunjin / ishizuki + 樹形音訳 Chokkan / Moyogi / Shakan / Kengai / Han-Kengai / Sokan) について**常時** warn:

- ja 原文に「盆栽」 「山採り」 等が含まれているのに翻訳値に音訳が消えている (例: en に "bonsai" がない)
- SoT は ADR-0033 D3 + 本 script 内蔵 `PROTECTED_TERMS` (glossary.md は 2026-06-11 廃止、 --glossary option 撤去)

### Phase 1a 再実行 (regression test)

```bash
# Sess19-4 PR-T1a #690 の input
node scripts/i18n/apply-translation.mjs /tmp/i18n-phase1a.json --dry-run
```

→ `Total: 289 string updates expected` (17 keys × 17 langs) + git diff 0 (既適用済) で regression 0 確認。

### 関連

- ADR-0033 D3 (翻訳禁止リスト厳守、 R-40 PR 着手前確認義務、 2026-06-11 Amendment で glossary 廃止)
- Sess19-4 PR-T1a #690 (Phase 1a 17 keys × 17 言語実証)
- Sess20 Phase H2 各 PR で再利用
