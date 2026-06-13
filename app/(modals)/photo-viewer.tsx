/**
 * Photo Viewer Modal — event 紐付け写真の全画面 swipe 表示 (Sess34 ADR-0041 PR-4)。
 *
 * `presentation: 'modal'` (ADR-0024 Notes Amended 2026-05-15、 `(modals)/_layout.tsx` で適用)。
 *
 * URL params:
 *   - eventId: string (必須、 photos.event_id で filter する key)
 *   - initialIndex?: string (任意、 default '0'、 開いた時の初期表示 index)
 *
 * 動作:
 * - getAllPhotosByEventId(eventId) で全紐付け写真を fetch、 order_index 順
 * - FlatList horizontal pagingEnabled + expo-image で swipe gallery (iOS 写真アプリ風)
 * - BG 常時 black (theme token 経由禁止、 iOS Photos.app 整合)
 * - close は Stack header の戻るボタンで (expo-router 標準)
 *
 * A11y:
 * - 各 image に accessibilityLabel "{i} / {n}" + caption (あれば)
 * - accessibilityActions=[{name:'increment'},{name:'decrement'}] で VoiceOver swipe 操作対応
 *
 * 関連: ADR-0041 D3 (Viewer swipe 対応) / ADR-0024 (modal 一本化)
 */
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { getAllPhotosByEventId, type PhotoRead } from '@/src/db/photoRepository';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function PhotoViewerModal() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ eventId?: string; initialIndex?: string }>();
  const eventId = params.eventId ?? '';
  const initialIndex = Math.max(0, Number(params.initialIndex ?? '0') || 0);

  const [photos, setPhotos] = useState<PhotoRead[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    void (async () => {
      const list = await getAllPhotosByEventId(eventId);
      if (!cancelled) setPhotos(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const total = photos.length;
  // index 表示: 1-based ("{i} / {n}"、 初期 init で out-of-range の場合は clamp)
  const displayIndex = useMemo(() => {
    if (total === 0) return '0 / 0';
    const i = Math.min(currentIndex + 1, total);
    return t('photoViewerIndexOfTotal').replace('{i}', String(i)).replace('{n}', String(total));
  }, [currentIndex, total, t]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offset / SCREEN_W);
    if (idx !== currentIndex && idx >= 0 && idx < total) {
      setCurrentIndex(idx);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: displayIndex,
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const caption =
            item.caption ??
            t('photoViewerIndexOfTotal')
              .replace('{i}', String(index + 1))
              .replace('{n}', String(total));
          return (
            <View
              style={styles.page}
              accessibilityRole="image"
              accessibilityLabel={caption}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              testID={`e2e_photo_viewer_image_${index}`}
            >
              <Image
                source={{ uri: item.absoluteUri }}
                style={styles.image}
                contentFit="contain"
                priority={Math.abs(index - currentIndex) <= 1 ? 'high' : 'normal'}
                accessible={false}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyText}>—</ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // iOS Photos.app 整合、 dark mode token 経由禁止
  },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  empty: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
