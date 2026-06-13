/**
 * useUnsavedChangesGuard hook の静的解析 + 振る舞い test (Sess39 PR-1、 issue #822)。
 *
 * 確認項目:
 * 1. export 存在 (hook 関数 + types)
 * 2. props 型 (isDirty: boolean、 bypass?: boolean)
 * 3. return 型 (guardVisible: boolean、 confirmDiscard: () => void、 cancelDiscard: () => void)
 * 4. React Navigation の beforeRemove event hook の logic (mock 経由)
 *
 * 動的な navigation event hook 検証は実機 / Maestro flow で後続 PR-2 で担保。
 * 本 test は hook の export contract + type 整合 + 内部 state 遷移 logic を保証。
 *
 * @see src/core/hooks/useUnsavedChangesGuard.ts
 * @see issue #822
 */

// React Navigation を mock (jest が自動 hoist する factory)
import { renderHook, act } from '@testing-library/react-native';
import { useNavigation } from 'expo-router/react-navigation';

import {
  useUnsavedChangesGuard,
  type UseUnsavedChangesGuardProps,
  type UseUnsavedChangesGuardResult,
} from '@/src/core/hooks/useUnsavedChangesGuard';

jest.mock('expo-router/react-navigation', () => ({
  useNavigation: jest.fn(() => ({
    addListener: jest.fn(() => jest.fn()), // unsubscribe function
    dispatch: jest.fn(),
  })),
}));

