/**
 * sessionStorage persistence for AI Guide state
 */

import type { GuideResult } from './types';

export type PersistedGuideState = {
  guide: GuideResult | null;
  currentStepIndex: number;
  userGoal: string;
  isGuidanceActive: boolean;
  startUrl: string;
  timestamp: number;
};

const STORAGE_KEY = 'videmus-ai-guide-state';
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function saveGuideState(state: PersistedGuideState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save guide state:', error);
  }
}

export function loadGuideState(): PersistedGuideState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state: PersistedGuideState = JSON.parse(stored);

    // Expiry check
    if (Date.now() - state.timestamp > EXPIRY_MS) {
      clearGuideState();
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to load guide state:', error);
    return null;
  }
}

export function clearGuideState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
