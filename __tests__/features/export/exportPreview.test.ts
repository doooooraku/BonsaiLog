/**
 * F-10 PDF/CSV 出力動線 静的解析 test (Issue #33 / ADR-0016)。
 *
 * Sess50: 個別 PDF は WebView プレビューを廃止し prepareBonsaiPdf + generateBonsaiPdfWithFallback
 *   (3 段階フォールバック) → OS 共有に一本化。
 * Sess51: list-preview (WebView) も廃止し list_pdf は中間画面なし出力に統一。
 * Sess55: 個別 PDF の中間確認画面 (pdf-preview.tsx) を廃止。picker (pdf.tsx) で選択 + 下部 CTA
 *   から直接生成。リスト系 (CSV 3 + list_pdf) の生成は Hub (index.tsx) に一元化し、Sheet は
 *   onGenerate で条件を返すだけ (二重 Modal 回避)。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const FLOW = r('../../../src/features/export/exportFlow.ts');
const PDF_PICKER = r('../../../app/export/pdf.tsx');
const SHEET = r('../../../src/features/export/ExportOptionsSheet.tsx');
const HUB = r('../../../app/export/index.tsx');

describe('個別 PDF 出力 (picker 直接出力、Sess55)', () => {
  test('1. 中間確認画面 pdf-preview.tsx は削除済み', () => {
    expect(existsSync(resolve(__dirname, '../../../app/export/pdf-preview.tsx'))).toBe(false);
  });

  test('2. picker は選択 + 下部 CTA で直接生成 (pdf-preview へ遷移しない)', () => {
    // 中間画面へ遷移しない (選択 → 下部 CTA で生成)
    expect(PDF_PICKER).not.toMatch(/\/export\/pdf-preview/);
    // 単一選択 + 下部「出力する」CTA
    expect(PDF_PICKER).toMatch(/selectedId/);
    expect(PDF_PICKER).toContain('e2e_export_pdf_generate');
    expect(PDF_PICKER).toMatch(/exportOptExport/);
  });

  test('3. 出力は generateBonsaiPdfWithFallback (3 段階) 経由 → 単発直呼び禁止 (構造ガード)', () => {
    expect(PDF_PICKER).toMatch(/prepareBonsaiPdf/);
    expect(PDF_PICKER).toMatch(/generateBonsaiPdfWithFallback/);
    expect(PDF_PICKER).toMatch(/buildHtmlForAttempt/);
    // Sess50: 単発 generateAndShareBonsaiPdf 直呼びを禁止 (必ずフォールバック経由)
    expect(PDF_PICKER).not.toMatch(/generateAndShareBonsaiPdf/);
    // WebView プレビューは持たない
    expect(PDF_PICKER).not.toMatch(/from 'react-native-webview'/);
  });

  test('4. 生成中は GeneratingOverlay を表示', () => {
    expect(PDF_PICKER).toMatch(/<GeneratingOverlay/);
    expect(PDF_PICKER).toMatch(/format="PDF"/);
  });
});

describe('リスト系 (CSV 3 + list_pdf) 出力 (Hub 一元生成、Sess55)', () => {
  test('5. list-preview.tsx は削除済み (Sess51)', () => {
    expect(existsSync(resolve(__dirname, '../../../app/export/list-preview.tsx'))).toBe(false);
  });

  test('6. Sheet は生成を Hub に委譲 (onGenerate)、自身は runExport しない', () => {
    expect(SHEET).toMatch(/onGenerate/);
    expect(SHEET).not.toMatch(/runExport/);
    expect(SHEET).not.toContain('/export/list-preview');
    expect(SHEET).not.toMatch(/exportOptPreview/);
    expect(SHEET).toContain('e2e_export_options_generate');
  });

  test('7. Hub が runExport + GeneratingOverlay で一元生成 (二重 Modal 回避)', () => {
    expect(HUB).toMatch(/onGenerate=\{handleGenerate\}/);
    expect(HUB).toMatch(/await runExport\(/);
    expect(HUB).toMatch(/<GeneratingOverlay/);
  });

  test('8. 出力は generateListPdfWithFallback (写真 3 段階) 経由、旧単発 API は撤去', () => {
    expect(FLOW).toMatch(/generateListPdfWithFallback/);
    expect(FLOW).not.toMatch(/generateAndShareListPdf/);
  });
});

describe('exportFlow HTML ローダー切り出し', () => {
  test('9. prepareBonsaiPdf / prepareListPdf (ファクトリ) を export', () => {
    expect(FLOW).toMatch(/export async function prepareBonsaiPdf/);
    expect(FLOW).toMatch(/export async function prepareListPdf/);
    // Sess51: list_pdf もプレビュー廃止 → runExport は写真フォールバック用 prepareListPdf を使う
    expect(FLOW).toMatch(/await prepareListPdf\(opts, t\)/);
    // attempt 別画質で再生成するファクトリを返す
    expect(FLOW).toMatch(/buildHtmlForAttempt/);
  });

  test('10. 写真は base64 inline + attempt 別画質 (thumb/photo spec、Sess50)', () => {
    expect(FLOW).toMatch(/readPhotoAsBase64/);
    // 写真は cover / event 紐付き (thumb) / gallery (photo) に振り分けて base64 inline
    expect(FLOW).toMatch(/photoUrisByEventId/);
    expect(FLOW).toMatch(/getPhotoResizeSpec/);
  });
});
