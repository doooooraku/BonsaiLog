/**
 * F-10 PDF プレビュー/出力 静的解析 test (Issue #33 / ADR-0016)。
 *
 * Sess50: 個別 PDF (pdf-preview) は WebView プレビューを廃止し、prepareBonsaiPdf +
 * generateBonsaiPdfWithFallback (3 段階フォールバック) → OS 共有に一本化したことを構造保証。
 * Sess51: list-preview (WebView) も廃止し、list_pdf は Sheet → runExport 直接出力に統一。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const PDF_PREVIEW = r('../../../app/export/pdf-preview.tsx');
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

describe('list_pdf 直接出力 (Sess51: プレビュー画面廃止)', () => {
  test('4. list-preview.tsx は削除済み (WebView プレビュー廃止)', () => {
    expect(existsSync(resolve(__dirname, '../../../app/export/list-preview.tsx'))).toBe(false);
  });

  test('5. Sheet は list_pdf も中間画面なしで runExport 直呼び (list-preview 遷移なし)', () => {
    expect(SHEET).not.toContain('/export/list-preview');
    expect(SHEET).not.toMatch(/exportOptPreview/);
    // 全種 (CSV 3 + list_pdf) を runExport で即出力 → OS 共有
    expect(SHEET).toMatch(/await runExport\(/);
    expect(SHEET).toContain('e2e_export_options_generate');
  });

  test('6. 出力は generateListPdfWithFallback (写真 3 段階) 経由、旧単発 API は撤去', () => {
    expect(FLOW).toMatch(/generateListPdfWithFallback/);
    expect(FLOW).not.toMatch(/generateAndShareListPdf/);
  });
});

describe('exportFlow HTML ローダー切り出し', () => {
  test('7. prepareBonsaiPdf / prepareListPdf (ファクトリ) を export', () => {
    expect(FLOW).toMatch(/export async function prepareBonsaiPdf/);
    expect(FLOW).toMatch(/export async function prepareListPdf/);
    // Sess51: list_pdf もプレビュー廃止 → runExport は写真フォールバック用 prepareListPdf を使う
    expect(FLOW).toMatch(/await prepareListPdf\(opts, t\)/);
    // attempt 別画質で再生成するファクトリを返す
    expect(FLOW).toMatch(/buildHtmlForAttempt/);
  });

  test('8. 写真は base64 inline + attempt 別画質 (thumb/photo spec、Sess50)', () => {
    expect(FLOW).toMatch(/readPhotoAsBase64/);
    // 写真は cover / event 紐付き (thumb) / gallery (photo) に振り分けて base64 inline
    expect(FLOW).toMatch(/photoUrisByEventId/);
    expect(FLOW).toMatch(/getPhotoResizeSpec/);
  });
});
