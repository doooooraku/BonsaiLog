#!/usr/bin/env node
// ja 文言スタイル lint — docs/reference/copy-style-ja.md の機械検査可能項目を検査する。
// 対象は ja.ts のみ (ADR-0060: ja 先行スコープ)。
//
// 検査項目 (ガイド項番):
//   3. 英数字・プレースホルダと和文の間の半角スペース (spacing)
//      + 和文同士の間の不要な半角スペース (jaSpace、折返しヒント残骸)
//   1/2. 文末句点ルール (suffix で判定可能なキーのみ。*Desc 系で文形なのに句点なし /
//        *Title 系で句点あり。体言止めキャプションは対象外 = 人間レビュー管轄)
//   5. 表記揺れ辞書 (NOTATION_DICT が正)
//   4. 全角記号・全角英数字・全角スペースの混入
//
// モード: default = warn (報告のみ exit 0) / --strict = 違反があれば exit 1
// 全件監査 (Issue #1208 PR-2〜5) 完了後に verify チェーンで --strict 運用 (PR-6)。

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const JA_FILE = path.join(ROOT, 'src/core/i18n/locales/ja.ts');
const STRICT = process.argv.includes('--strict');

// --- 表記揺れ辞書 (NG → 正)。監査で随時追加する。 ---
const NOTATION_DICT = {
  買切: '買い切り',
  下さい: 'ください',
  出来ま: 'できま',
  頂き: 'いただき',
  致しま: 'いたしま',
  することができま: 'できま',
  '...': '…',
};

// 数値・英字を描画するプレースホルダ名 (spacing 検査対象)。
// {type} {label} {name} 等は和文を描画するため対象外 (密着可)。
const NUMERIC_PLACEHOLDERS = new Set([
  'count',
  'days',
  'weeks',
  'months',
  'years',
  'n',
  'i',
  'total',
  'limit',
  'used',
  'time',
  'date',
  'bonsai',
  'events',
  'photos',
]);

// --- 文末句点ルールの suffix 判定 ---
const PERIOD_REQUIRED_SUFFIX = /(Desc|Body|Detail|Description|FinePrint)$/;
const PERIOD_FORBIDDEN_SUFFIX =
  /(Title|Label|Cta|Badge|Action|Button|Tab|Section|Short|Toggle|Placeholder|Header|Name)$/;

// --- 和文文字クラス (ひらがな/カタカナ/漢字/長音/々) ---
const JA = 'ぁ-んァ-ヶ一-龯ー々';

// --- ルール別 allowlist (意図的な例外。理由をコメントで残すこと) ---
const ALLOWLIST = {
  // 相対時間・経過表現の複合語 (「3日前」「2週経過」「樹齢: 35年」) は密着が日本語慣行。
  // recurringWeeklyByDaysSummary の {days} は曜日名 (和文) を描画する。
  spacing: new Set([
    'elapsedDays',
    'elapsedWeeks',
    'elapsedMonths',
    'elapsedYears',
    'ageEstimatedFormat',
    'timelineConsecutive',
    'wiringRowWeeks',
    'wiringUnwireOverdue',
    'wiringUnwireInWeeks',
    'wiringUnwireOverdueWeeks',
    'recurringWeeklyByDaysSummary',
  ]),
  // ブランドタグライン (「鉢 1 本ずつ、一生分。」等) の句点は意匠。
  period: new Set(['onboardingWelcomeTitle', 'paywallHeroTitle', 'exportHubHeroTitle']),
  notation: new Set([]),
  fullwidth: new Set([]),
  jaSpace: new Set([]),
};

