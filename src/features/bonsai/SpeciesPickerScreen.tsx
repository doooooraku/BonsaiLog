/**
 * 樹種 (species) ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * Sess13 PR-A1: rowMapper 適用 (50 種全件表示 bug 修正)。
 * Sess13 PR-H: mockup species-picker.png 整合 +
 *   - 「一」 None option 削除 (Q-9 a)
 *   - placeholder「樹種名で検索 (例: 黒松, pine)」 (mockup 整合)
 *   - 「+ カスタム入力」 modal + bonsai_species_custom β table (Q-13 β)
 *
 * locale 別の通称 (commonName) + 学名 (scientificName) を表示、 search で絞り込み。
 * Master + custom を UNION 表示。 選択時に usePickerStore.setSpeciesPickerResult で返却:
 *   - master: id (raw ULID)
 *   - custom: 'custom:' + ULID prefix で区別
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlusIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  DISABLED_BG,
  ON_BRAND,
  TEXT_PRIMARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import {
  createOrFindCustomSpecies,
  getAllCustomSpecies,
} from '@/src/db/bonsaiSpeciesCustomRepository';
import type { BonsaiSpeciesCustom } from '@/src/db/schema';
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import { usePickerStore } from '@/src/stores/pickerStore';

const CUSTOM_SPECIES_MAX_LENGTH = 64;
const CUSTOM_PREFIX = 'custom:';

export default function SpeciesPickerScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ initial?: string }>();
  const [speciesList, setSpeciesList] = useState<SpeciesWithName[]>([]);
  const [customSpecies, setCustomSpecies] = useState<BonsaiSpeciesCustom[]>([]);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<string | null>(params.initial ?? null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAllSpecies(lang), getAllCustomSpecies()]).then(([list, customList]) => {
      if (cancelled) return;
      setSpeciesList(list);
      setCustomSpecies(customList);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const queryLower = query.trim().toLowerCase();
  const filteredMaster = queryLower
    ? speciesList.filter((s) =>
        `${s.commonName}${s.scientificName}`.toLowerCase().includes(queryLower),
      )
    : speciesList;
  const filteredCustom = queryLower
    ? customSpecies.filter((cs) => cs.name.toLowerCase().includes(queryLower))
    : customSpecies;

  const handleSelect = (resultId: string) => {
    setCurrent(resultId);
    usePickerStore.getState().setSpeciesPickerResult(resultId);
    router.back();
  };

  const handleCreateCustom = async () => {
    const trimmed = customInput.trim();
    if (trimmed.length === 0) return;
    try {
      const created = await createOrFindCustomSpecies(trimmed);
      setShowCustomModal(false);
      setCustomInput('');
      // 自動 select + back
      handleSelect(`${CUSTOM_PREFIX}${created.id}`);
    } catch (err) {
      Alert.alert(t('error'), String(err));
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_species_picker_screen"
    >
      <View style={styles.searchWrap}>
        <TextInput
          testID="e2e_species_picker_search"
          style={[styles.input, { color: c.text, borderColor: c.border }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('bonsaiFieldSpeciesSearchPlaceholder')}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {filteredMaster.map((s) => {
          const selected = s.id === current;
          return (
            <Pressable
              key={s.id}
              testID={`e2e_species_option_${s.id}`}
              accessibilityRole="button"
              accessibilityLabel={s.commonName}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => handleSelect(s.id)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : undefined}>
                {s.commonName}
              </ThemedText>
            </Pressable>
          );
        })}
        {/* Sess13 PR-H: カスタム樹種 (bonsai_species_custom) を master の下に UNION 表示。 */}
        {filteredCustom.map((cs) => {
          const customKey = `${CUSTOM_PREFIX}${cs.id}`;
          const selected = customKey === current;
          return (
            <Pressable
              key={cs.id}
              testID={`e2e_species_option_custom_${cs.id}`}
              accessibilityRole="button"
              accessibilityLabel={cs.name}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => handleSelect(customKey)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : undefined}>
                {cs.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Sess15 PR-AA: 案 D2 = solid outline + BRAND_GREEN テキスト/icon (Home Empty CTA と color family 統一、 secondary action 階層保持)。 */}
      <View style={styles.footerWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('customInputAdd')}
          style={styles.customAddButton}
          onPress={() => setShowCustomModal(true)}
          testID="e2e_species_picker_custom_add"
        >
          <PlusIcon size={18} color={BRAND_GREEN} />
          <ThemedText style={styles.customAddText}>{t('customInputAdd')}</ThemedText>
        </Pressable>
      </View>
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.background }]}>
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
              {t('customSpeciesCreateTitle')}
            </ThemedText>
            <TextInput
              testID="e2e_species_picker_custom_input"
              autoFocus={false}
              style={[styles.modalInput, { color: c.text, borderColor: c.border }]}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder={t('customSpeciesCreatePlaceholder')}
              placeholderTextColor={c.textSecondary}
              maxLength={CUSTOM_SPECIES_MAX_LENGTH}
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('cancel')}
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowCustomModal(false);
                  setCustomInput('');
                }}
              >
                <ThemedText style={styles.modalButtonSecondaryText}>{t('cancel')}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('create')}
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  customInput.trim().length === 0 && styles.modalButtonDisabled,
                ]}
                disabled={customInput.trim().length === 0}
                onPress={handleCreateCustom}
                testID="e2e_species_picker_custom_create"
              >
                <ThemedText style={styles.modalButtonPrimaryText}>{t('create')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    fontSize: 16,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 4 },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_DEFAULT,
    minHeight: 48,
  },
  rowSelected: { backgroundColor: BRAND_GREEN_BG, borderBottomColor: BRAND_GREEN },
  rowTextSelected: { fontWeight: '600' },
  footerWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  // Sess15 PR-AA: dashed gray → solid BRAND_GREEN (案 D2、 Home Empty CTA と統一 color family)。
  customAddButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  customAddText: { fontSize: 14, color: BRAND_GREEN, fontWeight: '600' },
  // Sess15 PR-HH: キーボード表示時に modal とキーボードが重ならないよう画面上部 (paddingTop) に配置。
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 14, padding: 20, gap: 14 },
  modalTitle: { fontSize: 16 },
  modalInput: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonSecondary: { backgroundColor: BG_SURFACE },
  modalButtonSecondaryText: { color: TEXT_PRIMARY },
  modalButtonPrimary: { backgroundColor: BRAND_GREEN },
  modalButtonPrimaryText: { color: ON_BRAND, fontWeight: '600' },
  modalButtonDisabled: { backgroundColor: DISABLED_BG },
});
