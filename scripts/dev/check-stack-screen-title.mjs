#!/usr/bin/env node
/**
 * check-stack-screen-title.mjs — Stack screen title 配線漏れ検出 (R-74)。
 *
 * 検出: `app/<screen>.tsx` で `useTranslation` を使う Stack screen が、
 * (1) `<Stack.Screen options={{title: t('...')}} />` (= 初回 mount 用 declarative)
 * (2) `useEffect(() => navigation.setOptions({title: t('...')}), [navigation, t, lang])`
 *     (= 言語切替時の動的更新)
 * の **両方** を実装しているかを grep で確認。 片方欠落で warning 出力。
 *
 * 片方だけだと:
 * - `<Stack.Screen options>` だけ → 言語切替で title 古い言語のまま残存 (Sess74 PR-3 E2 bug)
 * - `setOptions` だけ → 初回 mount に title 出ない、 一瞬 raw route 名がちらつく
 *
 * 正典 reference: app/settings/index.tsx Sess74 PR-3 (= ADR-0053 E2 Amendment、
 * 2 段 pattern を確立)。 Sess90 PR-A で 3 screen (= /custom-species /custom-styles /tags)
 * に同 pattern を適用、 R-74 起票。
 *
 * Sess90 PR-C では warning のみ (exit code 0 で CI block しない)、 false positive を
 * 観察してから error 昇格を検討する段階導入。
 *
 * 対象 file:
 * - app 配下の .tsx で:
 *   - useTranslation を import している
 *   - かつ Stack header を出す screen (= headerShown:false 設定がない / tab tab メイン以外)
 *
 * 除外:
 * - _layout.tsx (= screen ではなく Stack layout)
 * - (modals)/_layout.tsx で集約定義している modal child screen
 * - app/(tabs)/<tab>/index.tsx (= 自前 SearchHeader、 Stack header なし)
 * - 既知 ALLOWLIST (= 例外で意図的に片方だけ採用している場合)
 *
 * 検出ロジック:
 * 1. file 全体に `useTranslation` を含むか
 * 2. file 全体に `<Stack.Screen` か `Stack.Screen options` で title 設定があるか (= flag A)
 * 3. file 全体に `navigation.setOptions` で title 動的更新があるか (= flag B)
 * 4. A && !B → setOptions 漏れ warn
 * 5. !A && B → declarative 漏れ warn (= 初回 ちらつき)
 *
 * 出力例:
 *   app/tags.tsx: Stack.Screen options + setOptions のうち setOptions 配線漏れ (R-74)
 *
 * Exit code:
 * - 0 (常に成功、 warning のみ)
 *
 * 関連:
 * - ADR-0053 Sess74 PR-3 Amendment (= 2 段 pattern 確立)
 * - ADR-0053 Sess90 PR-A Amendment (= 3 screen 配線 + R-74 起票)
 * - R-74 (= Stack.Screen options + setOptions 両方必須)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// ALLOWLIST: 意図的に片方しか採用しない screen
// - app/tag-edit.tsx: title='' (= 自前 Pressable cancel button、 setOptions 不要)
// - app/photo-viewer 等: title 動的設定なし
const ALLOWLIST = new Set([
  'app/tag-edit.tsx', // ADR-0053 本文 §1 で title='' 採用
]);

/** 対象 file 列挙: app 配下の .tsx の screen file (= _layout.tsx 除外)。 */
function listTargetFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    return out
      .split('\n')
      .filter((p) => p.length > 0)
      .filter((p) => {
        if (ALLOWLIST.has(p)) return false;
        if (p.includes('__tests__')) return false;
        if (!p.endsWith('.tsx')) return false;
        if (!p.startsWith('app/')) return false;
        // _layout.tsx は対象外 (= Stack 全体の設定、 screen ではない)
        if (p.endsWith('_layout.tsx')) return false;
        return true;
      });
  } catch (e) {
    console.error('git ls-files 失敗:', e.message);
    process.exit(1);
  }
}

/**
 * file を解析、 2 段 pattern の片方欠落を判定。
 * 返り値: { kind: 'ok'|'missing-setoptions'|'missing-declarative'|'skip' }
 */
