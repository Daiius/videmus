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
  selector: z.string().nullable().describe('CSS selector for the target element (null if not applicable)'),
  value: z.string().nullable().describe('Value to input for input action (null if not applicable)'),
  notes: z.string().nullable().describe('Additional context or notes (null if none)')
});

/**
 * Zod schema for the complete guide result
 */
const GuideResultSchema = z.object({
  steps: z.array(GuideStepSchema).describe('List of steps to complete the goal'),
  totalSteps: z.number().int().positive().describe('Total number of steps'),
  summary: z.string().describe('Summary of what this guide accomplishes'),
  prerequisites: z.array(z.string()).nullable().describe('Prerequisites (null if none)'),
  warnings: z.array(z.string()).nullable().describe('Warnings or important notes (null if none)')
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

    // Warn about unstable nth-child selectors (but don't reject)
    if (step.selector && step.selector.includes(':nth-child')) {
      console.warn(
        `Step ${step.stepNumber} uses nth-child selector which may be unstable: ${step.selector}`
      );
    }
  }

  // Validate step numbering is sequential
  for (let i = 0; i < guide.steps.length; i++) {
    if (guide.steps[i].stepNumber !== i + 1) {
      console.warn(`Step numbering is not sequential at index ${i}`);
    }
  }

  return true;
}
