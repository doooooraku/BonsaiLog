import { useRouter, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  DISABLED_BG,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

import { createBonsai } from '@/src/db/bonsaiRepository';
import { BONSAI_STYLES, type BonsaiStyle } from '@/src/db/schema';
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';

/**
 * 盆栽新規登録画面 (P2-01 PR-D)。
 * - name (必須) / 樹種 / 樹形 / 取得日 を入力
 * - 樹種選択は inline ScrollView (50 種、簡易検索付き)
 * - 樹形選択は Picker 風 (10 種)
 * - 取得日は ISO 8601 文字列 (YYYY-MM-DD のみ簡易入力、Phase 2 PoC で DateTimePicker 連携)
 *
 * Claude Design `create-screens.jsx` 整合 (ADR-0019 §149-159):
 *   tokens 経由化 + form フィールド radius / border 整合 + chip radius 12 + submit BRAND_GREEN。
 */
export default function BonsaiNewScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [speciesList, setSpeciesList] = useState<SpeciesWithName[]>([]);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [style, setStyle] = useState<BonsaiStyle | null>(null);
  const [acquiredAt, setAcquiredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getAllSpecies(lang).then((list) => {
      if (!cancelled) setSpeciesList(list);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const filteredSpecies = speciesQuery.trim()
    ? speciesList.filter((s) =>
        `${s.commonName}${s.scientificName}`
          .toLowerCase()
          .includes(speciesQuery.trim().toLowerCase()),
      )
    : speciesList;

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const bonsai = await createBonsai({
        name: name.trim(),
        speciesId,
        style,
        acquiredAt: acquiredAt.trim() ? toIsoUtc(acquiredAt.trim()) : null,
      });
      router.replace(`/(tabs)/bonsai/${bonsai.id}` as Href);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldName')} *</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('bonsaiFieldNamePlaceholder')}
            accessibilityLabel={t('bonsaiFieldName')}
            maxLength={64}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldSpecies')}</ThemedText>
          <TextInput
            style={styles.input}
            value={speciesQuery}
            onChangeText={setSpeciesQuery}
            placeholder={t('bonsaiFieldSpeciesSearch')}
            accessibilityLabel={t('bonsaiFieldSpeciesSearch')}
          />
          <ScrollView style={styles.speciesScroll} nestedScrollEnabled>
            {filteredSpecies.slice(0, 30).map((s) => {
              const selected = s.id === speciesId;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.speciesRow, selected && styles.speciesRowSelected]}
                  onPress={() => setSpeciesId(selected ? null : s.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={s.commonName}
                >
                  <ThemedText style={selected ? styles.speciesNameSelected : undefined}>
                    {s.commonName}
                  </ThemedText>
                  <ThemedText style={styles.speciesSci}>{s.scientificName}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldStyle')}</ThemedText>
          <View style={styles.styleRow}>
            {BONSAI_STYLES.map((s) => {
              const selected = s === style;
              const labelKey = `bonsaiStyle_${s}` as TranslationKey;
              return (
                <Pressable
                  key={s}
                  style={[styles.styleChip, selected && styles.styleChipSelected]}
                  onPress={() => setStyle(selected ? null : s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(labelKey)}
                >
                  <ThemedText
                    style={selected ? styles.styleChipTextSelected : styles.styleChipText}
                  >
                    {t(labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldAcquiredAt')}</ThemedText>
          <TextInput
            style={styles.input}
            value={acquiredAt}
            onChangeText={setAcquiredAt}
            placeholder="YYYY-MM-DD"
            accessibilityLabel={t('bonsaiFieldAcquiredAt')}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('save')}
        accessibilityState={{ disabled: !canSubmit }}
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        <ThemedText style={styles.submitText}>{t('save')}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

/** YYYY-MM-DD → ISO 8601 UTC TEXT (00:00:00Z) */
function toIsoUtc(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return new Date().toISOString();
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}T00:00:00.000Z`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  scrollContent: { padding: 16, gap: 16 },
  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: BG_SURFACE,
  },
  speciesScroll: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
  },
  speciesRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  speciesRowSelected: { backgroundColor: BRAND_GREEN_BG },
  speciesNameSelected: { fontWeight: '600' },
  speciesSci: { fontSize: 12, color: TEXT_SECONDARY, fontStyle: 'italic' },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // chip radius 12 (design_system.md §5 整合、旧 16 → 12)、padding 12 (タップ領域 36+)
  styleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: BG_SURFACE,
  },
  styleChipSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  styleChipText: { fontSize: 13 },
  styleChipTextSelected: { fontSize: 13, color: ON_BRAND, fontWeight: '600' },
  submit: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  submitDisabled: { backgroundColor: DISABLED_BG },
  submitText: { color: ON_BRAND, fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
