import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

/**
 * design_system.md §3 のフォントスタックを type に応じて適用する。
 * @expo-google-fonts でロード済の特定 weight を fontFamily で指定。
 *
 * - title (displayL 32pt): NotoSerifJP_500Medium (見出し、明朝)
 * - subtitle (headingL 20pt): NotoSerifJP_500Medium (サブ見出し)
 * - defaultSemiBold (bodyL 16pt SemiBold): NotoSansJP_600SemiBold
 * - default (bodyL 16pt Regular): NotoSansJP_400Regular
 * - link (bodyL 16pt Latin): Inter_400Regular
 */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // bodyL 16/26 (design_system.md §3-3)
  default: {
    fontFamily: 'NotoSansJP_400Regular',
    fontSize: 16,
    lineHeight: 26,
  },
  // bodyL 16/26 SemiBold
  defaultSemiBold: {
    fontFamily: 'NotoSansJP_600SemiBold',
    fontSize: 16,
    lineHeight: 26,
  },
  // displayL 32/38 (画面タイトル)
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 32,
    lineHeight: 38,
  },
  // headingL 20/30 (サブ見出し)
  subtitle: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    lineHeight: 30,
  },
  // bodyL 16/26 (Latin、リンク色 #0a7ea4 は将来 token 化)
  link: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: '#0a7ea4',
  },
});
