/**
 * F-26 オンボーディング Phase A — state store (Issue #26 / ADR-0018)。
 *
 * Phase A: 完了状態 + 各画面 dismiss state を AsyncStorage に永続化。
 * Phase B 以降: 実画面 (Welcome / 言語選択 / Step 1-5) + ルート切替 hook + Settings → 再表示動線。
 *
 * 設計方針:
 * - 'onboarding.completed' = true なら通常起動、false ならオンボフロー (Phase B で _layout.tsx 切替)
 * - 各 Step の dismissed フラグで「あとで」スキップ履歴を保持 (Phase B 再表示時に状態復元)
 * - master 通知 OFF は AsyncStorage 'notification.master' (ADR-0014 §K1) を参照、本 store では持たない
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ADR-0020 v1.x-2 (2026-05-16): tut1/tut2/tut3/tut4 撤去、tut5 のみ残置 (機能チュート 0 ステップ化)。
export type OnboardingStep = 'welcome' | 'language' | 'tut5';

type OnboardingState = {
  /** 全フロー完了済みなら true (= 起動時にオンボ画面を出さない)。 */
  completed: boolean;
  setCompleted: (value: boolean) => void;
  /** 「あとで」でスキップした Step 履歴 (Phase B 再表示で状態復元、ADR-0018)。 */
  dismissed: Partial<Record<OnboardingStep, boolean>>;
  markDismissed: (step: OnboardingStep) => void;
  /** Settings → ヘルプ → チュート再表示で呼ぶ (Step 1-5 のみリセット、Welcome/言語/Splash は対象外)。 */
  resetTutorial: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      setCompleted: (value) => set({ completed: value }),
      dismissed: {},
      markDismissed: (step) => set((s) => ({ dismissed: { ...s.dismissed, [step]: true } })),
      resetTutorial: () =>
        set((s) => {
          const tut: Partial<Record<OnboardingStep, boolean>> = {};
          if (s.dismissed.welcome) tut.welcome = true;
          if (s.dismissed.language) tut.language = true;
          return { dismissed: tut };
        }),
    }),
    {
      name: 'bonsailog-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
