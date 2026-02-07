/**
 * GuidanceRenderer - Visualizes guide steps using Driver.js
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './driver-overrides.css';
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
 * Extract all page URL patterns from step notes
 * Returns patterns like ["/broadcast", "/broadcast/[id]"]
 * Notes may contain both source and destination pages
 */
function extractExpectedPages(step: GuideStepType): string[] {
  if (!step.notes) return [];
  // Match all URL patterns including [id] placeholders
  const matches = step.notes.match(/\/[a-zA-Z0-9/_[\]-]+/g);
  return matches ?? [];
}

/**
 * Check if the current page matches any of the expected page patterns
 */
function isOnExpectedPage(currentPath: string, step: GuideStepType): boolean {
  const patterns = extractExpectedPages(step);
  if (patterns.length === 0) return true; // No page info → assume correct
  return patterns.some(pattern => matchesPagePattern(currentPath, pattern));
}

/**
 * Get the first non-matching expected page (for navigation prompt)
 */
function getNavigationTarget(currentPath: string, step: GuideStepType): string | undefined {
  const patterns = extractExpectedPages(step);
  if (patterns.length === 0) return undefined;
  // If already on one of the expected pages, no navigation needed
  if (patterns.some(pattern => matchesPagePattern(currentPath, pattern))) return undefined;
  // Return the first pattern as navigation target
  return patterns[0];
}

/**
 * Check if the current pathname matches an expected URL pattern
 * Handles dynamic segments like [id] which match any value
 *
 * Examples:
 *   matchesPagePattern("/broadcast/abc123", "/broadcast/[id]") → true
 *   matchesPagePattern("/broadcast/abc123", "/broadcast/xyz789") → true (same depth, same prefix)
 *   matchesPagePattern("/broadcast", "/channel") → false
 */
function matchesPagePattern(currentPath: string, expectedPattern: string): boolean {
  const currentSegments = currentPath.split('/').filter(Boolean);
  const expectedSegments = expectedPattern.split('/').filter(Boolean);

  // Different depth → different page structure
  if (currentSegments.length !== expectedSegments.length) {
    return false;
  }

  for (let i = 0; i < expectedSegments.length; i++) {
    const expected = expectedSegments[i];
    const current = currentSegments[i];

    // [id] or [slug] style placeholders match anything
    if (expected.startsWith('[') && expected.endsWith(']')) {
      continue;
    }

    // Static segments must match exactly
    if (expected !== current) {
      // If the expected segment looks like a concrete dynamic ID (not a known route),
      // and the first segment (the route base) already matched, treat it as a dynamic segment
      if (i > 0 && currentSegments[0] === expectedSegments[0]) {
        continue;
      }
      return false;
    }
  }

  return true;
}

/**
 * Validate if a URL is a safe internal path
 * Only allows internal paths that match known safe patterns
 */
