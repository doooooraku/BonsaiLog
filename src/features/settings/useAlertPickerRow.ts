/**
 * 設定行の「Alert で選択肢を選ぶ」共通パターン (Phase 4 A3 で SettingsScreen から抽出)。
 *
 * テーマ (system/light/dark) と 鉢サイズ単位 (cm/mm/inch) が同一構造のため共通化:
 * - 現在値の表示ラベル (currentLabel)
 * - タップで Alert.alert(title, 選択肢..., cancel) を開く onPress
 *
 * 振る舞いは元実装と完全同一。
 */
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';

export type AlertPickerOption<T extends string> = {
  value: T;
  labelKey: TranslationKey;
};

export function useAlertPickerRow<T extends string>(args: {
  titleKey: TranslationKey;
  options: readonly AlertPickerOption<T>[];
  value: T;
  setValue: (value: T) => void;
}): { currentLabel: string; onPress: () => void } {
  const { titleKey, options, value, setValue } = args;
  const { t } = useTranslation();

  const currentLabel = useMemo(() => {
    const opt = options.find((o) => o.value === value);
    return opt ? t(opt.labelKey) : value;
    // options は呼出側で固定リテラル。value / t のみ依存。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, t]);

  const onPress = useCallback(() => {
    Alert.alert(t(titleKey), undefined, [
      ...options.map((opt) => ({
        text: t(opt.labelKey),
        onPress: () => setValue(opt.value),
      })),
      { text: t('cancel'), style: 'cancel' as const },
    ]);
    // options は固定リテラル、setValue は store action で安定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, titleKey, setValue]);

  return { currentLabel, onPress };
}
