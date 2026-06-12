/**
 * pendingGuide store unit test (#1203)。
 *
 * 確認項目:
 * 1. request → pending 設定 / clear → 解除
 * 2. 連続 request は上書き (同時 1 つ)
 * 3. 揮発 (persist なし — オプション未設定の契約)
 */
import { usePendingGuideStore } from '@/src/features/guides/pendingGuide';

beforeEach(() => {
  usePendingGuideStore.getState().clear();
});

describe('usePendingGuideStore (#1203)', () => {
  test('request → pending / clear → null', () => {
    usePendingGuideStore.getState().request('g2RecordCta');
    expect(usePendingGuideStore.getState().pending).toBe('g2RecordCta');
    usePendingGuideStore.getState().clear();
    expect(usePendingGuideStore.getState().pending).toBeNull();
  });

  test('連続 request は上書き (同時 1 つの契約)', () => {
    usePendingGuideStore.getState().request('g7RegisterCta');
    usePendingGuideStore.getState().request('g10BackupExport');
    expect(usePendingGuideStore.getState().pending).toBe('g10BackupExport');
  });

  test('揮発契約: persist API を持たない (再起動で消えるのが正)', () => {
    expect((usePendingGuideStore as unknown as { persist?: unknown }).persist).toBeUndefined();
  });
});
