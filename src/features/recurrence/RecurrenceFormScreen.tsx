/**
 * RecurrenceFormScreen = 定期予定ルール 新規作成/編集 共通画面 (Sess82 PR-D 起票、 Sess89 PR-C 複数件対応、 Sess93 PR-4 モックアップ統合)。
 *
 * 動線:
 *   - 新規: ふりかえり → 定期予定を管理 → BottomCtaBar「+ 新規追加」 →
 *           BonsaiMultiSelect (= 盆栽 複数選択) → BulkWorkPicker (= 種別選択) → 本画面 (mode='create')
 *   - 編集: ふりかえり → 定期予定を管理 → kebab → 編集 → 本画面 (mode='edit'、 ruleId param)
 *
 * 責務:
 *   - 編集モードで getRecurrenceRuleById で初期値 load (= 単数 bonsai + memo + byday + startDate)
 *   - 新規モードで usePickerStore.bulkContext.selectedBonsais から **複数件** bonsai 取得
 *   - RecurrencePicker (= 既存 component、 enabled 強制 true、 hideToggle/hideEndDate)
 *   - MemoInputRow (= Sess93 PR-4 新規、 200 文字 + 複数行)
 *   - NotificationCard (= Sess93 PR-4 新規、 まとめ通知時刻 直接編集)
 *   - RulePreviewCard (= Sess93 PR-4 新規、 「このルールで作られる予定」 確認 card)
 *   - 保存:
 *     - 編集 = 事前 ConfirmDialog (= 既存予定削除 + 再生成 通知) → replaceRecurrenceRule
 *     - 新規 = bulkCreateRecurrenceRules (= N 件 transaction 一括作成)
 *
 * Sess93 PR-4 改修:
 *   - byday → buildWeeklyByDayRrule で RRULE 生成 (= preset='weekly' + byday 非空時)
 *   - startDate → startAtUtc (= user 指定の任意日、 過去日 = 保存ブロック)
 *   - memo → recurrence_rules.memo (= PR-1 で 列追加 + cascade)
 *   - 編集 ConfirmDialog (= R-79 「破壊的データ操作は user に事前通知必須」 整合)
 *
 * 参照: docs/adr/ADR-0056-recurring-schedule.md / docs/adr/ADR-0025-bulk-action.md §7 (Sess89 PR-C Amendment)
 *        src/db/recurrenceRuleRepository.ts (= bulkCreateRecurrenceRules / replaceRecurrenceRule)
 *        src/components/form/RecurrencePicker.tsx (Sess78 PR-4、 Sess93 PR-3 拡張)
 */
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomCtaBar } from '@/src/components/common/BottomCtaBar';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { MemoInputRow } from '@/src/components/form/MemoInputRow';
import { NotificationCard } from '@/src/components/form/NotificationCard';
import {
  DEFAULT_RECURRENCE_VALUE,
  isStartDateInPast,
  RecurrencePicker,
  type RecurrenceValue,
} from '@/src/components/form/RecurrencePicker';
import { RulePreviewCard } from '@/src/components/form/RulePreviewCard';
import { useToastStore } from '@/src/components/Toast';
import { getTzOffsetMin, nowUtc, toLocalDateKey } from '@/src/core/datetime';
import { formatLocalizedShortDateWithWeekday } from '@/src/core/datetime/formatLocalized';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  buildCustomRrule,
  buildWeeklyByDayRrule,
  computeFirstOccurrenceDateKey,
  parseCustomRruleDays,
  parseWeeklyByDay,
  RECURRENCE_PRESETS,
  type RecurrencePresetKey,
} from '@/src/core/recurrence/rrule';
import { useColors } from '@/src/core/theme/useColors';
import { getBonsaiById } from '@/src/db/bonsaiRepository';
import {
  bulkCreateRecurrenceRules,
  countActiveRecurrenceGroups,
  FREE_RECURRENCE_GROUP_LIMIT,
  getActiveRulesByGroupKey,
  getRecurrenceRuleById,
  replaceRecurrenceRuleGroup,
  ruleGroupKey,
  type CreateRecurrenceRuleInput,
} from '@/src/db/recurrenceRuleRepository';
import { BonsaiChipPickerLayout } from '@/src/features/bonsai/BonsaiChipPickerLayout';
import { WorkTypeGrid } from '@/src/features/event/WorkTypeGrid';
import type { EventType } from '@/src/db/schema';
import { useProStore } from '@/src/stores/proStore';
import { usePickerStore, type BulkBonsaiRef } from '@/src/stores/pickerStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

