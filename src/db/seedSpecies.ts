/**
 * 樹種マスタ初期データ (50 種、F-01 foundation の AC2 対応)。
 *
 * Related:
 * - Issue #14 F-01 AC2: 50 種以上の樹種が seed されている
 * - basic_spec.md §10.1 (代表樹種 20 件 + 学名 + 通称 19 言語)
 * - constraints.md §3-1 (19 言語対応)
 *
 * v1.0 初期: ja + en の通称のみ seed。残り 17 言語 (fr/es/de/it/pt/ru/zh-Hans/zh-Hant/ko/hi/id/th/vi/tr/nl/pl/sv) は v1.x で追加。
 *
 * 出典: Bonsai Empire Tree Species Guide / 藤岡友宏『盆栽入門』近代盆栽 / Wikipedia 樹種ページ。
 */
import { ulid } from 'ulid';

export type SpeciesSeed = {
  id: string;
  scientificName: string;
  family: string | null;
  climateZoneMin: number | null;
  climateZoneMax: number | null;
  names: { ja: string; en: string };
};

/**
 * 50 種樹種マスタ (代表的な盆栽樹種を網羅)。
 *
 * ID は固定 ULID で生成 (再 seed 時の冪等性維持のため、ファイル内で同じ値を返す)。
 * 起動時に once seed → species テーブルに INSERT OR IGNORE で投入。
 */
function seedId(prefix: string): string {
  // 固定 ULID 風 ID (冪等性維持のため、起動毎に変動しない)
  // ulid() は時刻ベースだが、本番では INSERT OR IGNORE で重複回避
  return `species_${prefix}`;
}

