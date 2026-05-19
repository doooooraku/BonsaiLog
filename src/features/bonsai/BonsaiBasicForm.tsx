/**
 * 盆栽 基本情報フォーム — 新規登録 BottomSheet と詳細画面 基本情報タブで共用。
 *
 * mockup v1.0 `create-screens.jsx CreateBonsaiScreen` の prefill prop で create / edit
 * 両対応な単一コンポーネントを React Native 上で再現する目的。
 *
 * 構成:
 * - `useBonsaiBasicForm` — state + handler + submit ロジックを集約するフック
 * - `BonsaiBasicFormFields` — フィールド JSX (ScrollView は呼び出し側)
 * - `BonsaiBasicFormPickerSheets` — 樹種 / 樹形 Picker BottomSheet。@gorhom/bottom-sheet は
 *   ScrollView 内に nest すると closed (index=-1) でも inline で leak するため、呼び出し側で
 *   親 ScrollView の外 (root) に置く前提で別コンポーネントに分離。
 *
 * 呼び出し側:
 * - `BonsaiCreateSheet` (新規登録 / 編集 BottomSheet) — `BottomSheetScrollView` + `BottomSheetFooter`
 *   に組み込み、Picker Sheet は親 BottomSheet の sibling として配置
 * - `app/(tabs)/bonsai/[id]/index.tsx` の基本情報タブ — 親 ScrollView 内に inline 配置、
 *   Picker Sheet は ScrollView の外 (画面 root) に配置
 *
 * Issue #439 で BonsaiCreateSheet から抽出。
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CameraIcon, ChevronRightIcon, PlusIcon } from '@/src/components/icons';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledNumberInput } from '@/src/components/form/LabeledNumberInput';
import { LabeledPickerRow } from '@/src/components/form/LabeledPickerRow';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { nowUtc } from '@/src/core/datetime/clock';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { createBonsai, updateBonsai } from '@/src/db/bonsaiRepository';
import { addPhotoFromUri, FREE_PHOTO_LIMIT_PER_BONSAI } from '@/src/db/photoRepository';
import { BONSAI_STYLES, type Bonsai, type BonsaiStyle } from '@/src/db/schema';
import { getCustomSpeciesById } from '@/src/db/bonsaiSpeciesCustomRepository';
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import { cmToUnit, unitToCm } from '@/src/core/util/potUnitConvert';
import { useSettingsStore } from '@/src/stores/settingsStore';
import {
  attachTagToBonsai,
  detachTagFromBonsai,
  getRecentTags,
  getTagsByBonsai,
  type TagRecord,
} from '@/src/db/tagRepository';
import { usePickerStore } from '@/src/stores/pickerStore';
import { useProStore } from '@/src/stores/proStore';

/** YYYY-MM-DD → ISO 8601 UTC TEXT (00:00:00Z)。ADR-0008 §TZ 整合で nowUtc 使用。 */
function toIsoUtc(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return nowUtc();
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}T00:00:00.000Z`;
}

/** ISO 8601 → YYYY-MM-DD (UI 入力欄 prefill 用、null/不正値は空文字)。 */
function isoToYmd(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return '';
  return iso.slice(0, 10);
}

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
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const isPro = useProStore((s) => s.isPro);
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
    // 旧 { description } も後方互換で保持表示)。
    try {
      const parsed = editingBonsai.potInfo ? JSON.parse(editingBonsai.potInfo) : null;
      setPotInfoText(typeof parsed?.description === 'string' ? parsed.description : '');
      // 新構造 (width / depth / material) は cm 単位で保存されている前提、
      // 表示は user 設定 potUnit で変換 (本実装は cm 固定表示で simplify、 単位切替は別 PR で表示変換追加)。
      const widthCm = typeof parsed?.widthCm === 'number' ? parsed.widthCm : null;
      const depthCm = typeof parsed?.depthCm === 'number' ? parsed.depthCm : null;
      // Sess14 PR-L + Sess15 PR-BB: cm 保存値 → displayPotUnit (一時切替対応) へ変換。
      setPotWidth(cmToUnit(widthCm, displayPotUnit) ?? '');
      setPotDepth(cmToUnit(depthCm, displayPotUnit) ?? '');
      setPotMaterial(typeof parsed?.material === 'string' ? parsed.material : '');
      // 値が入っていれば自動展開 (Q-17 a)
      setPotExpanded(widthCm != null || depthCm != null || (parsed?.material?.length ?? 0) > 0);
    } catch {
      setPotInfoText('');
      setPotWidth('');
      setPotDepth('');
      setPotMaterial('');
      setPotExpanded(false);
    }
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
      try {
        const parsed = editingBonsai.potInfo ? JSON.parse(editingBonsai.potInfo) : null;
        setPotInfoText(typeof parsed?.description === 'string' ? parsed.description : '');
        const widthCm = typeof parsed?.widthCm === 'number' ? parsed.widthCm : null;
        const depthCm = typeof parsed?.depthCm === 'number' ? parsed.depthCm : null;
        setPotWidth(widthCm != null ? String(widthCm) : '');
        setPotDepth(depthCm != null ? String(depthCm) : '');
        setPotMaterial(typeof parsed?.material === 'string' ? parsed.material : '');
        setPotExpanded(widthCm != null || depthCm != null || (parsed?.material?.length ?? 0) > 0);
      } catch {
        setPotInfoText('');
        setPotWidth('');
        setPotDepth('');
        setPotMaterial('');
        setPotExpanded(false);
      }
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
  }, [editingBonsai]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    const remaining = isPro
      ? Number.POSITIVE_INFINITY
      : Math.max(0, FREE_PHOTO_LIMIT_PER_BONSAI - pendingPhotos.length);
    if (remaining === 0) {
      Alert.alert(
        t('photoLimitTitle'),
        t('photoLimitDesc').replace('{count}', String(FREE_PHOTO_LIMIT_PER_BONSAI)),
        [{ text: t('ok') }],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.85,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const acceptedCount = isPro ? result.assets.length : Math.min(result.assets.length, remaining);
    const accepted = result.assets.slice(0, acceptedCount).map((a) => ({
      uri: a.uri,
      width: a.width ?? null,
      height: a.height ?? null,
    }));
    const skipped = result.assets.length - accepted.length;
    setPendingPhotos((prev) => [...prev, ...accepted]);
    if (skipped > 0) {
      Alert.alert(
        t('photoLimitTitle'),
        t('photoLimitPartialAdded')
          .replace('{added}', String(accepted.length))
          .replace('{skipped}', String(skipped)),
        [{ text: t('ok') }],
      );
    }
  }, [isPro, pendingPhotos.length, t]);

  const handleRemovePendingPhoto = useCallback((index: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Sess14 PR-T: handleUpdatePendingPhotoCaption 削除 (caption field 廃止)。

  const handleMovePendingPhoto = useCallback((from: number, to: number) => {
    setPendingPhotos((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleTakePhotoCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    const remaining = isPro
      ? Number.POSITIVE_INFINITY
      : Math.max(0, FREE_PHOTO_LIMIT_PER_BONSAI - pendingPhotos.length);
    if (remaining === 0) {
      Alert.alert(
        t('photoLimitTitle'),
        t('photoLimitDesc').replace('{count}', String(FREE_PHOTO_LIMIT_PER_BONSAI)),
        [{ text: t('ok') }],
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const a = result.assets[0];
    setPendingPhotos((prev) => [
      ...prev,
      { uri: a.uri, width: a.width ?? null, height: a.height ?? null },
    ]);
  }, [isPro, pendingPhotos.length, t]);

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
  };
}

export type BonsaiBasicFormFieldsProps = {
  form: BonsaiBasicFormState;
  /** 写真フィールドを表示するか (新規モードのみ true、編集モードは詳細画面の photoCard で別管理)。 */
  showPhotos?: boolean;
};

/**
 * フィールド一覧 + Picker BottomSheet を render する。
 * ScrollView ラッパは呼び出し側が決める (BottomSheetScrollView or 親の通常 ScrollView 内 inline)。
 */
export function BonsaiBasicFormFields({ form, showPhotos = true }: BonsaiBasicFormFieldsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    isEdit,
    name,
    setName,
    speciesId,
    setSpeciesId,
    customSpeciesId,
    setCustomSpeciesId,
    customSpeciesName,
    setCustomSpeciesName,
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
  } = form;

  const showPhotoField = showPhotos && !isEdit;

  // Sess15 PR-CC: 案 P 採用 — 写真は「タグ」 と「メモ」 の間 (新規モード時) に表示する。
  // 必須項目を先頭に、 重い任意処理 (写真撮影/選択) を後半に集約することで入力放棄リスクを軽減。
  const photoBlock = showPhotoField ? (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <ThemedText type="defaultSemiBold">
          {t('bonsaiFieldPhotos')} ({pendingPhotos.length})
        </ThemedText>
        <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
      </View>
      {/* Sess13 PR-J: Repolog 流 2 button (カメラ / ライブラリ) 並列。 */}
      <View style={styles.photoSourceRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceCamera')}
          style={styles.photoSourceButton}
          onPress={handleTakePhotoCamera}
          testID="e2e_bonsai_create_photo_camera"
        >
          <CameraIcon size={20} />
          <ThemedText style={styles.photoSourceText}>{t('photoSourceCamera')}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceLibrary')}
          style={styles.photoSourceButton}
          onPress={handlePickPhoto}
          testID="e2e_bonsai_create_photo_library"
        >
          <ThemedText style={styles.photoSourceText}>{t('photoSourceLibrary')}</ThemedText>
        </Pressable>
      </View>
      {pendingPhotos.length > 0 && (
        <ThemedText style={styles.photoHelpText}>{t('photoReorderHelp')}</ThemedText>
      )}
      {pendingPhotos.map((p, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === pendingPhotos.length - 1;
        return (
          <View key={`${p.uri}-${idx}`} style={styles.photoCard}>
            <View style={styles.photoCardToolbar}>
              <ThemedText style={styles.photoCardIndex}>{idx + 1}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoMoveUp')}
                accessibilityState={{ disabled: isFirst }}
                disabled={isFirst}
                style={[styles.photoMoveButton, isFirst && styles.photoMoveButtonDisabled]}
                onPress={() => handleMovePendingPhoto(idx, idx - 1)}
                testID={`e2e_bonsai_create_photo_move_up_${idx}`}
              >
                <ThemedText style={styles.photoMoveText}>↑</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoMoveDown')}
                accessibilityState={{ disabled: isLast }}
                disabled={isLast}
                style={[styles.photoMoveButton, isLast && styles.photoMoveButtonDisabled]}
                onPress={() => handleMovePendingPhoto(idx, idx + 1)}
                testID={`e2e_bonsai_create_photo_move_down_${idx}`}
              >
                <ThemedText style={styles.photoMoveText}>↓</ThemedText>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('delete')}
                style={styles.photoCardDeleteButton}
                onPress={() => handleRemovePendingPhoto(idx)}
                testID={`e2e_bonsai_create_photo_remove_${idx}`}
              >
                <ThemedText style={styles.photoCardDeleteText}>×</ThemedText>
              </Pressable>
            </View>
            <Image source={{ uri: p.uri }} style={styles.photoCardImage} contentFit="cover" />
          </View>
        );
      })}
    </View>
  ) : null;

  return (
    <>
      {/* Sess13 PR-K: LabeledTextInput 共通化 (右上文字数 + 上限到達赤字) */}
      <LabeledTextInput
        label={t('bonsaiFieldName')}
        required
        requiredText={t('fieldRequiredLabel')}
        overlimitText={t('inputOverLimit')}
        value={name}
        onChangeText={setName}
        placeholder={t('bonsaiFieldNamePlaceholder')}
        maxLength={64}
        showCounter
        testID="e2e_bonsai_create_name"
      />

      {/* Sess14 PR-M + Sess15 PR-Y: LabeledPickerRow + 任意 badge + placeholder「樹種を選択」 (取得日と統一)。 */}
      <LabeledPickerRow
        label={t('bonsaiFieldSpecies')}
        optional
        optionalText={t('fieldOptionalLabel')}
        placeholder={t('bonsaiPlaceholderSpecies')}
        valueText={selectedSpecies?.commonName ?? customSpeciesName}
        onPress={() => {
          // Sess13 PR-H: custom 樹種選択中の場合は 'custom:<id>' を initial に渡す
          const initial =
            customSpeciesId != null ? `custom:${customSpeciesId}` : (speciesId ?? null);
          router.push(
            (initial != null
              ? `/species-picker?initial=${encodeURIComponent(initial)}`
              : '/species-picker') as Href,
          );
        }}
        onClear={() => {
          setSpeciesId(null);
          setCustomSpeciesId(null);
          setCustomSpeciesName(null);
        }}
        testID="e2e_bonsai_create_species_pick"
        testIDClear="e2e_bonsai_create_species_clear"
      />

      {/* Sess14 PR-M + Sess15 PR-Y: LabeledPickerRow + 任意 badge + placeholder「樹形を選択」 (取得日と統一)。 */}
      <LabeledPickerRow
        label={t('bonsaiFieldStyle')}
        optional
        optionalText={t('fieldOptionalLabel')}
        placeholder={t('bonsaiPlaceholderStyle')}
        valueText={
          style != null
            ? BONSAI_STYLES.includes(style as BonsaiStyle)
              ? t(`bonsaiStyle_${style}` as TranslationKey)
              : (style as string)
            : null
        }
        onPress={() =>
          router.push(
            (style != null
              ? `/style-picker?initial=${encodeURIComponent(style)}`
              : '/style-picker') as Href,
          )
        }
        onClear={() => setStyle(null)}
        testID="e2e_bonsai_create_style_pick"
        testIDClear="e2e_bonsai_create_style_clear"
      />

      {/* Sess14 PR-O: 取得日 を LabeledDateRow へ移行 (PR-E DatePicker 実装を component 化) */}
      <LabeledDateRow
        label={t('bonsaiFieldAcquiredAt')}
        optional
        optionalText={t('fieldOptionalLabel')}
        value={acquiredAt}
        onChangeText={setAcquiredAt}
        placeholder={t('datePickerPlaceholder')}
        testID="e2e_bonsai_create_acquired_at"
        testIDClear="e2e_bonsai_create_acquired_at_clear"
      />

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldEstimatedAge')}</ThemedText>
          <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
        </View>
        {/* Sess14 PR-O: 樹齢 を LabeledNumberInput へ移行 + 「不明」 checkbox 横並び維持 */}
        <View style={styles.ageRow}>
          <View style={{ flex: 1 }}>
            <LabeledNumberInput
              label=""
              value={estimatedAgeText}
              onChangeText={(text) => {
                setEstimatedAgeText(text);
                if (text.length > 0 && ageUnknown) setAgeUnknown(false);
              }}
              placeholder={t('bonsaiFieldEstimatedAgePlaceholder')}
              suffix="年"
              maxLength={4}
              editable={!ageUnknown}
              accessibilityLabel={t('bonsaiFieldEstimatedAge')}
              testID="e2e_bonsai_create_age_input"
            />
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ageUnknown }}
            accessibilityLabel={t('bonsaiFieldEstimatedAgeUnknown')}
            style={styles.ageUnknownToggle}
            onPress={() => {
              const next = !ageUnknown;
              setAgeUnknown(next);
              if (next) setEstimatedAgeText('');
            }}
            testID="e2e_bonsai_create_age_unknown"
          >
            <View style={[styles.checkbox, ageUnknown && styles.checkboxChecked]}>
              {ageUnknown && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
            </View>
            <ThemedText style={styles.ageUnknownLabel}>
              {t('bonsaiFieldEstimatedAgeUnknown')}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Sess14 PR-T: 購入日欄削除 (取得日と意味が重複、 user 真意「取得日があれば十分」)。
          purchaseDate state は後方互換で残す (既存 DB data 表示用、 form 上で編集不可)。 */}

      {/* Sess13 PR-B + PR-K: 入手元 (任意、 schema v10 acquired_from + LabeledTextInput 共通化)。 */}
      <LabeledTextInput
        label={t('bonsaiFieldAcquiredFrom')}
        optional
        optionalText={t('fieldOptionalLabel')}
        overlimitText={t('inputOverLimit')}
        value={acquiredFrom}
        onChangeText={setAcquiredFrom}
        placeholder={t('bonsaiFieldAcquiredFromPlaceholder')}
        maxLength={100}
        showCounter
        testID="e2e_bonsai_create_acquired_from"
      />

      {/* Sess15 PR-BB: mockup 174029.png 整合の card group 化 + 単位 segmented control。
          - 1 つの bordered card 内に expander + 3 input + 単位 segmented を集約 (まとまり感)
          - 単位 segmented は一時切替 (settingsStore は touch しない、 display 単位のみ反映)。 */}
      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldPotInfo')}</ThemedText>
          <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
        </View>
        <View style={styles.potCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bonsaiFieldPotInfoExpand')}
            style={styles.potExpander}
            onPress={() => setPotExpanded((p) => !p)}
            testID="e2e_bonsai_create_pot_expander"
          >
            <ThemedText style={styles.pickerPlaceholder}>
              {potExpanded ? '▲ ' : '▼ '}
              {t('bonsaiFieldPotInfoExpand')}
            </ThemedText>
          </Pressable>
          {potExpanded && (
            <View style={styles.potExpanded}>
              {/* Sess15 PR-BB: 単位 segmented control (一時切替、 settingsStore は touch しない)。 */}
              <View style={styles.potUnitSegmented}>
                {(['cm', 'mm', 'inch'] as const).map((u) => {
                  const active = displayPotUnit === u;
                  return (
                    <Pressable
                      key={u}
                      accessibilityRole="button"
                      accessibilityLabel={`unit ${u}`}
                      accessibilityState={{ selected: active }}
                      style={[styles.potUnitSegment, active && styles.potUnitSegmentActive]}
                      onPress={() => setDisplayPotUnit(u)}
                      testID={`e2e_bonsai_create_pot_unit_${u}`}
                    >
                      <ThemedText
                        style={active ? styles.potUnitSegmentTextActive : styles.potUnitSegmentText}
                      >
                        {u}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <LabeledNumberInput
                label=""
                value={potWidth}
                onChangeText={setPotWidth}
                placeholder={t('bonsaiFieldPotWidthPlaceholder').replace(' ({unit})', '')}
                suffix={displayPotUnit}
                maxLength={6}
                accessibilityLabel={t('bonsaiFieldPotWidth')}
                testID="e2e_bonsai_create_pot_width"
              />
              <LabeledNumberInput
                label=""
                value={potDepth}
                onChangeText={setPotDepth}
                placeholder={t('bonsaiFieldPotDepthPlaceholder').replace(' ({unit})', '')}
                suffix={displayPotUnit}
                maxLength={6}
                accessibilityLabel={t('bonsaiFieldPotDepth')}
                testID="e2e_bonsai_create_pot_depth"
              />
              <LabeledTextInput
                label=""
                value={potMaterial}
                onChangeText={setPotMaterial}
                placeholder={t('bonsaiFieldPotMaterialPlaceholder')}
                maxLength={100}
                showCounter
                overlimitText={t('inputOverLimit')}
                accessibilityLabel={t('bonsaiFieldPotMaterial')}
                testID="e2e_bonsai_create_pot_material"
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldTags')}</ThemedText>
          <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
        </View>
        {/* Sess15 PR-DD: empty 時は文言上 + button 下 (縦配置)、 chip 1+ 件時は wrap row (横並び)。 */}
        {recentTags.length === 0 ? (
          <View style={styles.tagEmptyColumn}>
            <ThemedText style={styles.tagsEmpty}>{t('bonsaiTagsEmpty')}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('bonsaiTagsAddCta')}
              style={styles.tagAddChip}
              onPress={() => router.push('/tag-edit?returnTo=bonsai-create' as Href)}
              testID="e2e_bonsai_tag_add"
            >
              <PlusIcon size={16} color={BRAND_GREEN} />
              <ThemedText style={styles.tagAddChipText}>{t('bonsaiTagsAddCta')}</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.tagChipRow}>
            {recentTags.map((tg) => {
              const selected = selectedTagIds.has(tg.id);
              return (
                <Pressable
                  key={tg.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={tg.name}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                  onPress={() => toggleTag(tg.id)}
                  testID={`e2e_bonsai_create_tag_chip_${tg.id}`}
                >
                  <ThemedText style={selected ? styles.tagChipTextSelected : styles.tagChipText}>
                    {tg.name}
                  </ThemedText>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('bonsaiTagsAddCta')}
              style={styles.tagAddChip}
              onPress={() => router.push('/tag-edit?returnTo=bonsai-create' as Href)}
              testID="e2e_bonsai_tag_add"
            >
              <PlusIcon size={16} color={BRAND_GREEN} />
              <ThemedText style={styles.tagAddChipText}>{t('bonsaiTagsAddCta')}</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Sess15 PR-CC: 写真フィールド (新規モードのみ表示) をタグの後 + メモの前に配置 (案 P)。
          編集モード (showPhotoField=false) では別タブ (Photos) で扱うため、 ここでは何も render しない。 */}
      {photoBlock}

      {/* Sess13 PR-K: メモを LabeledTextInput 共通化 (multiline + 文字数 + 上限赤字) */}
      <LabeledTextInput
        label={t('bonsaiFieldMemo')}
        optional
        optionalText={t('fieldOptionalLabel')}
        overlimitText={t('inputOverLimit')}
        value={memo}
        onChangeText={setMemo}
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

const styles = StyleSheet.create({
  field: { gap: 8 },
  photoBox: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER_DEFAULT,
    borderStyle: 'dashed',
    backgroundColor: BG_SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoCta: { fontSize: 12, color: TEXT_SECONDARY },
  photoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoStripCell: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  photoStripImage: { width: '100%', height: '100%' },
  photoStripCoverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoStripCoverBadgeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: ON_BRAND,
    letterSpacing: 0.6,
  },
  photoStripDeleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStripDeleteText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  photoCount: { fontSize: 11, color: TEXT_MUTED, marginLeft: 'auto' },
  input: {
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: BG_SURFACE,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
  },
  pickerPlaceholder: { color: TEXT_MUTED },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#8B2E2E',
  },
  requiredBadgeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#F7F3E8',
    letterSpacing: 0.8,
  },
  optionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  inputMultiline: { minHeight: 96, paddingVertical: 12 },
  // Sess13 PR-D: 樹齢「不明」 checkbox 横並び。
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ageInput: { flex: 1 },
  inputDisabled: { backgroundColor: BG_SURFACE, opacity: 0.5 },
  ageUnknownToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  checkboxMark: { color: ON_BRAND, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  ageUnknownLabel: { fontSize: 14 },
  // Sess14 PR-Q: dateRow / dateInput / dateClearButton / dateClearText は PR-O で
  // LabeledDateRow に移管済、 dead style として削除。
  potExpanded: { gap: 10, marginTop: 8 },
  // Sess15 PR-BB: mockup 174029.png 整合の card group (border 内に expander + 3 input + segmented を集約)。
  potCard: {
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    padding: 12,
    gap: 8,
  },
  potExpander: {
    minHeight: 40,
    justifyContent: 'center',
  },
  potUnitSegmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  potUnitSegment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  potUnitSegmentActive: { backgroundColor: BRAND_GREEN },
  potUnitSegmentText: { fontSize: 13, color: TEXT_SECONDARY },
  potUnitSegmentTextActive: { fontSize: 13, color: ON_BRAND, fontWeight: '600' },
  // Sess13 PR-J: Repolog 流写真カード
  photoSourceRow: { flexDirection: 'row', gap: 10 },
  photoSourceButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BG_SURFACE,
  },
  photoSourceText: { fontSize: 14, fontWeight: '500' },
  photoHelpText: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  photoCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    overflow: 'hidden',
    backgroundColor: BG_SURFACE,
  },
  photoCardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  photoCardIndex: { fontSize: 14, color: TEXT_SECONDARY, minWidth: 16 },
  photoMoveButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_SURFACE,
  },
  photoMoveButtonDisabled: { opacity: 0.3 },
  photoMoveText: { fontSize: 18 },
  photoCardDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_SURFACE,
  },
  photoCardDeleteText: { fontSize: 20, lineHeight: 22, color: TEXT_SECONDARY },
  // 4:3 横長 (Q-10 b 採用)
  photoCardImage: { width: '100%', aspectRatio: 4 / 3 },
  // Sess14 PR-T: photoCardCaption* styles 削除 (caption UI 廃止)。
  tagChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    minHeight: 36,
    justifyContent: 'center',
  },
  tagChipSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  tagChipText: { fontSize: 13 },
  tagChipTextSelected: { fontSize: 13, color: ON_BRAND, fontWeight: '600' },
  tagsEmpty: { fontSize: 13, color: TEXT_MUTED },
  // Sess15 PR-DD: empty 時の縦並び container (alignSelf で button を左寄せ)。
  tagEmptyColumn: { gap: 8 },
  // Sess15 PR-EE: 案 D2 統一 (dashed gray → solid 1.5px BRAND_GREEN + BRAND_GREEN テキスト + PlusIcon)。
  tagAddChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND_GREEN,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  tagAddChipText: { fontSize: 13, color: BRAND_GREEN, fontWeight: '600' },
});