type Mode = 'create' | 'edit';

type RouteParams = {
  ruleId?: string; // edit mode (= 編集対象 rule ID)
  eventType?: string; // create mode (= 対象 event_type、 caller 必須)
};

/**
 * RRULE 文字列 → {preset, customDays, byday} 逆引き (= 編集時の初期値ロード用、 Sess93 PR-4 拡張)。
 *
 * 1. weekly BYDAY pattern match (= FREQ=WEEKLY;BYDAY=...) を 最優先 (= byday 配列復元)
 * 2. 静的 preset map で 完全一致 search (custom 除外)
 * 3. FREQ=DAILY;INTERVAL=N pattern match (= custom)
 * 4. fallback (= 旧 weeklyMonday / biweekly は「カスタム」 N=7 default)
 */
function rruleToPreset(rrule: string): {
  preset: RecurrencePresetKey;
  customDays: number | null;
  byday: number[];
} {
  // Sess93 PR-4: FREQ=WEEKLY;BYDAY=... を 最優先 parse
  const byday = parseWeeklyByDay(rrule);
  if (byday !== null) {
    return { preset: 'weekly', customDays: null, byday };
  }
  for (const [key, val] of Object.entries(RECURRENCE_PRESETS)) {
    if (key === 'custom') continue;
    if (val === rrule) return { preset: key as RecurrencePresetKey, customDays: null, byday: [] };
  }
  const days = parseCustomRruleDays(rrule);
  if (days !== null) return { preset: 'custom', customDays: days, byday: [] };
  return { preset: 'custom', customDays: 7, byday: [] };
}

/**
 * Sess93 PR-4: preset + customDays + byday から 保存用 RRULE 文字列を 生成。
 */
function buildRruleFromValue(value: RecurrenceValue): string {
  if (value.preset === 'custom') {
    return buildCustomRrule(value.customDays ?? 7);
  }
  if (value.preset === 'weekly') {
    // byday 非空 → BYDAY 付与、 空 → FREQ=WEEKLY (開始日基準)
    return buildWeeklyByDayRrule(value.byday);
  }
  return RECURRENCE_PRESETS[value.preset];
}

/**
 * Sess93 PR-4: プレビュー summary 文字列 を 生成 (= 「{頻度}・{作業} を {N}本に」)。
 */
function buildPreviewSummary(
  value: RecurrenceValue,
  eventType: string | null,
  count: number,
  t: (key: TranslationKey) => string,
): string {
  if (!eventType || count === 0) return '';
  const presetKey =
    `recurringPreset${value.preset.charAt(0).toUpperCase()}${value.preset.slice(1)}` as TranslationKey;
  let presetLabel = '';
  try {
    presetLabel = t(presetKey);
  } catch {
    presetLabel = value.preset;
  }
  // custom 時は「N 日ごと」 形式に整形
  if (value.preset === 'custom') {
    presetLabel = t('recurringPresetCustomEveryNDays').replace(
      '{n}',
      String(value.customDays ?? 7),
    );
  }
  const eventLabel = t(`eventType_${eventType}` as TranslationKey);
  return t('recurringFormSummaryFormat')
    .replace('{rrule}', presetLabel)
    .replace('{eventType}', eventLabel)
    .replace('{count}', String(count));
}

