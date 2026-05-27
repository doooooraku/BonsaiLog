/**
 * F-10 PDF プレビュー/出力 静的解析 test (Issue #33 / ADR-0016)。
 *
 * Sess50: 個別 PDF (pdf-preview) は WebView プレビューを廃止し、prepareBonsaiPdf +
 * generateBonsaiPdfWithFallback (3 段階フォールバック) → OS 共有に一本化したことを構造保証。
 * list-preview はテキストのみで tile memory 問題が無いため WebView プレビューを維持。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const PDF_PREVIEW = r('../../../app/export/pdf-preview.tsx');
const LIST_PREVIEW = r('../../../app/export/list-preview.tsx');
const FLOW = r('../../../src/features/export/exportFlow.ts');
const PDF_PICKER = r('../../../app/export/pdf.tsx');
const SHEET = r('../../../src/features/export/ExportOptionsSheet.tsx');

describe('PDF Bonsai 出力確認 (pdf-preview)', () => {
  test('1. WebView を廃止し prepareBonsaiPdf で生成準備 (多写真 tile memory 対策、Sess50)', () => {
    expect(PDF_PREVIEW).not.toMatch(/from 'react-native-webview'/);
    expect(PDF_PREVIEW).not.toContain('e2e_export_pdf_preview_webview');
    expect(PDF_PREVIEW).toMatch(/prepareBonsaiPdf/);
  });

  test('2. 出力は generateBonsaiPdfWithFallback (3 段階) 経由 → 単発直呼び禁止 (構造ガード)', () => {
    expect(PDF_PREVIEW).toMatch(/generateBonsaiPdfWithFallback/);
    expect(PDF_PREVIEW).toMatch(/buildHtmlForAttempt/);
    expect(PDF_PREVIEW).toContain('e2e_export_pdf_preview_generate');
    expect(PDF_PREVIEW).toMatch(/FormScreenHeader/);
    expect(PDF_PREVIEW).toMatch(/exportOptExport/);
    // Sess50: 単発 generateAndShareBonsaiPdf 直呼びを禁止 (必ずフォールバック経由)
    expect(PDF_PREVIEW).not.toMatch(/generateAndShareBonsaiPdf/);
    expect(PDF_PREVIEW).not.toContain('e2e_export_pdf_preview_share');
  });

  test('3. pdf picker は選択で preview へ遷移 (即共有しない)', () => {
    expect(PDF_PICKER).toMatch(/router\.push\(`\/export\/pdf-preview\?bonsaiId=/);
    expect(PDF_PICKER).not.toMatch(/generateAndShareBonsaiPdf/);
  });
});

describe('PDF List Preview (list-preview)', () => {
  test('4. WebView で loadListPdfHtml を表示 + opts を JSON param で受領', () => {
    expect(LIST_PREVIEW).toMatch(/from 'react-native-webview'/);
    expect(LIST_PREVIEW).toMatch(/loadListPdfHtml/);
    expect(LIST_PREVIEW).toMatch(/JSON\.parse/);
    expect(LIST_PREVIEW).toContain('e2e_export_list_preview_webview');
  });

  test('5. 出力は下部「出力する」CTA → generateAndShareListPdf', () => {
    expect(LIST_PREVIEW).toMatch(/generateAndShareListPdf/);
    // Sess49 追補2: 右上「共有」廃止 → 下部 CTA (exportOptExport)、標準 FormScreenHeader
    expect(LIST_PREVIEW).toContain('e2e_export_list_preview_generate');
    expect(LIST_PREVIEW).toMatch(/FormScreenHeader/);
    expect(LIST_PREVIEW).not.toContain('e2e_export_list_preview_share');
  });

  test('6. Sheet は list_pdf で preview へ遷移 (opts を JSON で渡す)', () => {
    expect(SHEET).toMatch(/type === 'list_pdf'/);
    expect(SHEET).toMatch(/\/export\/list-preview\?opts=\$\{encodeURIComponent/);
    expect(SHEET).toMatch(/exportOptPreview/);
  });
});

describe('exportFlow HTML ローダー切り出し', () => {
  test('7. prepareBonsaiPdf (ファクトリ) / loadListPdfHtml を export し runExport と共用', () => {
    expect(FLOW).toMatch(/export async function prepareBonsaiPdf/);
    expect(FLOW).toMatch(/export async function loadListPdfHtml/);
    // runExport(list_pdf) も loadListPdfHtml を再利用
    expect(FLOW).toMatch(/await loadListPdfHtml\(opts, t\)/);
    // Sess50: attempt 別画質で再生成するファクトリを返す
    expect(FLOW).toMatch(/buildHtmlForAttempt/);
  });

  test('8. 写真は base64 inline + attempt 別画質 (thumb/photo spec、Sess50)', () => {
    expect(FLOW).toMatch(/readPhotoAsBase64/);
    // 写真は cover / event 紐付き (thumb) / gallery (photo) に振り分けて base64 inline
    expect(FLOW).toMatch(/photoUrisByEventId/);
    expect(FLOW).toMatch(/getPhotoResizeSpec/);
  });
});
