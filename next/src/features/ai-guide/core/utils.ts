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
 * Generate a stable CSS selector for an element
 * Priority: data-testid > id > unique class > tag + nth-child
 */
export function generateSelector(element: Element): string {
  // Priority 1: data-testid
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  // Priority 2: ID
  const id = element.id;
  if (id) {
    return `#${id}`;
  }

  // Priority 3: Unique class
  const classes = Array.from(element.classList);
  if (classes.length > 0) {
    const classSelector = `.${classes.join('.')}`;
    if (document.querySelectorAll(classSelector).length === 1) {
      return classSelector;
    }
  }

  // Priority 4: Tag + nth-child
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element) + 1;
    const tagName = element.tagName.toLowerCase();
    return `${tagName}:nth-child(${index})`;
  }

  return element.tagName.toLowerCase();
}

/**
 * Extract accessible name from an element
 * Following ARIA spec: aria-label > aria-labelledby > text content
 */
export function extractAccessibleName(element: Element): string {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel.trim();
  }

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) {
      return labelElement.textContent?.trim() || '';
    }
  }

  // For buttons and links, use text content
  const textContent = element.textContent?.trim() || '';
  if (textContent.length > 0 && textContent.length <= 100) {
    return textContent;
  }

  // For inputs, use placeholder or label
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const placeholder = element.placeholder;
    if (placeholder) {
      return placeholder;
    }

    // Find associated label
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() || '';
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
