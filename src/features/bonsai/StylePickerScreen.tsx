/**
 * 樹形 (BonsaiStyle) ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * Sess13 PR-F: chip grid → 縦並び list 化 (mockup style-picker-01.png 整合)。
 * Sess13 PR-G: 「+ カスタム入力」 modal + bonsai_styles_custom β table 統合。
 *
 * BONSAI_STYLES (10 種) + user 定義カスタム樹形を UNION 表示。
 * 選択時に `usePickerStore.setStylePickerResult` (enum 値 or custom name 文字列) +
 * `router.back()` で caller に返却。 bonsai.style column には raw text 保存。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
// Sess15 PR-X: TextInput は既に modal 用に import 済、 search bar 追加で再利用。

import { ThemedText } from '@/components/themed-text';
import { PlusIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT / TEXT_MUTED / TEXT_PRIMARY / TEXT_SECONDARY は inline c.* 化、 BRAND_GREEN* / DISABLED_BG / ON_BRAND は brand-static で保持。
import { BRAND_GREEN, BRAND_GREEN_BG, DISABLED_BG, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import {
  canCreateNewCustomStyle,
  createOrFindCustomStyle,
  FREE_CUSTOM_STYLE_LIMIT,
  getAllCustomStyles,
} from '@/src/db/bonsaiStylesCustomRepository';
import { BONSAI_STYLES, type BonsaiStyle, type BonsaiStyleCustom } from '@/src/db/schema';
import { useProGuard } from '@/src/features/pro/useProGuard';
import { usePickerStore } from '@/src/stores/pickerStore';

const CUSTOM_STYLE_MAX_LENGTH = 32;

export default function StylePickerScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ initial?: string }>();
  const initial = params.initial;
  const [current, setCurrent] = useState<string | null>(initial ?? null);
  const [customStyles, setCustomStyles] = useState<BonsaiStyleCustom[]>([]);
  const [query, setQuery] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    void getAllCustomStyles().then((list) => {
      if (!cancelled) setCustomStyles(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (value: string) => {
    setCurrent(value);
    // BonsaiStyle enum or custom string raw を保存 (BonsaiBasicForm 側で as BonsaiStyle | null へ)
    usePickerStore.getState().setStylePickerResult(value as BonsaiStyle);
    router.back();
  };

  // ADR-0049 Sess59 PR5: カスタム樹形 ⑥ Free 上限 3 ガード (custom_species と同 feature 扱い)
  const styleGuard = useProGuard({ feature: 'custom_species', currentCount: customStyles.length });

  const handleCreateCustom = async () => {
    const trimmed = customInput.trim();
    if (trimmed.length === 0) return;
    try {
      // ADR-0049 Sess59 PR5 + Sess60 PR1: Free 上限到達 + 既存名重複なし → Paywall 誘導
      // Sess60 PR1: photoLimit* 流用 → customLimit* 専用 key に切替 (文言不整合修正)
      const canCreate = await canCreateNewCustomStyle(trimmed, styleGuard.isPro);
      if (!canCreate) {
        Alert.alert(
          t('customLimitTitle'),
          t('customLimitDesc').replace('{count}', String(FREE_CUSTOM_STYLE_LIMIT)),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('proCtaUpgrade'), onPress: styleGuard.openPaywall },
          ],
        );
        return;
      }
      const created = await createOrFindCustomStyle(trimmed);
      setShowCustomModal(false);
      setCustomInput('');
      // 自動 select + back
      setCurrent(created.name);
      usePickerStore.getState().setStylePickerResult(created.name as BonsaiStyle);
      router.back();
    } catch (err) {
      Alert.alert(t('error'), String(err));
    }
  };

  // Sess15 PR-X: 樹形 picker に検索バー追加 (SpeciesPicker と pattern 統一)。
  const queryLower = query.trim().toLowerCase();
  const filteredMaster = queryLower
    ? BONSAI_STYLES.filter((s) =>
        t(`bonsaiStyle_${s}` as TranslationKey)
          .toLowerCase()
          .includes(queryLower),
      )
    : BONSAI_STYLES;
  const filteredCustom = queryLower
    ? customStyles.filter((cs) => cs.name.toLowerCase().includes(queryLower))
    : customStyles;

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_style_picker_screen"
    >
      <View style={styles.searchWrap}>
        <TextInput
          testID="e2e_style_picker_search"
          style={[
            styles.input,
            { color: c.text, borderColor: c.border, backgroundColor: c.surface },
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('bonsaiFieldStyleSearchPlaceholder')}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Sess60 PR3: section header でマスタ/カスタムを視覚的に差別化 */}
        {filteredMaster.length > 0 && (
          <View style={styles.sectionHeader} testID="e2e_style_section_master">
            <ThemedText style={[styles.sectionHeaderText, { color: c.textMuted }]}>
              {t('pickerSectionMaster')}
            </ThemedText>
          </View>
        )}
        {filteredMaster.map((s) => {
          const selected = s === current;
          const labelKey = `bonsaiStyle_${s}` as TranslationKey;
          return (
            <Pressable
              key={s}
              testID={`e2e_style_option_${s}`}
              accessibilityRole="button"
              accessibilityLabel={t(labelKey)}
              style={[styles.row, { borderBottomColor: c.border }, selected && styles.rowSelected]}
              onPress={() => handleSelect(s)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : styles.rowText}>
                {t(labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
        {/* Sess13 PR-G: カスタム樹形 (bonsai_styles_custom) を master の下に UNION 表示。 */}
        {/* Sess60 PR3: section header + 「カスタム」 badge + 残枠 counter で差別化 */}
        {customStyles.length > 0 && (
          <View style={styles.sectionHeader} testID="e2e_style_section_custom">
            <ThemedText style={[styles.sectionHeaderText, { color: c.textMuted }]}>
              {t('pickerSectionCustom')}
            </ThemedText>
            <ThemedText style={[styles.sectionHeaderCounter, { color: c.textSecondary }]}>
              {styleGuard.isPro
                ? `${customStyles.length}`
                : `${customStyles.length}/${FREE_CUSTOM_STYLE_LIMIT}`}
            </ThemedText>
          </View>
        )}
        {filteredCustom.map((cs) => {
          const selected = cs.name === current;
          return (
            <Pressable
              key={cs.id}
              testID={`e2e_style_option_custom_${cs.id}`}
              accessibilityRole="button"
              accessibilityLabel={cs.name}
              style={[
                styles.row,
                { borderBottomColor: c.border },
                styles.rowCustom,
                selected && styles.rowSelected,
              ]}
              onPress={() => handleSelect(cs.name)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : styles.rowText}>
                {cs.name}
              </ThemedText>
              <View style={styles.customBadge}>
                <ThemedText style={styles.customBadgeText}>{t('pickerCustomBadge')}</ThemedText>
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
          style={styles.customAddButton}
          onPress={() => setShowCustomModal(true)}
          testID="e2e_style_picker_custom_add"
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
              {t('customStyleCreateTitle')}
            </ThemedText>
            <TextInput
              testID="e2e_style_picker_custom_input"
              autoFocus={false}
              style={[styles.modalInput, { color: c.text, borderColor: c.border }]}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder={t('customStyleCreatePlaceholder')}
              placeholderTextColor={c.textSecondary}
              maxLength={CUSTOM_STYLE_MAX_LENGTH}
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
                  styles.modalButtonPrimary,
                  customInput.trim().length === 0 && styles.modalButtonDisabled,
                ]}
                disabled={customInput.trim().length === 0}
                onPress={handleCreateCustom}
                testID="e2e_style_picker_custom_create"
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
  // Sess15 PR-X: SpeciesPicker と pattern 統一 (searchWrap + input)。
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  scroll: { paddingBottom: 16 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    justifyContent: 'center',
  },
  // Sess60 PR3: カスタム row 用 (badge を右寄せするため flex-row)
  rowCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowSelected: { backgroundColor: BRAND_GREEN_BG, borderBottomColor: BRAND_GREEN },
  rowText: { fontSize: 16 },
  rowTextSelected: { fontSize: 16, fontWeight: '600' },
  // Sess60 PR3: マスタ/カスタム section header (視覚的区切り、 uppercase + small text)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
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
  customBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    maxWidth: 100,
  },
  customBadgeText: {
    fontSize: 10,
    color: BRAND_GREEN,
    fontWeight: '600',
  },
  footerWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  modalTitle: { fontSize: 16 },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
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
  modalButtonPrimary: { backgroundColor: BRAND_GREEN },
  modalButtonPrimaryText: { color: ON_BRAND, fontWeight: '600' },
  modalButtonDisabled: { backgroundColor: DISABLED_BG },
});
