/**
 * RecurrenceFormScreen = 定期予定ルール 新規作成/編集 共通画面 (Sess82 PR-D 起票、 Sess89 PR-C 複数件対応)。
 *
 * 動線:
 *   - 新規: ふりかえり → 定期予定を管理 → BottomCtaBar「+ 新規追加」 →
 *           BonsaiMultiSelect (= 盆栽 複数選択) → BulkWorkPicker (= 種別選択) → 本画面 (mode='create')
 *   - 編集: ふりかえり → 定期予定を管理 → kebab → 編集 → 本画面 (mode='edit'、 ruleId param)
 *
 * 責務:
 *   - 編集モードで getRecurrenceRuleById で初期値 load (= 単数 bonsai)、 null なら router.back() + Toast
 *   - 新規モードで usePickerStore.bulkContext.selectedBonsais から **複数件** bonsai 取得
 *   - RecurrencePicker (= 既存 component、 enabled 強制 true、 hideToggle/hideEndDate)
 *   - 保存:
 *     - 編集 = replaceRecurrenceRule (= softDelete + create wrapper、 単数)
 *     - 新規 = bulkCreateRecurrenceRules (= N 件 transaction 一括作成、 Sess89 PR-C R-73)
 *
 * Sess89 PR-C (案 X = 案 X N 件 loop):
 *   - 複数盆栽 → 同じ予定を一括作成 (= 5 鉢に毎週月曜の水やり等の use case)
 *   - 上部 Chip 横並び (= BulkWorkPicker 15851 スタイル流用、 readonly)
 *   - header「{count} 件の盆栽に同じ予定を追加」 / 単数「{name} に予定を追加」 (= R-71 件数別契約)
 *   - Pro 境界: 現在 active + 新規 N 件 > FREE_RECURRENCE_RULE_LIMIT (=3) で Paywall (= 案 P1)
 *   - 編集モードは単数のまま (= 既存仕様維持、 v1.x で多盆栽編集対応)
 *
 * 参照: docs/adr/ADR-0056-recurring-schedule.md / docs/adr/ADR-0025-bulk-action.md §7 (Sess89 PR-C Amendment)
 *        src/db/recurrenceRuleRepository.ts (= bulkCreateRecurrenceRules / replaceRecurrenceRule)
 *        src/components/form/RecurrencePicker.tsx (Sess78 PR-4、 controlled component)
 */
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomCtaBar } from '@/src/components/common/BottomCtaBar';
import { useToastStore } from '@/src/components/Toast';
import {
  DEFAULT_RECURRENCE_VALUE,
  RecurrencePicker,
  type RecurrenceValue,
} from '@/src/components/form/RecurrencePicker';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  buildCustomRrule,
  parseCustomRruleDays,
  RECURRENCE_PRESETS,
  type RecurrencePresetKey,
} from '@/src/core/recurrence/rrule';
import { useColors } from '@/src/core/theme/useColors';
import { getBonsaiById } from '@/src/db/bonsaiRepository';
import {
  bulkCreateRecurrenceRules,
  countActiveRecurrenceRules,
  FREE_RECURRENCE_RULE_LIMIT,
  getRecurrenceRuleById,
  replaceRecurrenceRule,
  type CreateRecurrenceRuleInput,
} from '@/src/db/recurrenceRuleRepository';
import { useProStore } from '@/src/stores/proStore';
import { usePickerStore, type BulkBonsaiRef } from '@/src/stores/pickerStore';

type Mode = 'create' | 'edit';

type RouteParams = {
  ruleId?: string; // edit mode (= 編集対象 rule ID)
  eventType?: string; // create mode (= 対象 event_type、 caller 必須)
};

/**
 * RRULE 文字列 → {preset, customDays} 逆引き (= 編集時の初期値ロード用、 Sess89 PR-B 拡張)。
 *
 * 1. 静的 preset map で 完全一致 search (custom 除外)
 * 2. FREQ=DAILY;INTERVAL=N pattern match (= custom)
 * 3. fallback (= 旧 weeklyMonday / biweekly は「カスタム」 N=7 default)
 */