function checkFile(filePath) {
  let content;
  try {
    content = readFileSync(join(ROOT, filePath), 'utf8');
  } catch {
    return { kind: 'skip', reason: 'read fail' };
  }

  // i18n を使わない screen は対象外 (= title が静的)
  if (!/useTranslation/.test(content)) {
    return { kind: 'skip', reason: 'no i18n' };
  }

  // headerShown:false のみの screen は対象外 (= タブメイン or 自前 header)
  // 全体で Stack header を一度も使わない場合
  const hasStackUsage = /<Stack\.Screen|Stack\.Screen options|navigation\.setOptions/.test(content);
  if (!hasStackUsage) {
    return { kind: 'skip', reason: 'no Stack usage' };
  }

  // すべての Stack.Screen が headerShown:false なら対象外
  // (単純 grep: 「Stack.Screen の登場回数」 ≤ 「headerShown: false の回数」 なら全部 hidden)
  const stackScreenCount = (content.match(/<Stack\.Screen/g) || []).length;
  const headerShownFalseCount = (content.match(/headerShown:\s*false/g) || []).length;
  // headerShown:false しか出ない + title 関連 完全になしなら skip
  if (
    stackScreenCount > 0 &&
    stackScreenCount === headerShownFalseCount &&
    !/title:\s*t\(/.test(content) &&
    !/navigation\.setOptions/.test(content)
  ) {
    return { kind: 'skip', reason: 'all headerShown:false' };
  }

  // 2 段 pattern 判定
  // Pattern A: <Stack.Screen options={{title: t('...')}} />
  const hasDeclarativeTitle = /Stack\.Screen[\s\S]{0,300}options=\{[\s\S]{0,200}title:\s*t\(/.test(
    content,
  );
  // Pattern B: navigation.setOptions({title: t('...')})
  const hasImperativeTitle = /navigation\.setOptions\(\s*\{[\s\S]{0,200}title:\s*t\(/.test(content);

  // 両方 ✅ OK / 両方 なし → skip (= title 配線なし screen) / 片方のみ → warn
  if (hasDeclarativeTitle && hasImperativeTitle) {
    return { kind: 'ok' };
  }
  if (!hasDeclarativeTitle && !hasImperativeTitle) {
    return { kind: 'skip', reason: 'no title wiring' };
  }
  if (hasDeclarativeTitle && !hasImperativeTitle) {
    return {
      kind: 'missing-setoptions',
      hint: '言語切替時 transient bug 対策の useEffect setOptions が漏れ。 settings/index.tsx Sess74 PR-3 pattern 流用推奨。',
    };
  }
  return {
    kind: 'missing-declarative',
    hint: '初回 mount 時 ちらつき (raw route 名表示) 対策の <Stack.Screen options> が漏れ。',
  };
}

function main() {
  const files = listTargetFiles();
  if (files.length === 0) {
    console.log('対象 file 0 (app 配下の .tsx screen)');
    process.exit(0);
  }
  const warns = [];
  let okCount = 0;
  let skipCount = 0;
  files.forEach((p) => {
    const r = checkFile(p);
    if (r.kind === 'ok') okCount++;
    else if (r.kind === 'skip') skipCount++;
    else warns.push({ file: p, ...r });
  });

  if (warns.length === 0) {
    console.log(
      `✅ Stack.Screen title 2 段 pattern OK (R-74、 ok=${okCount} / skip=${skipCount} / 走査=${files.length})`,
    );
    process.exit(0);
  }

  console.log(
    '⚠️  Stack.Screen title 2 段 pattern 配線漏れ (R-74 / ADR-0053 Sess90 PR-A Amendment):',
  );
  console.log('');
  console.log('Stack screen で title 表示する場合は以下 両方 必須:');
  console.log('  (1) <Stack.Screen options={{title: t("...")}}/> (= 初回 mount 用 declarative)');
  console.log(
    '  (2) useEffect(() => navigation.setOptions({title: t("...")}), [navigation, t, lang])',
  );
  console.log('      (= 言語切替時 transient bug 対策、 Sess74 PR-3 同型)');
  console.log('');
  warns.forEach((w) => {
    console.log(`  ${w.file}: ${w.kind}`);
    console.log(`    → ${w.hint}`);
  });
  console.log('');
  console.log(`合計 ${warns.length} 件 (ok=${okCount} / skip=${skipCount} / 走査=${files.length})`);
  process.exit(0);
}

main();
