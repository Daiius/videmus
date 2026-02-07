/**
 * React Hook for AI Guide state management
 * Supports sessionStorage persistence for cross-page navigation
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AIGuideState } from '../core/types';
import { analyzePage } from '../core/dom-analyzer';
import { generateGuide } from '../actions/guideActions';
import { saveGuideState, loadGuideState, clearGuideState } from '../core/storage';

const initialState: AIGuideState = {
  isLoading: false,
  guide: null,
  error: null,
  currentStepIndex: undefined,
  userGoal: '',
  isGuidanceActive: false
};

/**
 * Hook for managing AI Guide state with sessionStorage persistence
 */
export function useAIGuide() {
  const [state, setState] = useState<AIGuideState>(() => {
    // SSR guard: don't access sessionStorage on server
    if (typeof window === 'undefined') return initialState;

    const persisted = loadGuideState();
    if (persisted) {
      return {
        isLoading: false,
        guide: persisted.guide,
        error: null,
        currentStepIndex: persisted.currentStepIndex,
        userGoal: persisted.userGoal,
        isGuidanceActive: persisted.isGuidanceActive
      };
    }
    return initialState;
  });

  // Persist state to sessionStorage when guide-related state changes
  useEffect(() => {
    if (state.guide) {
      saveGuideState({
        guide: state.guide,
        currentStepIndex: state.currentStepIndex ?? 0,
        userGoal: state.userGoal ?? '',
        isGuidanceActive: state.isGuidanceActive ?? false,
        startUrl: window.location.href,
        timestamp: Date.now()
      });
    } else {
      // Clear storage when guide is cleared
      clearGuideState();
    }
  }, [state.guide, state.currentStepIndex, state.userGoal, state.isGuidanceActive]);

  /**
   * Request a guide based on user goal
   */
  const requestGuide = useCallback(async (userGoal: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      userGoal
    }));

    try {
      // 1. Analyze current page DOM
      const domSnapshot = analyzePage();

      // 2. Call server action to generate guide
      const result = await generateGuide(userGoal, domSnapshot);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          guide: result.guide,
          error: null,
          currentStepIndex: 0
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          guide: null,
          error: result.error.message
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        guide: null,
        error: error instanceof Error ? error.message : 'エラーが発生しました'
      }));
    }
  }, []);

  /**
   * Clear the current guide
   */
  const clearGuide = useCallback(() => {
    setState(initialState);
    clearGuideState();
  }, []);

  /**
   * Go to next step
   */
  const nextStep = useCallback(() => {
    setState(prev => {
      if (!prev.guide || prev.currentStepIndex === undefined) {
        return prev;
      }

      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.guide.steps.length) {
        return prev; // Already at last step
      }

      return {
        ...prev,
        currentStepIndex: nextIndex
      };
    });
  }, []);

  /**
   * Go to previous step
   */
  const previousStep = useCallback(() => {
    setState(prev => {
      if (!prev.guide || prev.currentStepIndex === undefined) {
        return prev;
      }

      const prevIndex = prev.currentStepIndex - 1;
      if (prevIndex < 0) {
        return prev; // Already at first step
      }

      return {
        ...prev,
        currentStepIndex: prevIndex
      };
    });
  }, []);

  /**
   * Go to a specific step
   */
  const goToStep = useCallback((stepIndex: number) => {
    setState(prev => {
      if (!prev.guide) {
        return prev;
      }

      if (stepIndex < 0 || stepIndex >= prev.guide.steps.length) {
        return prev; // Invalid step index
      }

      return {
        ...prev,
        currentStepIndex: stepIndex
      };
    });
  }, []);

  /**
   * Set user goal text
   */
  const setUserGoal = useCallback((userGoal: string) => {
    setState(prev => ({ ...prev, userGoal }));
  }, []);

  /**
   * Set guidance active state
   */
  const setIsGuidanceActive = useCallback((isGuidanceActive: boolean) => {
    setState(prev => ({ ...prev, isGuidanceActive }));
  }, []);

  return {
    ...state,
    requestGuide,
    clearGuide,
    nextStep,
    previousStep,
    goToStep,
    setUserGoal,
    setIsGuidanceActive
  };
}
