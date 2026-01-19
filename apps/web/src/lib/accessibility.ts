/**
 * WCAG 2.2 AAA Accessibility Utilities
 *
 * Comprehensive accessibility utilities for ensuring WCAG 2.2 AAA compliance.
 * Includes color contrast calculation, ARIA helpers, keyboard navigation,
 * screen reader support, and accessibility testing utilities.
 */

// ============================================================================
// TYPES
// ============================================================================

export type WCAGLevel = "A" | "AA" | "AAA";

export type ColorContrastResult = {
  ratio: number;
  level: WCAGLevel | "fail";
  passesAA: boolean;
  passesAAA: boolean;
  normalTextAA: boolean;
  normalTextAAA: boolean;
  largeTextAA: boolean;
  largeTextAAA: boolean;
};

export type AriaRole =
  | "alert"
  | "alertdialog"
  | "application"
  | "article"
  | "banner"
  | "button"
  | "cell"
  | "checkbox"
  | "columnheader"
  | "combobox"
  | "complementary"
  | "contentinfo"
  | "definition"
  | "dialog"
  | "directory"
  | "document"
  | "feed"
  | "figure"
  | "form"
  | "grid"
  | "gridcell"
  | "group"
  | "heading"
  | "img"
  | "link"
  | "list"
  | "listbox"
  | "listitem"
  | "log"
  | "main"
  | "marquee"
  | "math"
  | "menu"
  | "menubar"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "navigation"
  | "none"
  | "note"
  | "option"
  | "presentation"
  | "progressbar"
  | "radio"
  | "radiogroup"
  | "region"
  | "row"
  | "rowgroup"
  | "rowheader"
  | "scrollbar"
  | "search"
  | "searchbox"
  | "separator"
  | "slider"
  | "spinbutton"
  | "status"
  | "switch"
  | "tab"
  | "table"
  | "tablist"
  | "tabpanel"
  | "term"
  | "textbox"
  | "timer"
  | "toolbar"
  | "tooltip"
  | "tree"
  | "treegrid"
  | "treeitem";

export type FocusableElement =
  | HTMLAnchorElement
  | HTMLAreaElement
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLElement;

export type LiveRegionPoliteness = "off" | "polite" | "assertive";

export type A11yAuditIssue = {
  type:
    | "contrast"
    | "aria"
    | "keyboard"
    | "focus"
    | "landmark"
    | "heading"
    | "alt-text"
    | "label";
  severity: "error" | "warning" | "info";
  element?: Element;
  message: string;
  wcagCriteria?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/** WCAG minimum contrast ratio for normal text (AA) */
export const WCAG_AA_NORMAL_TEXT = 4.5;

/** WCAG minimum contrast ratio for large text (AA) */
export const WCAG_AA_LARGE_TEXT = 3;

/** WCAG minimum contrast ratio for normal text (AAA) */
export const WCAG_AAA_NORMAL_TEXT = 7;

/** WCAG minimum contrast ratio for large text (AAA) */
export const WCAG_AAA_LARGE_TEXT = 4.5;

/** Minimum touch target size in pixels (WCAG 2.5.5 AAA) */
export const MIN_TOUCH_TARGET_SIZE = 44;

/** Recommended focus indicator width */
export const FOCUS_INDICATOR_WIDTH = 2;

/** Default debounce time for live region updates (ms) */
export const LIVE_REGION_DEBOUNCE = 150;

/** Focusable element selector */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
  "details > summary",
  "audio[controls]",
  "video[controls]",
].join(", ");

/** Skip link target selector */
export const SKIP_LINK_TARGET = "#main-content";

// ============================================================================
// COLOR CONTRAST UTILITIES
// ============================================================================

/**
 * Parse a hex color string to RGB values
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "");

  // Validate that the string only contains valid hex characters
  if (!/^[0-9A-Fa-f]+$/.test(cleaned)) {
    return null;
  }

  if (cleaned.length === 3) {
    const c0 = cleaned[0] ?? "0";
    const c1 = cleaned[1] ?? "0";
    const c2 = cleaned[2] ?? "0";
    const r = parseInt(c0 + c0, 16);
    const g = parseInt(c1 + c1, 16);
    const b = parseInt(c2 + c2, 16);
    return { r, g, b };
  }

  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
}

/**
 * Convert RGB to relative luminance per WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(r: number, g: number, b: number): number {
  const values = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  const rs = values[0] ?? 0;
  const gs = values[1] ?? 0;
  const bs = values[2] ?? 0;
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 (no contrast) and 21 (max contrast)
 */
