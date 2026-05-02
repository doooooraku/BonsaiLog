#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, lstat, mkdir, readFile, readdir, readlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(
  process.env.AGENT_TOOLS_PROJECT_ROOT || path.join(SCRIPT_DIR, '..', '..'),
);

export const SKILLS_ROOT = path.join(PROJECT_ROOT, 'agent-tools', 'skills');

export const SOURCE_GROUPS = ['shared', 'claude', 'codex'];

export const DESTINATIONS = {
  claude: {
    label: 'Claude Code',
    groups: ['shared', 'claude'],
    dir: path.join(PROJECT_ROOT, '.claude', 'skills'),
  },
  codex: {
    label: 'Codex',
    groups: ['shared', 'codex'],
    dir: path.join(PROJECT_ROOT, '.codex', 'skills'),
  },
};

// Future candidate: Codex repo skills may move to `.agents/skills` if the project
// chooses that layout. This script intentionally generates only `.claude/skills`
// and `.codex/skills` for now.

export function printUsage() {
  console.log(`Usage: node agent-tools/scripts/sync-agent-tools.mjs [--check] [--help]

Sync generated Skills from agent-tools/skills/ into tool-native directories.

Options:
  --check   Verify generated Skills are in sync without writing files.
  --help    Show this help message without changing files.`);
}

