/**
 * AI Guide Feature - Public API
 */

// Components
export { AIGuideButton } from './components/AIGuideButton';

// Types (for consumers who need them)
export type {
  AccessibilityNode,
  AccessibilityTreeSnapshot,
  GuideStep,
  GuideResult,
  AIGuideState
} from './core/types';

// Hooks
export { useAIGuide } from './hooks/useAIGuide';

// Server Actions
export { generateGuide, checkAIGuideAvailability } from './actions/guideActions';