export function getContrastRatio(
  foreground: string,
  background: string
): number {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) {
    return 0;
  }

  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check color contrast against WCAG criteria
 */
export function checkColorContrast(
  foreground: string,
  background: string
): ColorContrastResult {
  const ratio = getContrastRatio(foreground, background);

  return {
    ratio: Math.round(ratio * 100) / 100,
    level:
      ratio >= WCAG_AAA_NORMAL_TEXT
        ? "AAA"
        : ratio >= WCAG_AA_NORMAL_TEXT
          ? "AA"
          : ratio >= WCAG_AA_LARGE_TEXT
            ? "A"
            : "fail",
    passesAA: ratio >= WCAG_AA_NORMAL_TEXT,
    passesAAA: ratio >= WCAG_AAA_NORMAL_TEXT,
    normalTextAA: ratio >= WCAG_AA_NORMAL_TEXT,
    normalTextAAA: ratio >= WCAG_AAA_NORMAL_TEXT,
    largeTextAA: ratio >= WCAG_AA_LARGE_TEXT,
    largeTextAAA: ratio >= WCAG_AAA_LARGE_TEXT,
  };
}

/**
 * Find a color that meets AAA contrast with the given background
 */
export function findAccessibleColor(
  baseColor: string,
  background: string,
  targetRatio: number = WCAG_AAA_NORMAL_TEXT
): string {
  const base = hexToRgb(baseColor);
  const bg = hexToRgb(background);

  if (!base || !bg) {
    return baseColor;
  }

  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);

  // Determine if we need to lighten or darken
  const shouldDarken = bgLuminance > 0.5;

  let { r, g, b } = base;
  let iterations = 0;
  const maxIterations = 255;

  while (iterations < maxIterations) {
    const currentRatio = getContrastRatio(
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
      background
    );

    if (currentRatio >= targetRatio) {
      break;
    }

    if (shouldDarken) {
      r = Math.max(0, r - 1);
      g = Math.max(0, g - 1);
      b = Math.max(0, b - 1);
    } else {
      r = Math.min(255, r + 1);
      g = Math.min(255, g + 1);
      b = Math.min(255, b + 1);
    }

    iterations++;
  }

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ============================================================================
// ARIA HELPERS
// ============================================================================

/**
 * Generate a unique ID for ARIA relationships
 */
export function generateAriaId(prefix: string = "a11y"): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create ARIA attributes for a describedby relationship
 */
export function createAriaDescribedBy(
  ...ids: (string | undefined | null)[]
): string | undefined {
  const validIds = ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );
  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

/**
 * Create ARIA attributes for a labelledby relationship
 */
export function createAriaLabelledBy(
  ...ids: (string | undefined | null)[]
): string | undefined {
  const validIds = ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );
  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

/**
 * Get appropriate ARIA role for semantic meaning
 */
export function getAriaRole(
  element: string,
  interactive: boolean = false
): AriaRole | undefined {
  const roleMap: Record<string, AriaRole> = {
    nav: "navigation",
    header: "banner",
    footer: "contentinfo",
    main: "main",
    aside: "complementary",
    section: "region",
    article: "article",
    form: "form",
  };

  if (interactive) {
    const interactiveRoleMap: Record<string, AriaRole> = {
      button: "button",
      link: "link",
      checkbox: "checkbox",
      radio: "radio",
      slider: "slider",
      switch: "switch",
      textbox: "textbox",
      combobox: "combobox",
      listbox: "listbox",
      menu: "menu",
      menuitem: "menuitem",
      tab: "tab",
      tabpanel: "tabpanel",
      dialog: "dialog",
      alertdialog: "alertdialog",
    };
    return interactiveRoleMap[element];
  }

  return roleMap[element];
}

/**
 * Create attributes for an expandable element
 */
export function createExpandableAttributes(
  isExpanded: boolean,
  controlsId: string
): Record<string, string | boolean> {
  return {
    "aria-expanded": isExpanded,
    "aria-controls": controlsId,
  };
}

