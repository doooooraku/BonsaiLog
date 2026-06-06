/**
 * 樹種 (species) ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * Sess15 PR-GG: 樹形 picker と同じ仕組み統一 (DB query 廃止)。
 * - SPECIES_SEED 静的配列を直接 render → 即時表示 (DB query の数秒遅延を解消)
 * - 通称は lang 別に SPECIES_SEED.names から取得 (現状 ja/en、 他 17 言語は en fallback)
 * - カスタム樹種のみ DB query (件数少なく遅延少ない)
 *
 * Sess13 PR-H: 「+ カスタム入力」 modal + bonsai_species_custom β table。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlusIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT / TEXT_MUTED / TEXT_PRIMARY / TEXT_SECONDARY は inline c.* 化。
// Sess70 PR-C2: BRAND_GREEN* / BRAND_GREEN_BG / DISABLED_BG / ON_BRAND も scheme-aware
// (c.tint / c.tintSubtle / c.disabledBg / c.onTint) に移行 (ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import {
  canCreateNewCustomSpecies,
  createOrFindCustomSpecies,
  FREE_CUSTOM_SPECIES_LIMIT,
  getAllCustomSpecies,
} from '@/src/db/bonsaiSpeciesCustomRepository';
import type { BonsaiSpeciesCustom } from '@/src/db/schema';
import { SPECIES_SEED } from '@/src/db/seedSpecies';
import { useProGuard } from '@/src/features/pro/useProGuard';
import { usePickerStore } from '@/src/stores/pickerStore';

const CUSTOM_SPECIES_MAX_LENGTH = 64;
const CUSTOM_PREFIX = 'custom:';

export default function SpeciesPickerScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ initial?: string }>();
  const [customSpecies, setCustomSpecies] = useState<BonsaiSpeciesCustom[]>([]);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<string | null>(params.initial ?? null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Sess15 PR-GG: 静的 SPECIES_SEED から lang 別通称を生成 (ja/en のみ、 他 17 言語は en fallback)。
  const speciesList = useMemo(
    () =>
      SPECIES_SEED.map((s) => ({
        id: s.id,
        scientificName: s.scientificName,
        commonName: lang === 'ja' ? s.names.ja : s.names.en,
      })),
    [lang],
  );

  // カスタム樹種のみ DB query (件数少なく遅延少ない)。
  useEffect(() => {
    let cancelled = false;
    void getAllCustomSpecies().then((customList) => {
      if (cancelled) return;
      setCustomSpecies(customList);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // ADR-0049 Sess59 PR5: カスタム樹種 ⑥ Free 上限 3 ガード
  const speciesGuard = useProGuard({
    feature: 'custom_species',
    currentCount: customSpecies.length,
  });

  const handleCreateCustom = async () => {
    const trimmed = customInput.trim();
    if (trimmed.length === 0) return;
    try {
      // ADR-0049 Sess59 PR5 + Sess60 PR1: Free 上限到達 + 既存名重複なし → Paywall 誘導
      // Sess60 PR1: photoLimit* 流用 → customLimit* 専用 key に切替 (文言不整合修正)
      const canCreate = await canCreateNewCustomSpecies(trimmed, speciesGuard.isPro);
      if (!canCreate) {
        Alert.alert(
          t('customLimitTitle'),
          t('customLimitDesc').replace('{count}', String(FREE_CUSTOM_SPECIES_LIMIT)),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('proCtaUpgrade'), onPress: speciesGuard.openPaywall },
          ],
        );
        return;
      }
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
          style={[
            styles.input,
            { color: c.text, borderColor: c.border, backgroundColor: c.surface },
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('bonsaiFieldSpeciesSearchPlaceholder')}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Sess60 PR3: section header でマスタ/カスタムを視覚的に差別化 */}
        {filteredMaster.length > 0 && (
          <View style={styles.sectionHeader} testID="e2e_species_section_master">
            <ThemedText style={[styles.sectionHeaderText, { color: c.textMuted }]}>
              {t('pickerSectionMaster')}
            </ThemedText>
          </View>
        )}
        {filteredMaster.map((s) => {
          const selected = s.id === current;
          return (
            <Pressable
              key={s.id}
              testID={`e2e_species_option_${s.id}`}
              accessibilityRole="button"
              accessibilityLabel={s.commonName}
              style={[
                styles.row,
                { borderBottomColor: c.border },
                selected && [
                  styles.rowSelected,
                  { backgroundColor: c.tintSubtle, borderBottomColor: c.tint },
                ],
              ]}
              onPress={() => handleSelect(s.id)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : undefined}>
                {s.commonName}
              </ThemedText>
            </Pressable>
          );
        })}
        {/* Sess13 PR-H: カスタム樹種 (bonsai_species_custom) を master の下に UNION 表示。 */}
        {/* Sess60 PR3: section header + 「カスタム」 badge + 残枠 counter で差別化 */}
        {customSpecies.length > 0 && (
          <View style={styles.sectionHeader} testID="e2e_species_section_custom">
            <ThemedText style={[styles.sectionHeaderText, { color: c.textMuted }]}>
              {t('pickerSectionCustom')}
            </ThemedText>
            <ThemedText style={[styles.sectionHeaderCounter, { color: c.textSecondary }]}>
              {speciesGuard.isPro
                ? `${customSpecies.length}`
                : `${customSpecies.length}/${FREE_CUSTOM_SPECIES_LIMIT}`}
            </ThemedText>
          </View>
        )}
        {filteredCustom.map((cs) => {
          const customKey = `${CUSTOM_PREFIX}${cs.id}`;
          const selected = customKey === current;
          return (
            <Pressable
              key={cs.id}
              testID={`e2e_species_option_custom_${cs.id}`}
              accessibilityRole="button"
              accessibilityLabel={cs.name}
              style={[
                styles.row,
                styles.rowCustom,
                { borderBottomColor: c.border },
                selected && [
                  styles.rowSelected,
                  { backgroundColor: c.tintSubtle, borderBottomColor: c.tint },
                ],
              ]}
              onPress={() => handleSelect(customKey)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : undefined}>
                {cs.name}
              </ThemedText>
              <View style={[styles.customBadge, { borderColor: c.tint }]}>
                <ThemedText style={[styles.customBadgeText, { color: c.tint }]}>
                  {t('pickerCustomBadge')}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Sess15 PR-AA: 案 D2 = solid outline + BRAND_GREEN テキスト/icon (Home Empty CTA と color family 統一、 secondary action 階層保持)。 */}
      <View style={[styles.footerWrap, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('customInputAdd')}
          style={[styles.customAddButton, { borderColor: c.tint }]}
          onPress={() => setShowCustomModal(true)}
          testID="e2e_species_picker_custom_add"
        >
          <PlusIcon size={18} color={c.tint} />
          <ThemedText style={[styles.customAddText, { color: c.tint }]}>
            {t('customInputAdd')}
          </ThemedText>
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
                style={[
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  { backgroundColor: c.surface },
                ]}
                onPress={() => {
                  setShowCustomModal(false);
                  setCustomInput('');
                }}
              >
                <ThemedText style={[styles.modalButtonSecondaryText, { color: c.text }]}>
                  {t('cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('create')}
                style={[
                  styles.modalButton,
                  { backgroundColor: customInput.trim().length === 0 ? c.disabledBg : c.tint },
                ]}
                disabled={customInput.trim().length === 0}
                onPress={handleCreateCustom}
                testID="e2e_species_picker_custom_create"
              >
                <ThemedText style={[styles.modalButtonPrimaryText, { color: c.onTint }]}>
                  {t('create')}
                </ThemedText>
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
    borderRadius: 12,
    fontSize: 16,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 4 },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  // Sess60 PR3: カスタム row 用 (badge を右寄せするため flex-row)
  rowCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  // Sess70 PR-C2: bg / borderBottomColor は inline c.tintSubtle / c.tint (scheme-aware)。
  rowSelected: {},
  rowTextSelected: { fontWeight: '600' },
  // Sess60 PR3: マスタ/カスタム section header (視覚的区切り、 uppercase + small text)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionHeaderCounter: {
    fontSize: 12,
  },
  // Sess60 PR3: カスタム badge (BRAND_GREEN outline chip、 small)
  // Sess70 PR-C2: borderColor / color は inline c.tint (scheme-aware)。
  customBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 100,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  footerWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Sess15 PR-AA: dashed gray → solid BRAND_GREEN (案 D2、 Home Empty CTA と統一 color family)。
  // Sess70 PR-C2: borderColor / color は inline c.tint (scheme-aware)。
  customAddButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  customAddText: { fontSize: 14, fontWeight: '600' },
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
  modalButtonSecondary: {},
  modalButtonSecondaryText: {},
  // Sess70 PR-C2: modalButtonPrimary bg / Disabled bg / Text color は inline c.tint / c.disabledBg / c.onTint (scheme-aware)。
  modalButtonPrimaryText: { fontWeight: '600' },
});