export default function RecurrenceFormScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const router = useRouter();
  // Sess94 PR-B: 通知時刻 SoT (= settingsStore.notificationDailySummaryTime) を read で「次回」 行に反映
  const notifTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  const params = useLocalSearchParams<RouteParams>();
  const mode: Mode = params.ruleId ? 'edit' : 'create';

  const [bonsais, setBonsais] = useState<readonly BulkBonsaiRef[]>([]);
  const [eventType, setEventType] = useState<string | null>(null);
  // Sess99 #1122 案 G2: 編集モードのグループ情報 (= 同 group_id の rule 全員を置換対象にする)
  const [memberRuleIds, setMemberRuleIds] = useState<string[]>([]);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  // Sess99 #1122: 種別インライン変更 (編集モードのみ、 row tap で WorkTypeGrid を開閉)
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  // Sess99 #1122: 「対象の盆栽を変更」 → BonsaiMultiSelect(returnTo=back) 復帰待ちフラグ。
  // create モードの bulkContext 初期読込と干渉しないよう、自分が起動した時のみ focus で同期する。
  const awaitingBonsaiReselect = useRef(false);
  // Sess93 PR-3: startDate default = 今日のローカル日付 (= 過去日エラー回避)
  const todayKey = useMemo(() => toLocalDateKey(nowUtc(), getTzOffsetMin()), []);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({
    ...DEFAULT_RECURRENCE_VALUE,
    enabled: true,
    startDate: todayKey,
  });
  // Sess93 PR-4: memo state (= rule.memo、 user 任意 200 文字)
  const [memo, setMemo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Sess93 PR-4: 編集モード ConfirmDialog 表示 state (= R-79 破壊的データ操作の事前通知)
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  // Sess101 #1159: Free 境界 = 予定グループ数 (rule 数ではない)
  const [activeGroupCount, setActiveGroupCount] = useState(0);

  const isPro = useProStore((s) => s.isPro);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const count = await countActiveRecurrenceGroups();
        if (!cancelled) setActiveGroupCount(count);

        if (mode === 'edit' && params.ruleId) {
          const rule = await getRecurrenceRuleById(params.ruleId);
          if (!rule) {
            useToastStore.getState().show(t('recurringEditRuleNotFoundToast'));
            router.back();
            return;
          }
          // Sess99 #1122 案 G2: グループ全員 (= 同 group_id、 旧データは 1 本) を編集対象に復元
          const key = ruleGroupKey(rule);
          const members = await getActiveRulesByGroupKey(key);
          const memberBonsais: BulkBonsaiRef[] = [];
          for (const member of members) {
            const b = await getBonsaiById(member.bonsaiId);
            if (b) memberBonsais.push({ id: b.id, name: b.name });
          }
          if (cancelled) return;
          setGroupKey(key);
          setMemberRuleIds(members.map((m) => m.id));
          setBonsais(memberBonsais);
          setEventType(rule.eventType);
          const {
            preset: loadedPreset,
            customDays: loadedCustomDays,
            byday: loadedByday,
          } = rruleToPreset(rule.rrule);
          setRecurrence({
            enabled: true,
            preset: loadedPreset,
            customDays: loadedCustomDays,
            byday: loadedByday,
            startDate: rule.startAtUtc.slice(0, 10),
            endType: rule.endAtUtc ? 'specific' : 'never',
            endDate: rule.endAtUtc ? rule.endAtUtc.slice(0, 10) : null,
          });
          setMemo(rule.memo ?? '');
        } else if (mode === 'create' && params.eventType) {
          const selectedBonsais = usePickerStore.getState().bulkContext?.selectedBonsais ?? [];
          if (selectedBonsais.length === 0) {
            router.back();
            return;
          }
          if (cancelled) return;
          setBonsais(selectedBonsais);
          setEventType(params.eventType);
        } else {
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

  // Sess99 #1122 案 G2: 「対象の盆栽を変更」 → BonsaiMultiSelect (returnTo=back) で選び直し、
  // bulkContext 経由で受け取る (= 既存の選択 UI / restore 機構をそのまま流用)。
  const handleChangeBonsais = useCallback(() => {
    usePickerStore.getState().setBulkContext({ selectedBonsais: bonsais });
    awaitingBonsaiReselect.current = true;
    router.push('/bonsai-multi-select?mode=recurring&returnTo=back' as Href);
  }, [bonsais, router]);

  useFocusEffect(
    useCallback(() => {
      if (!awaitingBonsaiReselect.current) return;
      awaitingBonsaiReselect.current = false;
      const ctx = usePickerStore.getState().bulkContext;
      if (ctx && ctx.selectedBonsais.length > 0) {
        setBonsais(ctx.selectedBonsais);
      }
    }, []),
  );

  // Sess93 PR-4: 保存実行 (= 編集モード ConfirmDialog 経由 / 新規モード 直接)
  const performSave = useCallback(async (): Promise<void> => {
    if (bonsais.length === 0 || !eventType || saving) return;

    // Sess101 #1159: Free 境界 = 予定グループ数 (ADR-0049 ⑦ Sess101 Amendment)。
    // 編集 = グループ置換でグループ数不変 → 盆栽の増減・種別変更は Free でも常に可
    // (Grandfathered 4+ グループの編集も通す)。 新規 = +1 グループのみ判定。
    if (!isPro && mode === 'create' && activeGroupCount >= FREE_RECURRENCE_GROUP_LIMIT) {
      router.push('/pro?source=recurring_rule' as Href);
      return;
    }

    setSaving(true);
    try {
      const rrule = buildRruleFromValue(recurrence);
      // Sess93 PR-3/PR-4: startAtUtc は user 指定の開始日 (= 過去日 不可、 既に UI でガード済)
      const startAtUtc = recurrence.startDate
        ? `${recurrence.startDate}T00:00:00.000Z`
        : (nowUtc() as string);
      const endAtUtc =
        recurrence.endType === 'never'
          ? null
          : recurrence.endType === 'specific' && recurrence.endDate
            ? `${recurrence.endDate}T00:00:00.000Z`
            : null;

      if (mode === 'edit' && groupKey && memberRuleIds.length > 0) {
        // Sess99 #1122 案 G2: グループ全員を置換 — 盆栽セットの増減 + 種別変更も全てここで反映。
        const inputs: CreateRecurrenceRuleInput[] = bonsais.map((b) => ({
          bonsaiId: b.id,
          eventType,
          rrule,
          startAtUtc,
          endAtUtc,
          memo: memo || null,
        }));
        await replaceRecurrenceRuleGroup(memberRuleIds, inputs, groupKey);
        useToastStore.getState().show(t('recurringEditSavedToast'));
      } else {
        const inputs: CreateRecurrenceRuleInput[] = bonsais.map((b) => ({
          bonsaiId: b.id,
          eventType,
          rrule,
          startAtUtc,
          endAtUtc,
          memo: memo || null,
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
    groupKey,
    memberRuleIds,
    recurrence,
    router,
    saving,
    t,
    isPro,
    activeGroupCount,
    memo,
  ]);

  // Sess93 PR-4: 保存ボタン ハンドラ — 編集モード は ConfirmDialog を 挟む、 新規モードは 直接 performSave
  const handleSaveTap = useCallback(() => {
    if (mode === 'edit') {
      setShowEditConfirm(true);
      return;
    }
    void performSave();
  }, [mode, performSave]);

  const handleEditConfirm = useCallback(() => {
    setShowEditConfirm(false);
    void performSave();
  }, [performSave]);

  const handleEditCancel = useCallback(() => {
    setShowEditConfirm(false);
  }, []);

  // Sess101 #1157: 「次回」 行 = SoT 関数 computeFirstOccurrenceDateKey の実計算値。
  // 旧 Sess94 PR-B の「次回 = 開始日」 直表示は Sess93 PR-2 BYDAY 対応以降、 開始日が
  // rule に合致しない場合 (例: 開始 木曜 + 毎週月曜 → 実初回 = 次の月曜) に偽表示に
  // なるため撤廃。 保存時の events 展開と同一経路なので一覧画面の「次回」 と恒等。
  // exdates は新規 = なし / 編集 = 全削除 + 再生成 (replaceRecurrenceRuleGroup) で
  // リセットされるため、 プレビューは常に [] が保存後の実態と一致する。
  const firstOccurrenceDateKey = useMemo(() => {
    if (!recurrence.startDate || !eventType) return null;
    const startAtUtc = `${recurrence.startDate}T00:00:00.000Z`;
    const endAtUtc =
      recurrence.endType === 'specific' && recurrence.endDate
        ? `${recurrence.endDate}T00:00:00.000Z`
        : null;
    return computeFirstOccurrenceDateKey(
      buildRruleFromValue(recurrence),
      startAtUtc,
      endAtUtc,
      [],
      getTzOffsetMin(),
    );
  }, [recurrence, eventType]);

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

  const isSingle = bonsais.length === 1;
  const headerText = isSingle
    ? t('recurringFormBonsaisHeaderSingle').replace('{name}', bonsais[0]?.name ?? '')
    : t('recurringFormBonsaisHeader').replace('{count}', String(bonsais.length));

  const previewSummary = buildPreviewSummary(recurrence, eventType, bonsais.length, t);
  const startDateInvalid = isStartDateInPast(recurrence);
  const saveDisabled = saving || bonsais.length === 0 || !eventType || startDateInvalid;
  // 「次回」 行用文字列 (= 初回合致日 + 通知時刻、 例 ja「6月15日（月）7:00」 / en「Jun 15 (Mon) 7:00」)。
  // 日付は firstOccurrenceDateKey (= SoT 実計算、 上の useMemo) を表示 — 開始日直表示は禁止 (#1157)。
  // モック整合: 短日付 (年なし) + ja 全角括弧 で RulePreviewCard 次回行を ClaudeDesign 完全一致。
  const nextOccurrenceLabel = firstOccurrenceDateKey
    ? `${formatLocalizedShortDateWithWeekday(firstOccurrenceDateKey, lang)} ${notifTime}`
    : null;

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
      <BonsaiChipPickerLayout
        bonsais={bonsais}
        headerText={headerText}
        isSingle={isSingle}
        showAutoSelectedHint={mode === 'create'}
        chipTestIdPrefix="e2e_recurrence_form_chip"
        autoSelectedHintTestId="e2e_recurrence_form_auto_selected_hint"
        bottomPadding={96}
      >
        {/* Sess99 #1122 案 G2 (編集モードのみ): 「対象の盆栽を変更」 row —
            BonsaiMultiSelect (returnTo=back) で増減・差し替え。 */}
        {mode === 'edit' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('recurringFormChangeBonsais')}
            style={[styles.summaryRow, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={handleChangeBonsais}
            testID="e2e_recurrence_form_change_bonsais"
          >
            <ThemedText style={[styles.summaryLabel, { color: c.textSecondary }]}>
              {t('recurringFormChangeBonsais')}
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: c.tint }]}>
              {t('recurringFormTapToChange')}
            </ThemedText>
          </Pressable>
        )}

        {/* 作業種別 — Sess99 #1122: 編集モードは tap で WorkTypeGrid を開閉して変更可能
            (create モードは BulkWorkPicker で選択済のため従来どおり readonly)。 */}
        <Pressable
          accessibilityRole={mode === 'edit' ? 'button' : 'none'}
          accessibilityLabel={t('recurringFormEventTypeLabel')}
          disabled={mode !== 'edit'}
          style={[styles.summaryRow, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => setTypePickerOpen((open) => !open)}
          testID="e2e_recurrence_form_event_type_row"
        >
          <ThemedText style={[styles.summaryLabel, { color: c.textSecondary }]}>
            {t('recurringFormEventTypeLabel')}
          </ThemedText>
          <ThemedText style={[styles.summaryValue, { color: c.text }]}>
            {eventType ? t(`eventType_${eventType}` as TranslationKey) : '—'}
            {mode === 'edit' ? (typePickerOpen ? ' ▲' : ' ▼') : ''}
          </ThemedText>
        </Pressable>
        {mode === 'edit' && typePickerOpen && (
          <WorkTypeGrid
            selectedType={(eventType as EventType | null) ?? null}
            onSelect={(type) => {
              setEventType(type);
              setTypePickerOpen(false);
            }}
            testIDPrefix="e2e_recurrence_form_type"
          />
        )}

        {/* Sess93 PR-4: 開始日 picker を 表示 (= hideStartDate 解除)、 hideToggle/hideEndDate keep */}
        <RecurrencePicker value={recurrence} onChange={setRecurrence} hideToggle hideEndDate />

        {/* Sess93 PR-4: NotificationCard (= まとめ通知時刻 直接編集、 案 C) */}
        <NotificationCard disabled={saving} />

        {/* Sess93 PR-4: MemoInputRow (= 200 文字 + 複数行) */}
        <MemoInputRow
          value={memo}
          onChangeText={setMemo}
          disabled={saving}
          testID="e2e_recurrence_form_memo"
        />

        {/* Sess93 PR-4: RulePreviewCard (= 「このルールで作られる予定」 確認 card)
            Sess94 PR-B: 「次回」 行 配線 (= 開始日 + 通知時刻、 文化整合日付) */}
        <RulePreviewCard summary={previewSummary} nextOccurrence={nextOccurrenceLabel} />
      </BonsaiChipPickerLayout>

      <BottomCtaBar
        label={mode === 'edit' ? t('recurringEditSaveLabel') : t('recurringCreateSaveLabel')}
        onPress={handleSaveTap}
        disabled={saveDisabled}
        testID="e2e_recurrence_form_save"
        icon={<View />}
      />

      {/* Sess93 PR-4: 編集モード保存前 ConfirmDialog (= R-79、 既存予定削除 + 再生成 通知) */}
      <ConfirmDialog
        visible={showEditConfirm}
        title={t('recurringEditConfirmTitle')}
        description={t('recurringEditConfirmBody')}
        confirmLabel={t('recurringEditConfirmConfirm')}
        cancelLabel={t('cancel')}
        onConfirm={handleEditConfirm}
        onCancel={handleEditCancel}
        testID="e2e_recurrence_edit_confirm"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
});