/**
 * Create attributes for a current/selected element
 */
export function createCurrentAttributes(
  isCurrent: boolean,
  type: "page" | "step" | "location" | "date" | "time" | "true" = "page"
): Record<string, string | undefined> {
  return {
    "aria-current": isCurrent ? type : undefined,
  };
}

/**
 * Create attributes for a loading state
 */
export function createBusyAttributes(
  isBusy: boolean
): Record<string, boolean | string> {
  return {
    "aria-busy": isBusy,
    "aria-live": isBusy ? "polite" : "off",
  };
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

/**
 * Check if an element is focusable
 */
export function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  // Check if element matches focusable selector
  if (!element.matches(FOCUSABLE_SELECTOR)) {
    return false;
  }

  // Check if element is visible
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  // Check if element has dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: HTMLElement = document.body
): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  return elements.filter(isFocusable);
}

/**
 * Trap focus within a container (for modals/dialogs)
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  let previouslyFocused: HTMLElement | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusable[0]!;
    const lastElement = focusable[focusable.length - 1]!;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return {
    activate: () => {
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleKeyDown);
      const focusable = getFocusableElements(container);
      if (focusable.length > 0 && focusable[0]) {
        focusable[0].focus();
      }
    },
    deactivate: () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused) {
        previouslyFocused.focus();
      }
    },
  };
}

/**
 * Navigate between elements using arrow keys (for lists, menus, etc.)
 */
export function handleArrowKeyNavigation(
  event: KeyboardEvent,
  elements: HTMLElement[],
  currentIndex: number,
  options: {
    vertical?: boolean;
    horizontal?: boolean;
    wrap?: boolean;
  } = {}
): number {
  const { vertical = true, horizontal = false, wrap = true } = options;
  const length = elements.length;
  let newIndex = currentIndex;

  const isNext =
    (vertical && event.key === "ArrowDown") ||
    (horizontal && event.key === "ArrowRight");
  const isPrev =
    (vertical && event.key === "ArrowUp") ||
    (horizontal && event.key === "ArrowLeft");
  const isHome = event.key === "Home";
  const isEnd = event.key === "End";

  if (isNext) {
    event.preventDefault();
    newIndex = wrap
      ? (currentIndex + 1) % length
      : Math.min(currentIndex + 1, length - 1);
  } else if (isPrev) {
    event.preventDefault();
    newIndex = wrap
      ? (currentIndex - 1 + length) % length
      : Math.max(currentIndex - 1, 0);
  } else if (isHome) {
    event.preventDefault();
    newIndex = 0;
  } else if (isEnd) {
    event.preventDefault();
    newIndex = length - 1;
  }

  const targetElement = elements[newIndex];
  if (newIndex !== currentIndex && targetElement) {
    targetElement.focus();
  }

  return newIndex;
}

/**
 * Handle roving tabindex for composite widgets
 */
export function updateRovingTabindex(
  elements: HTMLElement[],
  activeIndex: number
): void {
  elements.forEach((element, index) => {
    element.setAttribute("tabindex", index === activeIndex ? "0" : "-1");
  });
}

// ============================================================================
// SCREEN READER SUPPORT
// ============================================================================

let liveRegionElement: HTMLElement | null = null;

/**
 * Get or create the live region element for announcements
 */
export function getLiveRegion(): HTMLElement {
  if (!liveRegionElement) {
    liveRegionElement = document.createElement("div");
    liveRegionElement.setAttribute("aria-live", "polite");
    liveRegionElement.setAttribute("aria-atomic", "true");
    liveRegionElement.setAttribute("role", "status");
    liveRegionElement.className = "sr-only";
    liveRegionElement.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegionElement);
  }
  return liveRegionElement;
}

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  politeness: LiveRegionPoliteness = "polite"
): void {
  const region = getLiveRegion();
  region.setAttribute("aria-live", politeness);

  // Clear and set message to trigger announcement
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, LIVE_REGION_DEBOUNCE);
}

/**
 * Announce an assertive (interrupt) message
 */
export function announceAssertive(message: string): void {
  announceToScreenReader(message, "assertive");
}

