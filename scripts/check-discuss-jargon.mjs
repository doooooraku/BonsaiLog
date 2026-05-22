#!/usr/bin/env node
/**
 * R-49 (Sess30 retro 由来): 議論時の説明品質 Self-check 自動化 script。
 *
 * 議論文 (file or stdin) を解析、 専門用語 / 参照記号 (ADR-XXXX / R-XX / §N / 案 A-X 等) の
 * 出現頻度を集計し、 中学生語訳併記の有無を判定。 閾値超過で exit 1 (CI ブロック)。
 *
 * 使い方:
 *   pnpm lint:discuss-jargon <file>           # ファイル指定
 *   cat draft.md | pnpm lint:discuss-jargon   # stdin 経由
 *   pnpm lint:discuss-jargon <file> --json    # JSON 出力 (CI 連携)
 *
 * 検出 pattern (R-49 6 項目のうち項目 1「専門用語訳」 の自動化):
 *   1. ADR-XXXX (例: ADR-0035) — 4 桁 ID の ADR 参照
 *   2. ADR-XXXX D-X (例: ADR-0035 D6) — Decision 番号付き
 *   3. R-XX (例: R-47) — recurrence-prevention rule 参照
 *   4. §N (例: §22) — design_system.md 等のセクション参照
 *   5. 案 X-Y (例: 案 A-1、 案 B-Y) — 議論内アプローチ記号
 *   6. SessN (例: Sess29) — セッション番号参照
 *   7. PR #N (例: PR #770) — PR 番号参照
 *
 * 中学生語訳併記の判定 (heuristic):
 *   検出した参照記号の周辺 ±80 文字に「(= ...)」 「(...の意味)」 「= ...」 等の併記表現があるか
 *   無ければ「中学生語訳併記不足」 として warning
 *
 * 閾値 (default):
 *   - 1 文書内で参照記号併記なし箇所が **3 件以上** で exit 1 (CI ブロック)
 *   - --json 時は exit 0 で JSON 出力のみ (集計用途)
 *
 * 関連: .claude/recurrence-prevention/specialized.md R-49 / docs/reference/tasks/lessons/sess30-retro.md
 */
import { readFileSync } from 'node:fs';
import { argv, exit, stdin } from 'node:process';

const PATTERNS = [
  {
    name: 'ADR-XXXX (Decision 付き)',
    regex: /ADR-\d{4}\s+D[-]?\d+/g,
  },
  {
    name: 'ADR-XXXX',
    regex: /ADR-\d{4}(?!\s+D)/g,
  },
  {
    name: 'R-XX (recurrence-prevention rule)',
    regex: /\bR-\d{1,3}\b/g,
  },
  {
    name: '§N (design_system セクション参照)',
    regex: /§\d{1,3}/g,
  },
  {
    name: '案 X-Y (議論内アプローチ記号)',
    regex: /案\s*[A-Z][-]?\d/g,
  },
  {
    name: 'SessN (セッション番号)',
    regex: /Sess\d{1,3}/g,
  },
  {
    name: 'PR #N (PR 番号)',
    regex: /PR\s*#\d+/g,
  },
];

/**
 * 検出した参照記号の周辺 ±80 文字に併記表現があるか判定。
 *
 * 併記表現 pattern:
 *  - "ADR-0035 (= 1 ヶ月前の決定)" → OK
 *  - "ADR-0035 (1 ヶ月前の決定)" → OK
 *  - "R-47 = ..." → OK
 *  - "R-47 (... の意味)" → OK
 *  - "ADR-0035" 単独 → NG (中学生語訳併記不足)
 *
 * @param {string} text - 全文
 * @param {number} matchStart - 検出位置
 * @param {number} matchEnd - 検出終了位置
 * @returns {boolean} 併記表現あり = true
 */
