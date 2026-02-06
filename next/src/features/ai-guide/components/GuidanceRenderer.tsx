/**
 * GuidanceRenderer - Visualizes guide steps using Driver.js
 */

'use client';

import { useEffect, useRef } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { GuideResult } from '../core/types';

type GuidanceRendererProps = {
  guide: GuideResult;
  currentStepIndex: number;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onComplete: () => void;
};

/**
 * Component for rendering visual guidance using Driver.js
 */
export function GuidanceRenderer({
  guide,
  currentStepIndex,
  onNextStep,
  onPreviousStep,
  onComplete
}: GuidanceRendererProps) {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    // Convert guide steps to Driver.js steps
    const driverSteps: DriveStep[] = guide.steps.map((step, index) => {
      const isLast = index === guide.steps.length - 1;

      return {
        element: step.selector,
        popover: {
          title: `ステップ ${step.stepNumber}/${guide.totalSteps}`,
          description: `
            <div>
              <p class="mb-2">${step.description}</p>
              ${step.notes ? `<p class="text-sm text-gray-400">${step.notes}</p>` : ''}
            </div>
          `,
          side: 'left' as const,
          align: 'start' as const,
          showButtons: ['next', 'previous', 'close'],
          nextBtnText: isLast ? '完了' : '次へ',
          prevBtnText: '戻る',
          doneBtnText: '完了'
        }
      };
    });

    // Initialize Driver.js
    const driverObj = driver({
      showProgress: true,
      steps: driverSteps,
      onNextClick: () => {
        if (currentStepIndex < guide.steps.length - 1) {
          onNextStep();
          driverObj.moveNext();
        } else {
          onComplete();
          driverObj.destroy();
        }
      },
      onPrevClick: () => {
        if (currentStepIndex > 0) {
          onPreviousStep();
          driverObj.movePrevious();
        }
      },
      onDestroyStarted: () => {
        onComplete();
        driverRef.current = null;
      }
    });

    driverRef.current = driverObj;

    // Start the guide
    driverObj.drive(currentStepIndex);

    // Cleanup on unmount
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [guide, currentStepIndex, onNextStep, onPreviousStep, onComplete]);

  return null; // Driver.js renders its own UI
}
