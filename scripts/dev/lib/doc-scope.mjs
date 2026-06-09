/**
 * doc-scope.mjs — ClaudeCode が参照する doc の scope filter + classifier (Sess89+ PR1)。
 *
 * scope = BonsaiLog プロジェクト + ~/.claude/ + auto memory dir のうち
 * 「doc 系」 のみ。 analyze-doc-reads.mjs (= Phase 1 script) と PR2 で追加する
 * log-doc-reads.mjs (= Phase 2 hook) の両方から import される共通 module。
 *
 * 議題: Sess89+ 議論モード結論 (= 案 A+B ハイブリッド 3 Phase、 PR 2 本順次)。
 * Plan: /home/doooo/.claude/plans/keen-dancing-quokka.md
 */
import { homedir } from 'node:os';

const HOME = homedir();
const REPO = '/home/doooo/04_app-factory/apps/BonsaiLog';
const PROJECT_HASH = '-home-doooo-04-app-factory-apps-BonsaiLog';
const MEMORY_DIR = `${HOME}/.claude/projects/${PROJECT_HASH}/memory`;

/**
 * 指定 path が「ClaudeCode 参照 doc」 の計測 scope に含まれるか判定。
 *
 * @param {string} p 絶対 path
 * @returns {boolean}
 */
export function isInScope(p) {
  if (typeof p !== 'string' || !p) return false;
  // deny exception: 自分自身の出力 (= self-recursion 防止)
  if (p.startsWith(`${REPO}/.claude/metrics/`)) return false;
  // allow rules (順次 OR)
  if (p === `${REPO}/CLAUDE.md`) return true;
  if (p === `${REPO}/AGENTS.md`) return true;
  if (p.startsWith(`${REPO}/docs/`)) return true;
  if (p.startsWith(`${REPO}/.claude/`)) return true;
  if (p === `${HOME}/.claude/CLAUDE.md`) return true;
  if (p.startsWith(`${HOME}/.claude/rules/`)) return true;
  if (p.startsWith(`${MEMORY_DIR}/`)) return true;
  return false;
}

/**
 * scope 内 path を category 分類。
 *
 * @param {string} p 絶対 path
 * @returns {string} category
 */
export function classify(p) {
  if (typeof p !== 'string') return 'other';
  if (/\/docs\/adr\//.test(p)) return 'ADR';
  if (/\/docs\/reference\/tasks\/lessons\//.test(p) || /\/docs\/lessons\//.test(p))
    return 'lessons';
  if (/\/docs\/reference\//.test(p)) return 'reference';
  if (/\/docs\/how-to\//.test(p)) return 'how-to';
  if (/\/docs\/explanation\//.test(p)) return 'explanation';
  if (p.startsWith(`${MEMORY_DIR}/`)) return 'memory';
  if (p.endsWith('/CLAUDE.md')) return 'claude_md';
  if (p.endsWith('/AGENTS.md')) return 'agents_md';
  if (/\/\.claude\/hooks\//.test(p)) return 'hooks';
  if (/\/\.claude\/skills\//.test(p)) return 'skills';
  if (/\/\.claude\/recurrence-prevention/.test(p)) return 'recurrence-prevention';
  if (/\/\.claude\/rules\//.test(p) || p.startsWith(`${HOME}/.claude/rules/`)) return 'rules';
  if (p.startsWith(`${REPO}/docs/`)) return 'docs_other';
  if (p.startsWith(`${REPO}/.claude/`)) return 'claude_other';
  return 'other';
}

/**
 * Inventory 対象拡張子 (= .md / .mdx のみ、 計測対象は「doc」 に限定)。
 *
 * @param {string} p 絶対 path
 * @returns {boolean}
 */
export function isDocFile(p) {
  if (typeof p !== 'string') return false;
  return p.endsWith('.md') || p.endsWith('.mdx');
}

/**
 * scope 用の root constants (= analyze-doc-reads.mjs から inventory walk 用)。
 */
export const SCOPE_ROOTS = {
  REPO,
  HOME,
  MEMORY_DIR,
  SINGLE_FILES: [`${REPO}/CLAUDE.md`, `${REPO}/AGENTS.md`, `${HOME}/.claude/CLAUDE.md`],
  DIR_ROOTS: [`${REPO}/docs`, `${REPO}/.claude`, `${HOME}/.claude/rules`, MEMORY_DIR],
};
