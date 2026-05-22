/**
 * check-discuss-jargon.mjs (Sess30 PR-5、 R-49 自動化) の静的解析 test。
 *
 * 実 process は spawn せず、 script 内の純関数 (analyze + hasGlossaryNearby) を
 * 間接的に script source を読んで pattern 検出する形で test。
 */
const fs = require('node:fs');
const path = require('node:path');

const SCRIPT_PATH = path.join(__dirname, '../../scripts/check-discuss-jargon.mjs');
const SRC = fs.readFileSync(SCRIPT_PATH, 'utf-8');

describe('check-discuss-jargon.mjs (R-49 自動化、 Sess30 PR-5)', () => {
  test('1. 7 種の PATTERNS 定義あり (ADR/R/§/案/Sess/PR/ADR with D)', () => {
    // PATTERNS 配列に少なくとも 7 種の name 定義
    const patterns = [
      'ADR-XXXX (Decision 付き)',
      'ADR-XXXX',
      'R-XX',
      '§N',
      '案 X-Y',
      'SessN',
      'PR #N',
    ];
    patterns.forEach((p) => {
      expect(SRC).toContain(p);
    });
  });

  test('2. hasGlossaryNearby 関数定義あり (併記表現の周辺検出)', () => {
    expect(SRC).toMatch(/function hasGlossaryNearby/);
    expect(SRC).toContain('matchStart');
    expect(SRC).toContain('matchEnd');
  });

  test('3. analyze 関数定義あり (文書解析)', () => {
    expect(SRC).toMatch(/function analyze/);
    expect(SRC).toContain('findings');
  });

  test('4. 閾値 3 件以上で exit 1 (CI ブロック)', () => {
    expect(SRC).toMatch(/threshold\s*=\s*3/);
    expect(SRC).toMatch(/exit\(1\)/);
  });

  test('5. --json option 対応 (CI 連携用)', () => {
    expect(SRC).toContain('--json');
    expect(SRC).toMatch(/JSON\.stringify/);
  });

  test('6. R-49 関連 comment あり (docs link)', () => {
    expect(SRC).toMatch(/R-49/);
    expect(SRC).toContain('specialized.md');
  });

  test('7. stdin 経由入力対応 (cat draft.md | pnpm ...)', () => {
    expect(SRC).toContain('stdin');
    expect(SRC).toMatch(/setEncoding\('utf-8'\)/);
  });

  test('8. 中学生語訳併記 pattern: 直後の (), =, ＝, （ で OK 判定', () => {
    // 併記判定 regex
    expect(SRC).toMatch(/[(（]/);
    expect(SRC).toMatch(/[＝=]/);
  });

  test('9. 違反 detail 出力 (context ±30 文字)', () => {
    expect(SRC).toMatch(/v\.position\s*-\s*30/);
    expect(SRC).toMatch(/v\.position\s*\+\s*v\.match\.length\s*\+\s*30/);
  });

  test('10. 対処ガイド出力 (R-49 整合 例文付き)', () => {
    expect(SRC).toMatch(/対処/);
    expect(SRC).toMatch(/わかりやすい説明/);
  });
});
