/**
 * 盆栽 基本情報フォーム — 新規登録画面と詳細画面 基本情報タブで共用。
 *
 * mockup v1.0 `create-screens.jsx CreateBonsaiScreen` の prefill prop で create / edit
 * 両対応な単一コンポーネントを React Native 上で再現する目的。
 *
 * 構成:
 * - `useBonsaiBasicForm` — state + handler + submit ロジックを集約するフック
 * - `BonsaiBasicFormFields` — フィールド JSX (ScrollView は呼び出し側)
 *
 * 呼び出し側:
 * - `BonsaiCreateScreen` (新規登録画面、 `(modals)/bonsai-new` route)
 * - `app/(tabs)/bonsai/[id]/index.tsx` の基本情報タブ (詳細画面)
 *
 * Issue #439 で BonsaiCreateSheet から抽出。 樹種 / 樹形 Picker は ADR-0024 で
 * `(modals)/species-picker` + `(modals)/style-picker` route (presentation: 'formSheet') に完全移行済。
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useUnsavedChangesGuard } from '@/src/core/hooks/useUnsavedChangesGuard';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { BonsaiIdentityFields } from '@/src/features/bonsai/basicForm/BonsaiIdentityFields';
import { BonsaiMetadataFields } from '@/src/features/bonsai/basicForm/BonsaiMetadataFields';
import { BonsaiPhotoPickerBlock } from '@/src/features/bonsai/basicForm/BonsaiPhotoPickerBlock';
import { BonsaiPotInfoSection } from '@/src/features/bonsai/basicForm/BonsaiPotInfoSection';
import { BonsaiTagsSection } from '@/src/features/bonsai/basicForm/BonsaiTagsSection';
import { useBonsaiFormPhotos } from '@/src/features/bonsai/basicForm/useBonsaiFormPhotos';
import { useTranslation } from '@/src/core/i18n/i18n';
import { createBonsai, updateBonsai } from '@/src/db/bonsaiRepository';
import { addPhotoFromUri } from '@/src/features/photos/photoOrchestrator';
import { type Bonsai, type BonsaiStyle } from '@/src/db/schema';
import { getCustomSpeciesById } from '@/src/db/bonsaiSpeciesCustomRepository';
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import { cmToUnit, unitToCm } from '@/src/core/util/potUnitConvert';
import { isoToYmd, parsePotInfo, toIsoUtc } from './bonsaiFormUtils';
import { useSettingsStore } from '@/src/stores/settingsStore';
import {
  attachTagToBonsai,
  detachTagFromBonsai,
  getRecentTags,
  getTagsByBonsai,
  type TagRecord,
} from '@/src/db/tagRepository';
import { usePickerStore } from '@/src/stores/pickerStore';

export type PendingPhoto = {
  uri: string;
  width: number | null;
  height: number | null;
  // Sess14 PR-T: caption field 削除 (user 真意「冗長」)。 既存 type 残り field なし。
};

export type UseBonsaiBasicFormProps = {
  editingBonsai?: Bonsai | null;
  onCreated?: (bonsaiId: string) => void;
  onUpdated?: (bonsaiId: string) => void;
  /** create/update 成功後に呼ばれる (BottomSheet を閉じる等、共通の後処理用)。 */
  onAfterSubmit?: () => void;
};

export type BonsaiBasicFormState = ReturnType<typeof useBonsaiBasicForm>;

