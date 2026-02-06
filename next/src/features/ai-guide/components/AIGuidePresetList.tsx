/**
 * AIGuidePresetList - Displays preset goal options
 */

'use client';

import clsx from 'clsx';

/**
 * Common preset goals
 */
const PRESET_GOALS = [
  '配信を開始したい',
  '視聴URLを取得したい',
  'チャンネルを作成したい',
  '配信IDを生成したい'
];

type AIGuidePresetListProps = {
  onSelect: (goal: string) => void;
  isLoading: boolean;
};

/**
 * Component for displaying preset goal buttons
 */
export function AIGuidePresetList({
  onSelect,
  isLoading
}: AIGuidePresetListProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-300">
        よくある操作を選択するか、直接入力してください
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRESET_GOALS.map((preset) => (
          <button
            key={preset}
            onClick={() => onSelect(preset)}
            disabled={isLoading}
            className={clsx(
              'px-3 py-2 text-sm text-left',
              'rounded-md border border-gray-600',
              'bg-transparent hover:bg-gray-700',
              'transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
