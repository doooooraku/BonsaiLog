/**
 * F-10 エクスポート Hub + Options Sheet + exportFlow 静的解析 test
 * (Issue #33 / ADR-0016 AC2 / AC11 / AC12)。
 *
 * ConfirmDialog.test.tsx 等で確立した静的解析 pattern (fs.readFileSync + regex) を踏襲。
 * Hub が 5 種類を露出し、リスト系はシートで条件確定 → Hub が一元生成 (runExport)、bonsai_pdf は
 * picker へ分岐し、Sheet が期間/対象/アーカイブを持ち、exportFlow が 4 種を扱うことを構造保証する。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const HUB = r('../../../app/export/index.tsx');
const SHEET = r('../../../src/features/export/ExportOptionsSheet.tsx');
const FLOW = r('../../../src/features/export/exportFlow.ts');
const SETTINGS = r('../../../app/settings/index.tsx');
const LAYOUT = r('../../../app/export/_layout.tsx');
const EVENT_REPO = r('../../../src/db/eventRepository.ts');

describe('Export Hub (ADR-0016 AC11)', () => {
  test('1. 5 種類すべてを catalog に持つ', () => {
    for (const k of ['bonsai_csv', 'events_csv', 'species_csv', 'bonsai_pdf', 'list_pdf']) {
      expect(HUB).toContain(`k: '${k}'`);
    }
  });

  test('2. CSV/PDF section 分け + FormScreenHeader (raw route header 回避)', () => {
    expect(HUB).toMatch(/exportHubCsvSection/);
    expect(HUB).toMatch(/exportHubPdfSection/);
    expect(HUB).toMatch(/FormScreenHeader/);
    expect(LAYOUT).toMatch(/headerShown:\s*false/);
  });

  test('3. Free は Paywall / bonsai_pdf は picker / 他はシートを開く分岐', () => {
    expect(HUB).toMatch(/if\s*\(!isPro\)/);
    expect(HUB).toMatch(/goToPaywall/);
    expect(HUB).toMatch(/router\.push\('\/export\/pdf' as Href\)/);
    expect(HUB).toMatch(/setSheetType\(k as ExportTypeKey\)/);
  });

  test('4. Hub screen + row testID + PRO バッジ + シート埋め込み', () => {
    expect(HUB).toContain('e2e_export_hub_screen');
    expect(HUB).toMatch(/e2e_export_hub_row_\$\{def\.k\}/);
    expect(HUB).toMatch(/proBadgeShort/);
    expect(HUB).toMatch(/<ExportOptionsSheet/);
  });
});

describe('Export Options Sheet (ADR-0016 AC11 Options / AC12 Y4)', () => {
  test('5. RN Modal transparent slide + 生成 testID', () => {
    expect(SHEET).toMatch(/<Modal[\s\S]*transparent[\s\S]*animationType="slide"/);
    expect(SHEET).toMatch(/onRequestClose=\{onClose\}/);
    expect(SHEET).toContain('e2e_export_options_generate');
    expect(SHEET).toContain('e2e_export_options_sheet');
  });

  test('6. 期間/対象/アーカイブ 3 種のオプション', () => {
    expect(SHEET).toMatch(/exportOptPeriodLabel/);
    expect(SHEET).toMatch(/exportOptScopeLabel/);
    expect(SHEET).toMatch(/exportOptIncludeArchived/);
    // 対象=選択/タグ の picker
    expect(SHEET).toMatch(/e2e_export_opt_bonsai_\$\{card\.id\}/);
    expect(SHEET).toMatch(/e2e_export_opt_tag_\$\{tg\.id\}/);
    // Sess56: 盆栽選択 row は写真カード atom (BonsaiSelectableCard) に統一
    // (BonsaiMultiSelectScreen と共用、重複削除)。
    expect(SHEET).toMatch(/BonsaiSelectableCard/);
  });

  test('7. 0 件選択 / タグ未選択のバリデーション (AC12)', () => {
    expect(SHEET).toMatch(/selectedIds\.length === 0/);
    expect(SHEET).toMatch(/exportOptScopeEmptyBody/);
    expect(SHEET).toMatch(/exportOptTagEmptyBody/);
  });

  test('8. ストレージ事前チェック / 生成は Hub に委譲 (onGenerate)、Sheet は runExport しない (Sess55)', () => {
    expect(SHEET).toMatch(/isStorageSufficient/);
    // 生成 + 共有 + 生成中オーバーレイは Hub に委譲 (二重 Modal 回避)。Sheet は条件を返すだけ。
    expect(SHEET).toMatch(/onGenerate\(/);
    expect(SHEET).not.toMatch(/runExport/);
    // Hub が 4 種を中間画面なしで一元生成 (即出力 → OS 共有)
    expect(HUB).toMatch(/await runExport\(/);
    // 中間プレビュー画面 (csv-preview / list-preview) はいずれも撤去済み
    expect(SHEET).not.toContain('/export/csv-preview');
    expect(SHEET).not.toContain('/export/list-preview');
  });
});

describe('exportFlow orchestration', () => {
  test('9. runExport が 4 種を分岐 + 既存ロジック関数を使用', () => {
    expect(FLOW).toMatch(/export async function runExport/);
    // CSV 3 種は人間可読再設計: 各 buildXxxRow / buildSpeciesSummaryRows + cellsToCsvString
    expect(FLOW).toMatch(/buildBonsaiCsvRow/);
    expect(FLOW).toMatch(/buildEventCsvRow/);
    expect(FLOW).toMatch(/buildSpeciesSummaryRows/);
    expect(FLOW).toMatch(/cellsToCsvString/);
    expect(FLOW).toMatch(/buildBonsaiListPdfHtml/);
    // Sess51 Phase 3: list_pdf は写真サムネ付きカタログ → 3 段階フォールバック出力
    expect(FLOW).toMatch(/generateListPdfWithFallback/);
  });

  test('10. resolvePeriodRange + OPTION_APPLIES + scope/archived 解決', () => {
    expect(FLOW).toMatch(/export function resolvePeriodRange/);
    expect(FLOW).toMatch(/export const OPTION_APPLIES/);
    expect(FLOW).toMatch(/getEventsInRange/);
    expect(FLOW).toMatch(/getAllArchivedBonsai/);
    expect(FLOW).toMatch(/getBonsaiByTag/);
  });

  test('11. eventRepository.getEventsInRange は deleted 除外 + 期間/対象フィルタ', () => {
    expect(EVENT_REPO).toMatch(/export async function getEventsInRange/);
    expect(EVENT_REPO).toMatch(/deleted_at IS NULL/);
    expect(EVENT_REPO).toMatch(/occurred_at_utc >= \?/);
    expect(EVENT_REPO).toMatch(/bonsai_id IN/);
  });
});

describe('設定エントリ集約', () => {
  test('12. 設定は単一 e2e_open_export_hub 行で /export へ、旧 3 行 testID は撤去済み', () => {
    expect(SETTINGS).toContain('e2e_open_export_hub');
    expect(SETTINGS).toMatch(/router\.push\('\/export' as Href\)/);
    expect(SETTINGS).not.toContain('e2e_open_export_csv');
    expect(SETTINGS).not.toContain('e2e_open_export_pdf');
    expect(SETTINGS).not.toContain('e2e_open_export_list_pdf');
  });
});
