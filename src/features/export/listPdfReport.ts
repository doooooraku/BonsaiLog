/**
 * F-10 list_pdf リッチレポートの集計純関数 (Issue #33 / ADR-0016)。
 *
 * 役割: DB から読んだ盆栽 + 作業イベント (status='logged' に絞った後) を受け取り、
 * 表紙サマリー / 棒グラフ (Phase 1) / ヒートマップ (Phase 2) / カタログ (Phase 3) 用の
 * 「表示用に確定した数値」へ変換する純関数群。HTML 組み立て (listPdfExport.ts) は
 * この出力を配置するだけにして純粋に保つ。bonsaiPdfReport.ts と同じ
 * 「DB / expo-print 非依存 + identity t でテスト可能」分離。
 *
 * 月キーは toLocalDateKey (dateUtils) を流用し各 event 固有の tzOffsetMin でローカル化する
 * (new Date().getMonth() の環境依存 / UTC 直 slice を回避、ADR-0008 §TZ)。
 */
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

/** 集計対象の盆栽 (DB から解決済み)。 */
export type ListReportBonsaiInput = {
  id: string;
  name: string;
  /** master / custom 解決済みの樹種通称 (無ければ null)。 */
  speciesName: string | null;
  /** 樹形 (raw style code or カスタム名、distinct 計数用、無ければ null)。 */
  style: string | null;
  /** 取得日 (ISO UTC、カタログ表示用、無ければ null)。 */
  acquiredAt: string | null;
};

/** 集計対象の作業イベント (呼出側で status='logged' に絞った後)。 */
export type ListReportEventInput = {
  bonsaiId: string;
  type: string;
  occurredAtUtc: string;
  tzOffsetMin: number;
};

/** 表紙サマリーカード (P1)。 */
export type ListReportSummary = {
  bonsaiCount: number;
  speciesCount: number;
  styleCount: number;
  totalEvents: number;
};

/** 棒グラフ 1 本分。pct は系列内 max を 100 とした相対値 (CSS 幅% 用、0-100)。 */
export type BarDatum = { label: string; count: number; pct: number };

/** 棒グラフ 3 種 (P1)。 */
export type ListReportBars = {
  /** 盆栽別の累計作業数 (降順、上位 N + その他集約)。 */
  perBonsai: BarDatum[];
  /** 樹種構成 (樹種ごとの保有本数、降順)。 */
  perSpecies: BarDatum[];
  /** 月別の記録数 (月軸に沿って時系列、欠損月は 0)。 */
  perMonth: BarDatum[];
};

/** 月軸の上限 (A4 幅に収める / 10 年分の暴発を防ぐ)。 */
export const MAX_MONTHS = 24;

/** UTC ISO + tzOffsetMin → ローカル月キー 'YYYY-MM'。 */
export function toLocalMonthKey(isoUtc: string, tzOffsetMin: number): string {
  return toLocalDateKey(isoUtc, tzOffsetMin).slice(0, 7);
}