function parseArgs(argv) {
  const allowedArgs = new Set(['--check', '--help', '-h', '--']);
  const unknownArgs = argv.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}. Use --help for usage.`);
  }

  return {
    checkOnly: argv.includes('--check'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export function relativeFromRoot(filePath) {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join('/');
}

export async function listSourceSkills() {
  const skills = [];

  for (const group of SOURCE_GROUPS) {
    const groupDir = path.join(SKILLS_ROOT, group);
    if (!existsSync(groupDir)) {
      continue;
    }

    const entries = await readdir(groupDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) {
        continue;
      }

      const dir = path.join(groupDir, entry.name);
      const skillFile = path.join(dir, 'SKILL.md');
      if (!existsSync(skillFile)) {
        continue;
      }

      skills.push({
        group,
        name: entry.name,
        dir,
        skillFile,
      });
    }
  }

  return skills;
}

export async function skillsForDestination(destinationKey) {
  const destination = DESTINATIONS[destinationKey];
  if (!destination) {
    throw new Error(`Unknown destination: ${destinationKey}`);
  }

  const allSkills = await listSourceSkills();
  const byName = new Map();
  const duplicates = [];

  for (const skill of allSkills) {
    if (!destination.groups.includes(skill.group)) {
      continue;
    }

    if (byName.has(skill.name)) {
      duplicates.push({ previous: byName.get(skill.name), next: skill });
    }

    byName.set(skill.name, skill);
  }

  return {
    destination,
    skills: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
    duplicates,
  };
}

async function directoryManifest(dir) {
  const manifest = [];

  async function walk(currentDir, relativeDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const normalizedRelativePath = relativePath.split(path.sep).join('/');

      if (entry.isDirectory()) {
        manifest.push(`dir:${normalizedRelativePath}`);
        await walk(absolutePath, relativePath);
        continue;
      }

      if (entry.isFile()) {
        const content = await readFile(absolutePath);
        const hash = createHash('sha256').update(content).digest('hex');
        manifest.push(`file:${normalizedRelativePath}:${content.byteLength}:${hash}`);
        continue;
      }

      if (entry.isSymbolicLink()) {
        const target = await readlink(absolutePath);
        manifest.push(`symlink:${normalizedRelativePath}:${target}`);
        continue;
      }

      const stats = await lstat(absolutePath);
      manifest.push(`other:${normalizedRelativePath}:${stats.mode}`);
    }
  }

  await walk(dir, '');
  return manifest;
}

export async function directoriesMatch(sourceDir, destinationDir) {
  if (!existsSync(destinationDir)) {
    return false;
  }

  const [sourceManifest, destinationManifest] = await Promise.all([
    directoryManifest(sourceDir),
    directoryManifest(destinationDir),
  ]);

  if (sourceManifest.length !== destinationManifest.length) {
    return false;
  }

  return sourceManifest.every((entry, index) => entry === destinationManifest[index]);
}

async function findUnmanagedSkillDirs(destinationKey) {
  const { destination, skills } = await skillsForDestination(destinationKey);
  const managedNames = new Set(skills.map((skill) => skill.name));
  const unmanaged = [];

  if (!existsSync(destination.dir)) {
    return unmanaged;
  }

  const entries = await readdir(destination.dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || managedNames.has(entry.name)) {
      continue;
    }

    const skillDir = path.join(destination.dir, entry.name);
    if (existsSync(path.join(skillDir, 'SKILL.md'))) {
      unmanaged.push(skillDir);
    }
  }

  return unmanaged;
}

export async function syncAgentTools({ checkOnly = false } = {}) {
  if (!existsSync(SKILLS_ROOT)) {
    throw new Error(`Missing source directory: ${relativeFromRoot(SKILLS_ROOT)}`);
  }

  const summary = {
    checkOnly,
    copied: 0,
    checked: 0,
    failures: [],
  };

  for (const destinationKey of Object.keys(DESTINATIONS)) {
    const { destination, skills } = await skillsForDestination(destinationKey);
    console.log(
      `${checkOnly ? 'check' : 'sync'} ${destination.label}: ${relativeFromRoot(destination.dir)}`,
    );

    if (!checkOnly) {
      await mkdir(destination.dir, { recursive: true });
    }

    const unmanagedSkillDirs = await findUnmanagedSkillDirs(destinationKey);
    for (const unmanagedDir of unmanagedSkillDirs) {
      const unmanagedLabel = relativeFromRoot(unmanagedDir);
      if (checkOnly) {
        summary.failures.push(`${unmanagedLabel} is not managed by agent-tools/skills`);
        console.log(`  FAIL ${unmanagedLabel} is not managed by agent-tools/skills`);
      } else {
        await rm(unmanagedDir, { recursive: true, force: true });
        console.log(`  removed unmanaged ${unmanagedLabel}`);
      }
    }

    for (const skill of skills) {
      const destinationDir = path.join(destination.dir, skill.name);
      const sourceLabel = relativeFromRoot(skill.dir);
      const destinationLabel = relativeFromRoot(destinationDir);

      if (checkOnly) {
        const isSynced = await directoriesMatch(skill.dir, destinationDir);
        summary.checked += 1;

        if (isSynced) {
          console.log(`  OK   ${destinationLabel}`);
        } else {
          summary.failures.push(`${destinationLabel} differs from ${sourceLabel}`);
          console.log(`  FAIL ${destinationLabel} differs from ${sourceLabel}`);
        }
        continue;
      }

      await rm(destinationDir, { recursive: true, force: true });
      await cp(skill.dir, destinationDir, { recursive: true });
      summary.copied += 1;
      console.log(`  copied ${sourceLabel} -> ${destinationLabel}`);
    }
  }

  if (checkOnly && summary.failures.length > 0) {
    const error = new Error(`${summary.failures.length} skill destination(s) are out of sync.`);
    error.failures = summary.failures;
    throw error;
  }

  return summary;
}

async function main() {
  const { checkOnly, help } = parseArgs(process.argv.slice(2));
  if (help) {
    printUsage();
    return;
  }

  const summary = await syncAgentTools({ checkOnly });
  if (checkOnly) {
    console.log(`OK: checked ${summary.checked} generated skill directories.`);
  } else {
    console.log(`OK: copied ${summary.copied} skill directories.`);
  }
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    if (error.failures?.length) {
      for (const failure of error.failures) {
        console.error(`  - ${failure}`);
      }
    }
    process.exitCode = 1;
  });
}
