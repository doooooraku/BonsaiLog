/**
 * F-10 生成中オーバーレイ 静的解析 test (Issue #33 / ADR-0016 AC11 Generating + Y2)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const OVERLAY = r('../../../src/features/export/GeneratingOverlay.tsx');
const PDF_PREVIEW = r('../../../app/export/pdf-preview.tsx');

describe('GeneratingOverlay (ADR-0016 AC11 / Y2)', () => {
  test('1. fade Modal + spinner + キャンセル', () => {
    expect(OVERLAY).toMatch(/<Modal[\s\S]*transparent[\s\S]*animationType="fade"/);
    expect(OVERLAY).toMatch(/ActivityIndicator/);
    expect(OVERLAY).toMatch(/exportGeneratingTitle/);
    expect(OVERLAY).toContain('e2e_export_generating_cancel');
    expect(OVERLAY).toMatch(/onRequestClose=\{onCancel\}/);
  });

  test('2. 個別 PDF プレビュー画面が共有中にオーバーレイ表示 (Sess51: list_pdf はプレビュー廃止)', () => {
    expect(PDF_PREVIEW).toMatch(/<GeneratingOverlay visible=\{sharing\}/);
  });

  test('3. 一定時間経過後に「お待ちください」ヒント (exportPdfSlowHint) を表示 (Sess50)', () => {
    expect(OVERLAY).toMatch(/exportPdfSlowHint/);
    expect(OVERLAY).toContain('e2e_export_generating_slow_hint');
    // すぐ終わる時は出さない (タイマー経過後のみ)
    expect(OVERLAY).toMatch(/SLOW_HINT_DELAY_MS/);
    expect(OVERLAY).toMatch(/setTimeout/);
  });
});
