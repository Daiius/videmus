/**
 * AIGuideSearchBar - Header-integrated search bar for AI Guide
 */

'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useAIGuide } from '../hooks/useAIGuide';
import { AIGuidePresetList } from './AIGuidePresetList';
import { AIGuideResult } from './AIGuideResult';
import { GuidanceRenderer } from './GuidanceRenderer';

export function AIGuideSearchBar() {
  const {
    isLoading,
    error,
    guide,
    currentStepIndex,
    userGoal,
    isGuidanceActive,
    requestGuide,
    clearGuide,
    nextStep,
    previousStep,
    setUserGoal,
    setIsGuidanceActive
  } = useAIGuide();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevIsOpen = useRef(isOpen);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // Reset on close (when not actively guiding)
  useEffect(() => {
    if (prevIsOpen.current && !isOpen && !isGuidanceActive) {
      clearGuide();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, isGuidanceActive, clearGuide]);

  const handleRequestGuide = async (goal: string) => {
    await requestGuide(goal);
    // Panel stays open to show guide result
  };

  const handleStartGuide = () => {
    setIsGuidanceActive(true);
    setIsOpen(false);
  };

  const handleCompleteGuide = () => {
    setIsGuidanceActive(false);
    clearGuide();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (userGoal ?? '').trim()) {
      handleRequestGuide((userGoal ?? '').trim());
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Search bar input field */}
        <div
          className={clsx(
            'w-32 sm:w-64 md:w-80 lg:w-96 h-9',
            'bg-primary border border-primary',
            'rounded-md px-3 py-2',
            'flex items-center gap-2',
            'transition-colors hover:bg-panel',
            'focus-within:border-active focus-within:bg-panel',
            'cursor-text'
          )}
        >
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={userGoal ?? ''}
            onChange={(e) => setUserGoal(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="何をしたいですか？"
            disabled={isGuidanceActive}
            role="search"
            aria-label="AI ガイド検索"
            className={clsx(
              'flex-1 bg-transparent outline-none text-sm',
              'placeholder:text-gray-500',
              isGuidanceActive && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Dropdown panel */}
        {isOpen && (
          <div
            className={clsx(
              'absolute top-full mt-2 left-0',
              'w-full md:w-[32rem]',
              'max-h-96 overflow-y-auto',
              'bg-panel border border-gray-700',
              'rounded-md shadow-xl',
              'z-50 p-4'
            )}
          >
            {/* Show preset list when no guide and no error */}
            {!guide && !error && (
              <AIGuidePresetList
                onSelect={(goal) => {
                  setUserGoal(goal);
                  handleRequestGuide(goal);
                }}
                isLoading={isLoading}
              />
            )}

            {/* Show guide result */}
            {guide && (
              <AIGuideResult
                guide={guide}
                onStartGuide={handleStartGuide}
              />
            )}

            {/* Show error */}
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Show loading spinner */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="ml-3 text-sm text-gray-300">ガイドを生成中...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Driver.js guidance renderer */}
      {isGuidanceActive && guide && currentStepIndex !== undefined && (
        <GuidanceRenderer
          guide={guide}
          currentStepIndex={currentStepIndex}
          onNextStep={nextStep}
          onPreviousStep={previousStep}
          onComplete={handleCompleteGuide}
        />
      )}
    </>
  );
}
