/**
 * React Hook for AI Guide state management
 */

'use client';

import { useState, useCallback } from 'react';
import type { AIGuideState } from '../core/types';
import { analyzePage } from '../core/dom-analyzer';
import { generateGuide } from '../actions/guideActions';

/**
 * Hook for managing AI Guide state
 */
export function useAIGuide() {
  const [state, setState] = useState<AIGuideState>({
    isLoading: false,
    guide: null,
    error: null,
    currentStepIndex: undefined
  });

  /**
   * Request a guide based on user goal
   */
  const requestGuide = useCallback(async (userGoal: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // 1. Analyze current page DOM
      const domSnapshot = analyzePage();

      // 2. Call server action to generate guide
      const result = await generateGuide(userGoal, domSnapshot);

      if (result.success) {
        setState({
          isLoading: false,
          guide: result.guide,
          error: null,
          currentStepIndex: 0 // Start at first step
        });
      } else {
        setState({
          isLoading: false,
          guide: null,
          error: result.error.message
        });
      }
    } catch (error) {
      setState({
        isLoading: false,
        guide: null,
        error: error instanceof Error ? error.message : 'エラーが発生しました'
      });
    }
  }, []);

  /**
   * Clear the current guide
   */
  const clearGuide = useCallback(() => {
    setState({
      isLoading: false,
      guide: null,
      error: null,
      currentStepIndex: undefined
    });
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

  return {
    ...state,
    requestGuide,
    clearGuide,
    nextStep,
    previousStep,
    goToStep
  };
}
