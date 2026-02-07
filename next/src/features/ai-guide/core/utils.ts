/**
 * Utility functions for AI Guide
 */

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 500); // Limit length
}

/**
 * Mask sensitive information in text content
 * Detects and masks potential tokens, API keys, and other credentials
 */
export function maskSensitiveData(text: string): string {
  if (!text) {
    return text;
  }

  let masked = text;

  // Pattern 1: OpenAI API keys (sk-...)
  masked = masked.replace(/sk-[a-zA-Z0-9]{20,}/g, '[MASKED_API_KEY]');

  // Pattern 2: JWT tokens (long base64 strings with dots)
  masked = masked.replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '[MASKED_TOKEN]');

  // Pattern 3: Generic long alphanumeric strings (potential tokens/secrets)
  // Only mask if 32+ characters and looks like a token (high entropy)
  masked = masked.replace(/\b[a-zA-Z0-9]{32,}\b/g, (match) => {
    // Check if it looks like a random token (has both letters and numbers)
    const hasLetters = /[a-zA-Z]/.test(match);
    const hasNumbers = /[0-9]/.test(match);
    if (hasLetters && hasNumbers) {
      return '[MASKED_TOKEN]';
    }
    return match;
  });

  // Pattern 4: Common secret prefixes
  masked = masked.replace(/\b(api[_-]?key|secret|token|password|auth)[:\s=]+[a-zA-Z0-9_-]{16,}/gi, '[MASKED_CREDENTIAL]');

  return masked;
}

/**
 * Generate a stable CSS selector for an element
 * Priority: data-testid > id > aria-label+tag > role+name > parent-relative path
 * Avoids nth-child selectors which are fragile and break easily
 */
export function generateSelector(element: Element): string {
  // Priority 1: data-testid (most stable)
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  // Priority 2: ID
  const id = element.id;
  if (id) {
    return `#${id}`;
  }

  // Priority 3: aria-label + tag
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    const tagName = element.tagName.toLowerCase();
    const selector = `${tagName}[aria-label="${ariaLabel}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Priority 4: role + unique text
  const role = element.getAttribute('role');
  if (role) {
    const name = extractAccessibleName(element);
    if (name) {
      const selector = `[role="${role}"]`;
      // Check if role alone is unique
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  // Priority 5: Build stable path from nearest identifiable ancestor
  return buildStablePathSelector(element);
}

/**
 * Build a selector path from the nearest identifiable ancestor
 * Avoids nth-child by using tag + attributes to narrow down
 */
function buildStablePathSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    const testId = current.getAttribute('data-testid');
    if (testId) {
      parts.unshift(`[data-testid="${testId}"]`);
      break;
    }

    const id = current.id;
    if (id) {
      parts.unshift(`#${id}`);
      break;
    }

    const tagName = current.tagName.toLowerCase();
    const ariaLabel = current.getAttribute('aria-label');
    if (ariaLabel) {
      parts.unshift(`${tagName}[aria-label="${ariaLabel}"]`);
      break;
    }

    // Use tag name only (no nth-child)
    parts.unshift(tagName);
    current = current.parentElement;
  }

  const selector = parts.join(' > ');

  // Verify the selector matches uniquely
  try {
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  } catch {
    // Invalid selector
  }

  // Fallback: just the tag name
  return element.tagName.toLowerCase();
}

/**
 * Extract accessible name from an element
 * Following ARIA spec: aria-label > aria-labelledby > text content
 * Masks sensitive information before returning
 */
export function extractAccessibleName(element: Element): string {
  let name = '';

  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    name = ariaLabel.trim();
    return maskSensitiveData(name);
  }

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) {
      name = labelElement.textContent?.trim() || '';
      return maskSensitiveData(name);
    }
  }

  // For buttons and links, use text content
  const textContent = element.textContent?.trim() || '';
  if (textContent.length > 0 && textContent.length <= 100) {
    return maskSensitiveData(textContent);
  }

  // For inputs, use placeholder or label
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const placeholder = element.placeholder;
    if (placeholder) {
      return maskSensitiveData(placeholder);
    }

    // Find associated label
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        name = label.textContent?.trim() || '';
        return maskSensitiveData(name);
      }
    }
  }

  return '';
}

/**
 * Check if an element is interactive
 */
export function isInteractiveElement(element: Element): boolean {
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
  const tagName = element.tagName.toLowerCase();

  if (interactiveTags.includes(tagName)) {
    return true;
  }

  // Check for role
  const role = element.getAttribute('role');
  const interactiveRoles = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'slider'];

  return role ? interactiveRoles.includes(role) : false;
}

/**
 * Check if an element should be included in the accessibility tree
 */
export function shouldIncludeElement(element: Element): boolean {
  // Skip hidden elements
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  // Skip display:none and visibility:hidden
  if (element instanceof HTMLElement) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
  }

  // Include interactive elements
  if (isInteractiveElement(element)) {
    return true;
  }

  // Include elements with semantic roles
  const role = element.getAttribute('role');
  const semanticRoles = [
    'navigation', 'main', 'banner', 'contentinfo', 'complementary',
    'article', 'section', 'heading', 'list', 'listitem'
  ];

  if (role && semanticRoles.includes(role)) {
    return true;
  }

  // Include semantic HTML elements
  const semanticTags = ['nav', 'main', 'header', 'footer', 'aside', 'article', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  return semanticTags.includes(element.tagName.toLowerCase());
}
