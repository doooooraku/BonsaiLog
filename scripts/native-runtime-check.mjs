#!/usr/bin/env node
/**
 * native-runtime-check - JS verify では検知できないネイティブ / ランタイム問題の構造的検知
 *
 * 経緯 (本検査が生まれた背景):
 *   2026-05-04 セッションの実機検証で「pnpm verify 全 9 ゲート緑 + Gradle BUILD SUCCESSFUL
 *   + APK インストール成功」だが、起動 / 操作で複数のクラッシュ + 警告が判明:
 *     - ULIDError: ulid v3 が React Native の Web Crypto 未搭載で SIGSEGV 級失敗
 *     - libskia.a 不在: Skia の install-libs.js postinstall がスキップされ Gradle CMake fail
 *     - VirtualizedList nesting 警告: ScrollView 直下の FlatList で LogBox エラー
 *
 *   いずれも JS test / type-check / lint では検知不能。CLAUDE.md §9
 *   「注意ではなく構造で防ぐ」に従い、本スクリプトで構造的に検知する。
 *
 * 検査対象:
 *   1. app/_layout.tsx の最上部に `react-native-get-random-values` polyfill が import されている
 *      (ulid v3 / uuid v9 / crypto-js 等の Web Crypto 依存ライブラリの起動時クラッシュ防止)
 *   2. node_modules/@shopify/react-native-skia/libs/android/<abi>/ が全 4 ABI 存在
 *      (postinstall 漏れによる libskia.a 不在 → Gradle CMake fail 防止)
 *   3. app/ + src/ 配下の .tsx で <ScrollView> 直下に <FlatList> / <SectionList> がない
 *      (VirtualizedList nesting LogBox エラー防止)
 *
 * 終了コード: 0 = OK、1 = 検出
 *
 * Related:
 *   - docs/reference/tasks/lessons/runtime.md (ULIDError lesson)
 *   - docs/reference/tasks/lessons/build.md (Skia install-libs.js lesson)
 *   - PR #179 (polyfill 導入) / PR #183 (VirtualizedList 修正) / PR #184 (本 script 起源、close)
 *   - Issue #289 (本 script 再起票、本 PR で実装)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const errors = [];

// ---------------------------------------------------------------------------
// 検査 1: react-native-get-random-values polyfill が app/_layout.tsx 最上部にある
// ---------------------------------------------------------------------------
function checkPolyfillImport() {
  const layoutPath = join(ROOT, 'app/_layout.tsx');
  if (!existsSync(layoutPath)) return;
  const content = readFileSync(layoutPath, 'utf8');
  const lines = content.split('\n');

  // 「react-native-get-random-values」が import されているか
  const polyfillLine = lines.findIndex((l) => /['"`]react-native-get-random-values['"`]/.test(l));
  if (polyfillLine === -1) {
    errors.push(
      'app/_layout.tsx に `react-native-get-random-values` の import がありません。' +
        '\n  ulid v3 / uuid v9 等が React Native で Web Crypto 取得失敗 → 起動クラッシュ。' +
        "\n  対処: `import 'react-native-get-random-values';` を最上部に追加。" +
        '\n  根拠: docs/reference/tasks/lessons/runtime.md「ULIDError」',
    );
    return;
  }

  // 最上部 (他の import より先) に評価されているか
  // 副作用付き import は記述順で評価されるため、polyfill 行より前に
  // 別の import 文 (相対 / 絶対) があったら警告
  for (let i = 0; i < polyfillLine; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('import ') && !trimmed.includes('react-native-get-random-values')) {
      errors.push(
        `app/_layout.tsx:${i + 1}  \`react-native-get-random-values\` polyfill が他の import より後に評価されます。` +
          '\n  副作用付き import は記述順で評価されるため、polyfill は最上部に配置してください。' +
          '\n  根拠: docs/reference/tasks/lessons/runtime.md「ULIDError」§ルール 2',
      );
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// 検査 2: @shopify/react-native-skia の libs/android が全 4 ABI 存在
// ---------------------------------------------------------------------------
function checkSkiaLibs() {
  const skiaPkgPath = join(ROOT, 'node_modules/@shopify/react-native-skia');
  if (!existsSync(skiaPkgPath)) return; // skia 未使用ならスキップ

  const libsAndroidPath = join(skiaPkgPath, 'libs/android');
  if (!existsSync(libsAndroidPath)) {
    errors.push(
      '@shopify/react-native-skia/libs/android/ ディレクトリが存在しません。' +
        '\n  install-libs.js postinstall がスキップされた可能性。' +
        '\n  対処: `node node_modules/@shopify/react-native-skia/scripts/install-libs.js`' +
        '\n  根拠: docs/reference/tasks/lessons/build.md「Skia libskia.a 不在」',
    );
    return;
  }

  const requiredAbis = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];
  const missing = requiredAbis.filter((abi) => !existsSync(join(libsAndroidPath, abi)));
  if (missing.length > 0) {
    errors.push(
      `@shopify/react-native-skia の libs/android で以下の ABI が不足: ${missing.join(', ')}` +
        '\n  対処: `node node_modules/@shopify/react-native-skia/scripts/install-libs.js`' +
        '\n  根拠: docs/reference/tasks/lessons/build.md「Skia libskia.a 不在」',
    );
  }
}

// ---------------------------------------------------------------------------
// 検査 3: <ScrollView> 直下に <FlatList> / <SectionList> / <VirtualizedList> がない
// ---------------------------------------------------------------------------
function checkVirtualizedListNesting() {
  const targets = ['app', 'src'];
  for (const target of targets) {
    walkTsx(join(ROOT, target), (file) => {
      const content = readFileSync(file, 'utf8');
      // ScrollView の中で FlatList/SectionList/VirtualizedList が使われているか簡易検査
      // (静的解析の限界: ScrollView の親子関係を完全に解析するには AST が必要、
      //  ここでは「同ファイル内に ScrollView と FlatList が両方ある」を警告対象にする
      //  → 過検知あり得るが、本セッションで起きた stats.tsx パターンを catch する)
      const hasScrollView = /<ScrollView\b/.test(content);
      const listMatches =
        content.match(/<(FlatList|SectionList|VirtualizedList)\b[^>]*\/?>/gs) || [];
      const hasVirtualizedList = listMatches.length > 0;
      // BottomSheet 内の FlatList は除外 (BottomSheetView の子は許可される)
      const isBottomSheetContext = /@gorhom\/bottom-sheet/.test(content);
      // horizontal FlatList は ScrollView (デフォルト縦) と orientation が直交するため
      // 「same orientation のネスト」にあたらず警告対象外 (React Native 公式)
      const allListsAreHorizontal =
        listMatches.length > 0 && listMatches.every((m) => /\bhorizontal\b/.test(m));
      if (hasScrollView && hasVirtualizedList && !isBottomSheetContext && !allListsAreHorizontal) {
        errors.push(
          `${relative(ROOT, file)}: 同ファイル内に <ScrollView> と <FlatList/SectionList> が共存しています。` +
            '\n  ネスト構造の場合「VirtualizedLists should never be nested inside plain ScrollViews」警告。' +
            '\n  対処: ScrollView を View に変更 or FlatList の ListHeaderComponent に集約。' +
            '\n  根拠: PR #183 (stats.tsx 修正実例)',
        );
      }
    });
  }
}

function walkTsx(dir, callback) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsx(full, callback);
    } else if (entry.endsWith('.tsx')) {
      callback(full);
    }
  }
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------
checkPolyfillImport();
checkSkiaLibs();
checkVirtualizedListNesting();

if (errors.length > 0) {
  console.error('❌ native-runtime-check failed (ネイティブ / ランタイム問題検出):');
  console.error('');
  for (const err of errors) {
    console.error(`  ${err}`);
    console.error('');
  }
  process.exit(1);
}

console.log(
  '✅ native-runtime-check passed (polyfill / Skia libs / VirtualizedList nesting 全 OK)',
);
