/**
 * Core types for AI Guide feature
 */

/**
 * Represents a node in the accessibility tree
 */
export type AccessibilityNode = {
  /** ARIA role of the element */
  role: string;
  /** Accessible name of the element */
  name: string;
  /** data-testid attribute value if present */
  testId?: string;
  /** CSS selector to identify the element */
  selector: string;
  /** Whether the element is interactive (button, link, input, etc.) */
  isInteractive: boolean;
  /** Child nodes */
  children: AccessibilityNode[];
  /** Element tag name */
  tagName?: string;
  /** ARIA label */
  ariaLabel?: string;
  /** Element ID */
  id?: string;
};

/**
 * Snapshot of the page's accessibility tree
 */
export type AccessibilityTreeSnapshot = {
  /** Timestamp when the snapshot was taken */
  timestamp: Date;
  /** Current URL */
  url: string;
  /** Root nodes of the accessibility tree */
  nodes: AccessibilityNode[];
};

/**
 * A single step in the guide
 */
export type GuideStep = {
  /** Step number (1-indexed) */
  stepNumber: number;
  /** Description of what the user should do */
  description: string;
  /** Type of action */
  action: 'click' | 'input' | 'navigate' | 'observe';
  /** CSS selector for the target element */
  selector?: string;
  /** Value to input (for 'input' action) */
  value?: string;
  /** Additional context or notes */
  notes?: string;
};

/**
 * Complete guide result from LLM
 */
export type GuideResult = {
  /** List of steps */
  steps: GuideStep[];
  /** Total number of steps */
  totalSteps: number;
  /** Summary of the guide */
  summary: string;
  /** Prerequisites (e.g., "ログインが必要です") */
  prerequisites?: string[];
  /** Warnings or important notes */
  warnings?: string[];
};

/**
 * State for the AI Guide UI
 */
export type AIGuideState = {
  /** Whether the guide is being generated */
  isLoading: boolean;
  /** Current guide result */
  guide: GuideResult | null;
  /** Error message if generation failed */
  error: string | null;
  /** Current step being highlighted (0-indexed) */
  currentStepIndex?: number;
};
