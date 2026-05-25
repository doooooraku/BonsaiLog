/**
 * proStore.devSetPro — 開発専用 (__DEV__ 限定) 課金状態 ON/OFF 切替のテスト。
 *
 * RevenueCat Sandbox 購入を介さず isPro を手動注入する開発スイッチ (設定画面 DEV セクション)。
 * proService は丸ごとモックし、store の状態遷移と永続化呼び出しのみ検証する。
 */
import { useProStore } from '@/src/stores/proStore';
import { proService } from '@/src/services/proService';

jest.mock('@/src/services/proService', () => ({
  proService: {
    loadLocalState: jest.fn(),
    refreshCustomerInfo: jest.fn(),
    purchase: jest.fn(),
    restore: jest.fn(),
    devSaveState: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('proStore.devSetPro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProStore.setState({
      state: null,
      isPro: false,
      planType: null,
      expirationDate: null,
      managementURL: null,
      initialized: false,
      busy: false,
    });
  });

  it('devSetPro(true) で isPro=true になり金庫へ保存される', async () => {
    await useProStore.getState().devSetPro(true);

    const s = useProStore.getState();
    expect(s.isPro).toBe(true);
    expect(s.planType).toBeNull();
    expect(s.initialized).toBe(true);
    expect(proService.devSaveState).toHaveBeenCalledTimes(1);
    expect(proService.devSaveState).toHaveBeenCalledWith(
      expect.objectContaining({ isPro: true, anonUserId: 'dev-override' }),
    );
  });

  it('devSetPro(false) で isPro=false に戻る', async () => {
    await useProStore.getState().devSetPro(true);
    await useProStore.getState().devSetPro(false);

    const s = useProStore.getState();
    expect(s.isPro).toBe(false);
    expect(proService.devSaveState).toHaveBeenLastCalledWith(
      expect.objectContaining({ isPro: false }),
    );
  });
});
