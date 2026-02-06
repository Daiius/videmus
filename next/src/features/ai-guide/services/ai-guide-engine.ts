/**
 * AI Guide Engine - LLM integration for generating step-by-step guides
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { AccessibilityTreeSnapshot, GuideResult } from '../core/types';
import { buildSystemPrompt, buildUserPrompt } from './prompt-templates';

/**
 * Zod schema for guide step
 */
const GuideStepSchema = z.object({
  stepNumber: z.number().int().positive().describe('Step number (1-indexed)'),
  description: z.string().describe('Description of what the user should do'),
  action: z.enum(['click', 'input', 'navigate', 'observe']).describe('Type of action'),
  selector: z.string().optional().describe('CSS selector for the target element'),
  value: z.string().optional().describe('Value to input (for input action)'),
  notes: z.string().optional().describe('Additional context or notes')
});

/**
 * Zod schema for the complete guide result
 */
const GuideResultSchema = z.object({
  steps: z.array(GuideStepSchema).describe('List of steps to complete the goal'),
  totalSteps: z.number().int().positive().describe('Total number of steps'),
  summary: z.string().describe('Summary of what this guide accomplishes'),
  prerequisites: z.array(z.string()).optional().describe('Prerequisites (e.g., "ログインが必要です")'),
  warnings: z.array(z.string()).optional().describe('Warnings or important notes')
});

/**
 * Generate step-by-step guide using LLM
 */
export async function generateSteps(
  userGoal: string,
  domSnapshot: AccessibilityTreeSnapshot
): Promise<GuideResult> {
  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(userGoal, domSnapshot);

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: GuideResultSchema,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, // Low temperature for consistent, deterministic output
    });

    return object as GuideResult;
  } catch (error) {
    console.error('Failed to generate guide:', error);
    throw new Error('ガイドの生成に失敗しました。もう一度お試しください。');
  }
}

/**
 * Validate that a guide result is usable
 */
export function validateGuide(guide: GuideResult): boolean {
  if (!guide.steps || guide.steps.length === 0) {
    return false;
  }

  // Check that interactive steps have selectors
  for (const step of guide.steps) {
    if ((step.action === 'click' || step.action === 'input') && !step.selector) {
      return false;
    }
  }

  return true;
}
