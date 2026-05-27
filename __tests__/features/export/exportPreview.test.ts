/**
 * F-10 PDF プレビュー 2 画面 静的解析 test (Issue #33 / ADR-0016 AC11 PDF Preview)。
 *
 * pdf-preview / list-preview が WebView で印刷同一 HTML を表示し、共有を既存 generator に
 * 委譲することを構造保証する。exportFlow の HTML ローダー切り出しも検証。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const PDF_PREVIEW = r('../../../app/export/pdf-preview.tsx');
const LIST_PREVIEW = r('../../../app/export/list-preview.tsx');
const FLOW = r('../../../src/features/export/exportFlow.ts');
const PDF_PICKER = r('../../../app/export/pdf.tsx');
const SHEET = r('../../../src/features/export/ExportOptionsSheet.tsx');

describe('PDF Bonsai Preview (pdf-preview)', () => {
  test('1. WebView で印刷同一 HTML (loadBonsaiPdfHtml) を表示', () => {
    expect(PDF_PREVIEW).toMatch(/from 'react-native-webview'/);
    expect(PDF_PREVIEW).toMatch(/loadBonsaiPdfHtml/);
    expect(PDF_PREVIEW).toContain('e2e_export_pdf_preview_webview');
  });

  test('2. 出力は下部「出力する」CTA → generateAndShareBonsaiPdf (photoCount 連携)', () => {
    expect(PDF_PREVIEW).toMatch(/generateAndShareBonsaiPdf\(html,[\s\S]*?photoCount/);
    // Sess49 追補2: 右上「共有」廃止 → 下部 CTA (exportOptExport)、標準 FormScreenHeader
    expect(PDF_PREVIEW).toContain('e2e_export_pdf_preview_generate');
    expect(PDF_PREVIEW).toMatch(/FormScreenHeader/);
    expect(PDF_PREVIEW).toMatch(/exportOptExport/);
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
  test('7. loadBonsaiPdfHtml / loadListPdfHtml を export し runExport と共用', () => {
    expect(FLOW).toMatch(/export async function loadBonsaiPdfHtml/);
    expect(FLOW).toMatch(/export async function loadListPdfHtml/);
    // runExport(list_pdf) も loadListPdfHtml を再利用
    expect(FLOW).toMatch(/await loadListPdfHtml\(opts, t\)/);
  });

  test('8. 写真は base64 inline (WKWebView file:// 制約回避)', () => {
    expect(FLOW).toMatch(/readPhotoAsBase64/);
    // Sess49: 写真は cover / event 紐付き / gallery に振り分けて base64 inline
    expect(FLOW).toMatch(/photoUrisByEventId/);
  });
});
