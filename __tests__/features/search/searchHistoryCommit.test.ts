/**
 * 検索履歴の保存タイミング契約 test (Sess95 PR-4)。
 *
 * テスター報告:「『ぼんさい』 で検索すると 『ぼん』『ぼんさ』『ぼんさい』 のように
 * 中間入力が全部履歴に残る」。 真因 = debounce 検索 (runSearchWith) のたびに
 * useSearchHistoryStore.push が呼ばれていた。
 *
 * 契約 (source-grep、 RowActionMenu.test と同方式):
 * 1. runSearchWith (検索実行) の中に履歴 push が存在しない
 * 2. commitHistory (確定 action 専用) が hook から export されている
 * 3. search.tsx の Enter 確定 (runSearch) と結果 row (onOpen) が commitHistory に配線されている
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOOK_SRC = readFileSync(
  join(__dirname, '../../../src/features/search/useBonsaiSearch.ts'),
  'utf8',
);
const SCREEN_SRC = readFileSync(
  join(__dirname, '../../../app/(tabs)/look-back/search.tsx'),
  'utf8',
);
const ROWS_SRC = readFileSync(
  join(__dirname, '../../../src/features/search/SearchResultRows.tsx'),
  'utf8',
);

describe('検索履歴は確定 action 時のみ保存 (Sess95 PR-4 契約)', () => {
  test('1. runSearchWith 内に履歴 push がない (debounce 中間入力の混入防止)', () => {
    // runSearchWith の useCallback body を抽出して push 不在を検証
    const start = HOOK_SRC.indexOf('const runSearchWith');
    const end = HOOK_SRC.indexOf('React.useEffect');
    expect(start).toBeGreaterThan(-1);
    const body = HOOK_SRC.slice(start, end);
    expect(body).not.toMatch(/useSearchHistoryStore\.getState\(\)\.push/);
  });

  test('2. commitHistory が export され minChars guard を持つ', () => {
    expect(HOOK_SRC).toMatch(/const commitHistory = useCallback/);
    expect(HOOK_SRC).toMatch(/trimmed\.length >= minChars/);
    expect(HOOK_SRC).toMatch(/commitHistory,\s*\n\s*};/);
  });

  test('3. Enter 確定 (runSearch) で commitHistory が呼ばれる', () => {
    expect(SCREEN_SRC).toMatch(/const runSearch = \(\) => \{\s*\n\s*commitHistory\(\);/);
    expect(SCREEN_SRC).toMatch(/onSubmitEditing={runSearch}/);
  });

  test('4. 結果 row tap (onOpen) で commitHistory が呼ばれる', () => {
    expect(SCREEN_SRC).toMatch(/<BonsaiResultRow[\s\S]*?onOpen={\(\) => commitHistory\(\)}/);
    expect(SCREEN_SRC).toMatch(/<EventResultRow[\s\S]*?onOpen={\(\) => commitHistory\(\)}/);
    // 行 component 側は navigation 前に onOpen を呼ぶ
    expect(ROWS_SRC).toMatch(/onOpen\?\.\(\);\s*\n\s*router\.push/);
  });

  test('5. 履歴 row tap で履歴先頭へ移動 (commitHistory(q))', () => {
    expect(SCREEN_SRC).toMatch(/commitHistory\(q\)/);
  });
});
