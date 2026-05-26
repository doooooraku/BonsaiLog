/**
 * F-10 エクスポート Hub + 欠落 CSV 配線 静的解析 test (Issue #33 / ADR-0016 AC2 / AC11)。
 *
 * ConfirmDialog.test.tsx 等で確立した静的解析 pattern (fs.readFileSync + regex) を踏襲。
 * expo-sqlite / RN 環境不要で、Hub が 5 種類を露出し各 CSV 画面が Pro gate + 正しい
 * ロジック関数を呼ぶことを構造保証する。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HUB = readFileSync(resolve(__dirname, '../../../app/export/index.tsx'), 'utf8');
const BONSAI_CSV = readFileSync(resolve(__dirname, '../../../app/export/bonsai-csv.tsx'), 'utf8');
const SPECIES_CSV = readFileSync(resolve(__dirname, '../../../app/export/species-csv.tsx'), 'utf8');
const SETTINGS = readFileSync(resolve(__dirname, '../../../app/settings/index.tsx'), 'utf8');
const LAYOUT = readFileSync(resolve(__dirname, '../../../app/export/_layout.tsx'), 'utf8');

describe('Export Hub (ADR-0016 AC11)', () => {
  test('1. 5 種類すべてを catalog に持つ (AC2: bonsai_csv/events_csv/species_csv/bonsai_pdf/list_pdf)', () => {
    for (const k of ['bonsai_csv', 'events_csv', 'species_csv', 'bonsai_pdf', 'list_pdf']) {
      expect(HUB).toContain(`k: '${k}'`);
    }
  });

  test('2. CSV 行は 3 種 / PDF 行は 2 種で section 分け', () => {
    expect(HUB).toMatch(/fmt === 'CSV'/);
    expect(HUB).toMatch(/fmt === 'PDF'/);
    expect(HUB).toMatch(/exportHubCsvSection/);
    expect(HUB).toMatch(/exportHubPdfSection/);
  });

  test('3. 5 種の遷移先 route が揃っている', () => {
    for (const r of [
      '/export/bonsai-csv',
      '/export/csv',
      '/export/species-csv',
      '/export/pdf',
      '/export/list-pdf',
    ]) {
      expect(HUB).toContain(`'${r}'`);
    }
  });

  test('4. Hub screen + row testID + PRO バッジ', () => {
    expect(HUB).toContain('e2e_export_hub_screen');
    expect(HUB).toMatch(/e2e_export_hub_row_\$\{def\.k\}/);
    expect(HUB).toMatch(/proBadgeShort/);
  });

  test('5. FormScreenHeader を使う (raw route header 不具合の回避)', () => {
    expect(HUB).toMatch(/FormScreenHeader/);
    expect(LAYOUT).toMatch(/headerShown:\s*false/);
  });
});

describe('bonsai_csv / species_csv 画面配線 (ADR-0016 AC2 UI)', () => {
  test('6. bonsai_csv は Pro gate + bonsaiToCsvString + getAllActiveBonsaiWithSpecies', () => {
    expect(BONSAI_CSV).toMatch(/if\s*\(!isPro\)/);
    expect(BONSAI_CSV).toMatch(/goToPaywall/);
    expect(BONSAI_CSV).toMatch(/bonsaiToCsvString/);
    expect(BONSAI_CSV).toMatch(/getAllActiveBonsaiWithSpecies/);
    expect(BONSAI_CSV).toContain('e2e_export_bonsai_csv_action');
  });

  test('7. species_csv は Pro gate + speciesToCsvString + getAllSpecies', () => {
    expect(SPECIES_CSV).toMatch(/if\s*\(!isPro\)/);
    expect(SPECIES_CSV).toMatch(/goToPaywall/);
    expect(SPECIES_CSV).toMatch(/speciesToCsvString/);
    expect(SPECIES_CSV).toMatch(/getAllSpecies/);
    expect(SPECIES_CSV).toContain('e2e_export_species_csv_action');
  });

  test('8. 両画面ともストレージ事前チェック (AC7)', () => {
    expect(BONSAI_CSV).toMatch(/isStorageSufficient/);
    expect(SPECIES_CSV).toMatch(/isStorageSufficient/);
  });
});

describe('設定エントリ集約 (mockup: 単一エントリ → Hub)', () => {
  test('9. 設定は単一の e2e_open_export_hub 行で /export へ', () => {
    expect(SETTINGS).toContain('e2e_open_export_hub');
    expect(SETTINGS).toMatch(/router\.push\('\/export' as Href\)/);
  });

  test('10. 旧 3 行 testID は撤去済み', () => {
    expect(SETTINGS).not.toContain('e2e_open_export_csv');
    expect(SETTINGS).not.toContain('e2e_open_export_pdf');
    expect(SETTINGS).not.toContain('e2e_open_export_list_pdf');
  });
});
