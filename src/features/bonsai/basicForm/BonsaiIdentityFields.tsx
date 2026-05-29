import { useRouter, type Href } from 'expo-router';

import { LabeledPickerRow } from '@/src/components/form/LabeledPickerRow';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { BONSAI_STYLES, type BonsaiStyle } from '@/src/db/schema';
import type { BonsaiBasicFormState } from '@/src/features/bonsai/BonsaiBasicForm';

/**
 * 盆栽基本情報フォーム「名前 / 樹種 / 樹形」フィールド (presentational)。
 * Phase 4 A2-1 で BonsaiBasicFormFields から抽出 (挙動不変)。
 * 樹種/樹形は picker 画面へ router.push し、戻り値は form 側 hook が consume する。
 */
export function BonsaiIdentityFields({ form }: { form: BonsaiBasicFormState }) {
  const { t } = useTranslation();
  const router = useRouter();
  const {
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
  } = form;

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
        maxLength={100}
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
    </>
  );
}
