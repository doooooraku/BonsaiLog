/**
 * RecurrenceFormScreen = 定期予定ルール 新規作成/編集 共通画面 (Sess82 PR-D)。
 *
 * 動線:
 *   - 新規: ふりかえり → 定期予定を管理 → BottomCtaBar「+ 新規追加」 → 本画面 (mode='create')
 *   - 編集: ふりかえり → 定期予定を管理 → kebab → 編集 → 本画面 (mode='edit'、 ruleId param)
 *
 * 責務:
 *   - 編集モードで getRecurrenceRuleById で初期値 load、 null なら router.back() + Toast
 *   - 新規モードで BulkPickerStore から bonsai 取得 (= 既存予定タブと同 pattern、 ただし簡易版で直接 selector)
 *   - RecurrencePicker (= 既存 component、 enabled 強制 true)
 *   - 保存 = createRecurrenceRule (新規) or replaceRecurrenceRule (編集、 = softDelete + create wrapper)
 *
 * 注: v1.0.1 簡易版として bonsai / event_type は readonly (= 編集時は変更不可、 新規時は URL param で指定済前提)
 *     v1.x で 全項目編集対応 (= user Q2=C「全項目」 完全実装は plan §C Option A の後継として 純正 updateRecurrenceRule)
 *
 * 参照: docs/adr/ADR-0056-recurring-schedule.md / src/features/recurrence/RecurrenceListScreen.tsx
 *        src/db/recurrenceRuleRepository.ts (createRecurrenceRule / replaceRecurrenceRule / getRecurrenceRuleById)
 *        src/components/form/RecurrencePicker.tsx (Sess78 PR-4、 controlled component 100% 流用)
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
  createRecurrenceRule,
  getRecurrenceRuleById,
  replaceRecurrenceRule,
  type CreateRecurrenceRuleInput,
} from '@/src/db/recurrenceRuleRepository';
import type { Bonsai } from '@/src/db/schema';

type Mode = 'create' | 'edit';

type RouteParams = {
  ruleId?: string; // edit mode (= 編集対象 rule ID)
  bonsaiId?: string; // create mode (= 対象 bonsai ID、 caller 必須)
  eventType?: string; // create mode (= 対象 event_type、 caller 必須)
};

/**
 * RRULE 文字列 → {preset, customDays} 逆引き (= 編集時の初期値ロード用、 Sess89 PR-B 拡張)。
 *
 * 1. 静的 preset map で 完全一致 search (= daily / weekly / monthly / every3Months /
 *    every6Months / yearly)、 ただし `custom` は除外 (= 動的生成のため逆引きは別 path)
 * 2. FREQ=DAILY;INTERVAL=N pattern match (= custom)、 N を customDays に
 * 3. fallback (= 旧 weeklyMonday / biweekly RRULE などは「カスタム」 として扱う、 N=7 default)
 */
function rruleToPreset(rrule: string): { preset: RecurrencePresetKey; customDays: number | null } {
  // 1. 静的 preset map で 完全一致 search (custom は除外)
  for (const [key, val] of Object.entries(RECURRENCE_PRESETS)) {
    if (key === 'custom') continue;
    if (val === rrule) return { preset: key as RecurrencePresetKey, customDays: null };
  }
  // 2. custom pattern match (= FREQ=DAILY;INTERVAL=N)
  const days = parseCustomRruleDays(rrule);
  if (days !== null) return { preset: 'custom', customDays: days };
  // 3. fallback (= 旧 weeklyMonday=FREQ=WEEKLY;BYDAY=MO / biweekly=FREQ=WEEKLY;INTERVAL=2 など)
  return { preset: 'custom', customDays: 7 };
}

