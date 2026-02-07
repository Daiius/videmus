/**
 * GuidanceRenderer - Visualizes guide steps using Driver.js
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { GuideResult, GuideStep as GuideStepType } from '../core/types';
import { WrongPageNotification } from './WrongPageNotification';

type GuidanceRendererProps = {
  guide: GuideResult;
  currentStepIndex: number;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onComplete: () => void;
};

/**
 * Extract expected page URL from step notes
 */
function extractExpectedPage(step: GuideStepType): string | undefined {
  if (step.notes) {
    const urlMatch = step.notes.match(/\/[a-zA-Z0-9/_-]+/);
    if (urlMatch) {
      return urlMatch[0];
    }
  }
  return undefined;
}

/**
 * Component for rendering visual guidance using Driver.js
 * Supports page navigation detection and element validation
 */
export function GuidanceRenderer({
  guide,
  currentStepIndex,
  onNextStep,
  onPreviousStep,
  onComplete
}: GuidanceRendererProps) {
  const driverRef = useRef<Driver | null>(null);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');

  // Memoize callbacks to prevent effect re-triggers
  const onNextStepRef = useRef(onNextStep);
  const onPreviousStepRef = useRef(onPreviousStep);
  const onCompleteRef = useRef(onComplete);
  onNextStepRef.current = onNextStep;
  onPreviousStepRef.current = onPreviousStep;
  onCompleteRef.current = onComplete;

  // Handle page navigation detection
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      console.log('Page navigation detected:', previousPathname.current, '->', pathname);

      // Destroy existing Driver.js instance
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }

      previousPathname.current = pathname;

      // If the current step is a click/navigate action, the navigation was expected
      const currentStep = guide.steps[currentStepIndex];
      if (currentStep && (currentStep.action === 'click' || currentStep.action === 'navigate')) {
        // Wait for DOM to settle, then advance to next step
        setTimeout(() => {
          onNextStepRef.current();
        }, 500);
      }
    }
  }, [pathname, guide.steps, currentStepIndex]);

  // Initialize Driver.js for current step
  useEffect(() => {
    const currentStep = guide.steps[currentStepIndex];
    if (!currentStep) {
      onCompleteRef.current();
      return;
    }

    // Build valid driver steps starting from current index
    const driverSteps: DriveStep[] = [];
    let validCurrentIndex = 0;

    for (let i = 0; i < guide.steps.length; i++) {
      const step = guide.steps[i];

      if (step.selector) {
        // Validate selector exists in DOM
        let element: Element | null = null;
        try {
          element = document.querySelector(step.selector);
        } catch {
          console.warn(`Invalid selector for step ${step.stepNumber}: ${step.selector}`);
        }

        if (element) {
          if (i === currentStepIndex) {
            validCurrentIndex = driverSteps.length;

          }

          const isLast = i === guide.steps.length - 1;
          driverSteps.push({
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
          });
        } else {
          console.warn(`Element not found for step ${step.stepNumber}: ${step.selector}`);

          // If this is the current step and element is missing, show fallback
          if (i === currentStepIndex) {
            setShowFallback(true);
            setFallbackMessage(
              `ステップ ${step.stepNumber} の対象要素が見つかりません。正しいページにいることを確認してください。`
            );
            return;
          }
        }
      } else {
        // Steps without selectors (observe/navigate) — add as popover-only
        if (i === currentStepIndex) {
          validCurrentIndex = driverSteps.length;
        }

        driverSteps.push({
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
            nextBtnText: i === guide.steps.length - 1 ? '完了' : '次へ',
            prevBtnText: '戻る',
            doneBtnText: '完了'
          }
        });
      }
    }

    // No valid steps at all
    if (driverSteps.length === 0) {
      setShowFallback(true);
      setFallbackMessage('ガイドの対象要素が見つかりませんでした。');
      return;
    }

    // Current step element was found — hide fallback
    setShowFallback(false);

    // Destroy previous driver instance
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    // Initialize Driver.js
    const driverObj = driver({
      showProgress: true,
      steps: driverSteps,
      onNextClick: () => {
        if (currentStepIndex < guide.steps.length - 1) {
          onNextStepRef.current();
          driverObj.moveNext();
        } else {
          onCompleteRef.current();
          driverObj.destroy();
        }
      },
      onPrevClick: () => {
        if (currentStepIndex > 0) {
          onPreviousStepRef.current();
          driverObj.movePrevious();
        }
      },
      onDestroyStarted: () => {
        onCompleteRef.current();
        driverRef.current = null;
        driverObj.destroy();
      }
    });

    driverRef.current = driverObj;
    driverObj.drive(validCurrentIndex);

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [guide, currentStepIndex, pathname]);

  return (
    <>
      {showFallback && (
        <WrongPageNotification
          message={fallbackMessage}
          stepNumber={guide.steps[currentStepIndex]?.stepNumber ?? 0}
          expectedPage={extractExpectedPage(guide.steps[currentStepIndex])}
          currentPage={pathname}
          onNavigate={(url) => {
            window.location.href = url;
          }}
          onSkip={() => {
            setShowFallback(false);
            onNextStep();
          }}
          onCancel={() => {
            setShowFallback(false);
            onComplete();
          }}
        />
      )}
    </>
  );
}
