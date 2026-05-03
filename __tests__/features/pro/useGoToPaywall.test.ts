/**
 * F-10 / F-13 Follow-up - buildPaywallAlertButtons 純関数テスト (Issue #33)。
 */
import { buildPaywallAlertButtons } from '@/src/features/pro/useGoToPaywall';

describe('buildPaywallAlertButtons (Free → Paywall 遷移用)', () => {
  test('1 番目はキャンセルボタン (style=cancel)', () => {
    const buttons = buildPaywallAlertButtons('キャンセル', 'アップグレード', jest.fn());
    expect(buttons[0].text).toBe('キャンセル');
    expect(buttons[0].style).toBe('cancel');
  });

  test('2 番目はアップグレードボタン (style 未指定)', () => {
    const buttons = buildPaywallAlertButtons('キャンセル', 'アップグレード', jest.fn());
    expect(buttons[1].text).toBe('アップグレード');
    expect(buttons[1].style).toBeUndefined();
  });

  test('アップグレードボタン押下で onUpgrade が呼ばれる', () => {
    const onUpgrade = jest.fn();
    const buttons = buildPaywallAlertButtons('キャンセル', 'アップグレード', onUpgrade);
    buttons[1].onPress?.();
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  test('ボタン配列の長さは 2', () => {
    const buttons = buildPaywallAlertButtons('Cancel', 'Upgrade to Pro', jest.fn());
    expect(buttons).toHaveLength(2);
  });
});
