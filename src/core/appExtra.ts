import Constants from 'expo-constants';

/**
 * app.config.ts の `extra` を型安全に読む共通アクセサ (Phase 3 Step 3 PR 3-1b)。
 *
 * `Constants.manifest` は deprecated かつ any 型で、`Constants.expoConfig ?? Constants.manifest`
 * の union を any に汚染する。その any を本関数 1 箇所で `Record<string, unknown>` に堰き止め、
 * 各値は `unknown` として返す (呼出側で `typeof` ガードして利用する)。
 * 挙動は従来の `(expoConfig as any)?.extra ?? {}` と同一 (同じ extra を同じ値で読む)。
 */
export function getAppExtra(): Record<string, unknown> {
  const config = Constants.expoConfig ?? Constants.manifest;
  return ((config as { extra?: unknown } | null)?.extra ?? {}) as Record<string, unknown>;
}