function rruleToPreset(rrule: string): { preset: RecurrencePresetKey; customDays: number | null } {
  for (const [key, val] of Object.entries(RECURRENCE_PRESETS)) {
    if (key === 'custom') continue;
    if (val === rrule) return { preset: key as RecurrencePresetKey, customDays: null };
  }
  const days = parseCustomRruleDays(rrule);
  if (days !== null) return { preset: 'custom', customDays: days };
  return { preset: 'custom', customDays: 7 };
}

export default function RecurrenceFormScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const mode: Mode = params.ruleId ? 'edit' : 'create';

  // Sess89 PR-C: 編集モードは単数 (= 既存仕様維持)、 新規モードは複数 (= store から取得)
  const [bonsais, setBonsais] = useState<readonly BulkBonsaiRef[]>([]);
  const [eventType, setEventType] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({
    ...DEFAULT_RECURRENCE_VALUE,
    enabled: true, // RecurrenceFormScreen では 強制 enabled (= rule entity の本質)
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Sess89 PR-C: Pro 境界判定用 active 件数 (= countActiveRecurrenceRules で取得)
  const [activeRuleCount, setActiveRuleCount] = useState(0);

  const isPro = useProStore((s) => s.isPro);

  // 編集モード = 既存 rule load (単数) / 新規モード = store から複数件取得
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // active 件数を Pro 境界判定用に取得
        const count = await countActiveRecurrenceRules();
        if (!cancelled) setActiveRuleCount(count);

        if (mode === 'edit' && params.ruleId) {
          const rule = await getRecurrenceRuleById(params.ruleId);
          if (!rule) {
            useToastStore.getState().show(t('recurringEditRuleNotFoundToast'));
            router.back();
            return;
          }
          const loadedBonsai = await getBonsaiById(rule.bonsaiId);
          if (cancelled) return;
          if (loadedBonsai) {
            setBonsais([{ id: loadedBonsai.id, name: loadedBonsai.name }]);
          }
          setEventType(rule.eventType);
          const { preset: loadedPreset, customDays: loadedCustomDays } = rruleToPreset(rule.rrule);
          setRecurrence({
            enabled: true,
            preset: loadedPreset,
            customDays: loadedCustomDays,
            endType: rule.endAtUtc ? 'specific' : 'never',
            endDate: rule.endAtUtc ? rule.endAtUtc.slice(0, 10) : null,
          });
        } else if (mode === 'create' && params.eventType) {
          // Sess89 PR-C: usePickerStore.bulkContext.selectedBonsais から複数件取得
          const selectedBonsais = usePickerStore.getState().bulkContext?.selectedBonsais ?? [];
          if (selectedBonsais.length === 0) {
            // store 空 = 直接遷移 or stale state、 戻る
            router.back();
            return;
          }
          if (cancelled) return;
          setBonsais(selectedBonsais);
          setEventType(params.eventType);
        } else {
          // 不正 param、 戻る
          router.back();
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, params.ruleId, params.eventType, router, t]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (bonsais.length === 0 || !eventType || saving) return;

    // Sess89 PR-C: Pro 境界判定 (= 案 P1 = 超過時 Paywall 即表示、 ADR-0049 ⑦)
    if (!isPro && activeRuleCount + bonsais.length > FREE_RECURRENCE_RULE_LIMIT) {
      router.push('/pro?source=recurring_rule' as Href);
      return;
    }

    setSaving(true);
    try {
      // Sess89 PR-B: custom 選択時は buildCustomRrule(customDays) で動的 RRULE 生成、 他 preset は静的 map
      const rrule =
        recurrence.preset === 'custom'
          ? buildCustomRrule(recurrence.customDays ?? 7)
          : RECURRENCE_PRESETS[recurrence.preset];
      const startAtUtc = nowUtc() as string;
      const endAtUtc =
        recurrence.endType === 'never'
          ? null
          : recurrence.endType === 'specific' && recurrence.endDate
            ? `${recurrence.endDate}T00:00:00.000Z`
            : null;

      if (mode === 'edit' && params.ruleId && bonsais[0]) {
        // 編集モード = 単数 (= 既存仕様維持)
        const input: CreateRecurrenceRuleInput = {
          bonsaiId: bonsais[0].id,
          eventType,
          rrule,
          startAtUtc,
          endAtUtc,
        };
        await replaceRecurrenceRule(params.ruleId, input);
        useToastStore.getState().show(t('recurringEditSavedToast'));
      } else {
        // Sess89 PR-C: 新規モード = bulkCreateRecurrenceRules で N 件 transaction 一括作成
        const inputs: CreateRecurrenceRuleInput[] = bonsais.map((b) => ({
          bonsaiId: b.id,
          eventType,
          rrule,
          startAtUtc,
          endAtUtc,
        }));
        await bulkCreateRecurrenceRules(inputs);
        useToastStore
          .getState()
          .show(t('recurringRuleCreatedToast').replace('{count}', String(bonsais.length)));
      }
      router.back();
    } catch (err) {
      console.warn('[RecurrenceFormScreen] save failed:', err);
      useToastStore.getState().show(t('recurringEditSaveFailedToast'));
    } finally {
      setSaving(false);
    }
  }, [
    bonsais,
    eventType,
    mode,
    params.ruleId,
    recurrence,
    router,
    saving,
    t,
    isPro,
    activeRuleCount,
  ]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: c.background }]}>
        <Stack.Screen
          options={{
            title:
              mode === 'edit' ? t('recurringEditScreenTitle') : t('recurringCreateScreenTitle'),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.tint} />
        </View>
      </ThemedView>
    );
  }

  // Sess89 PR-C: 件数別 header 文言 (= R-71 件数別 UX 表現契約)
  const isSingle = bonsais.length === 1;
  const headerText = isSingle
    ? t('recurringFormBonsaisHeaderSingle').replace('{name}', bonsais[0]?.name ?? '')
    : t('recurringFormBonsaisHeader').replace('{count}', String(bonsais.length));

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_recurrence_form_screen"
    >
      <Stack.Screen
        options={{
          title: mode === 'edit' ? t('recurringEditScreenTitle') : t('recurringCreateScreenTitle'),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Sess89 PR-C: 上部 Chip 横並び (= BulkWorkPicker 15851 スタイル流用、 readonly) */}
        <View style={[styles.chipsHeader, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemedText style={[styles.chipsHeaderText, { color: c.text }]}>{headerText}</ThemedText>
          <View style={styles.chipsRow}>
            {bonsais.map((b) => (
              <View
                key={b.id}
                style={[styles.chip, { backgroundColor: c.background, borderColor: c.border }]}
                testID={`e2e_recurrence_form_chip_${b.id}`}
              >
                <ThemedText style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
                  {b.name}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* 作業種別 (= readonly) */}
        <View style={[styles.summaryRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemedText style={[styles.summaryLabel, { color: c.textSecondary }]}>
            {t('recurringFormEventTypeLabel')}
          </ThemedText>
          <ThemedText style={[styles.summaryValue, { color: c.text }]}>
            {eventType ? t(`eventType_${eventType}` as TranslationKey) : '—'}
          </ThemedText>
        </View>

        <View style={styles.pickerWrap}>
          {/* Sess89 PR-A: hideToggle (= rule entity 本質 enabled=true) / hideEndDate (= 永続化標準) */}
          <RecurrencePicker value={recurrence} onChange={setRecurrence} hideToggle hideEndDate />
        </View>
      </ScrollView>

      <BottomCtaBar
        label={mode === 'edit' ? t('recurringEditSaveLabel') : t('recurringCreateSaveLabel')}
        onPress={() => void handleSave()}
        disabled={saving || bonsais.length === 0 || !eventType}
        testID="e2e_recurrence_form_save"
        icon={<View />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 96, gap: 12 },
  // Sess89 PR-C: 上部 Chip 横並び header (= BulkWorkPicker 15851 スタイル流用)
  chipsHeader: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  chipsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  pickerWrap: { marginTop: 8 },
});
