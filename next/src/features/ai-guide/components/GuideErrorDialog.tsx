/**
 * GuideErrorDialog - Error dialog when guide element cannot be found
 */

'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

type GuideErrorDialogProps = {
  stepNumber: number;
  selector: string;
  onSkip: () => void;
  onRetry: () => void;
  onCancel: () => void;
};

export function GuideErrorDialog({
  stepNumber,
  selector,
  onSkip,
  onRetry,
  onCancel
}: GuideErrorDialogProps) {
  return (
    <Dialog open={true} onClose={onCancel} className="relative z-[10002]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <ExclamationCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <DialogTitle className="font-semibold text-sm text-gray-100">
                ステップ {stepNumber}: 要素が見つかりません
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-1 break-all">
                セレクター: <code className="bg-gray-900 px-1 py-0.5 rounded">{selector}</code>
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-300 mb-4">
            ページの状態が変わった可能性があります。リトライするか、このステップをスキップしてください。
          </p>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              リトライ
            </button>
            <button
              onClick={onSkip}
              className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-gray-200 rounded transition-colors"
            >
              スキップ
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-800 text-gray-300 rounded transition-colors"
            >
              キャンセル
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
