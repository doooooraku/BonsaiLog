#!/usr/bin/env node
/**
 * check-navigation-patterns.mjs — Navigation anti-pattern 自動検出 (ADR-0030 D3)。
 *
 * docs/reference/design_system.md §17 整合: navigation pattern の使い分け基準を
 * 自動検出して warning 出力 (Sess18 では block しない、 段階導入)。
 *
 * 検出 anti-pattern:
 *
 * AP-1 (store-callback chain で次画面遷移):
 *   同一 file 内に router.back() + setX(...) + useFocusEffect の 3 セットが揃う場合、
 *   「Case C (次画面遷移を伴う store-callback)」 の疑いあり → ADR-0030 §17-2 P2 違反
 *   推奨: log mode のような「次画面に進む」 用途は直接 router.push に置換
 *
 * AP-2 (router.replace の用途違反):
 *   router.replace は「modal 系 stack を tab に switch する時のみ」 (ADR-0030 §17-2 P3)
 *   同 stack 内 screen 置換用途で使用していたら警告
 *
 * 対象 file:
 * - src/features/ ** /*.tsx (画面 component)
 * - app/(tabs)/ ** /*.tsx (caller component)
 * - app/(modals)/ ** /*.tsx (modal caller)
 *
 * 除外:
 * - __tests__/ 配下
 * - Sess18 で正当用途として保持されている schedule mode (Case A、 DatePicker dialog 呼出)
 *
 * Exit code:
 * - 0 (常に成功、 warning のみ)
 *
 * 関連: docs/reference/design_system.md §17 Navigation patterns
 *       ADR-0030 D3
 *       docs/reference/tasks/lessons/navigation.md (Sess12 PR-F/G 確立)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function listTargetFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    return out
      .split('\n')
      .filter((p) => p.length > 0)
      .filter((p) => {
        // 画面 / caller component (tsx)
        if (p.startsWith('src/features/') && p.endsWith('.tsx')) return true;
        if (p.startsWith('app/') && p.endsWith('.tsx')) return true;
        return false;
      })
      .filter((p) => !p.includes('__tests__'));
  } catch (e) {
    console.error('git ls-files 失敗:', e.message);
    process.exit(1);
  }
}

// AP-1 detection: same file has router.back() + setX(...) + useFocusEffect の 3 セット
function detectAP1(content) {
  const hasRouterBack = /router\.back\(\)/.test(content);
  const hasSetterCall = /\.set\w+\(/.test(content); // setWorkPickerResult / setX style
  const hasUseFocusEffect = /useFocusEffect/.test(content);
  return hasRouterBack && hasSetterCall && hasUseFocusEffect;
}

// AP-2 detection: router.replace 使用箇所 (用途違反の疑い)
function detectAP2Lines(content) {
  const lines = content.split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (/router\.replace\b/.test(line)) {
      hits.push({ line: idx + 1, snippet: line.trim().slice(0, 100) });
    }
  });
  return hits;
}

function main() {
  const files = listTargetFiles();
  if (files.length === 0) {
    console.log('対象 file 0');
    process.exit(0);
  }
  const ap1Hits = [];
  const ap2Hits = [];
  files.forEach((p) => {
    let content;
    try {
      content = readFileSync(join(ROOT, p), 'utf8');
    } catch {
      return;
    }
    if (detectAP1(content)) {
      ap1Hits.push(p);
    }
    const ap2Lines = detectAP2Lines(content);
    if (ap2Lines.length > 0) {
      ap2Hits.push({ file: p, lines: ap2Lines });
    }
  });

  console.log('');
  if (ap1Hits.length === 0 && ap2Hits.length === 0) {
    console.log('✅ Navigation anti-pattern 検出ゼロ (ADR-0030 §17 整合)');
    process.exit(0);
  }

  console.log('⚠️  Navigation anti-pattern 検出 (ADR-0030 §17 / design_system.md §17):');
  console.log('');

  if (ap1Hits.length > 0) {
    console.log('[AP-1] router.back() + setX(...) + useFocusEffect の 3 セット存在 (Case C 疑い):');
    ap1Hits.forEach((p) => {
      console.log(`  ${p}`);
    });
    console.log(
      '  → 該当箇所が「次画面遷移を伴う store-callback」 であれば、 直接 router.push に置換推奨。',
    );
    console.log(
      '  → 該当箇所が「dialog 呼出 (Case A)」 や「caller state 更新のみ (Case B)」 なら許容。',
    );
    console.log('');
  }

  if (ap2Hits.length > 0) {
    console.log('[AP-2] router.replace 使用箇所 (用途違反確認):');
    ap2Hits.forEach(({ file, lines }) => {
      lines.forEach(({ line, snippet }) => {
        console.log(`  ${file}:${line}: ${snippet}`);
      });
    });
    console.log(
      '  → ADR-0030 §17-2 P3 により、 router.replace は「modal stack → tab switch」 用途のみ許容。',
    );
    console.log('');
  }

  console.log(
    `合計: AP-1 ${ap1Hits.length} files、 AP-2 ${ap2Hits.length} files、 ${files.length} files scanned`,
  );

  // Sess18 では warning のみ、 exit 0
  process.exit(0);
}

main();
