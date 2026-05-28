/**
 * F-10 個別盆栽 PDF レポート構造化データ純関数 単体テスト (Sess49 / ADR-0016)。
 * t は identity (キー名 + placeholder replace) で、ローカライズ呼び出しと適応型挙動を検証する。
 */
import {
  buildBonsaiPdfReport,
  type BonsaiPdfReportInput,
  PEST_EVENT_TYPES,
} from '@/src/features/export/bonsaiPdfReport';
import type { Bonsai, Event } from '@/src/db/schema';

// identity t: 翻訳キーをそのまま返し、placeholder 解決後の整形を検証可能にする
const t = ((k: string) => k) as BonsaiPdfReportInput['t'];

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e1',
    bonsaiId: 'b1',
    type: 'watering',
    status: 'logged',
    occurredAtUtc: '2026-05-01T03:00:00.000Z',
    tzOffsetMin: 540,
    tzIana: 'Asia/Tokyo',
    durationMin: null,
    payloadJson: null,
    note: null,
    deletedAt: null,
    createdAt: '2026-05-01T03:00:00.000Z',
    updatedAt: '2026-05-01T03:00:00.000Z',
    ...overrides,
  } as unknown as Event;
}

function makeBonsai(overrides: Partial<Bonsai> = {}): BonsaiPdfReportInput['bonsai'] {
  return {
    name: '父の黒松',
    style: 'moyogi',
    acquiredAt: '2020-03-15T00:00:00.000Z',
    estimatedAge: 35,
    estimatedAgeUnknown: 0,
    memo: null,
    acquiredFrom: null,
    potInfo: null,
    ...overrides,
  } as BonsaiPdfReportInput['bonsai'];
}

function makeInput(overrides: Partial<BonsaiPdfReportInput> = {}): BonsaiPdfReportInput {
  return {
    bonsai: makeBonsai(),
    speciesName: '黒松',
    events: [],
    coverPhotoUri: null,
    coverPhotoTakenAt: null,
    photoUrisByEventId: {},
    galleryUris: [],
    tags: [],
    t,
    ...overrides,
  };
}

describe('buildBonsaiPdfReport — meta (個票)', () => {
  test('基本フィールドが揃う (樹種/樹形/樹齢/取得日)', () => {
    const r = buildBonsaiPdfReport(makeInput());
    expect(r.meta.name).toBe('父の黒松');
    expect(r.meta.speciesName).toBe('黒松');
    expect(r.meta.styleLabel).toBe('bonsaiStyle_moyogi'); // 標準樹形は i18n key
    expect(r.meta.ageText).toBe('elapsedYears'); // {years} を含む key (identity t)
    // 取得日のみ (保有年数は削除済 ④)
    expect(r.meta.acquiredText).toBe('2020-03-15');
  });

  test('適応型: 空フィールドは undefined (出力しない)', () => {
    const r = buildBonsaiPdfReport(
      makeInput({
        bonsai: makeBonsai({
          style: null,
          acquiredAt: null,
          estimatedAge: null,
          estimatedAgeUnknown: 0,
          memo: '  ',
          acquiredFrom: '',
          potInfo: null,
        }),
        speciesName: null,
      }),
    );
    expect(r.meta.speciesName).toBeUndefined();
    expect(r.meta.styleLabel).toBeUndefined();
    expect(r.meta.ageText).toBeUndefined();
    expect(r.meta.acquiredText).toBeUndefined();
    expect(r.meta.acquiredFrom).toBeUndefined();
    expect(r.meta.potText).toBeUndefined();
    expect(r.meta.memo).toBeUndefined();
    expect(r.meta.tags).toEqual([]);
  });

  test('樹齢「不明」フラグが推定年数より優先', () => {
    const r = buildBonsaiPdfReport(
      makeInput({ bonsai: makeBonsai({ estimatedAge: 35, estimatedAgeUnknown: 1 }) }),
    );
    expect(r.meta.ageText).toBe('bonsaiFieldEstimatedAgeUnknown');
  });

  test('カスタム樹形は生文字列のまま', () => {
    const r = buildBonsaiPdfReport(makeInput({ bonsai: makeBonsai({ style: '文人木' }) }));
    expect(r.meta.styleLabel).toBe('文人木');
  });

  test('鉢 / タグ / メモ / 入手元が整形される', () => {
    const r = buildBonsaiPdfReport(
      makeInput({
        bonsai: makeBonsai({
          potInfo: JSON.stringify({ widthCm: 18, depthCm: 6, material: '常滑' }),
          memo: '父から継承した黒松。',
          acquiredFrom: '父から継承',
        }),
        tags: ['師匠の家', '紅葉'],
      }),
    );
    expect(r.meta.potText).toContain('18×6cm');
    expect(r.meta.potText).toContain('常滑');
    expect(r.meta.memo).toBe('父から継承した黒松。');
    expect(r.meta.acquiredFrom).toBe('父から継承');
    expect(r.meta.tags).toEqual(['師匠の家', '紅葉']);
  });

  test('取得日は日付のみ (時刻部分は落とす)', () => {
    const r = buildBonsaiPdfReport(
      makeInput({ bonsai: makeBonsai({ acquiredAt: '2030-01-01T09:30:00.000Z' }) }),
    );
    expect(r.meta.acquiredText).toBe('2030-01-01');
  });
});

