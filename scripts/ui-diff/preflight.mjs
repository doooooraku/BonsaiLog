#!/usr/bin/env node
// scripts/ui-diff/preflight.mjs
// run.ts / capture-app.sh の実行前に環境を一括チェックして fail-fast。
// PoC で踏んだ罠 (Node / adb CRLF / Expo Go / Metro / Playwright / ImageMagick /
// ClaudeDesign 正本) を構造的に検出する。
//
// ADR-0021 §Initial・変更前提 + R-19「気をつけますではなく仕組みで」の実装。

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';

// --- ANSI colors ---
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};
const ICON = { ok: '✓', warn: '⚠', err: '✗' };

// --- env / paths ---
const ADB = process.env.ADB_BIN || '/usr/local/bin/adb';
const DESIGN_ROOT =
  process.env.UI_DIFF_DESIGN_ROOT || '/mnt/c/Users/doooo/Downloads/BonsaiLog_template';
const METRO_HOST = 'localhost';
const METRO_PORT = 8081;

// --- result accumulator ---
const results = []; // { id, name, status: 'ok'|'warn'|'err', message?, hint? }
let hasError = false;

const record = (r) => {
  results.push(r);
  if (r.status === 'err') hasError = true;
};

const tryExec = (cmd, args = []) => {
  try {
    const out = execSync(`${cmd} ${args.join(' ')}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return {
      ok: false,
      out: (e.stdout?.toString() || '').trim(),
      err: (e.stderr?.toString() || e.message || '').trim(),
    };
  }
};

// --- 1. Node v22+ ---
function checkNode() {
  const v = process.versions.node;
  const major = parseInt(v.split('.')[0], 10);
  if (major >= 22) {
    record({ id: 'node', name: 'Node.js v22+', status: 'ok', message: `v${v}` });
  } else {
    record({
      id: 'node',
      name: 'Node.js v22+',
      status: 'err',
      message: `v${v} (< v22)`,
      hint: 'PATH=/home/doooo/.local/bin:$PATH を prepend (MEMORY.md / pnpm-verify-config-node22.md)',
    });
  }
}

// --- 2. adb authorized device (CRLF 安全) ---
function checkAdb() {
  if (!fs.existsSync(ADB)) {
    record({
      id: 'adb',
      name: 'ADB binary',
      status: 'err',
      message: `${ADB} not found`,
      hint: 'WSL2 では Windows ADB のラッパーを /usr/local/bin/adb に配置 (rules/wsl2-environment.md)',
    });
    return;
  }
  const r = tryExec(ADB, ['devices']);
  if (!r.ok) {
    record({
      id: 'adb',
      name: 'ADB authorized device',
      status: 'err',
      message: r.err || 'adb devices failed',
      hint: 'adb サーバ起動を確認',
    });
    return;
  }
  // CRLF 対策: adb ラッパーは Windows 改行を返すので \r を削ってから判定
  const lines = r.out.replace(/\r/g, '').split('\n').slice(1);
  const authorized = lines.filter((l) => /\tdevice$/.test(l));
  const unauthorized = lines.filter((l) => /\tunauthorized$/.test(l));
  if (authorized.length > 0) {
    record({
      id: 'adb',
      name: 'ADB authorized device',
      status: 'ok',
      message: `${authorized.length} device(s) authorized`,
    });
  } else if (unauthorized.length > 0) {
    record({
      id: 'adb',
      name: 'ADB authorized device',
      status: 'err',
      message: `${unauthorized.length} unauthorized device(s)`,
      hint: '実機画面の「USB デバッグを許可しますか?」を承認',
    });
  } else {
    record({
      id: 'adb',
      name: 'ADB authorized device',
      status: 'err',
      message: 'no devices connected',
      hint: '実機を USB 接続 (adb devices で確認)',
    });
  }
}

// --- 3. Expo Go 衝突チェック (warn) ---
function checkExpoGo() {
  if (!fs.existsSync(ADB)) {
    record({
      id: 'expo-go',
      name: 'Expo Go absence',
      status: 'warn',
      message: 'skipped (no adb)',
    });
    return;
  }
  const r = tryExec(ADB, ['shell', 'pm', 'list', 'packages', 'host.exp.exponent']);
  if (r.ok && r.out.replace(/\r/g, '').includes('host.exp.exponent')) {
    record({
      id: 'expo-go',
      name: 'Expo Go absence',
      status: 'warn',
      message: 'Expo Go installed (will hijack exp:// deep link)',
      hint: 'maestro flow では bonsailog://expo-development-client/?url=... を使う (exp:// は使わない)',
    });
  } else {
    record({
      id: 'expo-go',
      name: 'Expo Go absence',
      status: 'ok',
      message: 'not installed (no conflict)',
    });
  }
}

// --- 4. Metro server reachable on :8081 ---
function checkMetro() {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (status, message, hint) => {
      if (done) return;
      done = true;
      sock.destroy();
      record({
        id: 'metro',
        name: `Metro server (${METRO_HOST}:${METRO_PORT})`,
        status,
        message,
        hint,
      });
      resolve();
    };
    sock.setTimeout(2000);
    sock.on('connect', () => finish('ok', 'reachable'));
    sock.on('error', () =>
      finish(
        'err',
        'not reachable',
        '別ターミナルで `pnpm dev` 起動 + `adb reverse tcp:8081 tcp:8081`',
      ),
    );
    sock.on('timeout', () =>
      finish('err', 'timeout', '別ターミナルで `pnpm dev` 起動 + `adb reverse tcp:8081 tcp:8081`'),
    );
    sock.connect(METRO_PORT, METRO_HOST);
  });
}

// --- 5. Playwright + chromium ---
function checkPlaywright() {
  const r = tryExec('pnpm', ['exec', 'playwright', '--version']);
  if (!r.ok) {
    record({
      id: 'playwright',
      name: 'Playwright',
      status: 'err',
      message: r.err || 'not installed',
      hint: 'pnpm add -D playwright sharp tsx',
    });
    return;
  }
  const home = process.env.HOME || '/home/doooo';
  const cacheDir = path.join(home, '.cache/ms-playwright');
  if (!fs.existsSync(cacheDir)) {
    record({
      id: 'playwright-chromium',
      name: 'Chromium binary',
      status: 'err',
      message: 'cache dir not found',
      hint: 'pnpm exec playwright install chromium',
    });
    return;
  }
  const entries = fs.readdirSync(cacheDir);
  const hasChromium = entries.some((e) => e.startsWith('chromium-'));
  if (!hasChromium) {
    record({
      id: 'playwright-chromium',
      name: 'Chromium binary',
      status: 'err',
      message: 'no chromium-* in cache',
      hint: 'pnpm exec playwright install chromium',
    });
  } else {
    record({ id: 'playwright', name: 'Playwright + chromium', status: 'ok', message: r.out });
  }
}

// --- 6. ImageMagick compare ---
function checkImageMagick() {
  const r = tryExec('compare', ['--version']);
  if (!r.ok) {
    record({
      id: 'imagemagick',
      name: 'ImageMagick compare',
      status: 'err',
      message: 'compare not found',
      hint: 'sudo apt install imagemagick',
    });
  } else {
    const ver = r.out.split('\n')[0] || '(unknown)';
    record({ id: 'imagemagick', name: 'ImageMagick compare', status: 'ok', message: ver });
  }
}

// --- 7. ClaudeDesign root ---
function checkDesignRoot() {
  if (!fs.existsSync(DESIGN_ROOT)) {
    record({
      id: 'design-root',
      name: 'ClaudeDesign root',
      status: 'err',
      message: `${DESIGN_ROOT} not found`,
      hint: 'Windows 側 C:\\Users\\doooo\\Downloads\\BonsaiLog_template\\ にエクスポート',
    });
    return;
  }
  const required = ['Home and Management Wireframes.html', 'tokens.css'];
  const missing = required.filter((f) => !fs.existsSync(path.join(DESIGN_ROOT, f)));
  if (missing.length > 0) {
    record({
      id: 'design-root',
      name: 'ClaudeDesign files',
      status: 'err',
      message: `missing: ${missing.join(', ')}`,
      hint: 'ClaudeDesign 再エクスポートが必要',
    });
  } else {
    record({ id: 'design-root', name: 'ClaudeDesign root', status: 'ok', message: DESIGN_ROOT });
  }
}

// --- main ---
async function main() {
  checkNode();
  checkAdb();
  checkExpoGo();
  await checkMetro();
  checkPlaywright();
  checkImageMagick();
  checkDesignRoot();

  console.log(`\n${C.bold}=== UI diff preflight ===${C.reset}`);
  for (const r of results) {
    const color = r.status === 'ok' ? C.green : r.status === 'warn' ? C.yellow : C.red;
    const icon = ICON[r.status];
    console.log(`  ${color}${icon}${C.reset} ${r.name}: ${r.message ?? ''}`);
    if (r.status !== 'ok' && r.hint) {
      console.log(`    ${C.dim}→ ${r.hint}${C.reset}`);
    }
  }
  console.log('');

  if (hasError) {
    console.log(
      `${C.red}${C.bold}preflight FAILED${C.reset} — 上記 hint に従って対処してから再実行してください。\n`,
    );
    process.exit(1);
  } else {
    const warnCount = results.filter((r) => r.status === 'warn').length;
    if (warnCount > 0) {
      console.log(
        `${C.yellow}${C.bold}preflight OK${C.reset} (with ${warnCount} warning${warnCount > 1 ? 's' : ''}) — UI diff パイプラインを起動できます。\n`,
      );
    } else {
      console.log(
        `${C.green}${C.bold}preflight OK${C.reset} — UI diff パイプラインを起動できます。\n`,
      );
    }
  }
}

main().catch((err) => {
  console.error('[preflight] unexpected error:', err);
  process.exit(1);
});
