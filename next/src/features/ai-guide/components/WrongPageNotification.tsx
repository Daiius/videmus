/**
 * WrongPageNotification - Fallback notification when target element is on a different page
 */

'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type WrongPageNotificationProps = {
  message: string;
  stepNumber: number;
  expectedPage?: string;
  currentPage: string;
  onNavigate: (url: string) => void;
  onSkip: () => void;
  onCancel: () => void;
};

export function WrongPageNotification({
  message,
  stepNumber,
  expectedPage,
  currentPage,
  onNavigate,
  onSkip,
  onCancel
}: WrongPageNotificationProps) {
  return (
    <div className="fixed top-4 left-4 z-[10001] w-80 bg-yellow-900/90 border border-yellow-700 rounded-md shadow-xl p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-yellow-100">
            ステップ {stepNumber}: ページが異なります
          </h3>
          <p className="text-xs text-yellow-200 mt-1">{message}</p>
        </div>
      </div>

      {/* Current page and expected page */}
      <div className="text-xs space-y-1 mb-3 p-2 bg-yellow-950/50 rounded">
        <div>
          <span className="text-yellow-400">現在のページ: </span>
          <span className="text-yellow-100">{currentPage}</span>
        </div>
        {expectedPage && (
          <div>
            <span className="text-yellow-400">必要なページ: </span>
            <span className="text-yellow-100">{expectedPage}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {expectedPage && (
          <button
            onClick={() => onNavigate(expectedPage)}
            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
          >
            正しいページへ移動
          </button>
        )}
        <button
          onClick={onSkip}
          className="px-3 py-1.5 text-xs text-yellow-100 bg-yellow-800 hover:bg-yellow-900 rounded transition-colors"
        >
          スキップ
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-200 bg-gray-700 hover:bg-gray-800 rounded transition-colors"
        >
          終了
        </button>
      </div>
    </div>
  );
}