function extractEntries(fileText) {
  // `key: '...'` を抽出。値が次行に折り返されるパターン (`key:\n  '...'`) にも対応。
  const markerMatch = /const\s+[A-Za-z0-9_]+\s*[:=][^{]*{/m.exec(fileText);
  if (!markerMatch) throw new Error('dict body not found');
  const start = markerMatch.index + markerMatch[0].length;
  const end = fileText.lastIndexOf('\n};');
  const body = fileText.slice(start, end);

  const entries = [];
  const pattern = /^\s*([A-Za-z0-9_]+)\s*:\s*\n?\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/gm;
  let match;
  while ((match = pattern.exec(body)) != null) {
    // \n エスケープを実改行に正規化 (spacing 検査が `n` を英字と誤認しないように)
    entries.push({ key: match[1], value: match[3].replace(/\\n/g, '\n') });
  }
  return entries;
}

function checkSpacing(key, value, violations) {
  if (ALLOWLIST.spacing.has(key)) return;
  const push = (index) =>
    violations.push({
      rule: 'spacing',
      key,
      detail: `英数字と和文の間に半角スペースが必要: 「...${value.slice(Math.max(0, index - 6), index + 8)}...」`,
    });
  // 1) リテラル英数字と和文の隣接 (placeholder 内部の英字は brace が挟まるため誤検知しない)
  const after = new RegExp(`[A-Za-z0-9][${JA}]`, 'g');
  const before = new RegExp(`[${JA}][A-Za-z0-9]`, 'g');
  for (const re of [after, before]) {
    let m;
    while ((m = re.exec(value)) != null) push(m.index);
  }
  // 2) 数値系 placeholder と和文の隣接 ({count}件 等)。和文を描画する placeholder は対象外。
  const ph = /\{(\w+)\}/g;
  const jaChar = new RegExp(`[${JA}]`);
  let m;
  while ((m = ph.exec(value)) != null) {
    if (!NUMERIC_PLACEHOLDERS.has(m[1])) continue;
    const beforeCh = value[m.index - 1];
    const afterCh = value[m.index + m[0].length];
    if (beforeCh && jaChar.test(beforeCh)) push(m.index);
    if (afterCh && jaChar.test(afterCh)) push(m.index + m[0].length - 1);
  }
}

function checkPeriod(key, value, violations) {
  if (ALLOWLIST.period.has(key)) return;
  const trimmed = value.replace(/\\n/g, '\n').trimEnd();
  if (PERIOD_REQUIRED_SUFFIX.test(key)) {
    // 文形 (です・ます等で終わる) なのに句点なし → 違反。体言止めキャプションは対象外。
    if (/(ます|です|ました|ません|ください|さい)$/.test(trimmed)) {
      violations.push({
        rule: 'period',
        key,
        detail: `文形の説明文は句点「。」で終わる: 「${trimmed.slice(-12)}」`,
      });
    }
  } else if (PERIOD_FORBIDDEN_SUFFIX.test(key)) {
    if (/。$/.test(trimmed)) {
      violations.push({
        rule: 'period',
        key,
        detail: `タイトル/ラベル系は句点なし: 「${trimmed.slice(-12)}」`,
      });
    }
  }
}

function checkJaSpace(key, value, violations) {
  if (ALLOWLIST.jaSpace.has(key)) return;
  // 和文文字 (句読点・かぎ括弧含む) 同士の間の半角スペースは不要 (折返しヒント残骸の検出)。
  // 英数字・記号 (→ / ( ) 等) との境界スペースは対象外 (checkSpacing の管轄)。
  const JA_WIDE = `${JA}。、「」『』・`;
  const re = new RegExp(`[${JA_WIDE}] +[${JA_WIDE}]`, 'g');
  let m;
  while ((m = re.exec(value)) != null) {
    violations.push({
      rule: 'jaSpace',
      key,
      detail: `和文間の不要な半角スペース: 「...${value.slice(Math.max(0, m.index - 6), m.index + 9)}...」`,
    });
  }
}

function checkNotation(key, value, violations) {
  if (ALLOWLIST.notation.has(key)) return;
  for (const [ng, ok] of Object.entries(NOTATION_DICT)) {
    if (value.includes(ng)) {
      violations.push({ rule: 'notation', key, detail: `表記揺れ「${ng}」→「${ok}」: ${value}` });
    }
  }
}

function checkFullwidth(key, value, violations) {
  if (ALLOWLIST.fullwidth.has(key)) return;
  const re = /[？！（）：；［］　０-９Ａ-Ｚａ-ｚ]/g;
  let m;
  while ((m = re.exec(value)) != null) {
    violations.push({
      rule: 'fullwidth',
      key,
      detail: `全角記号/英数字「${m[0]}」は半角にする: ${value}`,
    });
  }
}

function run() {
  if (!fs.existsSync(JA_FILE)) {
    console.error(`[i18n-style-ja] ja.ts not found: ${JA_FILE}`);
    process.exit(1);
  }
  const entries = extractEntries(fs.readFileSync(JA_FILE, 'utf8'));
  const violations = [];
  for (const { key, value } of entries) {
    checkSpacing(key, value, violations);
    checkPeriod(key, value, violations);
    checkNotation(key, value, violations);
    checkFullwidth(key, value, violations);
    checkJaSpace(key, value, violations);
  }

  const byRule = {};
  for (const v of violations) {
    byRule[v.rule] = (byRule[v.rule] ?? 0) + 1;
    const tag = STRICT ? 'ERROR' : 'WARN ';
    console.log(`${tag} [${v.rule}] ${v.key}: ${v.detail}`);
  }

  console.log('');
  console.log(
    `i18n style check (ja): ${entries.length} keys, ${violations.length} violations` +
      (violations.length > 0
        ? ` (${Object.entries(byRule)
            .map(([r, n]) => `${r}: ${n}`)
            .join(', ')})`
        : ''),
  );
  console.log('基準: docs/reference/copy-style-ja.md (ADR-0060)');

  if (STRICT && violations.length > 0) process.exit(1);
}

try {
  run();
} catch (error) {
  console.error(`[i18n-style-ja] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
