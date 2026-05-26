/**
 * F-10 生成中オーバーレイ 静的解析 test (Issue #33 / ADR-0016 AC11 Generating + Y2)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const OVERLAY = r('../../../src/features/export/GeneratingOverlay.tsx');
const PDF_PREVIEW = r('../../../app/export/pdf-preview.tsx');
const LIST_PREVIEW = r('../../../app/export/list-preview.tsx');

describe('GeneratingOverlay (ADR-0016 AC11 / Y2)', () => {
  test('1. fade Modal + spinner + キャンセル', () => {
    expect(OVERLAY).toMatch(/<Modal[\s\S]*transparent[\s\S]*animationType="fade"/);
    expect(OVERLAY).toMatch(/ActivityIndicator/);
    expect(OVERLAY).toMatch(/exportGeneratingTitle/);
    expect(OVERLAY).toContain('e2e_export_generating_cancel');
    expect(OVERLAY).toMatch(/onRequestClose=\{onCancel\}/);
  });

  test('2. PDF プレビュー両画面が共有中にオーバーレイ表示', () => {
    expect(PDF_PREVIEW).toMatch(/<GeneratingOverlay visible=\{sharing\}/);
    expect(LIST_PREVIEW).toMatch(/<GeneratingOverlay visible=\{sharing\}/);
  });
});
