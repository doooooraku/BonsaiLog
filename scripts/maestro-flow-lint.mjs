#!/usr/bin/env node
// scripts/maestro-flow-lint.mjs
// maestro/flows/**/*.yml を走査し、Maestro 1.x 旧構文を error 検出する。
//
// 解決する問題 (本セッション学び A3):
// - Maestro 2.0 で `steps:` キー廃止 (--- 区切り必須)
// - `assertVisible:` 配下の `timeout:` 廃止 (extendedWaitUntil を使う)
// - `waitForAnimationToEnd:` 配下のプロパティ廃止 (単独命令で使う)
//
// 本 lint は yaml parser を使わず regex で簡易検出 (依存追加を避けるため)。
// 偽陽性が出たら eslint-disable 的な「# maestro-lint-skip」コメントで局所抑制可能。
//
// Usage:
//   node scripts/maestro-flow-lint.mjs
//   pnpm verify:maestro

import * as fs from 'node:fs';
import * as path from 'node:path';

// 本 lint は新規 ADR-0021 パイプライン配下 (maestro/flows/ui-diff/) のみを対象とする。
// 既存 maestro/flows/*.yml は Maestro 1.x 時代に書かれており、新しい --- 区切り構文への
// 移行が必要だが、本 PR スコープ外。別 Issue で順次 2.0 化予定。
// 参考: docs/reference/tasks/lessons/wsl2-mobile.md §2 (Maestro 2.0 構文)
const FLOWS_DIR = path.resolve('maestro/flows/ui-diff');
const LEGACY_FLOWS_DIR = path.resolve('maestro/flows');
const errors = [];
const warnings = []; // Retro-C: WARN レベル (新規 flow から段階適用、既存は許容)

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    if (p.endsWith('.yml') || p.endsWith('.yaml')) return [p];
    return [];
  });
}

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const skipMarker = (line) => line.includes('# maestro-lint-skip');

  // (1) `steps:` キー検出 (Maestro 1.x の遺物、--- 区切りに移行)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipMarker(line)) continue;
    if (/^steps:\s*(?:#.*)?$/.test(line)) {
      errors.push(
        `${filePath}:${i + 1}: \`steps:\` キーは Maestro 2.0 で廃止 (--- 区切り必須)。` +
          `\n    → 修正: appId/name/tags の後に \`---\` を入れ、コマンドを top-level の YAML stream として書く`,
      );
    }
  }

  // (2) assertVisible 配下の timeout: 検出
  for (let i = 0; i < lines.length; i++) {
    if (skipMarker(lines[i])) continue;
    if (/^[\s-]*assertVisible:\s*$/.test(lines[i])) {
      // 続く 10 行以内で indent された timeout: を探す
      const baseIndent = lines[i].match(/^(\s*)/)[1].length;
      for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
        if (skipMarker(lines[j])) continue;
        const lineIndent = (lines[j].match(/^(\s*)/) || [''])[1].length;
        if (lineIndent <= baseIndent && lines[j].trim() !== '') break; // 兄弟以降
        if (/^\s+timeout:\s/.test(lines[j])) {
          errors.push(
            `${filePath}:${j + 1}: \`assertVisible\` 配下の \`timeout:\` は Maestro 2.0 で廃止。` +
              `\n    → 修正: \`extendedWaitUntil: { visible: { ... }, timeout: ... }\` に置き換える`,
          );
        }
      }
    }
  }

  // (3) waitForAnimationToEnd: 配下のプロパティ検出
  for (let i = 0; i < lines.length; i++) {
    if (skipMarker(lines[i])) continue;
    if (/^[\s-]*waitForAnimationToEnd:\s*$/.test(lines[i])) {
      const baseIndent = lines[i].match(/^(\s*)/)[1].length;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (skipMarker(lines[j])) continue;
        const lineIndent = (lines[j].match(/^(\s*)/) || [''])[1].length;
        if (lineIndent <= baseIndent && lines[j].trim() !== '') break;
        if (/^\s+\w+:/.test(lines[j])) {
          errors.push(
            `${filePath}:${j + 1}: \`waitForAnimationToEnd\` 配下のプロパティは Maestro 2.0 で廃止。` +
              `\n    → 修正: \`- waitForAnimationToEnd\` の単独命令で使う (引数なし)`,
          );
        }
      }
    }
  }

  // Retro-C (WARN): ui-diff/ 配下の flow は Continue dialog dismiss step 必須
  // PR #391 で主要 4 flow に追加、Phase 1.5-T4/T5 で残 flow も追加完了。
  // 新規 flow が同じパターンを忘れないよう WARN で気づかせる。
  if (filePath.includes('/ui-diff/')) {
    const hasContinueDismiss =
      content.includes("visible: 'Continue'") ||
      content.includes('visible: "Continue"') ||
      content.includes('visible: Continue');
    if (!hasContinueDismiss) {
      warnings.push(
        `${filePath}: Continue dialog dismiss step が見つかりません。` +
          `\n    → 推奨: openLink の直後に \`runFlow when visible 'Continue'\` で dismiss step を追加` +
          `\n    (Expo Dev Client 起動時の dialog が capture-app.sh の force-stop で毎回復活する罠、PR #391 パターン)`,
      );
    }
  }

  // Retro-C (WARN): 座標タップ (point: N%,M%) は testID / text へ置き換え推奨
  // 理由: 画面サイズ変更や DOM 構造変更で壊れやすい (本セッションで bonsai-detail が
  // 「お師匠の真柏」 tap してしまい誤判定したパターン、PR #409 で text マッチに修正)。
  for (let i = 0; i < lines.length; i++) {
    if (skipMarker(lines[i])) continue;
    const m = lines[i].match(/^\s+point:\s*(\d+%,\d+%)/);
    if (m) {
      warnings.push(
        `${filePath}:${i + 1}: 座標タップ \`point: ${m[1]}\` は脆弱、testID / text へ置き換え推奨。` +
          `\n    → 推奨: \`tapOn: text: '...' \` or \`tapOn: id: 'e2e_...'\` を使う` +
          `\n    (PR #409 bonsai-detail の誤判定再発防止、Retro-C)`,
      );
    }
  }

  // S1 (2026-05-13、ADR-0024 Phase G retro): 4 つの教訓を WARN/ERROR 検出
  for (let i = 0; i < lines.length; i++) {
    if (skipMarker(lines[i])) continue;

    // (S1-a) ERROR: `wait: <number>` 固定 wait は禁止 (waitForAnimationToEnd を使う)
    if (/^\s+-?\s*wait:\s*\d+/.test(lines[i])) {
      errors.push(
        `${filePath}:${i + 1}: 固定 \`wait: <number>\` は禁止。` +
          `\n    → 修正: \`- waitForAnimationToEnd\` (引数なし) or \`extendedWaitUntil\` を使う` +
          `\n    (Phase G retro、maestro-standard-pattern.md §7)`,
      );
    }

    // (S1-b) WARN: `pressKey: 'Back'` modal/Screen 内検証では keyboard 未起動時 modal close リスク
    if (/^\s+-?\s*pressKey:\s*['"]?Back['"]?/.test(lines[i])) {
      warnings.push(
        `${filePath}:${i + 1}: \`pressKey: 'Back'\` は modal 内検証で modal close リスクあり。` +
          `\n    → 推奨: \`scrollUntilVisible\` で間接 dismiss、または Onboarding skip 用途なら問題なし` +
          `\n    (Phase G part 2 PR #493 で 5 回試行ロス、maestro-standard-pattern.md §7.1)`,
      );
    }

    // (S1-c) WARN: `tapOn: text:` (testID なし) は modal/sheet 内 hidden リスク
    // 直前/同行に `id:` がなく `text:` 単独の tapOn パターン
    if (/^\s+-?\s*tapOn:\s*$/.test(lines[i])) {
      // 次の 5 行で id 不在 + text: 存在を確認
      let hasId = false;
      let hasText = false;
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const baseIndent = lines[i].match(/^(\s*)/)[1].length;
        const jIndent = (lines[j].match(/^(\s*)/) || [''])[1].length;
        if (jIndent <= baseIndent && lines[j].trim() !== '') break;
        if (/^\s+id:/.test(lines[j])) hasId = true;
        if (/^\s+text:/.test(lines[j])) hasText = true;
      }
      if (hasText && !hasId) {
        warnings.push(
          `${filePath}:${i + 1}: \`tapOn: text:\` は modal/sheet 内で hidden になる場合あり、testID 推奨。` +
            `\n    → 推奨: \`tapOn: { id: 'e2e_<screen>_<element>', retryTapIfNoChange: true }\`` +
            `\n    (Phase G retro、maestro-standard-pattern.md §5)`,
        );
      }
    }
  }
}

