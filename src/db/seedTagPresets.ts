/**
 * F-09 タグマスタ (プリセットタグ) 初期データ
 * (Sess74 PR-1 / ADR-0049 §Notes Amended / ADR-0026 §Notes Amended)。
 *
 * 設計:
 * - master tag = アプリが提供する固定 2 件 (お気に入り / 花あり、 19 言語フル翻訳)
 * - SPECIES_SEED (`seedSpecies.ts`) と同形式、 静的 const 配列
 * - DB 投入なし。 user が chip tap で初めて `tags` 行が作成される (createOrFindTag)
 * - Free 上限 (FREE_TAG_LIMIT = 3) の count 対象外
 *   (canCreateNewTag が TAG_PRESET_NAMES_NORMALIZED で除外判定)
 * - 言語切替時の重複 row 化は仕様として受容 (`tags.name` は user 入力の生 string 原則、
 *   functional_spec §14.3.3 / ADR-0033)
 *
 * Related:
 * - ADR-0049 Pro 機能境界 v1.0 (§Notes Amended Sess74)
 * - ADR-0026 マスタ削減 + カスタム主軸 (§Notes Amended Sess74)
 * - functional_spec §14.3.3 (タグの 2 種別 = master / custom)
 */

export type TagPreset = {
  id: string;
  names: {
    ja: string;
    en: string;
    fr: string;
    es: string;
    de: string;
    it: string;
    pt: string;
    ru: string;
    zhHans: string;
    zhHant: string;
    ko: string;
    hi: string;
    id: string;
    th: string;
    vi: string;
    tr: string;
    nl: string;
    pl: string;
    sv: string;
  };
};

/**
 * プリセットタグ 2 件 (Sess74 plan v2 確定)。
 * 19 言語フル翻訳。 各翻訳は plan v2 で人手確認済。
 */
export const TAG_PRESETS: readonly TagPreset[] = [
  {
    id: 'favorite',
    names: {
      ja: 'お気に入り',
      en: 'Favorite',
      fr: 'Favori',
      es: 'Favorito',
      de: 'Favorit',
      it: 'Preferito',
      pt: 'Favorito',
      ru: 'Избранное',
      zhHans: '收藏',
      zhHant: '收藏',
      ko: '즐겨찾기',
      hi: 'पसंदीदा',
      id: 'Favorit',
      th: 'รายการโปรด',
      vi: 'Yêu thích',
      tr: 'Favori',
      nl: 'Favoriet',
      pl: 'Ulubione',
      sv: 'Favorit',
    },
  },
  {
    id: 'flowering',
    names: {
      ja: '花あり',
      en: 'Flowering',
      fr: 'En fleur',
      es: 'En flor',
      de: 'Blühend',
      it: 'In fiore',
      pt: 'Em flor',
      ru: 'Цветёт',
      zhHans: '开花',
      zhHant: '開花',
      ko: '개화',
      hi: 'फूल वाला',
      id: 'Berbunga',
      th: 'ออกดอก',
      vi: 'Ra hoa',
      tr: 'Çiçekli',
      nl: 'Bloeiend',
      pl: 'Kwitnący',
      sv: 'Blommande',
    },
  },
] as const;

/**
 * 循環依存回避のため normalizeTagName と同一実装を local 定義
 * (tagRepository.ts → seedTagPresets.ts → tagRepository.ts の循環を回避)。
 * 挙動同期は `__tests__/db/seedTagPresets.test.ts` で担保。
 */
function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * 全プリセット名の normalized 形 (19 言語 × 2 件 = 38 entries)。
 * canCreateNewTag / countCustomTags / isPresetTagName の O(1) lookup 用。
 */
export const TAG_PRESET_NAMES_NORMALIZED: ReadonlySet<string> = new Set(
  TAG_PRESETS.flatMap((p) => Object.values(p.names)).map(normalize),
);

/**
 * 入力 name (raw or normalized) がプリセット名のいずれかと一致するか。
 *
 * 大文字小文字 / 前後空白 / 連続空白を吸収して比較。
 * Settings 画面の master badge 表示判定 + tag-edit 手入力ガードで使用 (PR-2)。
 */
export function isPresetTagName(rawOrNormalized: string): boolean {
  return TAG_PRESET_NAMES_NORMALIZED.has(normalize(rawOrNormalized));
}

/**
 * Seed 件数の検証 (Sess74 plan v2: 2 件固定)。
 * ビルド時静的検証 (テストでも担保)。
 */
if (TAG_PRESETS.length !== 2) {
  throw new Error(
    `TAG_PRESETS has ${TAG_PRESETS.length} entries, but Sess74 plan v2 requires exactly 2. See docs/adr/ADR-0049-pro-feature-boundary-v1.md §Sess74 PR-1 Amendment`,
  );
}
