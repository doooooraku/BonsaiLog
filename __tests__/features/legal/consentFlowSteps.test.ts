/**
 * F-LEGAL-001 Phase C — ATT/UMP 7 ステップ順序判定 純関数テスト (Issue #37 / ADR-0017)。
 *
 * F-22 AC7-1 連携: ウェルカム → 言語 → 通知 → ATT explainer → ATT → UMP requestInfoUpdate → UMP form
 */

import {
  CONSENT_STEP_ORDER,
  getConsentFlowProgress,
  getNextConsentStep,
  isConsentFlowCompleted,
  type ConsentState,
} from '@/src/features/legal/consentFlowSteps';

function makeState(overrides: Partial<ConsentState> = {}): ConsentState {
  return {
    isPro: false,
    welcomeShown: false,
    languageSelected: false,
    notificationDecided: false,
    attExplainerShown: false,
    attStatus: 'not_determined',
    umpRequestCompleted: false,
    umpFormCompleted: false,
    ...overrides,
  };
}

describe('CONSENT_STEP_ORDER (AC7-1)', () => {
  test('順序: welcome → language → notification → att_explainer → att → ump_request → ump_form', () => {
    expect(CONSENT_STEP_ORDER).toEqual([
      'welcome',
      'language',
      'notification',
      'att_explainer',
      'att',
      'ump_request',
      'ump_form',
    ]);
  });
});

describe('getNextConsentStep (順序判定)', () => {
  test('Pro → completed 即返却 (ATT/UMP スキップ)', () => {
    expect(getNextConsentStep(makeState({ isPro: true }))).toBe('completed');
  });

  test('初期状態 → welcome', () => {
    expect(getNextConsentStep(makeState())).toBe('welcome');
  });

  test('welcome 完了 → language', () => {
    expect(getNextConsentStep(makeState({ welcomeShown: true }))).toBe('language');
  });

  test('welcome + language 完了 → notification', () => {
    expect(getNextConsentStep(makeState({ welcomeShown: true, languageSelected: true }))).toBe(
      'notification',
    );
  });

  test('welcome + language + notification 完了 → att_explainer (iOS)', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
        }),
      ),
    ).toBe('att_explainer');
  });

  test('att_explainer 完了 → att', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attExplainerShown: true,
        }),
      ),
    ).toBe('att');
  });

  test('ATT 完了 (authorized) → ump_request', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attExplainerShown: true,
          attStatus: 'authorized',
        }),
      ),
    ).toBe('ump_request');
  });

  test('ATT 拒否 (denied) でも ump_request に進む', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attExplainerShown: true,
          attStatus: 'denied',
        }),
      ),
    ).toBe('ump_request');
  });

  test('ump_request 完了 → ump_form', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attExplainerShown: true,
          attStatus: 'authorized',
          umpRequestCompleted: true,
        }),
      ),
    ).toBe('ump_form');
  });

  test('全 step 完了 → completed', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attExplainerShown: true,
          attStatus: 'authorized',
          umpRequestCompleted: true,
          umpFormCompleted: true,
        }),
      ),
    ).toBe('completed');
  });
});

describe('Android / iOS<14 (ATT unsupported) の挙動', () => {
  test('ATT unsupported → att_explainer + att スキップ → ump_request へ', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attStatus: 'unsupported',
        }),
      ),
    ).toBe('ump_request');
  });

  test('ATT unsupported + ump 完了 → completed', () => {
    expect(
      getNextConsentStep(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attStatus: 'unsupported',
          umpRequestCompleted: true,
          umpFormCompleted: true,
        }),
      ),
    ).toBe('completed');
  });
});

describe('isConsentFlowCompleted', () => {
  test('Pro → true', () => {
    expect(isConsentFlowCompleted(makeState({ isPro: true }))).toBe(true);
  });

  test('全 step 完了 → true', () => {
    expect(
      isConsentFlowCompleted(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attExplainerShown: true,
          attStatus: 'authorized',
          umpRequestCompleted: true,
          umpFormCompleted: true,
        }),
      ),
    ).toBe(true);
  });

  test('Android で ATT スキップ + UMP 完了 → true', () => {
    expect(
      isConsentFlowCompleted(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attStatus: 'unsupported',
          umpRequestCompleted: true,
          umpFormCompleted: true,
        }),
      ),
    ).toBe(true);
  });

  test('一部未完了 → false', () => {
    expect(isConsentFlowCompleted(makeState({ welcomeShown: true }))).toBe(false);
  });
});

describe('getConsentFlowProgress', () => {
  test('Pro → 1', () => {
    expect(getConsentFlowProgress(makeState({ isPro: true }))).toBe(1);
  });

  test('初期状態 → 0', () => {
    expect(getConsentFlowProgress(makeState())).toBe(0);
  });

  test('全 step 完了 → 1', () => {
    expect(
      getConsentFlowProgress(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attExplainerShown: true,
          attStatus: 'authorized',
          umpRequestCompleted: true,
          umpFormCompleted: true,
        }),
      ),
    ).toBe(1);
  });

  test('iOS で 3 step 完了 (welcome/language/notification) → 3/7', () => {
    expect(
      getConsentFlowProgress(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
        }),
      ),
    ).toBeCloseTo(3 / 7);
  });

  test('Android (ATT unsupported) で 3 step 完了 → 3/5 (分母調整)', () => {
    expect(
      getConsentFlowProgress(
        makeState({
          welcomeShown: true,
          languageSelected: true,
          notificationDecided: true,
          attStatus: 'unsupported',
        }),
      ),
    ).toBeCloseTo(3 / 5);
  });
});

describe('AC7-1 シナリオ統合 (順序通り遷移)', () => {
  test('iOS シナリオ: 7 step 順番に完了', () => {
    let state = makeState();
    expect(getNextConsentStep(state)).toBe('welcome');

    state = { ...state, welcomeShown: true };
    expect(getNextConsentStep(state)).toBe('language');

    state = { ...state, languageSelected: true };
    expect(getNextConsentStep(state)).toBe('notification');

    state = { ...state, notificationDecided: true };
    expect(getNextConsentStep(state)).toBe('att_explainer');

    state = { ...state, attExplainerShown: true };
    expect(getNextConsentStep(state)).toBe('att');

    state = { ...state, attStatus: 'authorized' };
    expect(getNextConsentStep(state)).toBe('ump_request');

    state = { ...state, umpRequestCompleted: true };
    expect(getNextConsentStep(state)).toBe('ump_form');

    state = { ...state, umpFormCompleted: true };
    expect(getNextConsentStep(state)).toBe('completed');
  });

  test('Android シナリオ: 5 step 順番に完了 (ATT 2 つスキップ)', () => {
    let state = makeState({ attStatus: 'unsupported' });
    expect(getNextConsentStep(state)).toBe('welcome');

    state = { ...state, welcomeShown: true };
    expect(getNextConsentStep(state)).toBe('language');

    state = { ...state, languageSelected: true };
    expect(getNextConsentStep(state)).toBe('notification');

    state = { ...state, notificationDecided: true };
    // ATT スキップ → ump_request へ
    expect(getNextConsentStep(state)).toBe('ump_request');

    state = { ...state, umpRequestCompleted: true };
    expect(getNextConsentStep(state)).toBe('ump_form');

    state = { ...state, umpFormCompleted: true };
    expect(getNextConsentStep(state)).toBe('completed');
  });
});
