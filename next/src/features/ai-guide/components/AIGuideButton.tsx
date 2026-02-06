/**
 * AIGuideButton - Floating action button and modal for AI Guide
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { useAIGuide } from '../hooks/useAIGuide';
import { AIGuideChatPanel } from './AIGuideChatPanel';
import { GuidanceRenderer } from './GuidanceRenderer';

/**
 * Main entry point for AI Guide feature
 * Renders a floating action button that opens a modal
 */
export function AIGuideButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);

  const {
    isLoading,
    error,
    guide,
    currentStepIndex,
    requestGuide,
    clearGuide,
    nextStep,
    previousStep
  } = useAIGuide();

  const handleStartGuide = () => {
    setIsGuidanceActive(true);
    setIsOpen(false); // Close modal while guidance is active
  };

  const handleCompleteGuide = () => {
    setIsGuidanceActive(false);
    clearGuide();
  };

  const handleClose = () => {
    setIsOpen(false);
    if (!isGuidanceActive) {
      clearGuide();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        data-testid="ai-guide-button"
        aria-label="AI ガイドを開く"
        className="
          fixed bottom-6 right-6 z-40
          w-14 h-14 rounded-full
          bg-blue-600 hover:bg-blue-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          flex items-center justify-center
          group
        "
      >
        {/* AI Icon */}
        <svg
          className="w-7 h-7 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>

        {/* Tooltip */}
        <span
          className="
            absolute right-full mr-3 px-3 py-1
            bg-gray-900 text-white text-sm rounded
            whitespace-nowrap
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none
          "
        >
          AI ガイド
        </span>
      </button>

      {/* Modal Dialog */}
      <Dialog
        open={isOpen}
        onClose={handleClose}
        className="relative z-50"
      >
        <DialogBackdrop
          className="fixed inset-0 bg-black/50"
        />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-2xl h-[600px] bg-panel rounded-lg shadow-xl">
            <AIGuideChatPanel
              isLoading={isLoading}
              error={error}
              guide={guide}
              onRequestGuide={requestGuide}
              onStartGuide={handleStartGuide}
              onClose={handleClose}
            />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Guidance Renderer (Driver.js) */}
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
