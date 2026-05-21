/**
 * i18n-remove-key.mjs 静的解析 test (Sess26 PR-η-2、 ADR-0036 Future Work + Sess25 PR-⑧ 学び #1)。
 *
 * E2E lifecycle test は実装時に手動確認済 (本セッション開発ログ参照):
 *   add testRemoveSingleLine + testRemoveAnother → ja.ts に multi-line value 注入 →
 *   dry-run で 39 lines 検出 (ja の multi-line は 2 lines、 他 18 lang は 1 line) →
 *   real remove で 19 locale 全削除 → type-check PASS で orphan 0 確認
 *
 * 本静的 test は script の構造を検証 (Sess23 PR-ζ-1-② 確立 pattern)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../scripts/i18n-remove-key.mjs'), 'utf8');

describe('i18n-remove-key.mjs (Sess26 PR-η-2)', () => {
  test('1. 19 locale を全て扱う (en + ja + 17 fallback)', () => {
    const localesMatch = SRC.match(/const\s+ALL_LOCALES\s*=\s*\[[^\]]+\]/);
    expect(localesMatch).not.toBeNull();
    if (localesMatch) {
      const list = localesMatch[0];
      const count = (list.match(/'/g) ?? []).length / 2;
      expect(count).toBe(19);
      // 主要 locale が含まれている
      ['en', 'ja', 'zhHans', 'zhHant', 'ko', 'hi', 'th'].forEach((lang) => {
        expect(list).toContain(`'${lang}'`);
      });
    }
  });

  test('2. multi-line value 検出 regex (Sess25 PR-⑧ orphan 事故対策)', () => {
    // multi-line key 行 pattern: `keyName:$` (末尾 : で改行)
    expect(SRC).toMatch(/multiLineKeyRegex\s*=\s*new\s+RegExp/);
    expect(SRC).toMatch(/\$\{keyName\}:\\\\s\*\$/);
    // 次行 (orphan value 行) の検出 + 同時削除
    expect(SRC).toMatch(/\^\\s\+\['"\]\.\*\?\['"\]/);
    expect(SRC).toMatch(/i\+\+/); // index 進めて 2 行 skip
  });

  test('3. single-line value 検出 regex (key + value + comma の 1 行)', () => {
    expect(SRC).toMatch(/singleLineRegex\s*=\s*new\s+RegExp/);
    // pattern: `keyName: 'value',` (escape \' 対応、 末尾 comma optional)
    expect(SRC).toMatch(/\$\{keyName\}:\\\\s\*\['"\]/);
  });

  test('4. valid JS identifier check (regex injection 防止)', () => {
    expect(SRC).toMatch(/\^\[a-zA-Z_\]\[a-zA-Z0-9_\]\*\$/);
    expect(SRC).toMatch(/Invalid key name/);
  });

  test('5. dry-run option (実 file 変更しない、 削除対象を stdout 出力)', () => {
    expect(SRC).toMatch(/let\s+dryRun\s*=\s*false/);
    expect(SRC).toMatch(/--dry-run/);
    expect(SRC).toMatch(/if\s*\(dryRun\)/);
  });

  test('6. 複数 key 同時削除対応 (keyNames 配列で受領)', () => {
    expect(SRC).toMatch(/const\s+keyNames\s*=\s*\[\]/);
    expect(SRC).toMatch(/keyNames\.push/);
    expect(SRC).toMatch(/for\s*\(const\s+key\s+of\s+keyNames\)/);
  });

  test('7. 全 19 locale で 0 件 hit なら exit 1 (typo 検出)', () => {
    expect(SRC).toMatch(/totalRemoved\s*===\s*0/);
    expect(SRC).toMatch(/No keys matched in any locale/);
    expect(SRC).toMatch(/exit\(1\)/);
  });

  test('8. Next steps ガイド (R-1 目視確認 + verify:type-check + i18n:check)', () => {
    expect(SRC).toMatch(/pnpm verify:type-check/);
    expect(SRC).toMatch(/pnpm i18n:check/);
    expect(SRC).toMatch(/git diff src\/core\/i18n\/locales\//);
  });
});
