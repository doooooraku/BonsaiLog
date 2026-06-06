import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlusIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT / TEXT_MUTED / TEXT_SECONDARY は inline c.* 化。
// Sess69 PR-B: BRAND_GREEN / ON_BRAND も scheme-aware (c.tint / c.onTint) に移行
// (dark mode で選択中 chip 深緑が沈む + 追加 chip 緑文字消える罠を解消、 ADR-0015/ADR-0052 Amendment)。
import { useColors } from '@/src/core/theme/useColors';
import type { BonsaiBasicFormState } from '@/src/features/bonsai/BonsaiBasicForm';

const TAG_COLLAPSED_COUNT = 3;

/**
 * 盆栽基本情報フォーム「タグ」セクション (presentational)。
 * empty 時は文言上 + 追加 button 下 (縦)、 1+ 件は wrap row (横)。 最近 3 件 + 「+N 件」 折りたたみ。
 *
 * Phase 4 A2-4 で BonsaiBasicFormFields から抽出 (挙動不変)。tagExpanded は local UI state。
 * recentTags は最大 8 件 (useBonsaiBasicForm getRecentTags(8))。追加は tag-edit へ router.push。
 * 注: field/fieldLabelRow/optionalLabel は他セクションと共有のため WET 複製。
 */
export function BonsaiTagsSection({ form }: { form: BonsaiBasicFormState }) {
  const { t } = useTranslation();
  const c = useColors();
  const router = useRouter();
  const { recentTags, selectedTagIds, toggleTag } = form;

  // Sess15 PR-MM: タグ表示は「最近 3 件 + 「+N 件」 折りたたみ」 (案 A、 user 真意「画面埋め尽くし回避」)。
  const [tagExpanded, setTagExpanded] = useState(false);
  const visibleTags =
    tagExpanded || recentTags.length <= TAG_COLLAPSED_COUNT
      ? recentTags
      : recentTags.slice(0, TAG_COLLAPSED_COUNT);
  const hiddenTagCount = Math.max(0, recentTags.length - TAG_COLLAPSED_COUNT);

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <ThemedText type="defaultSemiBold">{t('bonsaiFieldTags')}</ThemedText>
        <ThemedText style={[styles.optionalLabel, { color: c.textMuted }]}>
          {t('fieldOptionalLabel')}
        </ThemedText>
      </View>
      {/* Sess15 PR-DD: empty 時は文言上 + button 下 (縦配置)、 chip 1+ 件時は wrap row (横並び)。 */}
      {recentTags.length === 0 ? (
        <View style={styles.tagEmptyColumn}>
          <ThemedText style={[styles.tagsEmpty, { color: c.textMuted }]}>
            {t('bonsaiTagsEmpty')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bonsaiTagsAddCta')}
            style={[styles.tagAddChip, { borderColor: c.tint }]}
            onPress={() => router.push('/tag-edit?returnTo=bonsai-create' as Href)}
            testID="e2e_bonsai_tag_add"
          >
            <PlusIcon size={16} color={c.tint} />
            <ThemedText style={[styles.tagAddChipText, { color: c.tint }]}>
              {t('bonsaiTagsAddCta')}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.tagChipRow}>
          {visibleTags.map((tg) => {
            const selected = selectedTagIds.has(tg.id);
            return (
              <Pressable
                key={tg.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={tg.name}
                style={[
                  styles.tagChip,
                  { backgroundColor: c.surface, borderColor: c.border },
                  selected && { backgroundColor: c.tint, borderColor: c.tint },
                ]}
                onPress={() => toggleTag(tg.id)}
                testID={`e2e_bonsai_create_tag_chip_${tg.id}`}
              >
                <ThemedText
                  style={
                    selected
                      ? [styles.tagChipTextSelected, { color: c.onTint }]
                      : styles.tagChipText
                  }
                >
                  {tg.name}
                </ThemedText>
              </Pressable>
            );
          })}
          {/* Sess15 PR-MM: 「+N 件」 / 「閉じる」 折りたたみ chip (案 A、 user 真意「画面埋め尽くし回避」)。 */}
          {hiddenTagCount > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                tagExpanded
                  ? t('tagShowLess')
                  : t('tagShowMore').replace('{count}', String(hiddenTagCount))
              }
              style={[styles.tagMoreChip, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => setTagExpanded((p) => !p)}
              testID="e2e_bonsai_create_tag_more"
            >
              <ThemedText style={[styles.tagMoreChipText, { color: c.textSecondary }]}>
                {tagExpanded
                  ? t('tagShowLess')
                  : t('tagShowMore').replace('{count}', String(hiddenTagCount))}
              </ThemedText>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bonsaiTagsAddCta')}
            style={[styles.tagAddChip, { borderColor: c.tint }]}
            onPress={() => router.push('/tag-edit?returnTo=bonsai-create' as Href)}
            testID="e2e_bonsai_tag_add"
          >
            <PlusIcon size={16} color={c.tint} />
            <ThemedText style={[styles.tagAddChipText, { color: c.tint }]}>
              {t('bonsaiTagsAddCta')}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  tagChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  // Sess69 PR-B: tagChipSelected bg/border は inline c.tint、 文字は c.onTint (scheme-aware)。
  tagChipText: { fontSize: 13 },
  tagChipTextSelected: { fontSize: 13, fontWeight: '600' },
  tagsEmpty: { fontSize: 13 },
  // Sess15 PR-DD: empty 時の縦並び container (alignSelf で button を左寄せ)。
  tagEmptyColumn: { gap: 8 },
  // Sess15 PR-EE: 案 D2 統一 (dashed gray → solid 1.5px tint + tint テキスト + PlusIcon)。
  // Sess69 PR-B: borderColor / color は inline c.tint (scheme-aware)。
  tagAddChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  tagAddChipText: { fontSize: 13, fontWeight: '600' },
  // Sess15 PR-MM: 「+N 件」 / 「閉じる」 折りたたみ chip。 tag chip と同じ size、 grey 系で secondary。
  tagMoreChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  tagMoreChipText: { fontSize: 13, fontWeight: '500' },
});
