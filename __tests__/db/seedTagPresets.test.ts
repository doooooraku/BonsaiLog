/**
 * F-09 タグマスタ (Sess74 PR-1) 純関数テスト
 * (TAG_PRESETS / TAG_PRESET_NAMES_NORMALIZED / isPresetTagName)。
 *
 * DB アクセス系 (canCreateNewTag / countCustomTags の実 DB 挙動) は
 * Phase C で Maestro / 実機テストでカバー (expo-sqlite は RN 専用、
 * tagRepository.test.ts 冒頭コメント参照)。
 */
import { TAG_PRESETS, TAG_PRESET_NAMES_NORMALIZED, isPresetTagName } from '@/src/db/seedTagPresets';
import { normalizeTagName } from '@/src/db/tagRepository';

describe('TAG_PRESETS', () => {
  test('Sess74 plan v2: 2 件固定', () => {
    expect(TAG_PRESETS).toHaveLength(2);
  });

  test('id は favorite と flowering のみ', () => {
    const ids = TAG_PRESETS.map((p) => p.id);
    expect(ids).toEqual(['favorite', 'flowering']);
  });

  test('全 preset に 19 言語キー (ja/en/fr/es/de/it/pt/ru/zhHans/zhHant/ko/hi/id/th/vi/tr/nl/pl/sv) が揃う', () => {
    const expectedLangs = [
      'ja',
      'en',
      'fr',
      'es',
      'de',
      'it',
      'pt',
      'ru',
      'zhHans',
      'zhHant',
      'ko',
      'hi',
      'id',
      'th',
      'vi',
      'tr',
      'nl',
      'pl',
      'sv',
    ];
    for (const preset of TAG_PRESETS) {
      const actualLangs = Object.keys(preset.names);
      expect(actualLangs.sort()).toEqual(expectedLangs.sort());
      // 全言語訳が空でないこと
      for (const lang of expectedLangs) {
        expect((preset.names as Record<string, string>)[lang]).toBeTruthy();
      }
    }
  });
});

describe('TAG_PRESET_NAMES_NORMALIZED', () => {
  test('19 言語 × 2 件 = 38 logical names → Set unique は 33 (一部翻訳が複数言語で重複)', () => {
    // 重複例:
    // - "Favorit" (de / id / sv 共通)
    // - "Favori" (fr / tr 共通)
    // - "Favorito" (es / pt 共通)
    // - "收藏" (zhHans / zhHant 共通)
    // 機能には影響なし: preset 判定は normalized name 一致で行うため、
    // unique 化されても 19 言語すべての訳がカバーされる。
    expect(TAG_PRESET_NAMES_NORMALIZED.size).toBe(33);
  });

  test('全 entry が normalize 済 (lowercase + trim + 空白圧縮)', () => {
    for (const name of TAG_PRESET_NAMES_NORMALIZED) {
      expect(name).toBe(name.trim().toLowerCase().replace(/\s+/g, ' '));
    }
  });

  test('JA 翻訳 normalized が含まれる', () => {
    expect(TAG_PRESET_NAMES_NORMALIZED.has('お気に入り')).toBe(true);
    expect(TAG_PRESET_NAMES_NORMALIZED.has('花あり')).toBe(true);
  });

  test('EN 翻訳 normalized (lowercase) が含まれる', () => {
    expect(TAG_PRESET_NAMES_NORMALIZED.has('favorite')).toBe(true);
    expect(TAG_PRESET_NAMES_NORMALIZED.has('flowering')).toBe(true);
  });

  test('RU 翻訳 normalized (Cyrillic lowercase) が含まれる', () => {
    expect(TAG_PRESET_NAMES_NORMALIZED.has('избранное')).toBe(true);
    expect(TAG_PRESET_NAMES_NORMALIZED.has('цветёт')).toBe(true);
  });

  test('CJK (zhHans / zhHant / ko) 翻訳が含まれる', () => {
    expect(TAG_PRESET_NAMES_NORMALIZED.has('收藏')).toBe(true); // zhHans/zhHant 同一
    expect(TAG_PRESET_NAMES_NORMALIZED.has('开花')).toBe(true); // zhHans
    expect(TAG_PRESET_NAMES_NORMALIZED.has('開花')).toBe(true); // zhHant
    expect(TAG_PRESET_NAMES_NORMALIZED.has('즐겨찾기')).toBe(true); // ko
  });
});

describe('isPresetTagName', () => {
  test('JA 「お気に入り」 完全一致 → true', () => {
    expect(isPresetTagName('お気に入り')).toBe(true);
  });

  test('EN 「Favorite」 (大文字始まり) → true (case-insensitive)', () => {
    expect(isPresetTagName('Favorite')).toBe(true);
  });

  test('前後空白あり EN 「  flowering  」 → true', () => {
    expect(isPresetTagName('  flowering  ')).toBe(true);
  });

  test('連続空白入り 「en flor」 と「en  flor」 は同じ', () => {
    expect(isPresetTagName('en flor')).toBe(true);
    expect(isPresetTagName('en  flor')).toBe(true);
    expect(isPresetTagName('  EN   FLOR  ')).toBe(true);
  });

  test('非 preset 「ベランダ」 → false', () => {
    expect(isPresetTagName('ベランダ')).toBe(false);
  });

  test('空文字 → false', () => {
    expect(isPresetTagName('')).toBe(false);
    expect(isPresetTagName('   ')).toBe(false);
  });

  test('部分一致では false (= 完全一致のみ)', () => {
    expect(isPresetTagName('お気に入り盆栽')).toBe(false);
    expect(isPresetTagName('flowering tree')).toBe(false);
  });
});

describe('normalize 同期: seedTagPresets の local normalize が tagRepository.normalizeTagName と一致', () => {
  // 循環依存回避のため seedTagPresets.ts 内で local normalize を持つ。
  // 挙動乖離を防ぐため、 代表的入力で両者が同じ結果を返すことを担保。
  const samples = [
    '  Spring  ',
    'Spring   Pruning',
    ' Spring  Pruning  Tip ',
    'spring pruning',
    '',
    '   ',
    ' 春の  剪定 ',
    'SPRING',
    'Spring',
    'お気に入り',
    'Favorite',
    'Избранное',
    '收藏',
  ];
  for (const sample of samples) {
    test(`「${sample}」 で同期`, () => {
      const repoNormalized = normalizeTagName(sample);
      // seedTagPresets の local normalize は isPresetTagName 経由でしか露出していない。
      // よって repoNormalized が preset 集合に含まれることと
      // isPresetTagName(sample) が一致することを確認。
      const expectedInSet = TAG_PRESET_NAMES_NORMALIZED.has(repoNormalized);
      expect(isPresetTagName(sample)).toBe(expectedInSet);
    });
  }
});
