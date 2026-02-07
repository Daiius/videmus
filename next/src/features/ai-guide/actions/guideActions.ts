/**
 * Server Actions for AI Guide
 */

'use server';

import { getSession } from '@/lib/session';
import type { AccessibilityTreeSnapshot, GuideResult } from '../core/types';
import { generateSteps, validateGuide } from '../services/ai-guide-engine';
import { sanitizeInput } from '../core/utils';

/**
 * Rate limiting store
 * Map<userId, timestamp[]> to track requests per user
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Rate limit configuration
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;

/**
 * DOM snapshot validation limits
 */
const MAX_DOM_NODES = 500;
const MAX_DOM_SNAPSHOT_SIZE = 100 * 1024; // 100KB

/**
 * Error types for guide generation
 */
export type GuideError = {
  code: 'UNAUTHORIZED' | 'INVALID_INPUT' | 'GENERATION_FAILED' | 'API_ERROR' | 'RATE_LIMITED';
  message: string;
};

/**
 * Result type for guide generation
 */
export type GenerateGuideResult =
  | { success: true; guide: GuideResult }
  | { success: false; error: GuideError };

/**
 * Check if user is rate limited
 * Returns true if rate limit exceeded, false otherwise
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];

  // Remove timestamps older than the window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true; // Rate limit exceeded
  }

  // Add current request timestamp
  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);

  return false; // Not rate limited
}

/**
 * Validate DOM snapshot size and structure
 */
function validateDomSnapshot(domSnapshot: AccessibilityTreeSnapshot): { valid: boolean; error?: string } {
  // Check if nodes array exists
  if (!domSnapshot.nodes || !Array.isArray(domSnapshot.nodes)) {
    return { valid: false, error: 'DOMスナップショットの形式が不正です' };
  }

  // Count total nodes recursively
  function countNodes(nodes: any[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      if (node.children && Array.isArray(node.children)) {
        count += countNodes(node.children);
      }
    }
    return count;
  }

  const totalNodes = countNodes(domSnapshot.nodes);
  if (totalNodes > MAX_DOM_NODES) {
    return { valid: false, error: 'ページの構造が複雑すぎます' };
  }

  // Check serialized size
  try {
    const serialized = JSON.stringify(domSnapshot);
    if (serialized.length > MAX_DOM_SNAPSHOT_SIZE) {
      return { valid: false, error: 'DOMスナップショットのサイズが大きすぎます' };
    }
  } catch (error) {
    return { valid: false, error: 'DOMスナップショットのシリアライズに失敗しました' };
  }

  return { valid: true };
}

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

    // 2. Rate limiting check
    const userId = session.user.id;
    if (checkRateLimit(userId)) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'リクエストが多すぎます。しばらく待ってから再度お試しください。'
        }
      };
    }

    // 3. DOM snapshot validation
    const snapshotValidation = validateDomSnapshot(domSnapshot);
    if (!snapshotValidation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: snapshotValidation.error || 'DOMスナップショットが不正です'
        }
      };
    }

    // 4. Input validation and sanitization
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

    // 5. Validate API key
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

    // 6. Generate guide using LLM
    const guide = await generateSteps(sanitizedGoal, domSnapshot);

    // 7. Validate the generated guide
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
    // Log detailed error for debugging (server-side only)
    console.error('Error in generateGuide:', error);

    // Return sanitized error message to client (no internal details)
    return {
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: 'ガイドの生成中にエラーが発生しました'
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