const files = walk(FLOWS_DIR);
console.log(`[maestro-flow-lint] checking ${files.length} flow file(s) in ${FLOWS_DIR}/`);
files.forEach(lintFile);

if (errors.length > 0) {
  console.error(`\n❌ maestro-flow-lint failed: ${errors.length} error(s)\n`);
  errors.forEach((e) => console.error(`  ${e}\n`));
  console.error('参考: docs/reference/tasks/lessons/wsl2-mobile.md §2 (Maestro 2.0 構文)');
  process.exit(1);
}

console.log(`✅ maestro-flow-lint passed (${files.length} flow file(s) OK)`);

// Retro-C: WARN は exit 1 にせず、情報表示のみ (新規 flow の品質保証 + 既存 flow の段階移行)
if (warnings.length > 0) {
  console.log(`\nℹ️  ${warnings.length} 件の WARN (新規 flow 推奨パターン):`);
  warnings.forEach((w) => console.log(`  ${w}\n`));
  console.log('参考: PR #391 (Continue dismiss) / PR #409 (text マッチ tapOn)');
}

// 参考情報: 既存 maestro/flows/*.yml (本 lint 対象外) の 1.x 構文残存件数を info 表示
if (LEGACY_FLOWS_DIR !== FLOWS_DIR) {
  const legacyAll = fs
    .readdirSync(LEGACY_FLOWS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && (d.name.endsWith('.yml') || d.name.endsWith('.yaml')))
    .map((d) => path.join(LEGACY_FLOWS_DIR, d.name));
  if (legacyAll.length > 0) {
    const savedErrors = errors.slice();
    errors.length = 0;
    legacyAll.forEach(lintFile);
    const legacyCount = errors.length;
    errors.length = 0;
    errors.push(...savedErrors);
    if (legacyCount > 0) {
      console.log(
        `\nℹ️  Legacy flows (maestro/flows/*.yml): ${legacyCount} 件の 1.x 構文残存 (本 PR スコープ外、別 Issue で対応)。`,
      );
    }
  }
}
