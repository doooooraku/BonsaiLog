/**
 * 単位系の共有型 (FSD 最下層 src/types)。
 *
 * Phase 6 F1b/c: `PotUnit` を settingsStore から本ファイルへ移設。
 * core 層 (potUnitConvert / lang-defaults) が stores を import する境界違反を解消する。
 * settingsStore は後方互換のため本型を re-export する。
 */

/** 鉢サイズ単位 (cm / mm / inch、 user preference、 Sess13 PR-I Q-7 b 採用)。 */
export type PotUnit = 'cm' | 'mm' | 'inch';