/**
 * Create screen reader only text (visually hidden)
 */
export function getSrOnlyStyles(): React.CSSProperties {
  return {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  };
}

// ============================================================================
// ACCESSIBILITY AUDIT
// ============================================================================

/**
 * Check for missing alt text on images
 */
export function auditImages(
  container: HTMLElement = document.body
): A11yAuditIssue[] {
  const issues: A11yAuditIssue[] = [];
  const images = container.querySelectorAll("img");

  images.forEach((img) => {
    if (!img.hasAttribute("alt")) {
      issues.push({
        type: "alt-text",
        severity: "error",
        element: img,
        message: "Image is missing alt attribute",
        wcagCriteria: "1.1.1 Non-text Content",
      });
    } else if (img.alt === "" && !img.hasAttribute("role")) {
      // Empty alt without role="presentation" might need review
      issues.push({
        type: "alt-text",
        severity: "warning",
        element: img,
        message:
          'Image has empty alt text. If decorative, add role="presentation"',
        wcagCriteria: "1.1.1 Non-text Content",
      });
    }
  });

  return issues;
}

/**
 * Check for missing form labels
 */
export function auditFormLabels(
  container: HTMLElement = document.body
): A11yAuditIssue[] {
  const issues: A11yAuditIssue[] = [];
  const inputs = container.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
  );

  inputs.forEach((input) => {
    const id = input.id;
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.hasAttribute("aria-label");
    const hasAriaLabelledBy = input.hasAttribute("aria-labelledby");
    const hasTitle = input.hasAttribute("title");

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      issues.push({
        type: "label",
        severity: "error",
        element: input,
        message: "Form input is missing an accessible label",
        wcagCriteria: "1.3.1 Info and Relationships",
      });
    }
  });

  return issues;
}

/**
 * Check heading hierarchy
 */
export function auditHeadingHierarchy(
  container: HTMLElement = document.body
): A11yAuditIssue[] {
  const issues: A11yAuditIssue[] = [];
  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let previousLevel = 0;

  headings.forEach((heading) => {
    const levelChar = heading.tagName[1] ?? "0";
    const level = parseInt(levelChar, 10);

    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push({
        type: "heading",
        severity: "warning",
        element: heading,
        message: `Heading level skipped from h${previousLevel} to h${level}`,
        wcagCriteria: "1.3.1 Info and Relationships",
      });
    }

    previousLevel = level;
  });

  // Check for multiple h1s
  const h1Count = container.querySelectorAll("h1").length;
  if (h1Count > 1) {
    issues.push({
      type: "heading",
      severity: "warning",
      message: `Multiple h1 elements found (${h1Count}). Consider using only one h1 per page`,
      wcagCriteria: "1.3.1 Info and Relationships",
    });
  }

  return issues;
}

/**
 * Check for landmark regions
 */
export function auditLandmarks(
  container: HTMLElement = document.body
): A11yAuditIssue[] {
  const issues: A11yAuditIssue[] = [];

  const hasMain = container.querySelector("main, [role='main']") !== null;
  const hasNav = container.querySelector("nav, [role='navigation']") !== null;
  const hasBanner = container.querySelector("header, [role='banner']") !== null;
  const hasContentinfo =
    container.querySelector("footer, [role='contentinfo']") !== null;

  if (!hasMain) {
    issues.push({
      type: "landmark",
      severity: "warning",
      message: "Page is missing a main landmark region",
      wcagCriteria: "1.3.1 Info and Relationships",
    });
  }

  if (!hasNav) {
    issues.push({
      type: "landmark",
      severity: "info",
      message: "Page is missing a navigation landmark region",
      wcagCriteria: "1.3.1 Info and Relationships",
    });
  }

  if (!hasBanner) {
    issues.push({
      type: "landmark",
      severity: "info",
      message: "Page is missing a banner/header landmark region",
      wcagCriteria: "1.3.1 Info and Relationships",
    });
  }

  if (!hasContentinfo) {
    issues.push({
      type: "landmark",
      severity: "info",
      message: "Page is missing a contentinfo/footer landmark region",
      wcagCriteria: "1.3.1 Info and Relationships",
    });
  }

  return issues;
}

/**
 * Check interactive elements for keyboard accessibility
 */
