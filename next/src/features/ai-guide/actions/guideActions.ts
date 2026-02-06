/**
 * Server Actions for AI Guide
 */

'use server';

import { getSession } from '@/lib/session';
import type { AccessibilityTreeSnapshot, GuideResult } from '../core/types';
import { generateSteps, validateGuide } from '../services/ai-guide-engine';
import { sanitizeInput } from '../core/utils';

/**
 * Error types for guide generation
 */
export type GuideError = {
  code: 'UNAUTHORIZED' | 'INVALID_INPUT' | 'GENERATION_FAILED' | 'API_ERROR';
  message: string;
};

/**
 * Result type for guide generation
 */
export type GenerateGuideResult =
  | { success: true; guide: GuideResult }
  | { success: false; error: GuideError };

/**
 * Generate a step-by-step guide based on user goal and page state
 */
export async function generateGuide(
  userGoal: string,
  domSnapshot: AccessibilityTreeSnapshot
): Promise<GenerateGuideResult> {
  try {
    // 1. Authentication check
    const session = await getSession();
    if (!session.user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ログインが必要です'
        }
      };
    }

    // 2. Input validation and sanitization
    const sanitizedGoal = sanitizeInput(userGoal);
    if (!sanitizedGoal || sanitizedGoal.length < 3) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '目的を入力してください（3文字以上）'
        }
      };
    }

    // 3. Validate API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'AIサービスの設定が正しくありません'
        }
      };
    }

    // 4. Generate guide using LLM
    const guide = await generateSteps(sanitizedGoal, domSnapshot);

    // 5. Validate the generated guide
    if (!validateGuide(guide)) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'ガイドの生成に失敗しました。もう一度お試しください。'
        }
      };
    }

    return {
      success: true,
      guide
    };

  } catch (error) {
    console.error('Error in generateGuide:', error);

    return {
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'ガイドの生成中にエラーが発生しました'
      }
    };
  }
}

/**
 * Check if the AI Guide feature is available
 */
export async function checkAIGuideAvailability(): Promise<boolean> {
  const session = await getSession();
  return !!session.user && !!process.env.OPENAI_API_KEY;
}
