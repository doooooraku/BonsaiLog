/**
 * F-10 CSV プレビュー画面 (7 画面目) 静的解析 test (Issue #33 / ADR-0016 AC11 CSV Preview)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const CSV_PREVIEW = r('../../../app/export/csv-preview.tsx');
const FLOW = r('../../../src/features/export/exportFlow.ts');

describe('CSV Preview (csv-preview)', () => {
  test('1. loadCsvForPreview で生成し、表 / 生テキスト 切替表示', () => {
    expect(CSV_PREVIEW).toMatch(/loadCsvForPreview/);
    expect(CSV_PREVIEW).toMatch(/exportCsvPreviewGrid/);
    expect(CSV_PREVIEW).toMatch(/exportCsvPreviewText/);
    expect(CSV_PREVIEW).toContain('e2e_export_csv_preview_grid_view');
    expect(CSV_PREVIEW).toContain('e2e_export_csv_preview_text_view');
  });

  test('2. 共有は shareExportFile 委譲 + opts を JSON param 受領', () => {
    expect(CSV_PREVIEW).toMatch(/shareExportFile/);
    expect(CSV_PREVIEW).toMatch(/JSON\.parse/);
    expect(CSV_PREVIEW).toContain('e2e_export_csv_preview_share');
  });

  test('3. RFC4180 行パーサで BOM 除去 + cell 分解', () => {
    expect(CSV_PREVIEW).toMatch(/function parseCsvLine/);
    expect(CSV_PREVIEW).toMatch(/CSV_BOM/);
  });
});

describe('exportFlow CSV ローダー', () => {
  test('4. loadCsvForPreview / shareExportFile を export (preview と runExport で共用)', () => {
    expect(FLOW).toMatch(/export async function loadCsvForPreview/);
    expect(FLOW).toMatch(/export async function shareExportFile/);
    // runExport も loadCsvForPreview + shareExportFile を再利用
    expect(FLOW).toMatch(/await loadCsvForPreview\(opts, t\)/);
    expect(FLOW).toMatch(/await shareExportFile\(/);
  });
});