export function auditKeyboardAccessibility(
  container: HTMLElement = document.body
): A11yAuditIssue[] {
  const issues: A11yAuditIssue[] = [];

  // Check for click handlers without keyboard support
  const clickableElements = container.querySelectorAll("[onclick]");
  clickableElements.forEach((element) => {
    if (
      !element.hasAttribute("tabindex") &&
      !element.matches("a, button, input, select, textarea")
    ) {
      issues.push({
        type: "keyboard",
        severity: "error",
        element,
        message:
          "Clickable element is not keyboard accessible. Add tabindex and keyboard handlers",
        wcagCriteria: "2.1.1 Keyboard",
      });
    }
  });

  // Check for positive tabindex (not recommended)
  const positiveTabindex = container.querySelectorAll("[tabindex]");
  positiveTabindex.forEach((element) => {
    const tabindex = parseInt(element.getAttribute("tabindex") || "0", 10);
    if (tabindex > 0) {
      issues.push({
        type: "keyboard",
        severity: "warning",
        element,
        message: `Positive tabindex (${tabindex}) found. Use 0 or -1 instead`,
        wcagCriteria: "2.4.3 Focus Order",
      });
    }
  });

  return issues;
}

/**
 * Run a full accessibility audit
 */
export function runAccessibilityAudit(
  container: HTMLElement = document.body
): A11yAuditIssue[] {
  return [
    ...auditImages(container),
    ...auditFormLabels(container),
    ...auditHeadingHierarchy(container),
    ...auditLandmarks(container),
    ...auditKeyboardAccessibility(container),
  ];
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Get visible focus indicator styles (WCAG 2.4.7 AAA)
 */
export function getFocusIndicatorStyles(): React.CSSProperties {
  return {
    outline: `${FOCUS_INDICATOR_WIDTH}px solid currentColor`,
    outlineOffset: "2px",
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/**
 * Create skip link functionality
 */
export function skipToMainContent(): void {
  const main = document.querySelector<HTMLElement>(
    SKIP_LINK_TARGET + ", main, [role='main']"
  );
  if (main) {
    main.setAttribute("tabindex", "-1");
    main.focus();
    main.scrollIntoView({ behavior: "smooth" });
  }
}

// ============================================================================
// TOUCH TARGET SIZE
// ============================================================================

/**
 * Check if an element meets minimum touch target size
 */
export function meetsMinimumTouchTarget(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.width >= MIN_TOUCH_TARGET_SIZE && rect.height >= MIN_TOUCH_TARGET_SIZE
  );
}

/**
 * Get styles to ensure minimum touch target size
 */
export function getMinTouchTargetStyles(): React.CSSProperties {
  return {
    minWidth: `${MIN_TOUCH_TARGET_SIZE}px`,
    minHeight: `${MIN_TOUCH_TARGET_SIZE}px`,
  };
}

// ============================================================================
// UTILITY HOOKS SUPPORT
// ============================================================================

/**
 * Generate unique IDs for form field relationships
 */
export function createFieldIds(baseName: string): {
  inputId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
} {
  const id = generateAriaId(baseName);
  return {
    inputId: `${id}-input`,
    labelId: `${id}-label`,
    descriptionId: `${id}-description`,
    errorId: `${id}-error`,
  };
}

/**
 * Create ARIA attributes for a form field
 */
export function createFieldAriaAttributes(options: {
  labelId?: string;
  descriptionId?: string;
  errorId?: string;
  hasError?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}): Record<string, string | boolean | undefined> {
  const {
    labelId,
    descriptionId,
    errorId,
    hasError = false,
    required = false,
    disabled = false,
    readOnly = false,
  } = options;

  const describedByIds: string[] = [];
  if (descriptionId) describedByIds.push(descriptionId);
  if (hasError && errorId) describedByIds.push(errorId);

  return {
    "aria-labelledby": labelId,
    "aria-describedby":
      describedByIds.length > 0 ? describedByIds.join(" ") : undefined,
    "aria-invalid": hasError || undefined,
    "aria-required": required || undefined,
    "aria-disabled": disabled || undefined,
    "aria-readonly": readOnly || undefined,
  };
}

// Import React types for proper typing
import type * as React from "react";
