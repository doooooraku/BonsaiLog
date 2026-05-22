/**
 * EventRowPhotoBlock — EventRow detailed mode 用の写真フル幅ブロック (Sess34 ADR-0041 Phase θ D2 改訂)。
 *
 * 構造:
 * - 横幅 full (親 container width)、 aspectRatio 4:3 (高さ自動算出、 約 540px @ 720 width)
 * - 残枚数があれば 右下に「+N」 badge (BADGE_SOFT_BG)
 * - tap で `/photo-viewer?eventId=<id>&initialIndex=0` modal を開く
 *
 * 表示条件:
 * - photo が null (event_id 紐付け写真ゼロ件) → 親側で条件 render により非表示
 *
 * 既存 EventRowPhotoStrip (80×60 thumbnail) は温存 (forward-only、 deprecate しない)。
 * 本 component は detailed mode 向けに新規作成、 PhotoStrip と機能 (PhotoViewer 起動 +
 * +N badge + a11y) は同一、 size + aspectRatio のみ異なる。
 *
 * 関連:
 * - ADR-0041 Phase θ D2 (写真 80×60 → 横幅 full × 4:3)
 * - ADR-0041 D3 (tap で Viewer modal 開く、 既存維持)
 * - photoRepository.getRepresentativePhotoByEventId (代表写真取得)
 */
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BADGE_SOFT_BG,
  BADGE_SOFT_TEXT,
  BG_SURFACE,
  BORDER_DEFAULT,
} from '@/src/core/theme/colors';
import type { PhotoRead } from '@/src/db/photoRepository';

export type EventRowPhotoBlockProps = {
  /** EventRow が紐付けする event の ID (photo-viewer modal のクエリパラメータ用) */
  eventId: string;
  /** 代表写真 (getRepresentativePhotoByEventId の結果)。 null なら親で非表示 */
  photo: PhotoRead;
  /** 紐付け写真の総数 (>= 1)。 totalCount > 1 なら +N badge を表示 */
  totalCount: number;
  /** testID prefix (例: 'e2e_event_row_photo_block_<eventId>') */
  testID?: string;
};

export function EventRowPhotoBlock({
  eventId,
  photo,
  totalCount,
  testID,
}: EventRowPhotoBlockProps) {
  const router = useRouter();
  const { t } = useTranslation();

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
      style={styles.container}
      testID={testID}
    >
      <Image
        source={{ uri: photo.absoluteUri }}
        style={styles.photo}
        contentFit="cover"
        priority="high"
        accessible={false}
      />
      {remaining > 0 && (
        <View style={styles.badge} testID={testID ? `${testID}_badge` : undefined}>
          <ThemedText style={styles.badgeText}>{`+${remaining}`}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 4 / 3, // PhotoField + ADR-0041 Phase θ D2 整合 (720 width → 540 height)
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: BADGE_SOFT_BG,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: BADGE_SOFT_TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
});
