/**
 * F-10 生成中オーバーレイ 静的解析 test (Issue #33 / ADR-0016 AC11 Generating + Y2)。
 *
 * Sess55: GeneratingOverlay を全エクスポート種が通る唯一の生成中 UI に昇格。
 *   title (種別名) + format バッジ + showCancel (PDF のみ) + delayMs (瞬間完了のチラつき防止) を追加し、
 *   picker (個別 PDF) と Hub (CSV 3 + list_pdf) の双方に配線したことを構造保証。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const OVERLAY = r('../../../src/features/export/GeneratingOverlay.tsx');
const PDF_PICKER = r('../../../app/export/pdf.tsx');
const HUB = r('../../../app/export/index.tsx');

describe('GeneratingOverlay (ADR-0016 AC11 / Y2)', () => {
  test('1. fade Modal + spinner + キャンセル + 汎用タイトル fallback', () => {
    expect(OVERLAY).toMatch(/<Modal[\s\S]*transparent[\s\S]*animationType="fade"/);
    expect(OVERLAY).toMatch(/ActivityIndicator/);
    expect(OVERLAY).toMatch(/exportGeneratingTitle/);
    expect(OVERLAY).toContain('e2e_export_generating_cancel');
    expect(OVERLAY).toMatch(/onRequestClose=\{onCancel\}/);
  });

  test('2. 種別名タイトル + 形式バッジ + showCancel + delayMs プロップ', () => {
    expect(OVERLAY).toMatch(/title\?:/);
    expect(OVERLAY).toMatch(/format\?:/);
    expect(OVERLAY).toMatch(/showCancel\?:/);
    expect(OVERLAY).toMatch(/delayMs\?:/);
    expect(OVERLAY).toMatch(/ExportFormatBadge/);
    expect(OVERLAY).toContain('e2e_export_generating_title');
  });

  test('3. 遅延表示: delayMs 経過前に閉じれば出さない (瞬間完了のチラつき防止)', () => {
    // shown state を delayMs の setTimeout で立ち上げ、Modal visible は shown を使う
    expect(OVERLAY).toMatch(/setShown/);
    expect(OVERLAY).toMatch(/visible=\{shown\}/);
    expect(OVERLAY).toMatch(/delayMs/);
  });

  test('4. 一定時間経過後に「お待ちください」ヒント (exportPdfSlowHint) を表示 (Sess50)', () => {
    expect(OVERLAY).toMatch(/exportPdfSlowHint/);
    expect(OVERLAY).toContain('e2e_export_generating_slow_hint');
    expect(OVERLAY).toMatch(/SLOW_HINT_DELAY_MS/);
    expect(OVERLAY).toMatch(/setTimeout/);
  });

  test('5. picker (個別 PDF) と Hub (CSV/list_pdf) の双方に配線', () => {
    // 個別 PDF: format=PDF で表示
    expect(PDF_PICKER).toMatch(/<GeneratingOverlay/);
    expect(PDF_PICKER).toMatch(/format="PDF"/);
    // Hub: 種別に応じた format、PDF のみキャンセル可
    expect(HUB).toMatch(/<GeneratingOverlay/);
    expect(HUB).toMatch(/format=\{generatingFmt\}/);
    expect(HUB).toMatch(/showCancel=\{generatingFmt === 'PDF'\}/);
  });
});
