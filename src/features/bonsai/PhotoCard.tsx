/**
 * 写真カード (詳細画面 photo セクションの 1 枚分)。
 *
 * Repolog `ReportEditorScreen` の photoCard 構造を BonsaiLog 仕様に移植:
 * - 200px 高サムネ (大きく見える)
 * - 上部ツールバー: ↑↓ 移動 + index バッジ + cover マーク + 削除
 * - 下部 caption 入力欄 (TextInput, multiline, max 100 字)
 *
 * 削除フローは BonsaiLog の既存 Alert 確認方式 (Repolog の undo banner は別 PR スコープ)。
 */
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import type { PhotoRead } from '@/src/db/photoRepository';

// Sess14 PR-T: MAX_CAPTION_CHARS 削除 (caption UI 廃止)。

type Props = {
  photo: PhotoRead;
  /** 0-based 表示 index (写真リスト内の位置)。 */
  index: number;
  /** 全体の写真数 (↑↓ ボタンの有効/無効判定用)。 */
  total: number;
  /** controlled caption (親が state を持つ、blur で DB 反映)。 */
  caption: string;
  onCaptionChange: (text: string) => void;
  onCaptionBlur: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  /** カバー写真に設定 (既に cover の場合は呼ばれない)。 */
  onSetCover: () => void;
};

export function PhotoCard({
  photo,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSetCover,
}: Props) {
  const { t } = useTranslation();
  const isCover = photo.isCover === 1;
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  return (
    <View style={styles.card} testID={`e2e_photo_card_${photo.id}`}>
      {/* 上部ツールバー: ↑↓ + index + cover バッジ + 削除 */}
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoMoveUpLabel')}
          accessibilityState={{ disabled: !canMoveUp }}
          style={[styles.moveButton, !canMoveUp && styles.moveButtonDisabled]}
          onPress={canMoveUp ? onMoveUp : undefined}
          disabled={!canMoveUp}
          testID={`e2e_photo_card_move_up_${photo.id}`}
        >
          <ThemedText style={styles.moveText}>↑</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoMoveDownLabel')}
          accessibilityState={{ disabled: !canMoveDown }}
          style={[styles.moveButton, !canMoveDown && styles.moveButtonDisabled]}
          onPress={canMoveDown ? onMoveDown : undefined}
          disabled={!canMoveDown}
          testID={`e2e_photo_card_move_down_${photo.id}`}
        >
          <ThemedText style={styles.moveText}>↓</ThemedText>
        </Pressable>

        <ThemedText style={styles.indexLabel}>
          {index + 1} / {total}
        </ThemedText>

        {isCover ? (
          <View style={styles.coverBadge}>
            <ThemedText style={styles.coverBadgeText}>{t('photoCoverBadge')}</ThemedText>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('photoSetCoverLabel')}
            style={styles.setCoverButton}
            onPress={onSetCover}
            testID={`e2e_photo_card_set_cover_${photo.id}`}
          >
            <ThemedText style={styles.setCoverButtonText}>★</ThemedText>
          </Pressable>
        )}

        <View style={styles.spacer} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('delete')}
          style={styles.deleteButton}
          onPress={onDelete}
          testID={`e2e_photo_card_delete_${photo.id}`}
        >
          <ThemedText style={styles.deleteButtonText}>×</ThemedText>
        </Pressable>
      </View>

      {/* サムネ (4:3 aspect、 Sess14 PR-N 統一) */}
      <Image source={{ uri: photo.absoluteUri }} style={styles.thumb} contentFit="cover" />
      {/* Sess14 PR-T: caption (写真メモ) UI 削除。 user 真意「冗長」、 主メモ欄で十分。
          caption 引数は後方互換で受け取るが render しない (caller の useEffect/blur 配線も
          実害なし、 削除は段階的)。 */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 8,
    gap: 6,
    backgroundColor: BG_PRIMARY,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_DEFAULT,
  },
  moveButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  moveButtonDisabled: { opacity: 0.3 },
  moveText: { fontSize: 18, color: TEXT_PRIMARY },
  indexLabel: { fontSize: 13, fontWeight: '500', color: TEXT_SECONDARY, marginLeft: 4 },
  coverBadge: {
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  coverBadgeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: ON_BRAND,
    letterSpacing: 0.6,
  },
  setCoverButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    marginLeft: 4,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCoverButtonText: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
  spacer: { flex: 1 },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  // Sess14 PR-N: CreateMode (PR-J) と統一、 4:3 aspect (画面幅追従、 縦長盆栽写真に親和)。
  thumb: { width: '100%', aspectRatio: 4 / 3 },
  // Sess14 PR-T: captionArea / captionInput / captionCounter styles 削除 (caption UI 廃止)。
});
