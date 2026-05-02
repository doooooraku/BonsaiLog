#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  DESTINATIONS,
  PROJECT_ROOT,
  SKILLS_ROOT,
  directoriesMatch,
  listSourceSkills,
  relativeFromRoot,
  skillsForDestination,
} from './sync-agent-tools.mjs';

const SECRET_ASSIGNMENT_PATTERN =
  /(?:^|[\s"'`])(?:[A-Z0-9_]*API_KEY|[A-Z0-9_]*TOKEN|[A-Z0-9_]*PASSWORD|[A-Z0-9_]*SECRET)(?:_[A-Z0-9]+)*\s*=/;

const results = [];

function printUsage() {
  console.log(`Usage: node agent-tools/scripts/check-agent-tools.mjs [--help]

Validate agent-tools Skills, generated destinations, secret hygiene, and Codex Engram MCP.

Options:
  --help    Show this help message without running checks.`);
}

function parseArgs(argv) {
  const allowedArgs = new Set(['--help', '-h', '--']);
  const unknownArgs = argv.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}. Use --help for usage.`);
  }

  return {
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function record(level, message) {
  results.push({ level, message });
  console.log(`${level}: ${message}`);
}

function ok(message) {
  record('OK', message);
}

function warn(message) {
  record('WARN', message);
}

function fail(message) {
  record('FAIL', message);
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return {};
  }

  const [, frontmatter] = match;
  const values = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    values[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
  }

  return values;
}

async function listFilesRecursively(dir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  }

  await walk(dir);
  return files;
}

async function checkSourceRoot() {
  if (!existsSync(SKILLS_ROOT)) {
    fail(`missing source directory: ${relativeFromRoot(SKILLS_ROOT)}`);
    return false;
  }

  ok(`source directory exists: ${relativeFromRoot(SKILLS_ROOT)}`);
  return true;
}

async function checkFrontmatter(sourceSkills) {
  if (sourceSkills.length === 0) {
    warn(`no source skills found under ${relativeFromRoot(SKILLS_ROOT)}`);
    return;
  }

  for (const skill of sourceSkills) {
    const markdown = await readFile(skill.skillFile, 'utf8');
    const frontmatter = parseFrontmatter(markdown);
    const label = relativeFromRoot(skill.skillFile);

    if (!frontmatter.name) {
      fail(`${label}: frontmatter.name is required`);
    }

    if (!frontmatter.description) {
      fail(`${label}: frontmatter.description is required`);
    }

    if (frontmatter.name && frontmatter.name !== skill.name) {
      fail(
        `${label}: folder name "${skill.name}" must match frontmatter name "${frontmatter.name}"`,
      );
    }

    if (frontmatter.name && frontmatter.description && frontmatter.name === skill.name) {
      ok(`${label}: frontmatter name/description are valid`);
    }
  }
}

async function checkGeneratedDestinations() {
  for (const destinationKey of Object.keys(DESTINATIONS)) {
    const { destination, skills } = await skillsForDestination(destinationKey);

    for (const skill of skills) {
      const destinationDir = path.join(destination.dir, skill.name);
      const isSynced = await directoriesMatch(skill.dir, destinationDir);
      const destinationLabel = relativeFromRoot(destinationDir);
      const sourceLabel = relativeFromRoot(skill.dir);

      if (isSynced) {
        ok(`${destinationLabel}: matches ${sourceLabel}`);
      } else {
        fail(`${destinationLabel}: differs from ${sourceLabel}`);
      }
    }
  }
}

async function checkUnmanagedDestinationSkills() {
  for (const destinationKey of Object.keys(DESTINATIONS)) {
    const { destination, skills } = await skillsForDestination(destinationKey);
    const managedNames = new Set(skills.map((skill) => skill.name));

    if (!existsSync(destination.dir)) {
      continue;
    }

    const entries = await readdir(destination.dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || managedNames.has(entry.name)) {
        continue;
      }

      const skillFile = path.join(destination.dir, entry.name, 'SKILL.md');
      if (existsSync(skillFile)) {
        fail(
          `${relativeFromRoot(path.join(destination.dir, entry.name))}: unmanaged Skill remains outside agent-tools/skills`,
        );
      }
    }
  }
}

async function checkSecrets(sourceSkills) {
  const checkedFiles = new Set();

  for (const skill of sourceSkills) {
    for (const filePath of await listFilesRecursively(skill.dir)) {
      if (checkedFiles.has(filePath)) {
        continue;
      }
      checkedFiles.add(filePath);

      const content = await readFile(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (SECRET_ASSIGNMENT_PATTERN.test(lines[index])) {
          fail(`${relativeFromRoot(filePath)}:${index + 1}: looks like a secret assignment`);
        }
      }
    }
  }

  ok(`secret assignment scan completed (${checkedFiles.size} files)`);
}

function checkCodexMcp() {
  const result = spawnSync('codex', ['mcp', 'list'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
  });

  if (result.error?.code === 'ENOENT') {
    warn('codex command not found; skipped `codex mcp list` engram check');
    return;
  }

  if (result.error) {
    warn(`could not run \`codex mcp list\`: ${result.error.message}`);
    return;
  }

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) {
    fail(`\`codex mcp list\` exited with status ${result.status}`);
    return;
  }

  if (/\bengram\b/i.test(output)) {
    ok('`codex mcp list` includes engram');
  } else {
    fail('`codex mcp list` does not include engram');
  }
}

async function main() {
  const { help } = parseArgs(process.argv.slice(2));
  if (help) {
    printUsage();
    return;
  }

  const hasSourceRoot = await checkSourceRoot();
  const sourceSkills = hasSourceRoot ? await listSourceSkills() : [];

  if (hasSourceRoot) {
    await checkFrontmatter(sourceSkills);
    await checkSecrets(sourceSkills);
    await checkGeneratedDestinations();
    await checkUnmanagedDestinationSkills();
  }

  checkCodexMcp();

  const counts = results.reduce(
    (acc, result) => {
      acc[result.level] += 1;
      return acc;
    },
    { OK: 0, WARN: 0, FAIL: 0 },
  );

  console.log(`Summary: OK=${counts.OK} WARN=${counts.WARN} FAIL=${counts.FAIL}`);

  if (counts.FAIL > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
