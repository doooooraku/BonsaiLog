/**
 * contextual soft-ask モーダルのグローバルホスト (ADR-0014 Amended)。
 *
 * `app/_layout.tsx` root に 1 つだけマウントする。 予定登録画面 (BulkWorkPickerScreen) は
 * 登録後すぐ画面遷移して unmount するため、 モーダルは画面に依存しない root host で表示する。
 *
 * 動作:
 * - `useNotificationOptInStore.showOptIn` が true のとき ConfirmDialog を表示
 * - 「受け取る」 (onConfirm): ここで初めて OS 通知許可をリクエスト → granted なら通知 ON + 再予約
 * - 「受け取らない」 (onCancel): 閉じるだけ (許可は撃たない = iOS 生涯 1 回ダイアログを温存)
 */
import React from 'react';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useSettingsStore } from '@/src/stores/settingsStore';

import { useNotificationOptInStore } from './optInPrompt';
import { requestNotificationPermission } from './scheduler';
import { triggerSummaryReschedule } from './triggerReschedule';

export function NotificationOptInHost() {
  const { t } = useTranslation();
  const showOptIn = useNotificationOptInStore((s) => s.showOptIn);
  const setShowOptIn = useNotificationOptInStore((s) => s.setShowOptIn);
  const setNotifEnabled = useSettingsStore((s) => s.setNotificationDailySummaryEnabled);

  const handleConfirm = React.useCallback(async () => {
    setShowOptIn(false);
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifEnabled(true);
      await triggerSummaryReschedule(t);
    }
  }, [setShowOptIn, setNotifEnabled, t]);

  const handleCancel = React.useCallback(() => {
    setShowOptIn(false);
  }, [setShowOptIn]);

  return (
    <ConfirmDialog
      visible={showOptIn}
      title={t('softAskNotifTitle')}
      description={t('softAskNotifBody')}
      confirmLabel={t('softAskNotifConfirm')}
      cancelLabel={t('softAskNotifCancel')}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      testID="e2e_soft_ask_notif_modal"
    />
  );
}
