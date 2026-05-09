/**
 * useColors — 現在の effectiveScheme に応じた Colors[scheme] を返す hook。
 *
 * Phase B-2a (PR #226): inline `backgroundColor: BG_PRIMARY` 等の固定値を
 * `c.background` 等の動的値に置換するための共通フック。
 *
 * 設計方針:
 * - useThemeColor (1 トークン取得) と異なり、scheme 全体を一括で取得 (画面で
 *   複数色を使う場合に便利)
 * - resolveEffectiveScheme + useSettingsStore + useColorScheme を統合
 * - light / dark の 2 theme で動作 (ADR-0015 Notes Amended 2026-05-10、outdoor 削除済)
 */
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveEffectiveScheme } from '@/src/core/theme/themeResolver';
import { useSettingsStore } from '@/src/stores/settingsStore';

// Colors.light / Colors.dark は const assertion で値が string literal 型に narrow
// されているため、両者の交差を取ると型不整合になる。useColors の戻り値は
// 「同じ shape の string プロパティ」として widen して返す。
export type ColorScheme = { [K in keyof typeof Colors.light]: string };

/**
 * 現在の effectiveScheme に基づく Colors を返す。
 *
 * @example
 *   const c = useColors();
 *   <View style={{ backgroundColor: c.background, borderColor: c.border }}>
 *     <Text style={{ color: c.text }}>...</Text>
 *   </View>
 */
export function useColors(): ColorScheme {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const normalized = systemScheme === 'light' || systemScheme === 'dark' ? systemScheme : null;
  const scheme = resolveEffectiveScheme(themeMode, normalized);
  return Colors[scheme] as ColorScheme;
}