export function useBonsaiBasicForm({
  editingBonsai,
  onCreated,
  onUpdated,
  onAfterSubmit,
}: UseBonsaiBasicFormProps) {
  const isEdit = editingBonsai != null;
  const { t, lang } = useTranslation();

  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  // Sess13 PR-H: カスタム樹種 FK (schema v14)。 speciesId と排他、 picker 結果は
  // 'custom:<id>' prefix で区別して setCustomSpeciesId に分岐保存。
  const [customSpeciesId, setCustomSpeciesId] = useState<string | null>(null);
  const [customSpeciesName, setCustomSpeciesName] = useState<string | null>(null);
  const [speciesList, setSpeciesList] = useState<SpeciesWithName[]>([]);
  const [style, setStyle] = useState<BonsaiStyle | null>(null);
  const [acquiredAt, setAcquiredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    pendingPhotos,
    setPendingPhotos,
    isPro,
    handlePickPhoto,
    handleRemovePendingPhoto,
    handleMovePendingPhoto,
    handleTakePhotoCamera,
  } = useBonsaiFormPhotos(t);
  const [estimatedAgeText, setEstimatedAgeText] = useState('');
  // Sess13 PR-D: 樹齢「不明」 明示 (schema v12 estimated_age_unknown column)。
  // checkbox tap で estimatedAgeText を空に + ageUnknown = true。
  // 数値入力時は ageUnknown 自動 false。
  const [ageUnknown, setAgeUnknown] = useState(false);
  // Sess14 PR-Q: showDatePicker state は PR-O で LabeledDateRow 内に移管済、 ここでは削除。
  const [memo, setMemo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  // Issue #455 Phase 2: 鉢情報 (テキスト自由入力、既存 pot_info JSON に { description } で保存)。
  const [potInfoText, setPotInfoText] = useState('');
  // Sess13 PR-I + Sess14 PR-L + Sess15 PR-BB: 鉢情報構造化 (pot_info JSON に widthCm/depthCm cm 統一保存、
  // 入力 / 表示は user 設定 potUnit の初期値 + 編集画面 segmented control の一時切替で動的変換)。
  const settingsPotUnit = useSettingsStore((s) => s.potUnit);
  const [displayPotUnit, setDisplayPotUnit] = useState<typeof settingsPotUnit>(settingsPotUnit);
  const [potWidth, setPotWidth] = useState(''); // user 入力単位の文字列
  const [potDepth, setPotDepth] = useState(''); // user 入力単位の文字列
  const prevPotUnitRef = useRef<typeof settingsPotUnit>(displayPotUnit);
  const [potMaterial, setPotMaterial] = useState('');
  const [potExpanded, setPotExpanded] = useState(false);
  // Sess13 PR-B: 入手元 (free-form text、 schema v10 acquired_from column 直接保存)。
  const [acquiredFrom, setAcquiredFrom] = useState('');
  const [recentTags, setRecentTags] = useState<TagRecord[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const originalTagIdsRef = useRef<Set<string>>(new Set());

  // Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog (新規作成 mode のみ、 編集 mode は別 issue)
  // 編集 mode (isEdit=true) では prefill data があるため diff 検出 logic が複雑 → 別途対応
  const isDirty = useMemo(
    () =>
      !isEdit &&
      (name.trim().length > 0 ||
        speciesId !== null ||
        customSpeciesId !== null ||
        style !== null ||
        acquiredAt.length > 0 ||
        estimatedAgeText.length > 0 ||
        ageUnknown ||
        memo.length > 0 ||
        purchaseDate.length > 0 ||
        potInfoText.length > 0 ||
        potWidth.length > 0 ||
        potDepth.length > 0 ||
        potMaterial.length > 0 ||
        acquiredFrom.length > 0 ||
        selectedTagIds.size > 0 ||
        pendingPhotos.length > 0),
    [
      isEdit,
      name,
      speciesId,
      customSpeciesId,
      style,
      acquiredAt,
      estimatedAgeText,
      ageUnknown,
      memo,
      purchaseDate,
      potInfoText,
      potWidth,
      potDepth,
      potMaterial,
      acquiredFrom,
      selectedTagIds,
      pendingPhotos,
    ],
  );
  const { guardVisible, confirmDiscard, cancelDiscard, allowNavigation } = useUnsavedChangesGuard({
    isDirty,
    bypass: submitting,
  });

  // Phase G1 (ADR-0024 Provisionally Accepted): @gorhom Sheet を `(modals)/{species,style}-picker`
  // route に置換、戻り値は usePickerStore 経由で受け取る。
  // Sess13 PR-C: tag-edit?returnTo=bonsai-create からの復帰時に新規 tagId を auto-select。
  useFocusEffect(
    useCallback(() => {
      const speciesResult = usePickerStore.getState().consumeSpeciesPickerResult();
      if (speciesResult !== undefined) {
        // Sess13 PR-H: 'custom:<id>' prefix → custom 樹種 FK 分岐保存
        if (typeof speciesResult === 'string' && speciesResult.startsWith('custom:')) {
          const cid = speciesResult.slice(7);
          setSpeciesId(null);
          setCustomSpeciesId(cid);
          void getCustomSpeciesById(cid).then((cs) => setCustomSpeciesName(cs?.name ?? null));
        } else {
          setSpeciesId(speciesResult);
          setCustomSpeciesId(null);
          setCustomSpeciesName(null);
        }
      }
      const styleResult = usePickerStore.getState().consumeStylePickerResult();
      if (styleResult !== undefined) {
        setStyle(styleResult);
      }
      // Sess13 PR-C: tag-edit から復帰した場合の auto-select + recentTags 再読込
      const tagAddResult = usePickerStore.getState().consumeTagAddResult();
      if (tagAddResult !== undefined) {
        setSelectedTagIds((prev) => {
          const next = new Set(prev);
          next.add(tagAddResult);
          return next;
        });
        void getRecentTags(8).then((tags) => {
          setRecentTags(tags);
        });
      }
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    void getAllSpecies(lang).then((list) => {
      if (!cancelled) setSpeciesList(list);
    });
    void getRecentTags(8).then((tags) => {
      if (!cancelled) setRecentTags(tags);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Sess14 PR-L + Sess15 PR-BB: displayPotUnit 切替時に入力値を新単位へ再変換 (cm 内部値経由)。
  useEffect(() => {
    const prev = prevPotUnitRef.current;
    if (prev === displayPotUnit) return;
    setPotWidth((current) => {
      const cm = unitToCm(current, prev);
      return cmToUnit(cm, displayPotUnit) ?? '';
    });
    setPotDepth((current) => {
      const cm = unitToCm(current, prev);
      return cmToUnit(cm, displayPotUnit) ?? '';
    });
    prevPotUnitRef.current = displayPotUnit;
  }, [displayPotUnit]);

  // editingBonsai prefill (新規モードと編集モードを id で区別、id 変化時に再 prefill)。
  const editingId = editingBonsai?.id ?? null;
  useEffect(() => {
    if (editingBonsai == null) {
      originalTagIdsRef.current = new Set();
      return;
    }
    setName(editingBonsai.name);
    setSpeciesId(editingBonsai.speciesId);
    setCustomSpeciesId(editingBonsai.customSpeciesId);
    if (editingBonsai.customSpeciesId) {
      void getCustomSpeciesById(editingBonsai.customSpeciesId).then((cs) =>
        setCustomSpeciesName(cs?.name ?? null),
      );
    } else {
      setCustomSpeciesName(null);
    }
    setStyle(editingBonsai.style as BonsaiStyle | null);
    setAcquiredAt(isoToYmd(editingBonsai.acquiredAt));
    setEstimatedAgeText(
      editingBonsai.estimatedAge != null ? String(editingBonsai.estimatedAge) : '',
    );
    setAgeUnknown(editingBonsai.estimatedAgeUnknown === 1);
    setMemo(editingBonsai.memo ?? '');
    setPurchaseDate(isoToYmd(editingBonsai.purchaseDate));
    // pot_info JSON から復元 (Sess13 PR-I: 新形式 { width, depth, material } 優先、
    // 旧 { description } も後方互換)。parsePotInfo は壊れた JSON / 型不一致を空フォールバック (純関数、 characterize 済)。
    // cm 保存値 → displayPotUnit (一時切替対応) へ変換して表示 (Sess14 PR-L + Sess15 PR-BB)。
    const pot = parsePotInfo(editingBonsai.potInfo);
    setPotInfoText(pot.description);
    setPotWidth(cmToUnit(pot.widthCm, displayPotUnit) ?? '');
    setPotDepth(cmToUnit(pot.depthCm, displayPotUnit) ?? '');
    setPotMaterial(pot.material);
    setPotExpanded(pot.expanded);
    setAcquiredFrom(editingBonsai.acquiredFrom ?? '');
    let cancelled = false;
    void getTagsByBonsai(editingBonsai.id).then((tags) => {
      if (cancelled) return;
      const ids = new Set(tags.map((tg) => tg.id));
      setSelectedTagIds(ids);
      originalTagIdsRef.current = new Set(ids);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const selectedSpecies = useMemo(
    () => (speciesId != null ? (speciesList.find((s) => s.id === speciesId) ?? null) : null),
    [speciesId, speciesList],
  );

  const canSubmit = name.trim().length > 0 && !submitting;

  const resetToInitial = useCallback(() => {
    if (editingBonsai != null) {
      setName(editingBonsai.name);
      setSpeciesId(editingBonsai.speciesId);
      setCustomSpeciesId(editingBonsai.customSpeciesId);
      setStyle(editingBonsai.style as BonsaiStyle | null);
      setAcquiredAt(isoToYmd(editingBonsai.acquiredAt));
      setEstimatedAgeText(
        editingBonsai.estimatedAge != null ? String(editingBonsai.estimatedAge) : '',
      );
      setAgeUnknown(editingBonsai.estimatedAgeUnknown === 1);
      setMemo(editingBonsai.memo ?? '');
      setPurchaseDate(isoToYmd(editingBonsai.purchaseDate));
      // reset は prefill と異なり cm 生値をそのまま表示 (単位変換なし、 元実装踏襲)。
      const pot = parsePotInfo(editingBonsai.potInfo);
      setPotInfoText(pot.description);
      setPotWidth(pot.widthCm != null ? String(pot.widthCm) : '');
      setPotDepth(pot.depthCm != null ? String(pot.depthCm) : '');
      setPotMaterial(pot.material);
      setPotExpanded(pot.expanded);
      setAcquiredFrom(editingBonsai.acquiredFrom ?? '');
      setSelectedTagIds(new Set(originalTagIdsRef.current));
      setPendingPhotos([]);
    } else {
      setName('');
      setSpeciesId(null);
      setCustomSpeciesId(null);
      setCustomSpeciesName(null);
      setStyle(null);
      setAcquiredAt('');
      setPendingPhotos([]);
      setEstimatedAgeText('');
      setAgeUnknown(false);
      setMemo('');
      setPurchaseDate('');
      setPotInfoText('');
      setPotWidth('');
      setPotDepth('');
      setPotMaterial('');
      setPotExpanded(false);
      setAcquiredFrom('');
      setSelectedTagIds(new Set());
    }
    // setPendingPhotos は useBonsaiFormPhotos 由来 (eslint が安定 setter と非認識のため明記、stable 故挙動不変)。
  }, [editingBonsai, setPendingPhotos]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Sess13 PR-D: ageUnknown=true なら estimatedAge は null 強制 (「不明」 明示)。
      const parsedAge = estimatedAgeText.trim() ? parseInt(estimatedAgeText.trim(), 10) : NaN;
      const estimatedAge =
        !ageUnknown && Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 10000
          ? parsedAge
          : null;
      const fields = {
        name: name.trim(),
        speciesId,
        customSpeciesId,
        style,
        acquiredAt: acquiredAt.trim() ? toIsoUtc(acquiredAt.trim()) : null,
        estimatedAge,
        estimatedAgeUnknown: ageUnknown,
        memo: memo.trim() ? memo.trim() : null,
        purchaseDate: purchaseDate.trim() ? toIsoUtc(purchaseDate.trim()) : null,
        // Sess13 PR-I + Sess14 PR-L: 鉢情報構造化 { widthCm, depthCm, material } 保存、
        // 旧 { description } も後方互換。 入力 user 単位 → cm 正規化 (unitToCm)。
        potInfo: (() => {
          const widthCm = unitToCm(potWidth, displayPotUnit);
          const depthCm = unitToCm(potDepth, displayPotUnit);
          const material = potMaterial.trim() || null;
          const description = potInfoText.trim() || null;
          if (widthCm == null && depthCm == null && material == null && description == null) {
            return null;
          }
          return {
            widthCm,
            depthCm,
            material,
            description,
          };
        })(),
        // Sess13 PR-B: 入手元 (schema v10 acquired_from column 直接保存)。
        acquiredFrom: acquiredFrom.trim() ? acquiredFrom.trim() : null,
      };

      if (editingBonsai != null) {
        await updateBonsai(editingBonsai.id, fields);
        const original = originalTagIdsRef.current;
        const toAttach = Array.from(selectedTagIds).filter((id) => !original.has(id));
        const toDetach = Array.from(original).filter((id) => !selectedTagIds.has(id));
        try {
          await Promise.all([
            ...toAttach.map((tagId) => attachTagToBonsai(editingBonsai.id, tagId)),
            ...toDetach.map((tagId) => detachTagFromBonsai(editingBonsai.id, tagId)),
          ]);
          // 編集成功後は original を最新化して、再オープン時の差分計算を正しくする。
          originalTagIdsRef.current = new Set(selectedTagIds);
        } catch (err) {
          console.warn('[BonsaiBasicForm] tag diff update failed (continuing):', err);
        }
        // Sess42 バグ2 fix: 保存成功、これから router.back() するので同期的に guard を bypass
        // (bypass: submitting だけだと再レンダ反映前に back() が発火し dialog が出る競合を回避)。
        allowNavigation();
        onAfterSubmit?.();
        onUpdated?.(editingBonsai.id);
      } else {
        const bonsai = await createBonsai(fields);
        for (const p of pendingPhotos) {
          try {
            // Sess14 PR-T: caption (写真メモ) 削除、 null 固定。
            await addPhotoFromUri({ bonsaiId: bonsai.id, sourceUri: p.uri });
          } catch (err) {
            console.warn('[BonsaiBasicForm] photo persist failed (continuing):', err);
          }
        }
        if (selectedTagIds.size > 0) {
          try {
            await Promise.all(
              Array.from(selectedTagIds).map((tagId) => attachTagToBonsai(bonsai.id, tagId)),
            );
          } catch (err) {
            console.warn('[BonsaiBasicForm] tag attach failed (continuing):', err);
          }
        }
        // Sess42 バグ2 fix: 保存成功、これから router.back() するので同期的に guard を bypass。
        allowNavigation();
        onAfterSubmit?.();
        onCreated?.(bonsai.id);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    estimatedAgeText,
    ageUnknown,
    name,
    speciesId,
    customSpeciesId,
    style,
    acquiredAt,
    memo,
    purchaseDate,
    potInfoText,
    potWidth,
    potDepth,
    potMaterial,
    acquiredFrom,
    editingBonsai,
    selectedTagIds,
    pendingPhotos,
    onAfterSubmit,
    onCreated,
    onUpdated,
    allowNavigation,
  ]);

  return {
    // state
    isEdit,
    name,
    setName,
    speciesId,
    setSpeciesId,
    customSpeciesId,
    setCustomSpeciesId,
    customSpeciesName,
    setCustomSpeciesName,
    speciesList,
    selectedSpecies,
    style,
    setStyle,
    acquiredAt,
    setAcquiredAt,
    estimatedAgeText,
    setEstimatedAgeText,
    ageUnknown,
    setAgeUnknown,
    memo,
    setMemo,
    purchaseDate,
    setPurchaseDate,
    potInfoText,
    setPotInfoText,
    potWidth,
    setPotWidth,
    potDepth,
    setPotDepth,
    potMaterial,
    setPotMaterial,
    potExpanded,
    setPotExpanded,
    displayPotUnit,
    setDisplayPotUnit,
    acquiredFrom,
    setAcquiredFrom,
    recentTags,
    selectedTagIds,
    toggleTag,
    pendingPhotos,
    handlePickPhoto,
    handleRemovePendingPhoto,
    handleMovePendingPhoto,
    handleTakePhotoCamera,
    isPro,
    canSubmit,
    submitting,
    // actions
    handleSubmit,
    resetToInitial,
    // Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog (新規作成 mode のみ)
    guardVisible,
    confirmDiscard,
    cancelDiscard,
  };
}

export type BonsaiBasicFormFieldsProps = {
  form: BonsaiBasicFormState;
  /** 写真フィールドを表示するか (新規モードのみ true、編集モードは詳細画面の photoCard で別管理)。 */
  showPhotos?: boolean;
  /**
   * Sess15 PR-SS: 詳細画面 (showPhotos=false 時) で「タグ後・メモ前」 slot に挿入する写真セクション。
   * 新規 modal の photoBlock (pendingPhotos) と排他、 showPhotoField が false の時のみ render される。
   * 案 P (新規 modal の field 順序) と完全 1:1 一致を実現。
   */
  customPhotoBlock?: React.ReactNode;
  /**
   * Sess31 PR-1 (R-46 拡張): メモ欄 onFocus callback。 親 ScrollView 側で scrollToEnd を呼び、
   * IME 起動時の可視性を確保する用途。
   */
  onMemoFocus?: (() => void) | undefined;
};

/**
 * フィールド一覧 + Picker BottomSheet を render する。
 * ScrollView ラッパは呼び出し側が決める (BottomSheetScrollView or 親の通常 ScrollView 内 inline)。
 */
export function BonsaiBasicFormFields({
  form,
  showPhotos = true,
  customPhotoBlock,
  onMemoFocus,
}: BonsaiBasicFormFieldsProps) {
  const { t } = useTranslation();
  const { isEdit, memo, setMemo } = form;

  const showPhotoField = showPhotos && !isEdit;

  return (
    <>
      <BonsaiIdentityFields form={form} />

      {/* Sess14 PR-T: 購入日欄削除 (取得日と意味が重複、 user 真意「取得日があれば十分」)。
          purchaseDate state は後方互換で残す (既存 DB data 表示用、 form 上で編集不可)。 */}
      <BonsaiMetadataFields form={form} />

      <BonsaiPotInfoSection form={form} />

      <BonsaiTagsSection form={form} />

      {/* Sess15 PR-CC + PR-SS: 写真フィールドをタグ後・メモ前に配置 (案 P)。
          新規 modal (showPhotoField=true) は内部 photoBlock (pendingPhotos)、
          詳細画面 (showPhotoField=false) は customPhotoBlock (詳細画面の photoSection) を slot として挿入。
          排他制御で 1 つだけ render。 */}
      {showPhotoField ? <BonsaiPhotoPickerBlock form={form} /> : customPhotoBlock}

      {/* Sess13 PR-K: メモを LabeledTextInput 共通化 (multiline + 文字数 + 上限赤字)。
          Sess31 PR-1 (R-46 拡張): onMemoFocus prop で親 ScrollView の auto-scroll 配線。 */}
      <LabeledTextInput
        label={t('bonsaiFieldMemo')}
        optional
        optionalText={t('fieldOptionalLabel')}
        overlimitText={t('inputOverLimit')}
        value={memo}
        onChangeText={setMemo}
        onFocus={onMemoFocus}
        placeholder={t('bonsaiFieldMemoPlaceholder')}
        maxLength={500}
        showCounter
        multiline
        numberOfLines={4}
        testID="e2e_bonsai_create_memo"
      />
    </>
  );
}

// Phase G5 (ADR-0024 Accepted): 旧 `BonsaiBasicFormPickerSheets` 空関数 + Props 型を削除。
// 樹種 / 樹形 Picker は `(modals)/species-picker` + `(modals)/style-picker` route
// (presentation: 'formSheet') に完全移行済。
