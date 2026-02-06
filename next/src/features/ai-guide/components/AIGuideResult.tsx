/**
 * AIGuideResult - Displays guide results
 */

'use client';

import type { GuideResult } from '../core/types';

type AIGuideResultProps = {
  guide: GuideResult;
  onStartGuide: () => void;
};

/**
 * Component for displaying guide result
 * (Migrated from AIGuideChatPanel)
 */
export function AIGuideResult({
  guide,
  onStartGuide
}: AIGuideResultProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-md">
        <h3 className="text-sm font-semibold mb-1">概要</h3>
        <p className="text-sm text-gray-300">{guide.summary}</p>
      </div>

      {/* Prerequisites */}
      {guide.prerequisites && guide.prerequisites.length > 0 && (
        <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-md">
          <h3 className="text-sm font-semibold mb-1">前提条件</h3>
          <ul className="list-disc list-inside text-sm text-gray-300">
            {guide.prerequisites.map((prereq, i) => (
              <li key={i}>{prereq}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">手順 ({guide.totalSteps}ステップ)</h3>
        {guide.steps.map((step) => (
          <div key={step.stepNumber} className="flex gap-2 text-sm">
            <span className="font-semibold text-blue-400">{step.stepNumber}.</span>
            <div className="flex-1">
              <span className="text-gray-300">{step.description}</span>
              {step.notes && (
                <p className="text-xs text-gray-400 mt-1">{step.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {guide.warnings && guide.warnings.length > 0 && (
        <div className="p-3 bg-orange-900/30 border border-orange-700 rounded-md">
          <h3 className="text-sm font-semibold mb-1">注意事項</h3>
          <ul className="list-disc list-inside text-sm text-gray-300">
            {guide.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Start guide button */}
      <button
        onClick={onStartGuide}
        className="
          w-full px-4 py-2
          bg-blue-600 hover:bg-blue-700
          rounded-md font-semibold text-sm
          transition-colors
        "
      >
        ガイドを開始
      </button>
    </div>
  );
}
