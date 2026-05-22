#!/usr/bin/env node
/**
 * scripts/i18n/add-keys-sess34-pr2.mjs
 *
 * Sess34 PR-2 (ADR-0041 PR-2) — 19 言語 locale ファイルに新規 i18n keys を一括追加。
 * apply-translation.mjs は既存 key の値更新のみで新規 key を追加できないため本 script で追加。
 *
 * 動作: 各 locale ファイルの最後の `};` 直前に新規 key:value を挿入。
 * 既に同 key が存在する場合は skip (idempotent)。
 *
 * Usage: node scripts/i18n/add-keys-sess34-pr2.mjs
 *
 * 一回限り (PR-2 で実行後は削除も可、 ただし audit 用に残置)。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const LOCALES_DIR = resolve(ROOT, 'src/core/i18n/locales');

// 19 言語 (ja は SoT、 他 18 言語)
const LANGS = [
  'ja',
  'en',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'nl',
  'sv',
  'pl',
  'ru',
  'zhHans',
  'zhHant',
  'ko',
  'hi',
  'id',
  'th',
  'vi',
  'tr',
];

// ADR-0041 PR-2 新規 i18n keys (各言語の翻訳値)
// Pruning amount / Repot third / Fert slow_release / Pest purpose / Trim range / Moss action / Leaf aid symptom / UI a11y
const NEW_KEYS = {
  // ============================================================
  // Pruning amount (剪定の量) — payload.amount = 'few' | 'some' | 'lot'
  // ============================================================
  historyLabelPruneAmountFew: {
    ja: '少し',
    en: 'A little',
    fr: 'Un peu',
    es: 'Un poco',
    de: 'Wenig',
    it: 'Un po',
    pt: 'Um pouco',
    nl: 'Een beetje',
    sv: 'Lite',
    pl: 'Trochę',
    ru: 'Немного',
    zhHans: '少量',
    zhHant: '少量',
    ko: '조금',
    hi: 'थोड़ा',
    id: 'Sedikit',
    th: 'เล็กน้อย',
    vi: 'Một chút',
    tr: 'Az',
  },
  historyLabelPruneAmountSome: {
    ja: 'そこそこ',
    en: 'Some',
    fr: 'Modéré',
    es: 'Algo',
    de: 'Mäßig',
    it: 'Discreto',
    pt: 'Moderado',
    nl: 'Matig',
    sv: 'Måttligt',
    pl: 'Umiarkowanie',
    ru: 'Умеренно',
    zhHans: '适量',
    zhHant: '適量',
    ko: '적당히',
    hi: 'कुछ',
    id: 'Cukup',
    th: 'พอประมาณ',
    vi: 'Vừa phải',
    tr: 'Orta',
  },
  historyLabelPruneAmountLot: {
    ja: 'たっぷり',
    en: 'A lot',
    fr: 'Beaucoup',
    es: 'Mucho',
    de: 'Viel',
    it: 'Molto',
    pt: 'Muito',
    nl: 'Veel',
    sv: 'Mycket',
    pl: 'Dużo',
    ru: 'Много',
    zhHans: '大量',
    zhHant: '大量',
    ko: '많이',
    hi: 'बहुत',
    id: 'Banyak',
    th: 'มาก',
    vi: 'Nhiều',
    tr: 'Çok',
  },
  // ============================================================
  // Repot root_pruning third (根の整理 1/3) — 'third' は form 新値、 旧 i18n に無し
  // ============================================================
  historyLabelRepotRootsThird: {
    ja: '1/3整理',
    en: 'Trim 1/3',
    fr: '1/3 taillé',
    es: 'Podar 1/3',
    de: '1/3 zurückschneiden',
    it: 'Potare 1/3',
    pt: 'Podar 1/3',
    nl: '1/3 snoeien',
    sv: 'Beskär 1/3',
    pl: 'Przyciąć 1/3',
    ru: 'Обрезать 1/3',
    zhHans: '修剪1/3',
    zhHant: '修剪1/3',
    ko: '1/3 정리',
    hi: '1/3 छाँटें',
    id: 'Pangkas 1/3',
    th: 'ตัดแต่ง 1/3',
    vi: 'Tỉa 1/3',
    tr: '1/3 budama',
  },
  // ============================================================
  // Fert kind slow_release (緩効性) — form 新値、 旧 i18n は 'slow'
  // ============================================================
  historyLabelFertKindSlowRelease: {
    ja: '緩効性',
    en: 'Slow-release',
    fr: 'Libération lente',
    es: 'Liberación lenta',
    de: 'Langzeitdünger',
    it: 'A lenta cessione',
    pt: 'Liberação lenta',
    nl: 'Langzaamwerkend',
    sv: 'Långtidsverkande',
    pl: 'O spowolnionym uwalnianiu',
    ru: 'Длительного действия',
    zhHans: '缓释',
    zhHant: '緩釋',
    ko: '완효성',
    hi: 'धीमी रिलीज़',
    id: 'Pelepasan lambat',
    th: 'ปุ๋ยละลายช้า',
    vi: 'Tan chậm',
    tr: 'Yavaş salımlı',
  },
  // ============================================================
  // Pest purpose (病害虫の目的) — form 新値、 旧 i18n は 'prevent'/'treat'/'both'
  // ============================================================
  historyLabelPestPurposePrevention: {
    ja: '予防',
    en: 'Prevention',
    fr: 'Prévention',
    es: 'Prevención',
    de: 'Vorbeugung',
    it: 'Prevenzione',
    pt: 'Prevenção',
    nl: 'Preventie',
    sv: 'Förebyggande',
    pl: 'Profilaktyka',
    ru: 'Профилактика',
    zhHans: '预防',
    zhHant: '預防',
    ko: '예방',
    hi: 'रोकथाम',
    id: 'Pencegahan',
    th: 'การป้องกัน',
    vi: 'Phòng ngừa',
    tr: 'Önleme',
  },
  historyLabelPestPurposeTreatment: {
    ja: '治療',
    en: 'Treatment',
    fr: 'Traitement',
    es: 'Tratamiento',
    de: 'Behandlung',
    it: 'Trattamento',
    pt: 'Tratamento',
    nl: 'Behandeling',
    sv: 'Behandling',
    pl: 'Leczenie',
    ru: 'Лечение',
    zhHans: '治疗',
    zhHant: '治療',
    ko: '치료',
    hi: 'उपचार',
    id: 'Pengobatan',
    th: 'การรักษา',
    vi: 'Điều trị',
    tr: 'Tedavi',
  },
  historyLabelPestPurposeBoth: {
    ja: '両方',
    en: 'Both',
    fr: 'Les deux',
    es: 'Ambos',
    de: 'Beides',
    it: 'Entrambi',
    pt: 'Ambos',
    nl: 'Beide',
    sv: 'Båda',
    pl: 'Oba',
    ru: 'Оба',
    zhHans: '两者',
    zhHant: '兩者',
    ko: '둘 다',
    hi: 'दोनों',
    id: 'Keduanya',
    th: 'ทั้งสอง',
    vi: 'Cả hai',
    tr: 'Her ikisi',
  },
  // ============================================================
  // Trim range (葉刈り/芽切り/芽摘み/芽切り の範囲) — form 新値、 旧 i18n に無し
  // ============================================================
  historyLabelTrimRangeTipsOnly: {
    ja: '先端のみ',
    en: 'Tips only',
    fr: 'Pointes seulement',
    es: 'Solo puntas',
    de: 'Nur Spitzen',
    it: 'Solo punte',
    pt: 'Apenas pontas',
    nl: 'Alleen toppen',
    sv: 'Endast spetsar',
    pl: 'Tylko czubki',
    ru: 'Только кончики',
    zhHans: '仅顶端',
    zhHant: '僅頂端',
    ko: '끝부분만',
    hi: 'केवल सिरे',
    id: 'Ujung saja',
    th: 'เฉพาะปลาย',
    vi: 'Chỉ ngọn',
    tr: 'Sadece uçlar',
  },
  historyLabelTrimRangeModerate: {
    ja: 'そこそこ',
    en: 'Moderate',
    fr: 'Modéré',
    es: 'Moderado',
    de: 'Mäßig',
    it: 'Moderato',
    pt: 'Moderado',
    nl: 'Matig',
    sv: 'Måttligt',
    pl: 'Umiarkowanie',
    ru: 'Умеренно',
    zhHans: '适度',
    zhHant: '適度',
    ko: '적당히',
    hi: 'मध्यम',
    id: 'Sedang',
    th: 'ปานกลาง',
    vi: 'Vừa phải',
    tr: 'Orta',
  },
  historyLabelTrimRangeHeavy: {
    ja: '思い切り',
    en: 'Heavy',
    fr: 'Intense',
    es: 'Fuerte',
    de: 'Stark',
    it: 'Intenso',
    pt: 'Forte',
    nl: 'Zwaar',
    sv: 'Kraftigt',
    pl: 'Mocno',
    ru: 'Сильно',
    zhHans: '大量',
    zhHant: '大量',
    ko: '대담하게',
    hi: 'भारी',
    id: 'Banyak',
    th: 'มาก',
    vi: 'Mạnh',
    tr: 'Yoğun',
  },
  // ============================================================
  // Moss action (苔の手入れ) — form 新値、 旧 i18n は 'add'/'remove'/'water'
  // ============================================================
  historyLabelMossActionAttach: {
    ja: '貼り付け',
    en: 'Attach',
    fr: 'Coller',
    es: 'Adherir',
    de: 'Anbringen',
    it: 'Applicare',
    pt: 'Aplicar',
    nl: 'Aanbrengen',
    sv: 'Fästa',
    pl: 'Przymocować',
    ru: 'Прикрепить',
    zhHans: '贴附',
    zhHant: '貼附',
    ko: '붙이기',
    hi: 'जोड़ें',
    id: 'Tempel',
    th: 'แปะ',
    vi: 'Dán',
    tr: 'Yapıştır',
  },
  historyLabelMossActionRemove: {
    ja: '剥がす',
    en: 'Remove',
    fr: 'Retirer',
    es: 'Quitar',
    de: 'Entfernen',
    it: 'Rimuovere',
    pt: 'Remover',
    nl: 'Verwijderen',
    sv: 'Ta bort',
    pl: 'Usunąć',
    ru: 'Удалить',
    zhHans: '剥除',
    zhHant: '剝除',
    ko: '제거',
    hi: 'हटाएँ',
    id: 'Lepas',
    th: 'ลอก',
    vi: 'Gỡ bỏ',
    tr: 'Kaldır',
  },
  historyLabelMossActionMoisten: {
    ja: '湿らす',
    en: 'Moisten',
    fr: 'Humidifier',
    es: 'Humedecer',
    de: 'Anfeuchten',
    it: 'Inumidire',
    pt: 'Umedecer',
    nl: 'Bevochtigen',
    sv: 'Fukta',
    pl: 'Zwilżyć',
    ru: 'Увлажнить',
    zhHans: '湿润',
    zhHant: '濕潤',
    ko: '적시기',
    hi: 'नम करें',
    id: 'Basahi',
    th: 'ทำให้ชุ่ม',
    vi: 'Làm ẩm',
    tr: 'Nemlendir',
  },
  // ============================================================
  // Leaf aid symptom (葉の手当 の症状) — form 新値、 旧 i18n に無し
  // ============================================================
  historyLabelLeafAidSymptomBurn: {
    ja: '葉焼け',
    en: 'Leaf burn',
    fr: 'Brûlure de feuille',
    es: 'Quemadura de hoja',
    de: 'Blattbrand',
    it: 'Bruciatura fogliare',
    pt: 'Queimadura foliar',
    nl: 'Bladverbranding',
    sv: 'Bladbränna',
    pl: 'Oparzenie liści',
    ru: 'Ожог листьев',
    zhHans: '叶烧',
    zhHant: '葉燒',
    ko: '잎 화상',
    hi: 'पत्ती जलना',
    id: 'Daun terbakar',
    th: 'ใบไหม้',
    vi: 'Cháy lá',
    tr: 'Yaprak yanığı',
  },
  historyLabelLeafAidSymptomWither: {
    ja: '葉枯れ',
    en: 'Withering',
    fr: 'Flétrissement',
    es: 'Marchitez',
    de: 'Welke',
    it: 'Appassimento',
    pt: 'Murcha',
    nl: 'Verwelking',
    sv: 'Vissning',
    pl: 'Więdnięcie',
    ru: 'Увядание',
    zhHans: '叶枯',
    zhHant: '葉枯',
    ko: '잎 시듦',
    hi: 'मुरझाना',
    id: 'Layu',
    th: 'ใบเหี่ยว',
    vi: 'Héo lá',
    tr: 'Solma',
  },
  historyLabelLeafAidSymptomPest: {
    ja: '虫害',
    en: 'Pest damage',
    fr: 'Dégâts de parasites',
    es: 'Daño por plagas',
    de: 'Schädlingsbefall',
    it: 'Danno da parassiti',
    pt: 'Dano por pragas',
    nl: 'Plaagschade',
    sv: 'Skadedjursangrepp',
    pl: 'Szkody od szkodników',
    ru: 'Вред от вредителей',
    zhHans: '虫害',
    zhHant: '蟲害',
    ko: '해충 피해',
    hi: 'कीट क्षति',
    id: 'Hama',
    th: 'แมลงทำลาย',
    vi: 'Sâu bệnh',
    tr: 'Zararlı hasarı',
  },
  historyLabelLeafAidSymptomMold: {
    ja: 'カビ',
    en: 'Mold',
    fr: 'Moisissure',
    es: 'Moho',
    de: 'Schimmel',
    it: 'Muffa',
    pt: 'Mofo',
    nl: 'Schimmel',
    sv: 'Mögel',
    pl: 'Pleśń',
    ru: 'Плесень',
    zhHans: '霉菌',
    zhHant: '黴菌',
    ko: '곰팡이',
    hi: 'फफूँद',
    id: 'Jamur',
    th: 'รา',
    vi: 'Nấm mốc',
    tr: 'Küf',
  },
  historyLabelLeafAidSymptomOther: {
    ja: 'その他',
    en: 'Other',
    fr: 'Autre',
    es: 'Otro',
    de: 'Sonstiges',
    it: 'Altro',
    pt: 'Outro',
    nl: 'Overig',
    sv: 'Annat',
    pl: 'Inne',
    ru: 'Другое',
    zhHans: '其他',
    zhHant: '其他',
    ko: '기타',
    hi: 'अन्य',
    id: 'Lainnya',
    th: 'อื่นๆ',
    vi: 'Khác',
    tr: 'Diğer',
  },
  // ============================================================
  // ADR-0041 D5: memo 3 行 + 「もっと見る」 リンク
  // ============================================================
  eventRowReadMore: {
    ja: 'もっと見る ▶',
    en: 'Read more ▶',
    fr: 'Voir plus ▶',
    es: 'Leer más ▶',
    de: 'Mehr lesen ▶',
    it: 'Leggi di più ▶',
    pt: 'Ler mais ▶',
    nl: 'Meer lezen ▶',
    sv: 'Läs mer ▶',
    pl: 'Czytaj więcej ▶',
    ru: 'Подробнее ▶',
    zhHans: '查看更多 ▶',
    zhHant: '查看更多 ▶',
    ko: '더 보기 ▶',
    hi: 'और देखें ▶',
    id: 'Selengkapnya ▶',
    th: 'อ่านเพิ่ม ▶',
    vi: 'Xem thêm ▶',
    tr: 'Daha fazla ▶',
  },
  eventRowReadMoreAccessibility: {
    ja: 'メモの全文を表示',
    en: 'Show full memo',
    fr: 'Afficher la note complète',
    es: 'Mostrar nota completa',
    de: 'Vollständige Notiz anzeigen',
    it: 'Mostra nota completa',
    pt: 'Mostrar nota completa',
    nl: 'Volledige notitie tonen',
    sv: 'Visa hela anteckningen',
    pl: 'Pokaż pełną notatkę',
    ru: 'Показать полную заметку',
    zhHans: '显示完整备忘',
    zhHant: '顯示完整備忘',
    ko: '메모 전문 표시',
    hi: 'पूरा नोट दिखाएँ',
    id: 'Tampilkan catatan lengkap',
    th: 'แสดงบันทึกเต็ม',
    vi: 'Hiển thị toàn bộ ghi chú',
    tr: 'Tüm notu göster',
  },
  // ============================================================
  // ADR-0041 D3: 写真 Viewer
  // ============================================================
  photoViewerIndexOfTotal: {
    ja: '{i} / {n}',
    en: '{i} / {n}',
    fr: '{i} / {n}',
    es: '{i} / {n}',
    de: '{i} / {n}',
    it: '{i} / {n}',
    pt: '{i} / {n}',
    nl: '{i} / {n}',
    sv: '{i} / {n}',
    pl: '{i} / {n}',
    ru: '{i} / {n}',
    zhHans: '{i} / {n}',
    zhHant: '{i} / {n}',
    ko: '{i} / {n}',
    hi: '{i} / {n}',
    id: '{i} / {n}',
    th: '{i} / {n}',
    vi: '{i} / {n}',
    tr: '{i} / {n}',
  },
  // ============================================================
  // ADR-0041 D2: 写真 strip a11y
  // ============================================================
  photoStripAccessibility: {
    ja: '写真 {count} 枚、 タップで拡大',
    en: '{count} photo(s), tap to enlarge',
    fr: '{count} photo(s), appuyer pour agrandir',
    es: '{count} foto(s), tocar para ampliar',
    de: '{count} Foto(s), zum Vergrößern tippen',
    it: '{count} foto, tocca per ingrandire',
    pt: '{count} foto(s), tocar para ampliar',
    nl: '{count} foto(s), tik om te vergroten',
    sv: '{count} foto(n), tryck för att förstora',
    pl: '{count} zdjęć, naciśnij aby powiększyć',
    ru: 'Фото: {count}, нажмите для увеличения',
    zhHans: '照片 {count} 张，点击放大',
    zhHant: '照片 {count} 張，點擊放大',
    ko: '사진 {count}장, 탭하여 확대',
    hi: '{count} फ़ोटो, बड़ा करने के लिए टैप करें',
    id: '{count} foto, ketuk untuk perbesar',
    th: 'ภาพ {count} ภาพ แตะเพื่อขยาย',
    vi: '{count} ảnh, chạm để phóng to',
    tr: '{count} fotoğraf, büyütmek için dokunun',
  },
};

function fileForLang(lang) {
  return resolve(LOCALES_DIR, `${lang}.ts`);
}

function addKeysToLocale(lang) {
  const filePath = fileForLang(lang);
  let content = readFileSync(filePath, 'utf8');

  // 各 key について、 既存 grep して未存在のみ追加
  const lines = content.split('\n');
  // 最後の `};` (default export object 終端) を探す
  let closeIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '};') {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    throw new Error(`${lang}: closing '};' not found`);
  }

  const toAdd = [];
  for (const [key, langMap] of Object.entries(NEW_KEYS)) {
    // 既存 key check
    const existsRe = new RegExp(`^\\s+${key}:\\s*`, 'm');
    if (existsRe.test(content)) continue;
    const value = langMap[lang];
    if (value == null) {
      throw new Error(`${lang}: missing translation for key '${key}'`);
    }
    // escape single quote
    const escaped = value.replace(/'/g, "\\'");
    toAdd.push(`  ${key}: '${escaped}',`);
  }

  if (toAdd.length === 0) {
    return { lang, added: 0 };
  }

  lines.splice(closeIdx, 0, ...toAdd);
  writeFileSync(filePath, lines.join('\n'), 'utf8');
  return { lang, added: toAdd.length };
}

function main() {
  console.log(`Adding ${Object.keys(NEW_KEYS).length} new keys to ${LANGS.length} locales...`);
  const results = [];
  for (const lang of LANGS) {
    try {
      const r = addKeysToLocale(lang);
      results.push(r);
      console.log(`  ${r.lang.padEnd(8)} +${r.added} keys`);
    } catch (e) {
      console.error(`  ${lang.padEnd(8)} ERROR: ${e.message}`);
      process.exit(2);
    }
  }
  console.log(`\nDone. Total: ${results.reduce((s, r) => s + r.added, 0)} entries added.`);
}

main();
