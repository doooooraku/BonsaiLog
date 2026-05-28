/**
 * 盆栽詳細画面の日付整形ユーティリティ(Phase 4 A1-1 で index.tsx から抽出)。
 * locale 'ja' は 'ja-JP' に正規化、不正な iso は元文字列を返す(挙動不変)。
 */
export function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale);
  } catch {
    return iso;
  }
}
