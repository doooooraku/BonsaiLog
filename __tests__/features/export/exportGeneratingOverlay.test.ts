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

  test('2-1. Sess56: バッジ+タイトル縦並び + numberOfLines={2} + ellipsizeMode で多言語 wrap 構造解決', () => {
    // 横並び (flex:1 で title wrap) は 19 言語×5 種別で中途半端な折り返しを起こすため縦並びに変更。
    // headerCol の flexDirection が 'column' でバッジ→タイトルが縦に並ぶことを構造保証。
    expect(OVERLAY).toMatch(/headerCol:\s*\{\s*flexDirection:\s*'column'/);
    // タイトルは保険として 2 行までで ellipsize (超長言語対応)。
    expect(OVERLAY).toMatch(/numberOfLines=\{2\}/);
    expect(OVERLAY).toMatch(/ellipsizeMode="tail"/);
    // タイトルは中央揃え (縦並びの中心線に沿わせる)。
    expect(OVERLAY).toMatch(/textAlign:\s*'center'/);
    // カードは画面幅 90% まで広げる (横並びの 360px 上限を撤廃して超長文に追随)。
    expect(OVERLAY).toMatch(/maxWidth:\s*'90%'/);
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
