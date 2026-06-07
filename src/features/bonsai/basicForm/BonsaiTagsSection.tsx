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
// Sess74 PR-2: master プリセットタグ (ADR-0049 §Notes Amended / ADR-0026 §Notes Amended)。
// preset chip 2 件 (お気に入り / 花あり) を「おすすめ」 section で表示、
// recentTags 上に配置。 tap で createOrFindTag → attach (Free 上限カウント除外)。
import { isPresetTagName, TAG_PRESETS } from '@/src/db/seedTagPresets';
import { normalizeTagName } from '@/src/db/tagRepository';

const TAG_COLLAPSED_COUNT = 3;
/** functional_spec §14.3.3 TM1: 1 盆栽あたり最大 10 タグ (Bear / Things 業界標準)。 */
const BONSAI_TAG_LIMIT = 10;

/**
 * 盆栽基本情報フォーム「タグ」セクション (presentational)。
 *
 * 構成 (Sess74 PR-2 改訂):
 * 1. 「おすすめ」 section: preset chip 2 件 (TAG_PRESETS、 lang 別 localized)
 * 2. 「最近のタグ」 section: recentTags chip (preset 由来は除外)
 * 3. 折りたたみ chip (「+N 件」 / 閉じる)
 * 4. 「+ タグ追加」 chip (tag-edit 画面遷移)
 *
 * empty 時 (recentTags 0 件 + preset 未選択) は文言上 + 追加 button 下 (縦)、
 * 1+ 件は wrap row (横)。 最近 3 件 + 「+N 件」 折りたたみ。
 *
 * 10 タグ上限到達時 (selectedTagIds.size >= 10) は全 chip を disabled 化
 * (functional_spec §14.3.3 TM1)。
 *
 * Phase 4 A2-4 で BonsaiBasicFormFields から抽出 (挙動不変)。tagExpanded は local UI state。
 * recentTags は最大 8 件 (useBonsaiBasicForm getRecentTags(8))。追加は tag-edit へ router.push。
 */
export function BonsaiTagsSection({ form }: { form: BonsaiBasicFormState }) {
  const { t, lang } = useTranslation();
  const c = useColors();
  const router = useRouter();
  const { recentTags, selectedTagIds, toggleTag, togglePresetTag } = form;

  // Sess15 PR-MM: タグ表示は「最近 3 件 + 「+N 件」 折りたたみ」 (案 A、 user 真意「画面埋め尽くし回避」)。
  const [tagExpanded, setTagExpanded] = useState(false);

  // Sess74 PR-2: preset 由来 row を recent から除外 (重複表示防止)。
  const customRecentTags = recentTags.filter((r) => !isPresetTagName(r.nameNormalized));
  const visibleTags =
    tagExpanded || customRecentTags.length <= TAG_COLLAPSED_COUNT
      ? customRecentTags
      : customRecentTags.slice(0, TAG_COLLAPSED_COUNT);
  const hiddenTagCount = Math.max(0, customRecentTags.length - TAG_COLLAPSED_COUNT);

  // Sess74 PR-2: 10 タグ上限到達 → 未 selected chip を disabled (functional_spec §14.3.3 TM1)。
  const isAtLimit = selectedTagIds.size >= BONSAI_TAG_LIMIT;

  // Sess74 PR-2: preset chip 一覧 (lang 別 localized、 selected 判定 + onPress wrapper)。
  type PresetChip = {
    id: string;
    localizedName: string;
    selected: boolean;
  };
  const presetChips: PresetChip[] = TAG_PRESETS.map((p) => {
    const localizedName = (p.names as Record<string, string>)[lang] ?? p.names.en;
    const normalized = normalizeTagName(localizedName);
    const matched = recentTags.find((r) => r.nameNormalized === normalized);
    const selected = matched ? selectedTagIds.has(matched.id) : false;
    return { id: p.id, localizedName, selected };
  });

  const isEmpty = customRecentTags.length === 0 && !presetChips.some((p) => p.selected);

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <ThemedText type="defaultSemiBold">{t('bonsaiFieldTags')}</ThemedText>
        <ThemedText style={[styles.optionalLabel, { color: c.textMuted }]}>
          {t('fieldOptionalLabel')}
        </ThemedText>
      </View>

      {/* Sess74 PR-2: 「おすすめ」 section (master preset chip 2 件、 常時表示)。 */}
      <View style={styles.presetSection}>
        <ThemedText style={[styles.sectionLabel, { color: c.textMuted }]}>
          {t('tagSectionPresets')}
        </ThemedText>
        <View style={styles.tagChipRow}>
          {presetChips.map((chip) => {
            const disabled = isAtLimit && !chip.selected;
            return (
              <Pressable
                key={chip.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: chip.selected, disabled }}
                accessibilityLabel={chip.localizedName}
                style={[
                  styles.tagChip,
                  { backgroundColor: c.surface, borderColor: c.border },
                  chip.selected && { backgroundColor: c.tint, borderColor: c.tint },
                  disabled && styles.tagChipDisabled,
                ]}
                onPress={() => {
                  if (disabled) return;
                  void togglePresetTag(chip.localizedName);
                }}
                disabled={disabled}
                testID={`e2e_tag_preset_chip_${chip.id}`}
              >
                <ThemedText
                  style={
                    chip.selected
                      ? [styles.tagChipTextSelected, { color: c.onTint }]
                      : styles.tagChipText
                  }
                >
                  {chip.localizedName}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sess15 PR-DD: empty 時は文言上 + button 下 (縦配置)、 chip 1+ 件時は wrap row (横並び)。
          Sess74 PR-2: customRecentTags でカウント (preset 除外)、 preset も未選択時のみ empty 表示。 */}
      {isEmpty ? (
        <View style={styles.tagEmptyColumn}>
          <ThemedText style={[styles.tagsEmpty, { color: c.textMuted }]}>
            {t('bonsaiTagsEmpty')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bonsaiTagsAddCta')}
            accessibilityState={{ disabled: isAtLimit }}
            style={[
              styles.tagAddChip,
              { borderColor: c.tint },
              isAtLimit && styles.tagChipDisabled,
            ]}
            onPress={() => {
              if (isAtLimit) return;
              router.push('/tag-edit?returnTo=bonsai-create' as Href);
            }}
            disabled={isAtLimit}
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
            const disabled = isAtLimit && !selected;
            return (
              <Pressable
                key={tg.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled }}
                accessibilityLabel={tg.name}
                style={[
                  styles.tagChip,
                  { backgroundColor: c.surface, borderColor: c.border },
                  selected && { backgroundColor: c.tint, borderColor: c.tint },
                  disabled && styles.tagChipDisabled,
                ]}
                onPress={() => {
                  if (disabled) return;
                  toggleTag(tg.id);
                }}
                disabled={disabled}
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
            accessibilityState={{ disabled: isAtLimit }}
            style={[
              styles.tagAddChip,
              { borderColor: c.tint },
              isAtLimit && styles.tagChipDisabled,
            ]}
            onPress={() => {
              if (isAtLimit) return;
              router.push('/tag-edit?returnTo=bonsai-create' as Href);
            }}
            disabled={isAtLimit}
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
  // Sess74 PR-2: preset section (おすすめタグ常時表示)。
  presetSection: { gap: 6 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
  // Sess74 PR-2: 10 タグ上限到達時の未 selected chip (functional_spec §14.3.3 TM1)。
  tagChipDisabled: { opacity: 0.4 },
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