function hasGlossaryNearby(text, matchStart, matchEnd) {
  const radius = 80;
  const start = Math.max(0, matchStart - radius);
  const end = Math.min(text.length, matchEnd + radius);
  const context = text.slice(start, end);
  // 併記表現の判定 pattern (検出位置直後の () or = で説明文がある)
  const after = text.slice(matchEnd, end);
  // 直後に半角/全角スペース + ( ... ) or = ... があれば併記とみなす
  if (/^\s*[(（][^)）]+[)）]/.test(after)) return true;
  if (/^\s*[＝=]\s*\S/.test(after)) return true;
  // 同一段落内に「= 」「(...)」 で別の併記があれば OK (例: 文末で「これは 1 ヶ月前の決定です」)
  // ただしこれは過剰検出になるので、 直後 ±20 文字のみで判断
  const nearAfter = text.slice(matchEnd, Math.min(text.length, matchEnd + 20));
  if (/[（(=＝]/.test(nearAfter)) return true;
  return false;
}

/**
 * 文書を解析、 参照記号一覧 + 併記不足箇所を返す。
 */
function analyze(text) {
  /** @type {Array<{name: string, match: string, position: number, hasGlossary: boolean}>} */
  const findings = [];
  for (const { name, regex } of PATTERNS) {
    let m;
    // regex は global なので exec を loop
    const re = new RegExp(regex.source, 'g');
    while ((m = re.exec(text)) !== null) {
      const matchStart = m.index;
      const matchEnd = m.index + m[0].length;
      findings.push({
        name,
        match: m[0],
        position: matchStart,
        hasGlossary: hasGlossaryNearby(text, matchStart, matchEnd),
      });
    }
  }
  return findings;
}

function readInput() {
  return new Promise((resolve) => {
    const filePath = argv[2] && !argv[2].startsWith('--') ? argv[2] : null;
    if (filePath) {
      resolve(readFileSync(filePath, 'utf-8'));
      return;
    }
    let data = '';
    stdin.setEncoding('utf-8');
    stdin.on('data', (chunk) => (data += chunk));
    stdin.on('end', () => resolve(data));
  });
}

async function main() {
  const text = await readInput();
  if (text.trim().length === 0) {
    console.error('[check-discuss-jargon] empty input');
    exit(2);
  }

  const findings = analyze(text);
  const violations = findings.filter((f) => !f.hasGlossary);
  const jsonMode = argv.includes('--json');

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          totalReferences: findings.length,
          violations: violations.length,
          details: violations.slice(0, 50).map((v) => ({
            symbol: v.match,
            position: v.position,
            category: v.name,
          })),
        },
        null,
        2,
      ),
    );
    exit(0);
  }

  // 集計を console.log
  console.log(`[check-discuss-jargon] 検出参照記号: ${findings.length} 件`);
  if (findings.length > 0) {
    const byCategory = findings.reduce((acc, f) => {
      acc[f.name] = (acc[f.name] || 0) + 1;
      return acc;
    }, /** @type {Record<string, number>} */ ({}));
    for (const [name, count] of Object.entries(byCategory)) {
      console.log(`  - ${name}: ${count} 件`);
    }
  }

  if (violations.length > 0) {
    console.error(`\n[ERROR] 中学生語訳併記が不足している参照記号: ${violations.length} 件`);
    console.error('(R-49 項目 1 違反、 議論文では各記号に「(= 中学生語訳)」 等の併記必須)\n');
    violations.slice(0, 10).forEach((v) => {
      const around = text.slice(Math.max(0, v.position - 30), v.position + v.match.length + 30);
      console.error(
        `  L pos=${v.position}  "${v.match}"  context: ...${around.replace(/\n/g, ' ')}...`,
      );
    });
    if (violations.length > 10) {
      console.error(`  ... 他 ${violations.length - 10} 件`);
    }
    console.error(
      `\n対処: 各参照記号の直後に「(= わかりやすい説明)」 等を併記してください。\n` +
        `      例: 「ADR-0035 D6 (= 1 ヶ月前に決めた『記録 tab tap = 予定 tab に飛ぶ』 ルール)」\n` +
        `R-49 の他の項目 (図解 / 例え / 80 文字以内 等) は手動 Self-check を実施してください。\n`,
    );

    const threshold = 3;
    if (violations.length >= threshold) {
      console.error(`違反 ${violations.length} 件 >= 閾値 ${threshold} 件、 exit 1 (CI ブロック)`);
      exit(1);
    }
  } else if (findings.length > 0) {
    console.log('\n[check-discuss-jargon] OK — 全ての参照記号に併記表現あり');
  }
  exit(0);
}

void main();
