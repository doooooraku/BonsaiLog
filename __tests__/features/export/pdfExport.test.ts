/**
 * F-10 Phase B pdfExport 純関数テスト (Issue #33 / ADR-0016)。
 *
 * - escapeHtml: XSS / 特殊文字エスケープ
 * - buildBonsaiPdfHtml: テンプレート純関数 (DOCTYPE / CJK font / page-break / 写真は Phase C)
 *
 * Print / Sharing 副作用は Phase C で実機検証。
 */
import { buildBonsaiPdfHtml, escapeHtml } from '@/src/features/export/pdfExport';

describe('escapeHtml', () => {
  test('null / undefined → 空文字', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('& < > " \' をエスケープ', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  test('複合', () => {
    expect(escapeHtml('<img src="x">&y')).toBe('&lt;img src=&quot;x&quot;&gt;&amp;y');
  });
});

describe('buildBonsaiPdfHtml', () => {
  const baseTexts = {
    title: '盆栽記録',
    labelSpecies: '樹種',
    labelStyle: '樹形',
    labelAcquiredAt: '取得日',
    labelEventsTitle: '作業履歴',
    labelEventDate: '日付',
    labelEventType: '種類',
    labelEventNote: 'メモ',
    footerNote: 'BonsaiLog で生成',
  };

  test('DOCTYPE が html で始まる (iOS WKWebView 制約)', () => {
    const html = buildBonsaiPdfHtml({
      bonsai: { name: 'Test', style: null, acquiredAt: null },
      events: [],
      ...baseTexts,
    });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  test('CJK フォント明示が含まれる (Repolog Issue #292 教訓)', () => {
    const html = buildBonsaiPdfHtml({
      bonsai: { name: 'Test', style: null, acquiredAt: null },
      events: [],
      ...baseTexts,
    });
    expect(html).toContain('Hiragino');
    expect(html).toContain('Noto Sans CJK');
  });

  test('events 0 件は ― を表示', () => {
    const html = buildBonsaiPdfHtml({
      bonsai: { name: 'Test', style: null, acquiredAt: null },
      events: [],
      ...baseTexts,
    });
    expect(html).toContain('<p>―</p>');
    expect(html).not.toContain('<table');
  });

  test('events 1 件以上で table を出力', () => {
    const html = buildBonsaiPdfHtml({
      bonsai: { name: 'Test', style: null, acquiredAt: null },
      events: [{ occurredAtUtc: '2026-05-03T01:00:00.000Z', type: 'watering', note: 'メモ' }],
      ...baseTexts,
    });
    expect(html).toContain('<table');
    expect(html).toContain('2026-05-03');
    expect(html).toContain('watering');
    expect(html).toContain('メモ');
  });

  test('XSS な name / note をエスケープ', () => {
    const html = buildBonsaiPdfHtml({
      bonsai: { name: '<script>x</script>', style: null, acquiredAt: null },
      events: [
        { occurredAtUtc: '2026-05-03T01:00:00.000Z', type: 'watering', note: '<img src=x>' },
      ],
      ...baseTexts,
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img src=x&gt;');
  });

  test('species / style / acquiredAt が null/undefined ならその dt/dd を出さない', () => {
    const html = buildBonsaiPdfHtml({
      bonsai: { name: 'Test', style: null, acquiredAt: null },
      events: [],
      ...baseTexts,
    });
    expect(html).not.toContain('<dt>樹種</dt>');
    expect(html).not.toContain('<dt>樹形</dt>');
    expect(html).not.toContain('<dt>取得日</dt>');
  });

  test('species 提供時は dt/dd 表示', () => {
    const html = buildBonsaiPdfHtml({
      bonsai: { name: 'Test', style: 'chokkan', acquiredAt: '2026-04-01T00:00:00.000Z' },
      speciesCommonName: '黒松',
      events: [],
      ...baseTexts,
    });
    expect(html).toContain('<dt>樹種</dt><dd>黒松</dd>');
    expect(html).toContain('<dt>樹形</dt><dd>chokkan</dd>');
    expect(html).toContain('<dt>取得日</dt><dd>2026-04-01</dd>');
  });
});