/** 'YYYY-MM' を 1 ヶ月進める。 */
function nextMonth(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const carry = m >= 12;
  const ny = carry ? y + 1 : y;
  const nm = carry ? 1 : m + 1;
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}`;
}

/**
 * fromMonth..toMonth (両端含む) を連続生成 (欠損月も 0 埋め用に列を作る)。
 * 件数が maxMonths を超える場合は直近 maxMonths 件にクランプ (古い側を捨てる)。
 * 空入力 / from > to は防御して空配列 or [from] を返す。
 */
export function buildMonthAxis(
  fromMonth: string,
  toMonth: string,
  maxMonths: number = MAX_MONTHS,
): string[] {
  if (!fromMonth || !toMonth || fromMonth > toMonth) {
    return fromMonth ? [fromMonth] : [];
  }
  const months: string[] = [];
  let cur = fromMonth;
  // 異常入力でも無限ループしないよう上限ガード。
  for (let i = 0; i < 10000; i++) {
    months.push(cur);
    if (cur === toMonth) break;
    cur = nextMonth(cur);
  }
  return months.length > maxMonths ? months.slice(months.length - maxMonths) : months;
}

/** logged events の最古〜最新を連続月軸へ。events 無しは空配列。 */
export function monthAxisFromEvents(events: readonly ListReportEventInput[]): string[] {
  if (events.length === 0) return [];
  const keys = events.map((e) => toLocalMonthKey(e.occurredAtUtc, e.tzOffsetMin)).sort();
  return buildMonthAxis(keys[0] as string, keys[keys.length - 1] as string);
}

/** 表紙サマリー (盆栽総数 / 樹種数 / 樹形数 / 通算記録)。 */
export function buildListReportSummary(
  bonsai: readonly ListReportBonsaiInput[],
  events: readonly ListReportEventInput[],
): ListReportSummary {
  const species = new Set<string>();
  const styles = new Set<string>();
  for (const b of bonsai) {
    if (b.speciesName) species.add(b.speciesName);
    if (b.style) styles.add(b.style);
  }
  return {
    bonsaiCount: bonsai.length,
    speciesCount: species.size,
    styleCount: styles.size,
    totalEvents: events.length,
  };
}

/** { label, count }[] → BarDatum[] (系列内 max 基準で pct を付与、小数 1 桁)。 */
function toBars(entries: readonly { label: string; count: number }[]): BarDatum[] {
  const max = entries.reduce((m, e) => Math.max(m, e.count), 0);
  return entries.map((e) => ({
    label: e.label,
    count: e.count,
    pct: max > 0 ? Math.round((e.count / max) * 1000) / 10 : 0,
  }));
}

/**
 * 棒グラフ 3 種を生成。
 * @param opts.topBonsai perBonsai の表示上限 (超過分は「その他」へ集約)
 * @param opts.months perMonth / 時系列の月軸 (呼出側が monthAxisFromEvents 等で確定)
 * @param opts.othersLabelTemplate 「その他({count})」のテンプレ ({count}=残り盆栽数)
 */
export function buildListReportBars(
  bonsai: readonly ListReportBonsaiInput[],
  events: readonly ListReportEventInput[],
  opts: { topBonsai: number; months: readonly string[]; othersLabelTemplate: string },
): ListReportBars {
  // perBonsai: 木ごとの件数降順、上位 topBonsai + 「その他({残数})」集約。
  const countByBonsai = new Map<string, number>();
  for (const e of events) {
    countByBonsai.set(e.bonsaiId, (countByBonsai.get(e.bonsaiId) ?? 0) + 1);
  }
  const perBonsaiSorted = bonsai
    .map((b) => ({ label: b.name, count: countByBonsai.get(b.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const top = perBonsaiSorted.slice(0, opts.topBonsai);
  const rest = perBonsaiSorted.slice(opts.topBonsai);
  if (rest.length > 0) {
    const restSum = rest.reduce((s, e) => s + e.count, 0);
    top.push({
      label: opts.othersLabelTemplate.replace('{count}', String(rest.length)),
      count: restSum,
    });
  }

  // perSpecies: 樹種ごとの「盆栽の本数」降順。
  const countBySpecies = new Map<string, number>();
  for (const b of bonsai) {
    if (b.speciesName) {
      countBySpecies.set(b.speciesName, (countBySpecies.get(b.speciesName) ?? 0) + 1);
    }
  }
  const perSpeciesSorted = [...countBySpecies.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // perMonth: 与えられた月軸ごとの件数 (時系列、欠損月は 0)。
  const countByMonth = new Map<string, number>();
  for (const e of events) {
    const mk = toLocalMonthKey(e.occurredAtUtc, e.tzOffsetMin);
    countByMonth.set(mk, (countByMonth.get(mk) ?? 0) + 1);
  }
  const perMonth = opts.months.map((m) => ({ label: m, count: countByMonth.get(m) ?? 0 }));

  return {
    perBonsai: toBars(top),
    perSpecies: toBars(perSpeciesSorted),
    perMonth: toBars(perMonth),
  };
}

// ---------------------------------------------------------------------------
// Phase 2: お世話ヒートマップ (木 × 月の作業件数)
// ---------------------------------------------------------------------------

/** ヒートマップ 1 マス。count = 件数 (一次情報)、level = 色段階 (副次)。 */
export type HeatmapCell = { count: number; level: 0 | 1 | 2 | 3 | 4 };

/** 木 × 月 ヒートマップ (P2)。 */
export type ListReportHeatmap = {
  /** 列 = 月軸 (YYYY-MM)。 */
  months: string[];
  /** 行 = 盆栽 (件数合計の降順)。 */
  rows: { bonsaiId: string; name: string; cells: HeatmapCell[]; total: number }[];
  /** 月別合計 (列ごと、months と同順)。 */
  monthTotals: number[];
  /** 記録の多い月 (降順、最大 3、0 件は除外)。 */
  topMonths: { month: string; count: number }[];
  /** level 算出の基準となる全マス最大件数 (凡例表示用)。 */
  maxCell: number;
};

/**
 * 件数 → 色段階 (0-4)。達成判定ではなく「件数の多寡」の相対量子化。
 * maxCell 基準の相対値 (各ユーザーの中での多寡を事実として示す。絶対閾値だと
 * 水やり頻度の違うユーザー間で色が偏るため)。0 件は常に level 0。
 */
export function heatmapLevel(count: number, maxCell: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || maxCell <= 0) return 0;
  const r = count / maxCell;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

/**
 * 木 × 月 のヒートマップを生成。行は件数合計の降順 (よく手をかけた木が上)。
 * @param months 列の月軸 (呼出側が monthAxisFromEvents 等で確定、空なら空マトリクス)
 */
export function buildListReportHeatmap(
  bonsai: readonly ListReportBonsaiInput[],
  events: readonly ListReportEventInput[],
  months: readonly string[],
): ListReportHeatmap {
  const monthIndex = new Map<string, number>(months.map((m, i) => [m, i]));
  // bonsaiId → 月 index 別の件数配列。
  const countsByBonsai = new Map<string, number[]>();
  for (const b of bonsai) countsByBonsai.set(b.id, new Array<number>(months.length).fill(0));
  for (const e of events) {
    const arr = countsByBonsai.get(e.bonsaiId);
    if (!arr) continue;
    const mi = monthIndex.get(toLocalMonthKey(e.occurredAtUtc, e.tzOffsetMin));
    if (mi !== undefined) arr[mi] = (arr[mi] ?? 0) + 1;
  }

  let maxCell = 0;
  for (const arr of countsByBonsai.values()) {
    for (const c of arr) maxCell = Math.max(maxCell, c);
  }

  const rows = bonsai
    .map((b) => {
      const counts = countsByBonsai.get(b.id) ?? new Array<number>(months.length).fill(0);
      return {
        bonsaiId: b.id,
        name: b.name,
        total: counts.reduce((s, c) => s + c, 0),
        cells: counts.map((c) => ({ count: c, level: heatmapLevel(c, maxCell) })),
      };
    })
    .sort((a, b) => b.total - a.total);

  const monthTotals = months.map((_, i) => rows.reduce((s, r) => s + (r.cells[i]?.count ?? 0), 0));
  const topMonths = months
    .map((m, i) => ({ month: m, count: monthTotals[i] ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return { months: [...months], rows, monthTotals, topMonths, maxCell };
}

// ---------------------------------------------------------------------------
// Phase 3: 盆栽カタログ (木ごとのカード)
// ---------------------------------------------------------------------------

/** カタログ 1 件分 (写真 URI は持たない。写真は HTML 層直前で attempt 別に注入)。 */
export type CatalogEntry = {
  bonsaiId: string;
  name: string;
  /** master / custom 解決済みの樹種通称 (無ければ null)。 */
  speciesName: string | null;
  /** ローカライズ済み樹形ラベル (無ければ null)。 */
  styleLabel: string | null;
  /** 取得日 (YYYY-MM-DD、無ければ null)。 */
  acquiredAt: string | null;
  /** 作業種別の内訳 (ローカライズ済みラベル + 件数、降順)。 */
  typeBreakdown: { typeLabel: string; count: number }[];
  /** 累計作業件数。 */
  totalCount: number;
};

/**
 * 盆栽カタログのデータを生成 (件数合計の降順 = よく手をかけた木が上、mockup 整合)。
 * @param opts.typeLabelOf  event.type → ローカライズ済み種別名 (eventType_{type})
 * @param opts.styleLabelOf raw style → ローカライズ済み樹形名 (formatStyle)
 */
export function buildCatalogEntries(
  bonsai: readonly ListReportBonsaiInput[],
  events: readonly ListReportEventInput[],
  opts: { typeLabelOf: (type: string) => string; styleLabelOf: (style: string) => string },
): CatalogEntry[] {
  const eventsByBonsai = new Map<string, ListReportEventInput[]>();
  for (const e of events) {
    const arr = eventsByBonsai.get(e.bonsaiId);
    if (arr) arr.push(e);
    else eventsByBonsai.set(e.bonsaiId, [e]);
  }
  return bonsai
    .map((b) => {
      const evs = eventsByBonsai.get(b.id) ?? [];
      const counts = new Map<string, number>();
      for (const e of evs) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
      const typeBreakdown = [...counts.entries()]
        .map(([type, count]) => ({ typeLabel: opts.typeLabelOf(type), count }))
        .sort((a, b) => b.count - a.count);
      return {
        bonsaiId: b.id,
        name: b.name,
        speciesName: b.speciesName,
        styleLabel: b.style ? opts.styleLabelOf(b.style) : null,
        acquiredAt: b.acquiredAt ? b.acquiredAt.slice(0, 10) : null,
        typeBreakdown,
        totalCount: evs.length,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount);
}
