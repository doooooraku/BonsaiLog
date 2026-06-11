// scripts/plugins/withCmakeArgs.js
// CMake linker arguments を Android build に inject する Custom config plugin。
// Sess4 PR-6 (2026-05-17、案 C-1): Dev Build (Debug config) を復活させてホットリロード対応。
//
// 解決対象の bug:
//   Sess1 で NDK 27 + Debug config + LTO (-flto=thin) で APK build した時、
//   CMake が古い gold linker (`-fuse-ld=gold`) を強制し、
//   NDK 27 は LLVMgold.so を同梱しないため linker error:
//
//     /usr/bin/ld.gold: error: LLVMgold.so: cannot open shared object file
//     /usr/bin/ld.gold: fatal error: crtbegin_so.o: unsupported ELF machine number 183
//
//   既知バグ: android/ndk#1444、cmake-gitlab#21772 (CMake 3.22.1 LTO + gold 強制)
//
// 解決策:
//   externalNativeBuild.cmake.arguments で linker を明示的に lld (modern LLVM linker) に
//   強制 + LTO 無効化。
//   - `-DCMAKE_EXE_LINKER_FLAGS=-fuse-ld=lld`
//   - `-DCMAKE_SHARED_LINKER_FLAGS=-fuse-ld=lld`
//   - `-DCMAKE_MODULE_LINKER_FLAGS=-fuse-ld=lld`
//   - `-DCMAKE_CXX_FLAGS=-fno-lto` (保険、LTO 無効化)
//
// Sess1 / Sess2 議論結果より、Repolog で確立されたパターン (preview-local-apk = Release config)
// では本問題は発生しない (Release config の最適化路で LTO+gold linker bug を回避)。
// development profile (Debug config) のみで本 plugin が必要。
//
// 関連:
//   ADR-0021 Notes Amended (Sess4 PR-6)
//   PR #535 (Sess2 PR-4、preview-local-apk 採用; 経緯は Sess3 handoff = 2026-06 docs 再編で削除、git 履歴参照)
const { withAppBuildGradle } = require('@expo/config-plugins');

const CMAKE_ARGS_BLOCK = `
        // Sess4 PR-6: NDK 27 + Debug config の LTO+gold linker bug 回避 (Dev Build 復活、案 C-1)
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_EXE_LINKER_FLAGS=-fuse-ld=lld", "-DCMAKE_SHARED_LINKER_FLAGS=-fuse-ld=lld", "-DCMAKE_MODULE_LINKER_FLAGS=-fuse-ld=lld", "-DCMAKE_CXX_FLAGS=-fno-lto"
            }
        }`;

const MARKER = 'Sess4 PR-6: NDK 27 + Debug config の LTO+gold linker bug 回避';

module.exports = function withCmakeArgs(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error('withCmakeArgs expects android/app/build.gradle in groovy syntax');
    }
    const contents = gradleConfig.modResults.contents;
    if (contents.includes(MARKER)) {
      return gradleConfig;
    }
    // android { defaultConfig { ... } } の defaultConfig block 内に inject。
    // 正規表現で defaultConfig { を見つけて直後に externalNativeBuild block を追加。
    const updated = contents.replace(/(defaultConfig\s*\{)/, `$1${CMAKE_ARGS_BLOCK}`);
    if (updated === contents) {
      throw new Error('withCmakeArgs: defaultConfig block not found in app/build.gradle');
    }
    gradleConfig.modResults.contents = updated;
    return gradleConfig;
  });
};
