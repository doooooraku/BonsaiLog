import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'src/core/i18n/locales');
const SCAN_DIRS = [path.join(ROOT, 'app'), path.join(ROOT, 'src')];

function parseArgs(argv) {
  const args = {
    locale: 'en',
    json: false,
    inventory: false,
    out: null,
  };

  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--') {
      continue;
    }
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--inventory') {
      args.inventory = true;
      continue;
    }
    if (token === '--out') {
      const outPath = argv[i + 1];
      if (!outPath) {
        throw new Error('--out requires a file path');
      }
      args.out = outPath;
      i += 1;
      continue;
    }
    positionals.push(token);
  }

  if (positionals.length > 0) {
    args.locale = positionals[0];
  }

  return args;
}

function extractDictBody(fileText) {
  const markerMatch = /const\s+[A-Za-z0-9_]+\s*=\s*{/m.exec(fileText);
  if (!markerMatch) {
    throw new Error('Could not find locale object declaration');
  }
  const start = markerMatch.index + markerMatch[0].length;
  const rest = fileText.slice(start);
  const end = rest.indexOf('\n};');
  if (end < 0) {
    throw new Error('Could not find end of locale object');
  }
  return rest.slice(0, end);
}

function extractLocaleKeys(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const dictBody = extractDictBody(text);
  const keyPattern = /^\s*([A-Za-z0-9_]+)\s*:/gm;
  const keys = [];
  let match;
  while ((match = keyPattern.exec(dictBody)) != null) {
    keys.push(match[1]);
  }
  return [...new Set(keys)];
}

function walkFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractUsageFromCode(enKeySet) {
  const directUsed = new Set();
  const dynamicUsed = new Set();
  const keyPattern = /\bt\.([A-Za-z0-9_]+)/g;
  const bracketPattern = /\bt\[['"]([A-Za-z0-9_]+)['"]\]/g;
  const labelKeyPattern = /\blabelKey\s*:\s*['"]([A-Za-z0-9_]+)['"]/g;

  for (const dirPath of SCAN_DIRS) {
    if (!fs.existsSync(dirPath)) continue;
    for (const filePath of walkFiles(dirPath)) {
      const text = fs.readFileSync(filePath, 'utf8');
      let match;
      while ((match = keyPattern.exec(text)) != null) {
        const key = match[1];
        if (enKeySet.has(key)) {
          directUsed.add(key);
        }
      }

      while ((match = bracketPattern.exec(text)) != null) {
        const key = match[1];
        if (enKeySet.has(key)) {
          dynamicUsed.add(key);
        }
      }

      while ((match = labelKeyPattern.exec(text)) != null) {
        const key = match[1];
        if (enKeySet.has(key)) {
          dynamicUsed.add(key);
        }
      }
    }
  }

  const usedKeys = new Set([...directUsed, ...dynamicUsed]);

  return {
    usedDirect: [...directUsed].sort(),
    usedDynamic: [...dynamicUsed].sort(),
    usedAll: [...usedKeys].sort(),
  };
}

function toMarkdown(report) {
  const now = new Date().toISOString();
  const lines = [
    '# i18n Audit Report',
    '',
    `- generatedAt: ${now}`,
    `- locale: ${report.locale}`,
    `- enTotalKeys: ${report.enTotalKeys}`,
    `- localeOverrideKeys: ${report.localeOverrideKeys}`,
    `- missingAllCount: ${report.missingAll.length}`,
    `- usedKeysInApp: ${report.usedKeysInApp}`,
    `- usedKeysDirect: ${report.usedDirect.length}`,
    `- usedKeysDynamic: ${report.usedDynamic.length}`,
    `- missingUsedCount: ${report.missingUsed.length}`,
    '',
    '## Missing Keys Used In App',
  ];

  if (report.missingUsed.length === 0) {
    lines.push('- none');
  } else {
    for (const key of report.missingUsed) {
      lines.push(`- ${key}`);
    }
  }

  lines.push('', '## Missing Keys In Locale (All)');
  if (report.missingAll.length === 0) {
    lines.push('- none');
  } else {
    for (const key of report.missingAll) {
      lines.push(`- ${key}`);
    }
  }

  if (report.inventoryEnabled) {
    lines.push('', '## Key Inventory (en.ts)');
    lines.push(`- usedInCodeCount: ${report.usedAll.length}`);
    lines.push(`- unusedCandidateCount: ${report.unusedCandidates.length}`);

    lines.push('', '### Used Keys (Direct: t.key)');
    if (report.usedDirect.length === 0) {
      lines.push('- none');
    } else {
      for (const key of report.usedDirect) {
        lines.push(`- ${key}`);
      }
    }

    lines.push('', "### Used Keys (Dynamic: labelKey/t['key'])");
    if (report.usedDynamic.length === 0) {
      lines.push('- none');
    } else {
      for (const key of report.usedDynamic) {
        lines.push(`- ${key}`);
      }
    }

    lines.push('', '### Unused Candidates (No code reference found)');
    if (report.unusedCandidates.length === 0) {
      lines.push('- none');
    } else {
      for (const key of report.unusedCandidates) {
        lines.push(`- ${key}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const enFile = path.join(LOCALES_DIR, 'en.ts');
  const localeFile = path.join(LOCALES_DIR, `${args.locale}.ts`);

  if (!fs.existsSync(enFile)) {
    throw new Error('en.ts not found');
  }
  if (!fs.existsSync(localeFile)) {
    throw new Error(`locale file not found: ${localeFile}`);
  }

  const enKeys = extractLocaleKeys(enFile);
  const localeKeys = extractLocaleKeys(localeFile);
  const enKeySet = new Set(enKeys);
  const localeKeySet = new Set(localeKeys);
  const usage = extractUsageFromCode(enKeySet);
  const missingUsed = usage.usedAll.filter((key) => !localeKeySet.has(key));
  const missingAll = enKeys.filter((key) => !localeKeySet.has(key));
  const unusedCandidates = enKeys.filter((key) => !usage.usedAll.includes(key));

  const report = {
    locale: args.locale,
    enTotalKeys: enKeys.length,
    localeOverrideKeys: localeKeys.length,
    usedKeysInApp: usage.usedAll.length,
    usedDirect: usage.usedDirect,
    usedDynamic: usage.usedDynamic,
    usedAll: usage.usedAll,
    unusedCandidates,
    missingUsed,
    missingAll,
    inventoryEnabled: args.inventory,
  };

  if (args.out) {
    const outPath = path.isAbsolute(args.out) ? args.out : path.join(ROOT, args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, toMarkdown(report), 'utf8');
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Locale: ${report.locale}`);
  console.log(`en total keys: ${report.enTotalKeys}`);
  console.log(`locale override keys: ${report.localeOverrideKeys}`);
  console.log(`used keys in app/src: ${report.usedKeysInApp}`);
  console.log(`used keys (direct t.key): ${report.usedDirect.length}`);
  console.log(`used keys (dynamic literals): ${report.usedDynamic.length}`);
  if (args.inventory) {
    console.log(`unused candidate keys: ${report.unusedCandidates.length}`);
  }
  console.log(`missing used keys: ${report.missingUsed.length}`);
  console.log(`missing all keys: ${report.missingAll.length}`);
  if (report.missingUsed.length > 0) {
    console.log('\n[missing used keys]');
    console.log(report.missingUsed.join('\n'));
  }
}

try {
  run();
} catch (error) {
  console.error(`[i18n-audit] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
