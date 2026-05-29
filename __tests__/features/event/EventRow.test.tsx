/**
 * EventRow 静的解析 test (ADR-0036 D9 / Sess25 PR-ζ-2-⑨)。
 *
 * 改善 ②: showBonsaiName=true 時の 作業名 + 日付 重複行 物理削除確認。
 * showBonsaiName=false (bonsai-detail history タブ) は regression なし維持。
 *
 * Phase 4 C1 (ADR-0045): EventRow を thin dispatcher 化したため、 検査対象は
 * 表示を担う EventRowCompact.tsx / EventRowDetailed.tsx を読む (intent は不変)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMPACT_SRC = readFileSync(
  resolve(__dirname, '../../../src/features/event/EventRowCompact.tsx'),
  'utf8',
);
const DETAILED_SRC = readFileSync(
  resolve(__dirname, '../../../src/features/event/EventRowDetailed.tsx'),
  'utf8',
);

describe('EventRow 改善 ② (ADR-0036 D9、 showBonsaiName=true 時 重複削除)', () => {
  test('1. showBonsaiName=true 分岐は bonsaiName 単独 (eventLabel + date を render しない)', () => {
    // eventRowMain の 三項演算 true 分岐に bonsaiName 単独 ThemedText (compact)
    expect(COMPACT_SRC).toMatch(
      /showBonsaiName\s*&&\s*bonsaiName\s*\?\s*\(\s*<ThemedText\s+style=\{styles\.eventBonsaiName\}/,
    );
  });

  test('2. showBonsaiName=false 分岐は eventLabel + eventRowDate を Fragment で render (bonsai-detail 維持)', () => {
    // Fragment <> ... </> で eventLabel + eventRowDate 両方 render (compact)
    expect(COMPACT_SRC).toMatch(/<>\s*\n\s*<ThemedText style=\{styles\.eventLabel\}/);
    expect(COMPACT_SRC).toMatch(/<ThemedText style=\{styles\.eventRowDate\}/);
  });

  test('3. 旧 「showBonsaiName=true 時に eventRowDate も同時 render」 が削除済', () => {
    // 新構造: eventRowDate は showBonsaiName=false 分岐のみ (eventRowMain 内 1 箇所)
    const eventRowMainBlock = COMPACT_SRC.match(
      /<View style=\{styles\.eventRowMain\}>[\s\S]*?<\/View>/,
    );
    expect(eventRowMainBlock).not.toBeNull();
    if (eventRowMainBlock) {
      const block = eventRowMainBlock[0];
      const occurrences = block.match(/styles\.eventRowDate/g);
      expect(occurrences).not.toBeNull();
      if (occurrences) {
        expect(occurrences.length).toBe(1);
      }
    }
  });

  test('4. 旧 「showBonsaiName=true 時 eventLabel 重複 ThemedText」 が削除済', () => {
    // 重複 eventLabel ブロック削除 → `showBonsaiName && bonsaiName && (<ThemedText style={styles.eventLabel}` がない
    expect(COMPACT_SRC).not.toMatch(
      /showBonsaiName\s*&&\s*bonsaiName\s*&&\s*\(\s*\n?\s*<ThemedText style=\{styles\.eventLabel\}/,
    );
  });

  test('5. accessibilityLabel は維持 (`${bonsaiName}, ${eventType}` で VoiceOver 読上げ整合、 detailed)', () => {
    expect(DETAILED_SRC).toMatch(
      /accessibilityLabel=\{[\s\S]*?showBonsaiName\s*&&\s*bonsaiName[\s\S]*?\$\{bonsaiName\},\s*\$\{t\(`eventType_/,
    );
  });

  test('6. ADR-0036 D9 由来コメントが存在 (将来の意図維持、 compact)', () => {
    expect(COMPACT_SRC).toMatch(/ADR-0036 D9/);
    expect(COMPACT_SRC).toMatch(/showBonsaiName=true[\s\S]*?bonsaiName 単独/);
  });
});
