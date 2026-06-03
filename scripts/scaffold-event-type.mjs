#!/usr/bin/env node
/**
 * scaffold-event-type.mjs — 新 EventType を 6 箇所に一括追加する CLI scaffold。
 * Sess64 Issue #936 (提案 2)。
 *
 * Usage:
 *   pnpm scaffold:event-type <type-name> [<en-display>] [<ja-display>] [--dry-run]
 *
 * Example:
 *   pnpm scaffold:event-type pinching 'Pinching' '芽摘み'
 *   pnpm scaffold:event-type pinching --dry-run
 *
 * 6 箇所:
 *   1. src/db/schema.ts の EVENT_TYPES 配列
 *   2. src/features/event/WorkLogTypeFormFields.tsx buildWorkLogPayload switch
 *   3. src/features/event/buildHistoryChips.ts switch
 *   4. src/components/icons/EventIcons.tsx EventIcon switch
 *   5. src/features/event/WorkTypeIcon.tsx switch
 *   6. i18n 19 言語の eventType_<type> / workLogNotePlaceholder_<type> (i18n-add-key を内部呼び出し)
 *
 * 安全策:
 *   - 既存 type-name は idempotent (再実行しても重複追加しない)
 *   - 不正な snake_case は exit 1
 *   - 各 anchor が見つからなければ exit 1
 *   - --dry-run で実書き込みなし
 *
 * 完了後の TODO (人間が肉付け):
 *   - WorkLogTypeFormFields.tsx の case stub に form フィールド + payload 構築ロジックを追加
 *   - buildHistoryChips.ts の case stub に chip 構築ロジックを追加
 *   - EventIcons.tsx / WorkTypeIcon.tsx の case (CompassIcon を一時流用) を専用 icon に差し替え
 *   - i18n は英語フォールバックで 17 言語に入れたので native 翻訳要
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const typeName = positional[0];
const enDisplay = positional[1] || typeName;
const jaDisplay = positional[2] || enDisplay;

function fail(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`);
}

function ok(msg) {
  console.log(`\x1b[32m[OK]\x1b[0m ${msg}`);
}

function skip(msg) {
  console.log(`\x1b[33m[SKIP]\x1b[0m ${msg}`);
}

if (!typeName) {
  console.error(
    'Usage: pnpm scaffold:event-type <type-name> [<en-display>] [<ja-display>] [--dry-run]',
  );
  console.error("Example: pnpm scaffold:event-type pinching 'Pinching' '芽摘み'");
  process.exit(1);
}

if (!/^[a-z][a-z0-9_]*$/.test(typeName)) {
  fail(`Type name must be lowercase snake_case: got "${typeName}"`);
}

if (isDryRun) info('--dry-run mode: no files will be written');

// ============================================================
// Step 1: src/db/schema.ts の EVENT_TYPES に追加
// ============================================================
const SCHEMA_PATH = join(ROOT, 'src/db/schema.ts');
const schemaContent = readFileSync(SCHEMA_PATH, 'utf8');

if (schemaContent.includes(`'${typeName}'`)) {
  skip(`schema.ts: '${typeName}' は既に EVENT_TYPES に存在`);
} else {
  // EVENT_TYPES 配列の `] as const;` の直前に追加
  const anchor = /(  '[a-z_]+', \/\/[^\n]+\n)(\] as const;[\s\S]*?export type EventType)/;
  if (!anchor.test(schemaContent)) {
    fail(
      'schema.ts: EVENT_TYPES の anchor が見つかりません (期待: ".. // comment\\n] as const;\\nexport type EventType")',
    );
  }
  const newSchema = schemaContent.replace(
    anchor,
    `$1  '${typeName}', // TODO(#936): ${jaDisplay}\n$2`,
  );
  if (!isDryRun) writeFileSync(SCHEMA_PATH, newSchema, 'utf8');
  ok(`schema.ts: EVENT_TYPES に '${typeName}' を追加`);
}

// ============================================================
// Step 2: WorkLogTypeFormFields.tsx の buildWorkLogPayload switch に case stub
// ============================================================
const FORM_PATH = join(ROOT, 'src/features/event/WorkLogTypeFormFields.tsx');
const formContent = readFileSync(FORM_PATH, 'utf8');

if (formContent.includes(`case '${typeName}':`)) {
  skip(`WorkLogTypeFormFields.tsx: case '${typeName}' は既に存在`);
} else {
  // `default:\n      // exhaustive check (Sess64 Issue #934)` の直前に挿入
  const anchor = /(    default:\n      \/\/ exhaustive check \(Sess64 Issue #934\))/;
  if (!anchor.test(formContent)) {
    fail('WorkLogTypeFormFields.tsx: default 句の anchor が見つかりません');
  }
  const stub = `    case '${typeName}':
      // TODO(#936): payload 構築ロジックを追加 (state.* を参照)
      break;
`;
  const newForm = formContent.replace(anchor, `${stub}$1`);
  if (!isDryRun) writeFileSync(FORM_PATH, newForm, 'utf8');
  ok(`WorkLogTypeFormFields.tsx: case '${typeName}' stub を追加`);
}

// ============================================================
// Step 3: buildHistoryChips.ts の switch に case stub
// ============================================================
const CHIPS_PATH = join(ROOT, 'src/features/event/buildHistoryChips.ts');
const chipsContent = readFileSync(CHIPS_PATH, 'utf8');

if (chipsContent.includes(`case '${typeName}':`)) {
  skip(`buildHistoryChips.ts: case '${typeName}' は既に存在`);
} else {
  const anchor = /(    default:\n      \/\/ exhaustive check \(Sess64 Issue #934\))/;
  if (!anchor.test(chipsContent)) {
    fail('buildHistoryChips.ts: default 句の anchor が見つかりません');
  }
  const stub = `    case '${typeName}': {
      // TODO(#936): chip 構築ロジックを追加 (payload.* → pushChip(...))
      break;
    }
`;
  const newChips = chipsContent.replace(anchor, `${stub}$1`);
  if (!isDryRun) writeFileSync(CHIPS_PATH, newChips, 'utf8');
  ok(`buildHistoryChips.ts: case '${typeName}' stub を追加`);
}

// ============================================================
// Step 4: EventIcons.tsx の EventIcon switch に case (CompassIcon 流用)
// ============================================================
const EVENT_ICONS_PATH = join(ROOT, 'src/components/icons/EventIcons.tsx');
const eventIconsContent = readFileSync(EVENT_ICONS_PATH, 'utf8');

if (eventIconsContent.includes(`case '${typeName}':`)) {
  skip(`EventIcons.tsx: case '${typeName}' は既に存在`);
} else {
  // `default:\n      // exhaustive check` の直前
  const anchor = /(    default:\n      \/\/ exhaustive check \(Sess64 Issue #934\))/;
  if (!anchor.test(eventIconsContent)) {
    fail('EventIcons.tsx: default 句の anchor が見つかりません');
  }
  const stub = `    case '${typeName}':
      // TODO(#936): 専用 icon に差し替え (現状は CompassIcon を流用)
      return <CompassIcon size={size} />;
`;
  const newEventIcons = eventIconsContent.replace(anchor, `${stub}$1`);
  if (!isDryRun) writeFileSync(EVENT_ICONS_PATH, newEventIcons, 'utf8');
  ok(`EventIcons.tsx: case '${typeName}' stub を追加 (CompassIcon 流用)`);
}

// ============================================================
// Step 5: WorkTypeIcon.tsx の switch に case (CompassIcon 風)
// ============================================================
const WORK_TYPE_ICON_PATH = join(ROOT, 'src/features/event/WorkTypeIcon.tsx');
const workTypeIconContent = readFileSync(WORK_TYPE_ICON_PATH, 'utf8');

if (workTypeIconContent.includes(`case '${typeName}':`)) {
  skip(`WorkTypeIcon.tsx: case '${typeName}' は既に存在`);
} else {
  const anchor = /(    default:\n      \/\/ exhaustive check \(Sess64 Issue #934\))/;
  if (!anchor.test(workTypeIconContent)) {
    fail('WorkTypeIcon.tsx: default 句の anchor が見つかりません');
  }
  // 単純な「丸 + クエスチョン」 風の placeholder SVG
  const stub = `    case '${typeName}':
      // TODO(#936): 専用 outline SVG に差し替え (現状は placeholder circle)
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Circle cx="14" cy="14" r="10" stroke={color} strokeWidth={sw} fill="none" />
        </Svg>
      );

`;
  const newWorkTypeIcon = workTypeIconContent.replace(anchor, `${stub}$1`);
  if (!isDryRun) writeFileSync(WORK_TYPE_ICON_PATH, newWorkTypeIcon, 'utf8');
  ok(`WorkTypeIcon.tsx: case '${typeName}' stub を追加 (placeholder circle)`);
}

// ============================================================
// Step 6: i18n 19 言語に eventType_<type> / workLogNotePlaceholder_<type> を追加
//         (既存 scripts/i18n-add-key.mjs を内部呼び出し)
// ============================================================
const i18nKeys = [
  { key: `eventType_${typeName}`, en: enDisplay, ja: jaDisplay },
  {
    key: `workLogNotePlaceholder_${typeName}`,
    en: `e.g. notes for ${enDisplay}`,
    ja: 'メモを入力',
  },
];

for (const { key, en, ja } of i18nKeys) {
  if (isDryRun) {
    info(`(dry-run) i18n: pnpm i18n:add-key ${key} '${en}' --ja '${ja}'`);
    continue;
  }
  try {
    const cmd = `pnpm i18n:add-key ${key} ${JSON.stringify(en)} --ja ${JSON.stringify(ja)}`;
    execSync(cmd, { cwd: ROOT, stdio: 'pipe' });
    ok(`i18n: ${key} を 19 言語に追加 (英語フォールバック)`);
  } catch (e) {
    fail(`i18n-add-key 実行失敗: ${key}\n${e.stderr?.toString() || e.message}`);
  }
}

// ============================================================
// 完了サマリ
// ============================================================
console.log('');
ok(`scaffold-event-type 完了: '${typeName}' (en="${enDisplay}", ja="${jaDisplay}")`);
console.log('');
info('次に人間が手動で実施する TODO:');
console.log(
  `  1. WorkLogTypeFormFields.tsx の case '${typeName}' に form フィールド + payload 構築ロジックを追加`,
);
console.log(`  2. buildHistoryChips.ts の case '${typeName}' に chip 構築ロジックを追加`);
console.log(`  3. EventIcons.tsx / WorkTypeIcon.tsx の case '${typeName}' を専用 icon に差し替え`);
console.log(`  4. i18n 17 言語 (en/ja 以外) は英語フォールバックなので native 翻訳要 (ADR-0033)`);
console.log(`  5. pnpm verify で網羅 CI ガード + テストが緑かを確認`);
console.log('');
info(`完了したら以下で動作確認:`);
console.log(`  pnpm verify:event-type-consistency`);
console.log(`  pnpm test --testPathPattern="(buildHistoryChips|EventIcons)"`);

process.exit(0);
