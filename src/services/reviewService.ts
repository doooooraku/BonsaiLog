import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import * as SecureStore from 'expo-secure-store';

const REVIEW_STATE_KEY = 'app_review_state';
const MAX_PROMPTS = 3;
const COOLDOWN_DAYS = 90;

type ReviewState = {
  lastPromptedAt: string | null;
  promptCount: number;
};

async function loadState(): Promise<ReviewState> {
  try {
    const raw = await SecureStore.getItemAsync(REVIEW_STATE_KEY);
    if (raw) return JSON.parse(raw) as ReviewState;
  } catch {
    // ignore
  }
  return { lastPromptedAt: null, promptCount: 0 };
}

async function saveState(state: ReviewState): Promise<void> {
  await SecureStore.setItemAsync(REVIEW_STATE_KEY, JSON.stringify(state));
}

export type ReviewDecision = 'prompt' | null;

export function shouldRequestReview(state: ReviewState): ReviewDecision {
  if (state.promptCount >= MAX_PROMPTS) return null;

  if (state.lastPromptedAt) {
    const daysSince =
      (Date.now() - new Date(state.lastPromptedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < COOLDOWN_DAYS) return null;
  }

  return 'prompt';
}

/**
 * Call at a positive moment (e.g. after completing a key action).
 * Fire-and-forget — errors never propagate to the caller.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    const state = await loadState();
    const decision = shouldRequestReview(state);
    if (!decision) return;

    await StoreReview.requestReview();

    await saveState({
      lastPromptedAt: new Date().toISOString(),
      promptCount: state.promptCount + 1,
    });
  } catch (e) {
    console.warn('[ReviewPrompt] failed (non-fatal):', e);
  }
}
