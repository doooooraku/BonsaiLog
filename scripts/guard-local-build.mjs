#!/usr/bin/env node
/**
 * guard-local-build — ローカル Android build の安全ピン (Sess99 恒久策)。
 *
 * 経緯: WSL2 上のローカル build (Gradle + NDK) がメモリを食い尽くし、Windows 側の
 * ページング I/O 失敗で BSOD 強制再起動が 3 回発生 (Sess65 / 2026-06-06 BugCheck 0x7A /
 * 2026-06-11 BugCheck 0x1E)。lessons/build.md「cloud build が第一選択 (ADR-0050)」を
 * 機械的に強制する (= user global CLAUDE.md §9: 3 回再発 → 自動化)。
 *
 * 動作:
 * - FORCE_LOCAL_BUILD=1 が無い限り exit 1 で build を止め、クラウド手順を案内する。
 * - 意図的にローカルで回す場合のみ: FORCE_LOCAL_BUILD=1 pnpm build:android:dev:local
 *
 * 終了コード: 0 = 続行許可、1 = ブロック
 */

if (process.env.FORCE_LOCAL_BUILD === '1') {
  console.log('[guard-local-build] FORCE_LOCAL_BUILD=1 — ローカル build を続行します (自己責任)。');
  process.exit(0);
}

console.error(`
[guard-local-build] ⛔ ローカル Android build はブロックされました。

理由: WSL2 ローカル build で PC が BSOD 強制再起動した事故が 3 回あります
      (Sess65 / 2026-06-06 0x7A / 2026-06-11 0x1E、lessons/build.md 参照)。
      cloud build が第一選択です (ADR-0050)。

クラウドでのビルド手順:
  dev APK : gh workflow run build-android-dev.yml
            → gh run download -n bonsailog-dev-apk -D dist/
  release : gh workflow run build-android-play.yml (/release-android Skill 参照)

それでもローカルで実行する場合 (PC クラッシュのリスクを理解した上で):
  FORCE_LOCAL_BUILD=1 pnpm build:android:dev:local
`);
process.exit(1);