describe('useUnsavedChangesGuard — Sess39 PR-1 (issue #822)', () => {
  describe('export contract', () => {
    test('hook 関数が export されている', () => {
      expect(typeof useUnsavedChangesGuard).toBe('function');
    });

    test('props 型 (UseUnsavedChangesGuardProps) が export されている', () => {
      // TypeScript 型 export は実行時には存在しないが、 import が成功すれば OK
      const props: UseUnsavedChangesGuardProps = { isDirty: false };
      expect(props.isDirty).toBe(false);
    });

    test('return 型 (UseUnsavedChangesGuardResult) が export されている', () => {
      const result: UseUnsavedChangesGuardResult = {
        guardVisible: false,
        confirmDiscard: () => {},
        cancelDiscard: () => {},
        allowNavigation: () => {},
      };
      expect(result.guardVisible).toBe(false);
      expect(typeof result.confirmDiscard).toBe('function');
      expect(typeof result.cancelDiscard).toBe('function');
      expect(typeof result.allowNavigation).toBe('function');
    });
  });

  describe('hook 振る舞い (mock 経由)', () => {
    test('isDirty=false 初期状態で guardVisible=false', () => {
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: false }));
      expect(result.current.guardVisible).toBe(false);
    });

    test('isDirty=true でも初期 guardVisible=false (navigation 試行前)', () => {
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true }));
      expect(result.current.guardVisible).toBe(false);
    });

    test('beforeRemove listener が登録される', () => {
      const mockAddListener = jest.fn(() => jest.fn());
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: jest.fn(),
      });
      renderHook(() => useUnsavedChangesGuard({ isDirty: true }));
      expect(mockAddListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
    });

    test('cancelDiscard で guardVisible=false', () => {
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true }));
      act(() => {
        result.current.cancelDiscard();
      });
      expect(result.current.guardVisible).toBe(false);
    });

    test('confirmDiscard で navigation.dispatch が呼ばれる (pending action 無時は no-op)', () => {
      const mockDispatch = jest.fn();
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: jest.fn(() => jest.fn()),
        dispatch: mockDispatch,
      });
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true }));
      act(() => {
        result.current.confirmDiscard();
      });
      // pending action なし時は dispatch 呼ばれない
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result.current.guardVisible).toBe(false);
    });

    test('isDirty=false 時の beforeRemove は preventDefault せず通過 (callback 内動作確認)', () => {
      let capturedHandler:
        | ((e: { preventDefault: jest.Mock; data: { action: object } }) => void)
        | undefined;
      const mockAddListener = jest.fn((event, handler) => {
        if (event === 'beforeRemove') capturedHandler = handler;
        return jest.fn();
      });
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: jest.fn(),
      });
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: false }));
      const mockEvent = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      act(() => {
        capturedHandler?.(mockEvent);
      });
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result.current.guardVisible).toBe(false);
    });

    test('isDirty=true 時の beforeRemove は preventDefault + guardVisible=true', () => {
      let capturedHandler:
        | ((e: { preventDefault: jest.Mock; data: { action: object } }) => void)
        | undefined;
      const mockAddListener = jest.fn((event, handler) => {
        if (event === 'beforeRemove') capturedHandler = handler;
        return jest.fn();
      });
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: jest.fn(),
      });
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true }));
      const mockEvent = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      act(() => {
        capturedHandler?.(mockEvent);
      });
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.guardVisible).toBe(true);
    });

    test('bypass=true 時の beforeRemove は preventDefault せず通過 (submitting 中等)', () => {
      let capturedHandler:
        | ((e: { preventDefault: jest.Mock; data: { action: object } }) => void)
        | undefined;
      const mockAddListener = jest.fn((event, handler) => {
        if (event === 'beforeRemove') capturedHandler = handler;
        return jest.fn();
      });
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: jest.fn(),
      });
      renderHook(() => useUnsavedChangesGuard({ isDirty: true, bypass: true }));
      const mockEvent = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      act(() => {
        capturedHandler?.(mockEvent);
      });
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    test('isDirty=true で beforeRemove → confirmDiscard で pending action が dispatch される', () => {
      let capturedHandler:
        | ((e: { preventDefault: jest.Mock; data: { action: object } }) => void)
        | undefined;
      const mockDispatch = jest.fn();
      const mockAddListener = jest.fn((event, handler) => {
        if (event === 'beforeRemove') capturedHandler = handler;
        return jest.fn();
      });
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: mockDispatch,
      });
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true }));
      const mockAction = { type: 'GO_BACK' };
      const mockEvent = { preventDefault: jest.fn(), data: { action: mockAction } };
      act(() => {
        capturedHandler?.(mockEvent);
      });
      expect(result.current.guardVisible).toBe(true);
      act(() => {
        result.current.confirmDiscard();
      });
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
      expect(result.current.guardVisible).toBe(false);
    });

    test('Sess42 バグ2 fix: allowNavigation() 後は isDirty=true でも preventDefault せず通過', () => {
      let capturedHandler:
        | ((e: { preventDefault: jest.Mock; data: { action: object } }) => void)
        | undefined;
      const mockAddListener = jest.fn((event, handler) => {
        if (event === 'beforeRemove') capturedHandler = handler;
        return jest.fn();
      });
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: jest.fn(),
      });
      // bypass=false (submitting state 未反映を模す) + isDirty=true でも、
      // allowNavigation() を同期的に呼んだ後は guard が通過する (競合回避の核心)。
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true, bypass: false }));
      act(() => {
        result.current.allowNavigation();
      });
      const mockEvent = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      act(() => {
        capturedHandler?.(mockEvent);
      });
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result.current.guardVisible).toBe(false);
    });

    test('allowNavigation() 前は isDirty=true で通常通り preventDefault される (回帰防止)', () => {
      let capturedHandler:
        | ((e: { preventDefault: jest.Mock; data: { action: object } }) => void)
        | undefined;
      const mockAddListener = jest.fn((event, handler) => {
        if (event === 'beforeRemove') capturedHandler = handler;
        return jest.fn();
      });
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: jest.fn(),
      });
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true, bypass: false }));
      const mockEvent = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      act(() => {
        capturedHandler?.(mockEvent);
      });
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.guardVisible).toBe(true);
    });

    test('isDirty=true で beforeRemove → cancelDiscard で pending action は dispatch されない', () => {
      let capturedHandler:
        | ((e: { preventDefault: jest.Mock; data: { action: object } }) => void)
        | undefined;
      const mockDispatch = jest.fn();
      const mockAddListener = jest.fn((event, handler) => {
        if (event === 'beforeRemove') capturedHandler = handler;
        return jest.fn();
      });
      (useNavigation as jest.Mock).mockReturnValue({
        addListener: mockAddListener,
        dispatch: mockDispatch,
      });
      const { result } = renderHook(() => useUnsavedChangesGuard({ isDirty: true }));
      const mockEvent = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      act(() => {
        capturedHandler?.(mockEvent);
      });
      act(() => {
        result.current.cancelDiscard();
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result.current.guardVisible).toBe(false);
    });
  });
});
