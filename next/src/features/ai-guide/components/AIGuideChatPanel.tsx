/**
 * AIGuideChatPanel - Input UI for requesting guides
 */

'use client';

import { useState } from 'react';
import clsx from 'clsx';
import Button from '@/components/Button';
import Input from '@/components/Input';
import type { GuideResult } from '../core/types';

type AIGuideChatPanelProps = {
  isLoading: boolean;
  error: string | null;
  guide: GuideResult | null;
  onRequestGuide: (goal: string) => void;
  onStartGuide: () => void;
  onClose: () => void;
};

/**
 * Preset common goals
 */
const PRESET_GOALS = [
  '配信を開始したい',
  '視聴URLを取得したい',
  'チャンネルを作成したい',
  '配信IDを生成したい'
];

/**
 * Chat panel for AI Guide interaction
 */
export function AIGuideChatPanel({
  isLoading,
  error,
  guide,
  onRequestGuide,
  onStartGuide,
  onClose
}: AIGuideChatPanelProps) {
  const [userGoal, setUserGoal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userGoal.trim() && !isLoading) {
      onRequestGuide(userGoal.trim());
    }
  };

  const handlePresetClick = (preset: string) => {
    setUserGoal(preset);
    onRequestGuide(preset);
  };

  return (
    <div className="flex flex-col h-full bg-panel rounded-md shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">AI ガイド</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          aria-label="閉じる"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message or guide result */}
        {!guide && !error && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              何をしたいですか？目的を入力してください。
            </p>

            {/* Preset buttons */}
            <div className="space-y-2">
              <p className="text-xs text-gray-400">よくある操作:</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_GOALS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    disabled={isLoading}
                    className={clsx(
                      'px-3 py-2 text-sm rounded-md border border-gray-600',
                      'hover:bg-gray-700 transition-colors text-left',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Guide result */}
        {guide && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-md">
              <h3 className="font-semibold mb-2">ガイド: {guide.summary}</h3>

              {/* Prerequisites */}
              {guide.prerequisites && guide.prerequisites.length > 0 && (
                <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-sm">
                  <p className="font-semibold mb-1">前提条件:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {guide.prerequisites.map((prereq, i) => (
                      <li key={i}>{prereq}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2">
                <p className="font-semibold text-sm">手順 ({guide.totalSteps}ステップ):</p>
                <ol className="list-decimal list-inside space-y-2">
                  {guide.steps.map((step) => (
                    <li key={step.stepNumber} className="text-sm">
                      <span className="ml-1">{step.description}</span>
                      {step.notes && (
                        <p className="text-xs text-gray-400 ml-5 mt-1">
                          {step.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Warnings */}
              {guide.warnings && guide.warnings.length > 0 && (
                <div className="mt-3 p-2 bg-orange-900/30 border border-orange-700 rounded text-sm">
                  <p className="font-semibold mb-1">注意:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {guide.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Start guide button */}
            <Button
              onClick={onStartGuide}
              className="w-full"
            >
              ガイドを開始
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="ml-3 text-sm text-gray-300">ガイドを生成中...</p>
          </div>
        )}
      </div>

      {/* Input form */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            value={userGoal}
            onChange={(e) => setUserGoal(e.target.value)}
            placeholder="例: 配信を開始したい"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !userGoal.trim()}
          >
            送信
          </Button>
        </form>
      </div>
    </div>
  );
}