export const SPECIES_SEED: SpeciesSeed[] = [
  // 松柏類 (10 種)
  {
    id: seedId('pinus_thunbergii'),
    scientificName: 'Pinus thunbergii',
    family: 'Pinaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: '黒松', en: 'Japanese Black Pine' },
  },
  {
    id: seedId('pinus_parviflora'),
    scientificName: 'Pinus parviflora',
    family: 'Pinaceae',
    climateZoneMin: 5,
    climateZoneMax: 8,
    names: { ja: '五葉松', en: 'Japanese White Pine' },
  },
  {
    id: seedId('pinus_densiflora'),
    scientificName: 'Pinus densiflora',
    family: 'Pinaceae',
    climateZoneMin: 4,
    climateZoneMax: 8,
    names: { ja: '赤松', en: 'Japanese Red Pine' },
  },
  {
    id: seedId('juniperus_chinensis'),
    scientificName: 'Juniperus chinensis',
    family: 'Cupressaceae',
    climateZoneMin: 4,
    climateZoneMax: 9,
    names: { ja: '真柏', en: 'Chinese Juniper' },
  },
  {
    id: seedId('juniperus_rigida'),
    scientificName: 'Juniperus rigida',
    family: 'Cupressaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: '杜松', en: 'Needle Juniper' },
  },
  {
    id: seedId('juniperus_procumbens'),
    scientificName: 'Juniperus procumbens nana',
    family: 'Cupressaceae',
    climateZoneMin: 4,
    climateZoneMax: 9,
    names: { ja: '這檜柏', en: 'Japanese Garden Juniper' },
  },
  {
    id: seedId('cryptomeria_japonica'),
    scientificName: 'Cryptomeria japonica',
    family: 'Cupressaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: '杉', en: 'Japanese Cedar' },
  },
  {
    id: seedId('chamaecyparis_obtusa'),
    scientificName: 'Chamaecyparis obtusa',
    family: 'Cupressaceae',
    climateZoneMin: 4,
    climateZoneMax: 8,
    names: { ja: '檜', en: 'Hinoki Cypress' },
  },
  {
    id: seedId('taxus_cuspidata'),
    scientificName: 'Taxus cuspidata',
    family: 'Taxaceae',
    climateZoneMin: 4,
    climateZoneMax: 7,
    names: { ja: '一位', en: 'Japanese Yew' },
  },
  {
    id: seedId('picea_jezoensis'),
    scientificName: 'Picea jezoensis',
    family: 'Pinaceae',
    climateZoneMin: 3,
    climateZoneMax: 6,
    names: { ja: '蝦夷松', en: 'Yezo Spruce' },
  },

  // 雑木類 - 落葉樹 (15 種)
  {
    id: seedId('acer_palmatum'),
    scientificName: 'Acer palmatum',
    family: 'Sapindaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'モミジ', en: 'Japanese Maple' },
  },
  {
    id: seedId('acer_buergerianum'),
    scientificName: 'Acer buergerianum',
    family: 'Sapindaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: '唐楓', en: 'Trident Maple' },
  },
  {
    id: seedId('zelkova_serrata'),
    scientificName: 'Zelkova serrata',
    family: 'Ulmaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'ケヤキ', en: 'Japanese Zelkova' },
  },
  {
    id: seedId('ulmus_parvifolia'),
    scientificName: 'Ulmus parvifolia',
    family: 'Ulmaceae',
    climateZoneMin: 4,
    climateZoneMax: 9,
    names: { ja: 'ニレ', en: 'Chinese Elm' },
  },
  {
    id: seedId('fagus_crenata'),
    scientificName: 'Fagus crenata',
    family: 'Fagaceae',
    climateZoneMin: 4,
    climateZoneMax: 8,
    names: { ja: 'ブナ', en: 'Japanese Beech' },
  },
  {
    id: seedId('carpinus_japonica'),
    scientificName: 'Carpinus japonica',
    family: 'Betulaceae',
    climateZoneMin: 5,
    climateZoneMax: 8,
    names: { ja: 'クマシデ', en: 'Japanese Hornbeam' },
  },
  {
    id: seedId('quercus_serrata'),
    scientificName: 'Quercus serrata',
    family: 'Fagaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'コナラ', en: 'Konara Oak' },
  },
  {
    id: seedId('celtis_sinensis'),
    scientificName: 'Celtis sinensis',
    family: 'Cannabaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'エノキ', en: 'Chinese Hackberry' },
  },
  {
    id: seedId('ginkgo_biloba'),
    scientificName: 'Ginkgo biloba',
    family: 'Ginkgoaceae',
    climateZoneMin: 4,
    climateZoneMax: 9,
    names: { ja: 'イチョウ', en: 'Ginkgo' },
  },
  {
    id: seedId('salix_babylonica'),
    scientificName: 'Salix babylonica',
    family: 'Salicaceae',
    climateZoneMin: 6,
    climateZoneMax: 9,
    names: { ja: 'シダレヤナギ', en: 'Weeping Willow' },
  },
  {
    id: seedId('liquidambar_formosana'),
    scientificName: 'Liquidambar formosana',
    family: 'Altingiaceae',
    climateZoneMin: 7,
    climateZoneMax: 10,
    names: { ja: 'タイワンフウ', en: 'Chinese Sweet Gum' },
  },
  {
    id: seedId('lagerstroemia_indica'),
    scientificName: 'Lagerstroemia indica',
    family: 'Lythraceae',
    climateZoneMin: 7,
    climateZoneMax: 10,
    names: { ja: '百日紅', en: 'Crape Myrtle' },
  },
  {
    id: seedId('wisteria_floribunda'),
    scientificName: 'Wisteria floribunda',
    family: 'Fabaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: '藤', en: 'Japanese Wisteria' },
  },
  {
    id: seedId('cercis_chinensis'),
    scientificName: 'Cercis chinensis',
    family: 'Fabaceae',
    climateZoneMin: 6,
    climateZoneMax: 9,
    names: { ja: 'ハナズオウ', en: 'Chinese Redbud' },
  },
  {
    id: seedId('hibiscus_syriacus'),
    scientificName: 'Hibiscus syriacus',
    family: 'Malvaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'ムクゲ', en: 'Rose of Sharon' },
  },

  // 花物 (10 種)
  {
    id: seedId('rhododendron_indicum'),
    scientificName: 'Rhododendron indicum',
    family: 'Ericaceae',
    climateZoneMin: 6,
    climateZoneMax: 9,
    names: { ja: '皐月', en: 'Satsuki Azalea' },
  },
  {
    id: seedId('rhododendron_kiusianum'),
    scientificName: 'Rhododendron kiusianum',
    family: 'Ericaceae',
    climateZoneMin: 6,
    climateZoneMax: 9,
    names: { ja: 'ミヤマキリシマ', en: 'Kyushu Azalea' },
  },
  {
    id: seedId('prunus_mume'),
    scientificName: 'Prunus mume',
    family: 'Rosaceae',
    climateZoneMin: 6,
    climateZoneMax: 9,
    names: { ja: '梅', en: 'Japanese Apricot' },
  },
  {
    id: seedId('prunus_serrulata'),
    scientificName: 'Prunus serrulata',
    family: 'Rosaceae',
    climateZoneMin: 5,
    climateZoneMax: 8,
    names: { ja: '桜', en: 'Japanese Cherry' },
  },
  {
    id: seedId('camellia_japonica'),
    scientificName: 'Camellia japonica',
    family: 'Theaceae',
    climateZoneMin: 7,
    climateZoneMax: 10,
    names: { ja: 'ツバキ', en: 'Camellia' },
  },
  {
    id: seedId('chaenomeles_japonica'),
    scientificName: 'Chaenomeles japonica',
    family: 'Rosaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'ボケ', en: 'Japanese Quince' },
  },
  {
    id: seedId('jasminum_nudiflorum'),
    scientificName: 'Jasminum nudiflorum',
    family: 'Oleaceae',
    climateZoneMin: 6,
    climateZoneMax: 10,
    names: { ja: 'ウンナンオウバイ', en: 'Winter Jasmine' },
  },
  {
    id: seedId('forsythia_suspensa'),
    scientificName: 'Forsythia suspensa',
    family: 'Oleaceae',
    climateZoneMin: 5,
    climateZoneMax: 8,
    names: { ja: 'レンギョウ', en: 'Weeping Forsythia' },
  },
  {
    id: seedId('serissa_japonica'),
    scientificName: 'Serissa japonica',
    family: 'Rubiaceae',
    climateZoneMin: 7,
    climateZoneMax: 11,
    names: { ja: 'ハクチョウゲ', en: 'Snow Rose' },
  },
  {
    id: seedId('bougainvillea_glabra'),
    scientificName: 'Bougainvillea glabra',
    family: 'Nyctaginaceae',
    climateZoneMin: 9,
    climateZoneMax: 11,
    names: { ja: 'ブーゲンビリア', en: 'Bougainvillea' },
  },

  // 実物 (8 種)
  {
    id: seedId('punica_granatum'),
    scientificName: 'Punica granatum',
    family: 'Lythraceae',
    climateZoneMin: 7,
    climateZoneMax: 10,
    names: { ja: '石榴', en: 'Pomegranate' },
  },
  {
    id: seedId('malus_halliana'),
    scientificName: 'Malus halliana',
    family: 'Rosaceae',
    climateZoneMin: 4,
    climateZoneMax: 8,
    names: { ja: 'ハナカイドウ', en: 'Hall Crabapple' },
  },
  {
    id: seedId('pyracantha_angustifolia'),
    scientificName: 'Pyracantha angustifolia',
    family: 'Rosaceae',
    climateZoneMin: 6,
    climateZoneMax: 9,
    names: { ja: 'タチバナモドキ', en: 'Narrow-leaved Firethorn' },
  },
  {
    id: seedId('cotoneaster_horizontalis'),
    scientificName: 'Cotoneaster horizontalis',
    family: 'Rosaceae',
    climateZoneMin: 5,
    climateZoneMax: 8,
    names: { ja: 'ベニシタン', en: 'Rockspray Cotoneaster' },
  },
  {
    id: seedId('citrus_japonica'),
    scientificName: 'Citrus japonica',
    family: 'Rutaceae',
    climateZoneMin: 8,
    climateZoneMax: 11,
    names: { ja: 'キンカン', en: 'Kumquat' },
  },
  {
    id: seedId('diospyros_kaki'),
    scientificName: 'Diospyros kaki',
    family: 'Ebenaceae',
    climateZoneMin: 7,
    climateZoneMax: 10,
    names: { ja: '柿', en: 'Persimmon' },
  },
  {
    id: seedId('crataegus_cuneata'),
    scientificName: 'Crataegus cuneata',
    family: 'Rosaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'サンザシ', en: 'Hawthorn' },
  },
  {
    id: seedId('elaeagnus_pungens'),
    scientificName: 'Elaeagnus pungens',
    family: 'Elaeagnaceae',
    climateZoneMin: 6,
    climateZoneMax: 10,
    names: { ja: 'ナワシログミ', en: 'Silverthorn' },
  },

  // 室内・トロピカル (7 種)
  {
    id: seedId('ficus_retusa'),
    scientificName: 'Ficus retusa',
    family: 'Moraceae',
    climateZoneMin: 10,
    climateZoneMax: 12,
    names: { ja: 'ガジュマル', en: 'Banyan Fig' },
  },
  {
    id: seedId('ficus_microcarpa'),
    scientificName: 'Ficus microcarpa',
    family: 'Moraceae',
    climateZoneMin: 10,
    climateZoneMax: 12,
    names: { ja: 'ベンガレンシス', en: 'Chinese Banyan' },
  },
  {
    id: seedId('portulacaria_afra'),
    scientificName: 'Portulacaria afra',
    family: 'Didiereaceae',
    climateZoneMin: 9,
    climateZoneMax: 11,
    names: { ja: 'ガジュマル属サンゴアブラギリ', en: 'Elephant Bush' },
  },
  {
    id: seedId('crassula_ovata'),
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
    climateZoneMin: 10,
    climateZoneMax: 11,
    names: { ja: '金のなる木', en: 'Jade Plant' },
  },
  {
    id: seedId('schefflera_arboricola'),
    scientificName: 'Schefflera arboricola',
    family: 'Araliaceae',
    climateZoneMin: 10,
    climateZoneMax: 12,
    names: { ja: 'カポック', en: 'Dwarf Umbrella Tree' },
  },
  {
    id: seedId('olea_europaea'),
    scientificName: 'Olea europaea',
    family: 'Oleaceae',
    climateZoneMin: 8,
    climateZoneMax: 11,
    names: { ja: 'オリーブ', en: 'Olive' },
  },
  {
    id: seedId('ehretia_microphylla'),
    scientificName: 'Ehretia microphylla',
    family: 'Boraginaceae',
    climateZoneMin: 9,
    climateZoneMax: 12,
    names: { ja: 'フクモクテイ', en: 'Fukien Tea' },
  },
];

/**
 * Seed 件数の検証 (Issue #14 AC2: 50 種以上必須)。
 */
export const SPECIES_SEED_COUNT = SPECIES_SEED.length;

if (SPECIES_SEED_COUNT < 50) {
  // ビルド時静的検証 (テストでも担保)
  throw new Error(
    `SPECIES_SEED has ${SPECIES_SEED_COUNT} entries, but Issue #14 AC2 requires 50+. Add more.`,
  );
}

// `ulid` import warning suppression (将来 dynamic ID 生成で使用予定)
void ulid;