describe('buildBonsaiPdfReport — timeline (作業ログ)', () => {
  test('種別名 / 日付(ローカル) / バッジ色 / チップ', () => {
    const e = makeEvent({
      type: 'wiring',
      payloadJson: JSON.stringify({ wire_size_mm: 2, body_part: 'miki' }),
      note: '主幹を矯正',
    });
    const r = buildBonsaiPdfReport(makeInput({ events: [e] }));
    expect(r.timeline).toHaveLength(1);
    const entry = r.timeline[0]!;
    expect(entry.typeLabel).toBe('eventType_wiring');
    expect(entry.date).toBe('2026-05-01'); // UTC 03:00 + JST = 同日
    expect(entry.badgeBg).toMatch(/^#/);
    expect(entry.badgeFg).toMatch(/^#/);
    expect(entry.note).toBe('主幹を矯正');
    // wire_size_mm → 「workLogWireGauge: 2mm」、body_part → 部位チップ
    expect(entry.chips.some((c) => c.includes('2mm'))).toBe(true);
    expect(entry.chips.length).toBeGreaterThanOrEqual(2);
  });

  test('インライン写真は event_id で振り分け', () => {
    const e = makeEvent({ id: 'ev-photo' });
    const r = buildBonsaiPdfReport(
      makeInput({
        events: [e],
        photoUrisByEventId: { 'ev-photo': ['data:image/jpeg;base64,AAA'] },
      }),
    );
    expect(r.timeline[0]!.photoUris).toEqual(['data:image/jpeg;base64,AAA']);
  });

  test('payload 無しの作業はチップ空配列 (適応型)', () => {
    const r = buildBonsaiPdfReport(makeInput({ events: [makeEvent({ payloadJson: null })] }));
    expect(r.timeline[0]!.chips).toEqual([]);
  });

  test('tz 異常時は日付部分 fallback (例外を投げない)', () => {
    const r = buildBonsaiPdfReport(makeInput({ events: [makeEvent({ tzIana: 'Invalid/Zone' })] }));
    expect(r.timeline[0]!.date).toBe('2026-05-01');
  });
});

describe('buildBonsaiPdfReport — pestEvents (病害虫・対処)', () => {
  test('pest_control / leaf_first_aid のみ抽出', () => {
    const events = [
      makeEvent({ id: '1', type: 'watering' }),
      makeEvent({
        id: '2',
        type: 'pest_control',
        payloadJson: JSON.stringify({ target: 'treatment', agent: 'コロマイト乳剤' }),
        note: 'ハダニ確認',
      }),
      makeEvent({
        id: '3',
        type: 'leaf_first_aid',
        payloadJson: JSON.stringify({ symptom: 'burn', treatment: '遮光強化' }),
      }),
      makeEvent({ id: '4', type: 'pruning' }),
    ];
    const r = buildBonsaiPdfReport(makeInput({ events }));
    expect(r.pestEvents).toHaveLength(2);
    expect(r.pestEvents[0]!.note).toBe('ハダニ確認');
    expect(r.pestEvents[0]!.symptomBodyPart.length).toBeGreaterThan(0);
    // タイムラインには全件出る
    expect(r.timeline).toHaveLength(4);
  });

  test('PEST_EVENT_TYPES は pest_control / leaf_first_aid', () => {
    expect(PEST_EVENT_TYPES.has('pest_control')).toBe(true);
    expect(PEST_EVENT_TYPES.has('leaf_first_aid')).toBe(true);
    expect(PEST_EVENT_TYPES.has('watering')).toBe(false);
  });

  test('病害虫の記録が無ければ pestEvents 空 (セクション非表示の根拠)', () => {
    const r = buildBonsaiPdfReport(makeInput({ events: [makeEvent({ type: 'watering' })] }));
    expect(r.pestEvents).toEqual([]);
  });
});

describe('buildBonsaiPdfReport — 写真', () => {
  test('cover 写真 + 撮影日キャプション', () => {
    const r = buildBonsaiPdfReport(
      makeInput({
        coverPhotoUri: 'data:image/jpeg;base64,COVER',
        coverPhotoTakenAt: '2026-04-22T00:00:00.000Z',
      }),
    );
    expect(r.coverPhotoUri).toBe('data:image/jpeg;base64,COVER');
    // identity t は placeholder を解決しないため key 名で検証 (eventCsvRow.test と同方針)
    expect(r.coverPhotoCaption).toBe('exportPdfPhotoTakenAt');
  });

  test('cover 無しなら caption も無し', () => {
    const r = buildBonsaiPdfReport(makeInput({ coverPhotoUri: null }));
    expect(r.coverPhotoUri).toBeUndefined();
    expect(r.coverPhotoCaption).toBeUndefined();
  });

  test('gallery 写真はそのまま渡る', () => {
    const r = buildBonsaiPdfReport(makeInput({ galleryUris: ['data:image/jpeg;base64,G1'] }));
    expect(r.gallery).toEqual(['data:image/jpeg;base64,G1']);
  });
});
