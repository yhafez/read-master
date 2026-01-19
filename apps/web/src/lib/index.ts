export {
  // Client and configuration
  queryClient,
  createQueryClient,
  queryKeys,
  // Constants
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
  DEFAULT_RETRY_COUNT,
  // Error handling
  setGlobalErrorHandler,
  type QueryErrorHandler,
} from "./queryClient";

export {
  QueryProvider,
  TestQueryProvider,
  useTestQueryClient,
  type QueryProviderProps,
} from "./QueryProvider";

// Accessibility utilities for WCAG 2.2 AAA compliance
export {
  // Types
  type WCAGLevel,
  type ColorContrastResult,
  type AriaRole,
  type FocusableElement,
  type LiveRegionPoliteness,
  type A11yAuditIssue,
  // Constants
  WCAG_AA_NORMAL_TEXT,
  WCAG_AA_LARGE_TEXT,
  WCAG_AAA_NORMAL_TEXT,
  WCAG_AAA_LARGE_TEXT,
  MIN_TOUCH_TARGET_SIZE,
  FOCUS_INDICATOR_WIDTH,
  LIVE_REGION_DEBOUNCE,
  FOCUSABLE_SELECTOR,
  SKIP_LINK_TARGET,
  // Color contrast utilities
  hexToRgb,
  getLuminance,
  getContrastRatio,
  checkColorContrast,
  findAccessibleColor,
  // ARIA helpers
  generateAriaId,
  createAriaDescribedBy,
  createAriaLabelledBy,
  getAriaRole,
  createExpandableAttributes,
  createCurrentAttributes,
  createBusyAttributes,
  // Keyboard navigation
  isFocusable,
  getFocusableElements,
  createFocusTrap,
  handleArrowKeyNavigation,
  updateRovingTabindex,
  // Screen reader support
  getLiveRegion,
  announceToScreenReader,
  announceAssertive,
  getSrOnlyStyles,
  // Accessibility audit
  auditImages,
  auditFormLabels,
  auditHeadingHierarchy,
  auditLandmarks,
  auditKeyboardAccessibility,
  runAccessibilityAudit,
  // Focus management
  getFocusIndicatorStyles,
  prefersReducedMotion,
  prefersHighContrast,
  skipToMainContent,
  // Touch target
  meetsMinimumTouchTarget,
  getMinTouchTargetStyles,
  // Field utilities
  createFieldIds,
  createFieldAriaAttributes,
} from "./accessibility";
