/**
 * 盆栽カード (mockup home-screens.jsx BonsaiCard L867-1014 整合、T1-10 PR で完全再構築)。
 *
 * 縦型 Repolog 準拠カード:
 * - ヒーロー写真 220h × 横全幅 (上部、padding なし、cover photo or BonsaiPlaceholder)
 * - 本体 3 段構造 (padding 14/16/16、gap 4):
 *   1. タイトル: 名前 NotoSerifJP 18pt weight 600 letterSpacing 0.02em (1 行 ellipsis)
 *   2. メタ行: 左「{N}日前 / 水やり (icon)」+ 右「{age}」(任意、tabular-nums)
 *   3. コメント行: 直近作業 note → 樹種名 → "—" の優先順位 (1 行 ellipsis)
 * - 角丸 14、border 1、box-shadow subtle、overflow hidden
 *
 * 複数選択モード対応 (mockup `selecting` / `selected` 整合):
 * - selecting=true 時、写真左上に 28×28 円形チェックマーク overlay (Apple Photos 同型)
 * - selected=true: BRAND_GREEN 背景 + CheckIcon (washi 色)
 * - selected=false: 半透明 BG_SURFACE 背景 + 白枠
 *
 * Repolog 哲学: 直近の作業事実のみ表示 (推奨は出さない、全ペルソナ ○ 以上)。
 * line jitter 防止: lastAction null 時は「記録はまだありません」、commentText は常に 1 行確保。
 */
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckIcon, DropletIcon, ScissorsIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess66 PR6c: theme-dependent token を inline c.* に (dark cascade)。
import { ACCENT_BARK, BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

import { BonsaiPlaceholder, hashSeed } from './BonsaiPlaceholder';

const HERO_HEIGHT = 220;
// CARD_WIDTH = 画面幅 - 左右マージン 16 × 2 (mockup home-screens.jsx CARD_W = 393 - 32 整合)。
// 縦持ち固定アプリのため Dimensions のキャッシュは問題にならない。
const CARD_WIDTH = Dimensions.get('window').width - 32;

export type BonsaiCardLastAction = {
  /** 'watering' | 'pruning' (icon と種別ラベルに使用)。 */
  kind: 'watering' | 'pruning';
  /** i18n 済の経過テキスト (例: '今日' / '3日' / '2週' / '5ヶ月' / '1年')。 */
  elapsed: string;
  /** 作業メモ (event.note)、null なら commentText は次の fallback を使う。 */
  note: string | null;
};

export type BonsaiCardData = {
  id: string;
  name: string;
  /** カバー写真の絶対 URI、null なら BonsaiPlaceholder を表示。 */
  coverUri: string | null;
  /** 樹種名 (commentText fallback 用)、null/空なら "—"。 */
  speciesCommonName: string | null;
  /** 直近作業 (watering/pruning の最新)、null なら「記録はまだありません」。 */
  lastAction: BonsaiCardLastAction | null;
  /** 樹齢の表示文字列 (例: '35年（推定）')、null なら非表示。Tier 2 で schema 拡張予定。 */
  ageText: string | null;
};

type Props = {
  data: BonsaiCardData;
  onPress: (id: string) => void;
  /** 複数選択モード中か (default false)。true 時、写真左上にチェックマーク overlay を表示。 */
  selecting?: boolean;
  /** selecting=true 時、この盆栽が選択中か (default false)。 */
  selected?: boolean;
  /** 長押し callback (selectMode 入りトリガ用、500ms default、optional)。 */
  onLongPress?: (id: string) => void;
  testID?: string;
};

export function BonsaiCard({
  data,
  onPress,
  selecting = false,
  selected = false,
  onLongPress,
  testID,
}: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const seed = hashSeed(data.id);

  // commentText: lastAction.note → speciesCommonName → "—" の優先順位 (mockup L871 整合)。
  const commentText =
    data.lastAction?.note ??
    (data.speciesCommonName != null && data.speciesCommonName.length > 0
      ? data.speciesCommonName
      : '—');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={data.name}
      accessibilityState={selecting ? { selected } : undefined}
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border },
        selected && styles.cardSelected,
      ]}
      onPress={() => onPress(data.id)}
      onLongPress={onLongPress != null ? () => onLongPress(data.id) : undefined}
      testID={testID}
    >
      <View style={styles.hero}>
        {data.coverUri != null && data.coverUri.length > 0 ? (
          <Image source={{ uri: data.coverUri }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <BonsaiPlaceholder
            w={CARD_WIDTH}
            h={HERO_HEIGHT}
            radius={0}
            seed={seed}
            noBorder
            style={styles.heroImage}
          />
        )}
        {selecting && (
          <View
            style={[
              styles.checkbox,
              selected ? styles.checkboxSelected : styles.checkboxUnselected,
            ]}
            testID={
              selected
                ? `${testID ?? 'e2e_bonsai_card'}_checked`
                : `${testID ?? 'e2e_bonsai_card'}_unchecked`
            }
          >
            {selected && <CheckIcon size={16} color={ON_BRAND} />}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ThemedText style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {data.name}
        </ThemedText>

        <View style={styles.metaRow}>
          {data.lastAction != null ? (
            <>
              <ThemedText style={styles.elapsedText}>
                {data.lastAction.elapsed === t('elapsedToday')
                  ? data.lastAction.elapsed
                  : t('homeCardElapsedAgo').replace('{elapsed}', data.lastAction.elapsed)}
              </ThemedText>
              <View style={styles.kindBox}>
                {data.lastAction.kind === 'pruning' ? (
                  <ScissorsIcon size={14} />
                ) : (
                  <DropletIcon size={14} />
                )}
                <ThemedText style={[styles.kindText, { color: c.textSecondary }]}>
                  {data.lastAction.kind === 'pruning'
                    ? t('eventType_pruning')
                    : t('eventType_watering')}
                </ThemedText>
              </View>
            </>
          ) : (
            <ThemedText style={[styles.noLogText, { color: c.textMuted }]}>
              {t('homeCardNoLog')}
            </ThemedText>
          )}
          {data.ageText != null && data.ageText.length > 0 && (
            <ThemedText style={styles.ageText}>{data.ageText}</ThemedText>
          )}
        </View>

        <ThemedText style={[styles.comment, { color: c.textSecondary }]} numberOfLines={1}>
          {commentText}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sess66 PR6c: bg/border は inline c.* (dark cascade)。
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1F3A2E',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardSelected: {
    borderColor: BRAND_GREEN,
    shadowOpacity: 0.18,
  },
  hero: { position: 'relative', width: '100%', height: HERO_HEIGHT },
  heroImage: { width: '100%', height: HERO_HEIGHT },
  checkbox: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkboxSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  checkboxUnselected: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.95)',
  },
  body: { paddingTop: 14, paddingBottom: 16, paddingHorizontal: 16, gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 0.36,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 20,
  },
  elapsedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: ACCENT_BARK,
    letterSpacing: 0.56,
  },
  kindBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindText: { fontSize: 14, lineHeight: 20 },
  noLogText: { fontSize: 14, lineHeight: 20 },
  ageText: {
    marginLeft: 'auto',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: ACCENT_BARK,
    letterSpacing: 0.26,
  },
  comment: { fontSize: 14, lineHeight: 20 },
});
