/**
 * WrongPageNotification - Fallback notification when target element is not found
 * Shows different messages depending on whether the user is on the wrong page or
 * the element is simply not found on the current (correct) page
 */

'use client';

import { ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type WrongPageNotificationProps = {
  message: string;
  stepNumber: number;
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
  expectedPage,
  currentPage,
  onNavigate,
  onSkip,
  onCancel
}: WrongPageNotificationProps) {
  const isWrongPage = !!expectedPage;

  return (
    <div className={`fixed top-4 left-4 z-[10001] w-80 border rounded-md shadow-xl p-4 animate-fade-in ${
      isWrongPage
        ? 'bg-yellow-900/90 border-yellow-700'
        : 'bg-gray-800/90 border-gray-600'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {isWrongPage ? (
          <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
        ) : (
          <MagnifyingGlassIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${isWrongPage ? 'text-yellow-100' : 'text-gray-100'}`}>
            {isWrongPage
              ? `ステップ ${stepNumber}: ページが異なります`
              : `ステップ ${stepNumber}: 要素が見つかりません`
            }
          </h3>
          <p className={`text-xs mt-1 ${isWrongPage ? 'text-yellow-200' : 'text-gray-300'}`}>
            {message}
          </p>
        </div>
      </div>

      {/* Page info */}
      {isWrongPage && (
        <div className="text-xs space-y-1 mb-3 p-2 bg-yellow-950/50 rounded">
          <div>
            <span className="text-yellow-400">現在のページ: </span>
            <span className="text-yellow-100">{currentPage}</span>
          </div>
          <div>
            <span className="text-yellow-400">必要なページ: </span>
            <span className="text-yellow-100">{expectedPage}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {isWrongPage && (
          <button
            onClick={() => onNavigate(expectedPage)}
            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
          >
            正しいページへ移動
          </button>
        )}
        <button
          onClick={onSkip}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            isWrongPage
              ? 'text-yellow-100 bg-yellow-800 hover:bg-yellow-900'
              : 'text-gray-200 bg-gray-600 hover:bg-gray-700'
          }`}
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