function isSafeInternalPath(url: string): boolean {
  // Block absolute URLs (external sites)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return false;
  }

  // Only allow paths starting with /
  if (!url.startsWith('/')) {
    return false;
  }

  // Whitelist of safe path patterns
  const safePatterns = [
    /^\/$/,                              // Home
    /^\/broadcast$/,                     // Broadcast page
    /^\/broadcast\/[a-zA-Z0-9-_]+$/,     // Broadcast detail
    /^\/stream\/[a-zA-Z0-9-_]+$/,        // Stream viewer
    /^\/admin$/,                         // Admin page
  ];

  return safePatterns.some(pattern => pattern.test(url));
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
  const isAutoAdvancingRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
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
        // Wait for DOM to settle, then advance
        setTimeout(() => {
          if (currentStepIndex >= guide.steps.length - 1) {
            // Last step completed with navigation — guide is done
            onCompleteRef.current();
          } else {
            onNextStepRef.current();
          }
        }, 500);
      }
    }
  }, [pathname, guide.steps, currentStepIndex]);

  // Initialize Driver.js for current step
  useEffect(() => {
    isAutoAdvancingRef.current = false;

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
            const onCorrectPage = isOnExpectedPage(pathname, step);

            setShowFallback(true);
            if (onCorrectPage) {
              // We're on the right page pattern, but selector didn't match
              setFallbackMessage(
                `対象の要素がページ上に見つかりません。ページの状態が変わった可能性があります。`
              );
            } else {
              setFallbackMessage(
                `${step.description}`
              );
            }
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
      overlayOpacity: 0,
      allowClose: false,
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
        // ダイアログが閉じている最中はフォーカス解放で destroy が呼ばれるが、
        // Driver.js の破棄自体を防止して popover を維持する
        const dialogClosing = document.querySelector('[role="dialog"][data-closed]');
        if (dialogClosing || isAutoAdvancingRef.current) {
          return; // destroy() を呼ばないことで Driver.js の破棄を防止
        }

        // cleanup からの destroy では driverRef.current が既に null
        // ユーザが Close ボタンを押した場合のみガイド完了
        if (driverRef.current) {
          onCompleteRef.current();
          driverRef.current = null;
        }
        driverObj.destroy();
      }
    });

    driverRef.current = driverObj;
    driverObj.drive(validCurrentIndex);

    // click アクションの場合、対象要素のクリックでステップを自動進行
    let clickCleanup: (() => void) | undefined;
    if (currentStep.action === 'click' && currentStep.selector) {
      const targetEl = document.querySelector(currentStep.selector);
      if (targetEl) {
        const handleClick = () => {
          // ダイアログ等の表示アニメーション完了を待つ
          isAutoAdvancingRef.current = true;
          setTimeout(() => {
            if (currentStepIndex < guide.steps.length - 1) {
              onNextStepRef.current();
            } else {
              onCompleteRef.current();
              driverObj.destroy();
            }
          }, 500);
        };
        targetEl.addEventListener('click', handleClick, { once: true });
        clickCleanup = () => targetEl.removeEventListener('click', handleClick);
      }
    }

    // ダイアログ閉じを検知して自動進行
    let dialogObserverCleanup: (() => void) | undefined;
    const openDialog = document.querySelector(
      '[role="dialog"]:not([data-closed])'
    );
    if (openDialog) {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'data-closed'
          ) {
            // ダイアログが閉じた → 次のステップへ
            isAutoAdvancingRef.current = true;
            setTimeout(() => {
              if (currentStepIndex < guide.steps.length - 1) {
                onNextStepRef.current();
              } else {
                onCompleteRef.current();
                driverObj.destroy();
              }
            }, 500);
            observer.disconnect();
            break;
          }
        }
      });
      observer.observe(openDialog, { attributes: true });
      dialogObserverCleanup = () => observer.disconnect();
    }

    return () => {
      clickCleanup?.();
      dialogObserverCleanup?.();
      if (driverRef.current) {
        // null を先にセットして onDestroyStarted でガイド完了を防ぐ
        const d = driverRef.current;
        driverRef.current = null;
        d.destroy();
      }
    };
  }, [guide, currentStepIndex, pathname]);

  // Determine navigation target for fallback display
  const currentStepForRender = guide.steps[currentStepIndex];
  const navigationTarget = currentStepForRender ? getNavigationTarget(pathname, currentStepForRender) : undefined;

  return (
    <>
      {showFallback && (
        <WrongPageNotification
          message={fallbackMessage}
          stepNumber={currentStepForRender?.stepNumber ?? 0}
          totalSteps={guide.totalSteps}
          expectedPage={navigationTarget}
          currentPage={pathname}
          onNavigate={(url) => {
            // Validate URL before navigation
            if (!isSafeInternalPath(url)) {
              console.error('Unsafe navigation blocked:', url);
              alert('安全でないページ遷移がブロックされました。');
              return;
            }

            // Use Next.js router for client-side navigation
            router.push(url);
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
