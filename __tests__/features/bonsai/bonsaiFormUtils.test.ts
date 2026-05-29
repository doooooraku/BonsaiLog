/**
 * BonsaiBasicForm 純粋ユーティリティ characterization (Phase 4 A2、 ADR-0045)。
 *
 * form 本体は分割せず orchestrator のまま維持 (637行を ADR-0045 で justify)。
 * 代わりに最も壊れやすい部分 — pot_info JSON parse (型不一致 / 壊れた JSON のフォールバック) と
 * 日付境界変換 — を純関数に切り出し、 振る舞いを凍結する安全網。
 */
import { isoToYmd, parsePotInfo, toIsoUtc } from '@/src/features/bonsai/bonsaiFormUtils';

describe('toIsoUtc', () => {
  test('YYYY-MM-DD を ISO 8601 UTC (00:00:00Z) に変換', () => {
    expect(toIsoUtc('2026-05-29')).toBe('2026-05-29T00:00:00.000Z');
  });

  test('不正形式は nowUtc() フォールバック (ISO 文字列を返す、 throw しない)', () => {
    const result = toIsoUtc('garbage');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('isoToYmd', () => {
  test('ISO 8601 を先頭 10 文字 (YYYY-MM-DD) に切り出す', () => {
    expect(isoToYmd('2026-05-29T00:00:00.000Z')).toBe('2026-05-29');
  });

  test('null / undefined / 短すぎる値は空文字', () => {
    expect(isoToYmd(null)).toBe('');
    expect(isoToYmd(undefined)).toBe('');
    expect(isoToYmd('abc')).toBe('');
  });
});

describe('parsePotInfo', () => {
  test('新形式 (widthCm/depthCm/material) を復元し expanded=true', () => {
    const r = parsePotInfo('{"widthCm":12,"depthCm":8,"material":"常滑"}');
    expect(r).toEqual({
      description: '',
      widthCm: 12,
      depthCm: 8,
      material: '常滑',
      expanded: true,
    });
  });

  test('旧形式 (description のみ) は description 復元 + expanded=false', () => {
    const r = parsePotInfo('{"description":"丸鉢"}');
    expect(r).toEqual({
      description: '丸鉢',
      widthCm: null,
      depthCm: null,
      material: '',
      expanded: false,
    });
  });

  test('壊れた JSON は全フィールド空にフォールバック (throw しない)', () => {
    const r = parsePotInfo('{not valid json');
    expect(r).toEqual({
      description: '',
      widthCm: null,
      depthCm: null,
      material: '',
      expanded: false,
    });
  });

  test('null / undefined / 空文字も安全に空フィールド', () => {
    expect(parsePotInfo(null).expanded).toBe(false);
    expect(parsePotInfo(undefined).widthCm).toBeNull();
    expect(parsePotInfo('').material).toBe('');
  });

  test('型不一致 (widthCm が string) は typeof ガードで null 化', () => {
    const r = parsePotInfo('{"widthCm":"12","material":42}');
    expect(r.widthCm).toBeNull();
    expect(r.material).toBe('');
  });

  test('material だけでも expanded=true (空 material は false)', () => {
    expect(parsePotInfo('{"material":"信楽"}').expanded).toBe(true);
    expect(parsePotInfo('{"material":""}').expanded).toBe(false);
  });
});