export default function RecurrenceFormScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const mode: Mode = params.ruleId ? 'edit' : 'create';

  const [bonsai, setBonsai] = useState<Bonsai | null>(null);
  const [eventType, setEventType] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({
    ...DEFAULT_RECURRENCE_VALUE,
    enabled: true, // RecurrenceFormScreen では 強制 enabled (= rule entity の本質)
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 編集モード = 既存 rule load / 新規モード = URL param から bonsai/event_type 取得
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (mode === 'edit' && params.ruleId) {
          const rule = await getRecurrenceRuleById(params.ruleId);
          if (!rule) {
            useToastStore.getState().show(t('recurringEditRuleNotFoundToast'));
            router.back();
            return;
          }
          const loadedBonsai = await getBonsaiById(rule.bonsaiId);
          if (cancelled) return;
          setBonsai(loadedBonsai);
          setEventType(rule.eventType);
          // Sess89 PR-B: rruleToPreset は {preset, customDays} を返す型に変更
          const { preset: loadedPreset, customDays: loadedCustomDays } = rruleToPreset(rule.rrule);
          setRecurrence({
            enabled: true,
            preset: loadedPreset,
            customDays: loadedCustomDays,
            endType: rule.endAtUtc ? 'specific' : 'never',
            endDate: rule.endAtUtc ? rule.endAtUtc.slice(0, 10) : null,
          });
        } else if (mode === 'create' && params.bonsaiId && params.eventType) {
          const loadedBonsai = await getBonsaiById(params.bonsaiId);
          if (cancelled) return;
          setBonsai(loadedBonsai);
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
  }, [mode, params.ruleId, params.bonsaiId, params.eventType, router, t]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!bonsai || !eventType || saving) return;
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
      const input: CreateRecurrenceRuleInput = {
        bonsaiId: bonsai.id,
        eventType,
        rrule,
        startAtUtc,
        endAtUtc,
      };
      if (mode === 'edit' && params.ruleId) {
        await replaceRecurrenceRule(params.ruleId, input);
      } else {
        await createRecurrenceRule(input);
      }
      useToastStore.getState().show(t('recurringEditSavedToast'));
      router.back();
    } catch (err) {
      console.warn('[RecurrenceFormScreen] save failed:', err);
      useToastStore.getState().show(t('recurringEditSaveFailedToast'));
    } finally {
      setSaving(false);
    }
  }, [bonsai, eventType, mode, params.ruleId, recurrence, router, saving, t]);

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
        {/* 盆栽 + 作業種別 (v1.0.1 簡易版: readonly 表示、 v1.x で 編集対応) */}
        <View style={[styles.summaryRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemedText style={[styles.summaryLabel, { color: c.textSecondary }]}>
            {t('recurringFormBonsaiLabel')}
          </ThemedText>
          <ThemedText style={[styles.summaryValue, { color: c.text }]} numberOfLines={1}>
            {bonsai?.name ?? '—'}
          </ThemedText>
        </View>
        <View style={[styles.summaryRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemedText style={[styles.summaryLabel, { color: c.textSecondary }]}>
            {t('recurringFormEventTypeLabel')}
          </ThemedText>
          <ThemedText style={[styles.summaryValue, { color: c.text }]}>
            {eventType ? t(`eventType_${eventType}` as TranslationKey) : '—'}
          </ThemedText>
        </View>

        <View style={styles.pickerWrap}>
          {/* Sess89 PR-A: hideToggle = rule entity は本質的に enabled=true 固定で toggle UI 不要 (= UI 矛盾解消)、
              hideEndDate = 定期予定は永続化が標準 (= ADR-0056 D4-1 + user 真意「永続的に登録される想定」)、
              user に終了日選ばせず内部 endAtUtc=null 固定。 */}
          <RecurrencePicker value={recurrence} onChange={setRecurrence} hideToggle hideEndDate />
        </View>
      </ScrollView>

      <BottomCtaBar
        label={mode === 'edit' ? t('recurringEditSaveLabel') : t('recurringCreateSaveLabel')}
        onPress={() => void handleSave()}
        disabled={saving || !bonsai || !eventType}
        testID="e2e_recurrence_form_save"
        /* Sess89 PR-A: 「+作成」 → 「保存する」 (= i18n + アイコン重複解消)。 PlusIcon 抑止で
           「保存」 と「+」 の意味重複を回避。 BottomCtaBar.tsx:98 で icon prop が null/undefined
           時の挙動を React.ReactNode 型で許容 (= 既存 fallback ロジック確認済)。 */
        icon={<View />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 96, gap: 12 },
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
