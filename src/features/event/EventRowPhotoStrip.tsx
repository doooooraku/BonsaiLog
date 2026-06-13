/**
 * EventRowPhotoStrip — EventRow detailed mode 用の写真 thumbnail strip (Sess34 ADR-0041 PR-4)。
 *
 * 構造:
 * - 80×60px (aspectRatio 4:3、 PhotoField token 流用) の thumbnail 1 枚
 * - 残枚数があれば 右下に「+N」 badge (BADGE_SOFT_BG)
 * - tap で `/photo-viewer?eventId=<id>&initialIndex=0` modal を開く
 *
 * 表示条件:
 * - photo が null (event_id 紐付け写真ゼロ件) → 親側で条件 render により非表示
 *
 * 関連:
 * - ADR-0041 D2 (Strip 1 枚 + +N badge)
 * - ADR-0041 D3 (tap で Viewer modal 開く)
 * - photoRepository.getRepresentativePhotoByEventId (代表写真取得)
 */
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT は inline c.* 化、 BADGE は brand-static で保持。
// Sess70 PR-C1: BADGE_SOFT_BG/TEXT を scheme-aware (c.badgeBg / c.tint) に移行
// (ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import type { PhotoRead } from '@/src/db/photoRepository';

export type EventRowPhotoStripProps = {
  /** EventRow が紐付けする event の ID (photo-viewer modal のクエリパラメータ用) */
  eventId: string;
  /** 代表写真 (getRepresentativePhotoByEventId の結果)。 null なら親で非表示 */
  photo: PhotoRead;
  /** 紐付け写真の総数 (>= 1)。 totalCount > 1 なら +N badge を表示 */
  totalCount: number;
  /** testID prefix (例: 'e2e_event_row_photo_strip_<eventId>') */
  testID?: string;
};

export function EventRowPhotoStrip({
  eventId,
  photo,
  totalCount,
  testID,
}: EventRowPhotoStripProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const c = useColors();

  const remaining = Math.max(0, totalCount - 1);
  const a11yLabel = t('photoStripAccessibility').replace('{count}', String(totalCount));

  const handlePress = () => {
    router.push(`/photo-viewer?eventId=${encodeURIComponent(eventId)}&initialIndex=0` as Href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={handlePress}
      style={[styles.container, { borderColor: c.border, backgroundColor: c.surface }]}
      testID={testID}
    >
      <Image
        source={{ uri: photo.absoluteUri }}
        style={styles.thumb}
        contentFit="cover"
        accessible={false}
      />
      {remaining > 0 && (
        <View
          style={[styles.badge, { backgroundColor: c.badgeBg }]}
          testID={testID ? `${testID}_badge` : undefined}
        >
          <ThemedText style={[styles.badgeText, { color: c.tint }]}>{`+${remaining}`}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 60, // 4:3 ratio
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  // Sess70 PR-C1: bg / color は inline c.badgeBg / c.tint (scheme-aware)。
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
