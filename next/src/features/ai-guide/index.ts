/**
 * AI Guide Feature - Public API
 */

// Components
export { AIGuideSearchBar } from './components/AIGuideSearchBar';

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
