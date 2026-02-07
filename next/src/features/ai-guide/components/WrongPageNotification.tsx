/**
 * WrongPageNotification - Navigation prompt or element-not-found fallback
 * Shows a friendly navigation guide when the next step is on a different page,
 * or a troubleshooting message when the element cannot be found on the current page
 */

'use client';

import { ArrowRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type WrongPageNotificationProps = {
  message: string;
  stepNumber: number;
  totalSteps: number;
  /** If undefined, user is on the correct page but element wasn't found */
  expectedPage?: string;
  currentPage: string;
  onNavigate: (url: string) => void;
  onSkip: () => void;
  onCancel: () => void;
};

export function WrongPageNotification({
  message,
  stepNumber,
  totalSteps,
  expectedPage,
  currentPage,
  onNavigate,
  onSkip,
  onCancel
}: WrongPageNotificationProps) {
  const needsNavigation = !!expectedPage;

  return (
    <div className={`fixed top-4 left-4 z-[10001] w-80 border rounded-md shadow-xl p-4 animate-fade-in ${
      needsNavigation
        ? 'bg-indigo-950/95 border-indigo-700'
        : 'bg-gray-800/90 border-gray-600'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {needsNavigation ? (
          <ArrowRightIcon className="w-6 h-6 text-indigo-400 flex-shrink-0" />
        ) : (
          <MagnifyingGlassIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${needsNavigation ? 'text-indigo-100' : 'text-gray-100'}`}>
            {needsNavigation
              ? `ステップ ${stepNumber}/${totalSteps}: 別のページへ移動`
              : `ステップ ${stepNumber}/${totalSteps}: 要素が見つかりません`
            }
          </h3>
          <p className={`text-xs mt-1 ${needsNavigation ? 'text-indigo-200' : 'text-gray-300'}`}>
            {message}
          </p>
        </div>
      </div>

      {/* Page info for navigation */}
      {needsNavigation && (
        <div className="text-xs space-y-1 mb-3 p-2 bg-indigo-900/50 rounded">
          <div>
            <span className="text-indigo-400">現在: </span>
            <span className="text-indigo-100">{currentPage}</span>
          </div>
          <div>
            <span className="text-indigo-400">移動先: </span>
            <span className="text-indigo-100">{expectedPage}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {needsNavigation && (
          <button
            onClick={() => onNavigate(expectedPage)}
            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
          >
            ページへ移動
          </button>
        )}
        <button
          onClick={onSkip}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            needsNavigation
              ? 'text-indigo-200 bg-indigo-800/60 hover:bg-indigo-800'
              : 'text-gray-200 bg-gray-600 hover:bg-gray-700'
          }`}
        >
          スキップ
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-300 bg-gray-700/80 hover:bg-gray-700 rounded transition-colors"
        >
          終了
        </button>
      </div>
    </div>
  );
}
