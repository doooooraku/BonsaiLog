/**
 * BonsaiSelectableCard 静的解析 test (Sess56、 ADR-0048 FSD 境界準拠 atom)。
 *
 * Sheet (ExportOptionsSheet) と Screen (BonsaiMultiSelectScreen) の盆栽選択 UI を一元化した
 * atom コンポーネントが、Pressable + accessibilityState + 写真 + Check icon + props 形式
 * (selected 外部制御) を保持していることを構造保証する。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const CARD = r('../../../src/features/bonsai/BonsaiSelectableCard.tsx');
const SHEET = r('../../../src/features/export/ExportOptionsSheet.tsx');
const SCREEN = r('../../../src/features/event/BonsaiMultiSelectScreen.tsx');

describe('BonsaiSelectableCard atom (Sess56)', () => {
  test('1. Pressable + accessibility (role/state/label) を保持', () => {
    expect(CARD).toMatch(/<Pressable/);
    expect(CARD).toMatch(/accessibilityRole="button"/);
    expect(CARD).toMatch(/accessibilityState=\{\{\s*selected\s*\}\}/);
    expect(CARD).toMatch(/accessibilityLabel=\{name\}/);
  });

  test('2. 写真サムネ (coverUri) + BonsaiPlaceholder fallback + Check icon', () => {
    expect(CARD).toMatch(/<Image\b/);
    expect(CARD).toMatch(/coverUri/);
    expect(CARD).toMatch(/BonsaiPlaceholder/);
    expect(CARD).toMatch(/<CheckIcon/);
  });

  test('3. Props 形式: selected boolean 外部制御 + onPress callback + 内部 state なし', () => {
    expect(CARD).toMatch(/selected:\s*boolean/);
    expect(CARD).toMatch(/onPress:\s*\(id:\s*string\)\s*=>\s*void/);
    expect(CARD).toMatch(/name:\s*string/);
    expect(CARD).toMatch(/coverUri:\s*string\s*\|\s*null/);
    expect(CARD).toMatch(/speciesCommonName:\s*string\s*\|\s*null/);
    // 内部 state を持たない (pickerStore 等への副作用ゼロ)
    expect(CARD).not.toMatch(/useState/);
  });

  test('4. Sheet と Screen の両方で atom を利用 (重複削除確証)', () => {
    expect(SHEET).toMatch(/<BonsaiSelectableCard\b/);
    expect(SHEET).toMatch(/from '@\/src\/features\/bonsai\/BonsaiSelectableCard'/);
    expect(SCREEN).toMatch(/<BonsaiSelectableCard\b/);
    expect(SCREEN).toMatch(/from '@\/src\/features\/bonsai\/BonsaiSelectableCard'/);
    // 旧 Sheet 素朴行 (☐☑ + name のみ) は撤去済み
    expect(SHEET).not.toMatch(/'☐'/);
    expect(SHEET).not.toMatch(/'☑'/);
  });

  test('5. 配置: src/features/bonsai/ (features 同層、ADR-0048 FSD 境界準拠)', () => {
    // BonsaiPlaceholder と同じ features/bonsai 層に置くことで boundaries lint pass
    // (components → features の方向禁止を回避、features 同士は許容)。
    expect(SHEET).toMatch(/@\/src\/features\/bonsai\/BonsaiSelectableCard/);
    expect(SCREEN).toMatch(/@\/src\/features\/bonsai\/BonsaiSelectableCard/);
  });
});
