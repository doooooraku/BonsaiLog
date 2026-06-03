/**
 * Exhaustive switch helper — discriminated union の switch で全 case を網羅していない場合、
 * コンパイル時に build error を発生させる。
 *
 * 使い方:
 * ```ts
 * switch (type) {
 *   case 'a': ...;
 *   case 'b': ...;
 *   default: return assertNever(type);
 * }
 * ```
 *
 * 新しい union member を追加すると、 上記 switch が網羅していないため `type` が `never` ではなく
 * `'newcase'` のままとなり、 assertNever の引数型違反として TypeScript が build error を返す。
 * これにより silent fall-through (Sess16 leaf_first_aid 漏れ事例) を構造的に防止する。
 *
 * 関連: Sess64 設計合意 (Issue #934) で本関数を導入。
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
