/**
 * DOM Analyzer for extracting accessibility tree information
 */

import type { AccessibilityNode, AccessibilityTreeSnapshot } from './types';
import {
  generateSelector,
  extractAccessibleName,
  isInteractiveElement,
  shouldIncludeElement
} from './utils';

/** Maximum depth to traverse in the DOM tree */
const MAX_DEPTH = 10;

/** Maximum number of nodes to include in the snapshot */
const MAX_NODES = 500;

/** Maximum text length for accessible names */
const MAX_TEXT_LENGTH = 100;

/**
 * Analyze the current page and extract accessibility tree
 */
export function analyzePage(): AccessibilityTreeSnapshot {
  const nodes: AccessibilityNode[] = [];
  const nodeCount = { current: 0 };

  // Start from body's children (skip body itself)
  const body = document.body;
  if (body) {
    const children = Array.from(body.children);
    for (const child of children) {
      const childNode = traverseDOM(child, 0, nodeCount);
      if (childNode) {
        nodes.push(childNode);
      }
    }
  }

  return {
    timestamp: new Date(),
    url: window.location.href,
    nodes
  };
}

/**
 * Recursively traverse the DOM and build accessibility tree
 */
function traverseDOM(
  element: Element,
  depth: number,
  nodeCount: { current: number }
): AccessibilityNode | null {
  // Stop if we've reached max depth or max nodes
  if (depth >= MAX_DEPTH || nodeCount.current >= MAX_NODES) {
    return null;
  }

  // Skip elements that should not be included
  if (!shouldIncludeElement(element)) {
    return null;
  }

  // Extract node information
  const role = getRole(element);
  const name = extractAccessibleName(element);
  const testId = element.getAttribute('data-testid') || undefined;
  const selector = generateSelector(element);
  const interactive = isInteractiveElement(element);
  const tagName = element.tagName.toLowerCase();
  const ariaLabel = element.getAttribute('aria-label') || undefined;
  const id = element.id || undefined;

  // Build node
  const node: AccessibilityNode = {
    role,
    name: name.slice(0, MAX_TEXT_LENGTH),
    testId,
    selector,
    isInteractive: interactive,
    tagName,
    ariaLabel,
    id,
    children: []
  };

  nodeCount.current++;

  // Traverse children
  const children = Array.from(element.children);
  for (const child of children) {
    const childNode = traverseDOM(child, depth + 1, nodeCount);
    if (childNode) {
      node.children.push(childNode);
    }
  }

  return node;
}

/**
 * Get the ARIA role of an element
 */
function getRole(element: Element): string {
  // Explicit role attribute
  const explicitRole = element.getAttribute('role');
  if (explicitRole) {
    return explicitRole;
  }

  // Implicit roles based on HTML semantics
  const tagName = element.tagName.toLowerCase();
  const roleMap: Record<string, string> = {
    button: 'button',
    a: 'link',
    nav: 'navigation',
    main: 'main',
    header: 'banner',
    footer: 'contentinfo',
    aside: 'complementary',
    article: 'article',
    section: 'region',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading',
    ul: 'list',
    ol: 'list',
    li: 'listitem',
    input: getInputRole(element as HTMLInputElement),
    select: 'combobox',
    textarea: 'textbox'
  };

  return roleMap[tagName] || 'generic';
}

/**
 * Get role for input elements based on type
 */
function getInputRole(element: HTMLInputElement): string {
  const type = element.type;
  const typeRoleMap: Record<string, string> = {
    button: 'button',
    submit: 'button',
    reset: 'button',
    checkbox: 'checkbox',
    radio: 'radio',
    text: 'textbox',
    email: 'textbox',
    password: 'textbox',
    search: 'searchbox',
    tel: 'textbox',
    url: 'textbox'
  };

  return typeRoleMap[type] || 'textbox';
}

/**
 * Serialize the accessibility tree for LLM consumption
 * Returns a simplified, compact representation
 */
export function serializeAccessibilityTree(snapshot: AccessibilityTreeSnapshot): string {
  const lines: string[] = [];

  lines.push(`URL: ${snapshot.url}`);
  lines.push(`Timestamp: ${snapshot.timestamp.toISOString()}`);
  lines.push('');
  lines.push('Accessibility Tree:');

  function serializeNode(node: AccessibilityNode, indent: string = ''): void {
    const parts: string[] = [];

    // Role and name
    parts.push(`${node.role}`);
    if (node.name) {
      parts.push(`"${node.name}"`);
    }

    // Test ID (most important for selection)
    if (node.testId) {
      parts.push(`[testId="${node.testId}"]`);
    }

    // Selector
    if (node.isInteractive) {
      parts.push(`{${node.selector}}`);
    }

    lines.push(`${indent}- ${parts.join(' ')}`);

    // Recursively serialize children
    for (const child of node.children) {
      serializeNode(child, indent + '  ');
    }
  }

  for (const node of snapshot.nodes) {
    serializeNode(node);
  }

  return lines.join('\n');
}

/**
 * Find nodes by test ID
 */
export function findNodeByTestId(
  snapshot: AccessibilityTreeSnapshot,
  testId: string
): AccessibilityNode | null {
  function search(node: AccessibilityNode): AccessibilityNode | null {
    if (node.testId === testId) {
      return node;
    }

    for (const child of node.children) {
      const found = search(child);
      if (found) {
        return found;
      }
    }

    return null;
  }

  for (const node of snapshot.nodes) {
    const found = search(node);
    if (found) {
      return found;
    }
  }

  return null;
}
