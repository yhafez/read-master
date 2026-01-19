/**
 * Tests for WCAG 2.2 AAA Accessibility Utilities
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  // Color contrast utilities
  hexToRgb,
  getLuminance,
  getContrastRatio,
  checkColorContrast,
  findAccessibleColor,
  // Constants
  WCAG_AA_NORMAL_TEXT,
  WCAG_AA_LARGE_TEXT,
  WCAG_AAA_NORMAL_TEXT,
  WCAG_AAA_LARGE_TEXT,
  MIN_TOUCH_TARGET_SIZE,
  FOCUS_INDICATOR_WIDTH,
  FOCUSABLE_SELECTOR,
  LIVE_REGION_DEBOUNCE,
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

// ============================================================================
// COLOR CONTRAST TESTS
// ============================================================================

describe("Color Contrast Utilities", () => {
  describe("hexToRgb", () => {
    it("should parse 6-digit hex colors", () => {
      expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb("#FF5733")).toEqual({ r: 255, g: 87, b: 51 });
    });

    it("should parse 3-digit hex colors", () => {
      expect(hexToRgb("#FFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb("#F00")).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("should handle hex without hash", () => {
      expect(hexToRgb("FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("FFF")).toEqual({ r: 255, g: 255, b: 255 });
    });

    it("should return null for invalid hex", () => {
      expect(hexToRgb("invalid")).toBeNull();
      expect(hexToRgb("#GGGGGG")).toBeNull();
      expect(hexToRgb("#12")).toBeNull();
    });
  });

  describe("getLuminance", () => {
    it("should calculate luminance for white", () => {
      const luminance = getLuminance(255, 255, 255);
      expect(luminance).toBeCloseTo(1, 2);
    });

    it("should calculate luminance for black", () => {
      const luminance = getLuminance(0, 0, 0);
      expect(luminance).toBe(0);
    });

    it("should calculate luminance for red", () => {
      const luminance = getLuminance(255, 0, 0);
      expect(luminance).toBeCloseTo(0.2126, 2);
    });

    it("should calculate luminance for mid-gray", () => {
      const luminance = getLuminance(128, 128, 128);
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(1);
    });
  });

  describe("getContrastRatio", () => {
    it("should return 21:1 for black on white", () => {
      const ratio = getContrastRatio("#000000", "#FFFFFF");
      expect(ratio).toBeCloseTo(21, 0);
    });

    it("should return 1:1 for same colors", () => {
      const ratio = getContrastRatio("#FFFFFF", "#FFFFFF");
      expect(ratio).toBe(1);
    });

    it("should return 0 for invalid colors", () => {
      const ratio = getContrastRatio("invalid", "#FFFFFF");
      expect(ratio).toBe(0);
    });

    it("should calculate correctly regardless of order", () => {
      const ratio1 = getContrastRatio("#000000", "#FFFFFF");
      const ratio2 = getContrastRatio("#FFFFFF", "#000000");
      expect(ratio1).toBe(ratio2);
    });
  });

  describe("checkColorContrast", () => {
    it("should pass AAA for black on white", () => {
      const result = checkColorContrast("#000000", "#FFFFFF");
      expect(result.passesAAA).toBe(true);
      expect(result.passesAA).toBe(true);
      expect(result.level).toBe("AAA");
    });

    it("should pass AA but fail AAA for medium contrast", () => {
      // ~4.5:1 contrast
      const result = checkColorContrast("#767676", "#FFFFFF");
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(false);
      expect(result.level).toBe("AA");
    });

    it("should fail for low contrast", () => {
      const result = checkColorContrast("#CCCCCC", "#FFFFFF");
      expect(result.passesAA).toBe(false);
      expect(result.level).toBe("fail");
    });

    it("should return correct large text criteria", () => {
      const result = checkColorContrast("#000000", "#FFFFFF");
      expect(result.largeTextAA).toBe(true);
      expect(result.largeTextAAA).toBe(true);
      expect(result.normalTextAA).toBe(true);
      expect(result.normalTextAAA).toBe(true);
    });
  });

  describe("findAccessibleColor", () => {
    it("should return original color if already accessible", () => {
      const result = findAccessibleColor("#000000", "#FFFFFF");
      expect(getContrastRatio(result, "#FFFFFF")).toBeGreaterThanOrEqual(
        WCAG_AAA_NORMAL_TEXT
      );
    });

    it("should darken color on light background", () => {
      const result = findAccessibleColor("#CCCCCC", "#FFFFFF");
      expect(getContrastRatio(result, "#FFFFFF")).toBeGreaterThanOrEqual(
        WCAG_AAA_NORMAL_TEXT
      );
    });

    it("should lighten color on dark background", () => {
      const result = findAccessibleColor("#333333", "#000000");
      expect(getContrastRatio(result, "#000000")).toBeGreaterThanOrEqual(
        WCAG_AAA_NORMAL_TEXT
      );
    });
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe("Accessibility Constants", () => {
  it("should have correct WCAG contrast ratios", () => {
    expect(WCAG_AA_NORMAL_TEXT).toBe(4.5);
    expect(WCAG_AA_LARGE_TEXT).toBe(3);
    expect(WCAG_AAA_NORMAL_TEXT).toBe(7);
    expect(WCAG_AAA_LARGE_TEXT).toBe(4.5);
  });

  it("should have correct touch target size", () => {
    expect(MIN_TOUCH_TARGET_SIZE).toBe(44);
  });

  it("should have correct focus indicator width", () => {
    expect(FOCUS_INDICATOR_WIDTH).toBe(2);
  });

  it("should have correct live region debounce", () => {
    expect(LIVE_REGION_DEBOUNCE).toBe(150);
  });

  it("should have comprehensive focusable selector", () => {
    expect(FOCUSABLE_SELECTOR).toContain("a[href]");
    expect(FOCUSABLE_SELECTOR).toContain("button:not([disabled])");
    expect(FOCUSABLE_SELECTOR).toContain("input:not([disabled])");
    expect(FOCUSABLE_SELECTOR).toContain("[tabindex]");
  });
});

// ============================================================================
// ARIA HELPERS TESTS
// ============================================================================

describe("ARIA Helpers", () => {
  describe("generateAriaId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateAriaId();
      const id2 = generateAriaId();
      expect(id1).not.toBe(id2);
    });

    it("should use custom prefix", () => {
      const id = generateAriaId("custom");
      expect(id.startsWith("custom-")).toBe(true);
    });

    it("should use default prefix", () => {
      const id = generateAriaId();
      expect(id.startsWith("a11y-")).toBe(true);
    });
  });

  describe("createAriaDescribedBy", () => {
    it("should join valid IDs", () => {
      const result = createAriaDescribedBy("id1", "id2", "id3");
      expect(result).toBe("id1 id2 id3");
    });

    it("should filter out null and undefined", () => {
      const result = createAriaDescribedBy("id1", null, undefined, "id2");
      expect(result).toBe("id1 id2");
    });

    it("should return undefined for no valid IDs", () => {
      const result = createAriaDescribedBy(null, undefined, "");
      expect(result).toBeUndefined();
    });
  });

  describe("createAriaLabelledBy", () => {
    it("should join valid IDs", () => {
      const result = createAriaLabelledBy("label1", "label2");
      expect(result).toBe("label1 label2");
    });

    it("should filter out empty strings", () => {
      const result = createAriaLabelledBy("label1", "", "label2");
      expect(result).toBe("label1 label2");
    });
  });

  describe("getAriaRole", () => {
    it("should return landmark roles", () => {
      expect(getAriaRole("nav")).toBe("navigation");
      expect(getAriaRole("header")).toBe("banner");
      expect(getAriaRole("footer")).toBe("contentinfo");
      expect(getAriaRole("main")).toBe("main");
    });

    it("should return interactive roles when specified", () => {
      expect(getAriaRole("button", true)).toBe("button");
      expect(getAriaRole("checkbox", true)).toBe("checkbox");
      expect(getAriaRole("dialog", true)).toBe("dialog");
    });

    it("should return undefined for unknown elements", () => {
      expect(getAriaRole("div")).toBeUndefined();
      expect(getAriaRole("unknown")).toBeUndefined();
    });
  });

  describe("createExpandableAttributes", () => {
    it("should create expanded attributes", () => {
      const result = createExpandableAttributes(true, "panel-1");
      expect(result["aria-expanded"]).toBe(true);
      expect(result["aria-controls"]).toBe("panel-1");
    });

    it("should create collapsed attributes", () => {
      const result = createExpandableAttributes(false, "panel-1");
      expect(result["aria-expanded"]).toBe(false);
    });
  });

  describe("createCurrentAttributes", () => {
    it("should create current page attribute", () => {
      const result = createCurrentAttributes(true, "page");
      expect(result["aria-current"]).toBe("page");
    });

    it("should create current step attribute", () => {
      const result = createCurrentAttributes(true, "step");
      expect(result["aria-current"]).toBe("step");
    });

    it("should return undefined when not current", () => {
      const result = createCurrentAttributes(false);
      expect(result["aria-current"]).toBeUndefined();
    });
  });

  describe("createBusyAttributes", () => {
    it("should create busy attributes when loading", () => {
      const result = createBusyAttributes(true);
      expect(result["aria-busy"]).toBe(true);
      expect(result["aria-live"]).toBe("polite");
    });

    it("should create idle attributes when not loading", () => {
      const result = createBusyAttributes(false);
      expect(result["aria-busy"]).toBe(false);
      expect(result["aria-live"]).toBe("off");
    });
  });
});

// ============================================================================
// KEYBOARD NAVIGATION TESTS
// ============================================================================

describe("Keyboard Navigation", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("isFocusable", () => {
    // Note: jsdom doesn't provide proper bounding rects, so some tests
    // verify the selector matching rather than full focusability check
    it("should match focusable selector for button", () => {
      const button = document.createElement("button");
      container.appendChild(button);
      expect(button.matches(FOCUSABLE_SELECTOR)).toBe(true);
    });

    it("should return false for disabled elements", () => {
      const button = document.createElement("button");
      button.disabled = true;
      container.appendChild(button);
      expect(isFocusable(button)).toBe(false);
    });

    it("should return false for hidden elements", () => {
      const button = document.createElement("button");
      button.style.display = "none";
      container.appendChild(button);
      expect(isFocusable(button)).toBe(false);
    });

    it("should match focusable selector for elements with tabindex", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0");
      container.appendChild(div);
      expect(div.matches(FOCUSABLE_SELECTOR)).toBe(true);
    });

    it("should return false for tabindex=-1", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "-1");
      container.appendChild(div);
      expect(isFocusable(div)).toBe(false);
    });
  });

  describe("getFocusableElements", () => {
    // Note: jsdom doesn't provide proper bounding rects, so we test
    // the selector matching behavior
    it("should find elements matching focusable selector", () => {
      container.innerHTML = `
        <button>Button</button>
        <a href="#">Link</a>
        <input type="text" />
        <div>Not focusable</div>
      `;
      // Check that the selector matches the right elements
      const focusableBySelector =
        container.querySelectorAll(FOCUSABLE_SELECTOR);
      expect(focusableBySelector.length).toBe(3);
    });

    it("should exclude disabled elements via selector", () => {
      container.innerHTML = `
        <button>Active</button>
        <button disabled>Disabled</button>
      `;
      const focusableBySelector =
        container.querySelectorAll(FOCUSABLE_SELECTOR);
      expect(focusableBySelector.length).toBe(1);
    });

    it("should return empty array for container with no focusable elements", () => {
      container.innerHTML = "<div><span>Text</span></div>";
      const elements = getFocusableElements(container);
      expect(elements.length).toBe(0);
    });
  });

  describe("createFocusTrap", () => {
    it("should create trap with activate and deactivate methods", () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
      `;
      const trap = createFocusTrap(container);

      expect(typeof trap.activate).toBe("function");
      expect(typeof trap.deactivate).toBe("function");

      // In real browser, activate would focus the first element
      // In jsdom, we verify the interface works
      trap.activate();
      trap.deactivate();
    });

    it("should restore focus on deactivate", () => {
      const externalButton = document.createElement("button");
      externalButton.id = "external";
      document.body.appendChild(externalButton);
      externalButton.focus();

      container.innerHTML = "<button>Inside</button>";
      const trap = createFocusTrap(container);
      trap.activate();
      trap.deactivate();

      expect(document.activeElement).toBe(externalButton);
      externalButton.remove();
    });
  });

  describe("handleArrowKeyNavigation", () => {
    it("should navigate down with ArrowDown", () => {
      const elements = [
        document.createElement("button"),
        document.createElement("button"),
        document.createElement("button"),
      ];
      elements.forEach((el) => container.appendChild(el));

      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      const newIndex = handleArrowKeyNavigation(event, elements, 0);
      expect(newIndex).toBe(1);
    });

    it("should navigate up with ArrowUp", () => {
      const elements = [
        document.createElement("button"),
        document.createElement("button"),
      ];
      elements.forEach((el) => container.appendChild(el));

      const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
      const newIndex = handleArrowKeyNavigation(event, elements, 1);
      expect(newIndex).toBe(0);
    });

    it("should wrap around when wrap option is true", () => {
      const elements = [
        document.createElement("button"),
        document.createElement("button"),
      ];
      elements.forEach((el) => container.appendChild(el));

      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      const newIndex = handleArrowKeyNavigation(event, elements, 1, {
        wrap: true,
      });
      expect(newIndex).toBe(0);
    });

    it("should not wrap when wrap option is false", () => {
      const elements = [
        document.createElement("button"),
        document.createElement("button"),
      ];
      elements.forEach((el) => container.appendChild(el));

      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      const newIndex = handleArrowKeyNavigation(event, elements, 1, {
        wrap: false,
      });
      expect(newIndex).toBe(1);
    });

    it("should go to first with Home", () => {
      const elements = [
        document.createElement("button"),
        document.createElement("button"),
        document.createElement("button"),
      ];
      elements.forEach((el) => container.appendChild(el));

      const event = new KeyboardEvent("keydown", { key: "Home" });
      const newIndex = handleArrowKeyNavigation(event, elements, 2);
      expect(newIndex).toBe(0);
    });

    it("should go to last with End", () => {
      const elements = [
        document.createElement("button"),
        document.createElement("button"),
        document.createElement("button"),
      ];
      elements.forEach((el) => container.appendChild(el));

      const event = new KeyboardEvent("keydown", { key: "End" });
      const newIndex = handleArrowKeyNavigation(event, elements, 0);
      expect(newIndex).toBe(2);
    });
  });

  describe("updateRovingTabindex", () => {
    it("should set active element to tabindex 0", () => {
      const elements = [
        document.createElement("button"),
        document.createElement("button"),
        document.createElement("button"),
      ];
      updateRovingTabindex(elements, 1);

      expect(elements[0]!.getAttribute("tabindex")).toBe("-1");
      expect(elements[1]!.getAttribute("tabindex")).toBe("0");
      expect(elements[2]!.getAttribute("tabindex")).toBe("-1");
    });
  });
});

// ============================================================================
// SCREEN READER SUPPORT TESTS
// ============================================================================

describe("Screen Reader Support", () => {
  afterEach(() => {
    // Clean up live region
    const liveRegion = document.querySelector(
      '[aria-live="polite"][role="status"]'
    );
    if (liveRegion) {
      liveRegion.remove();
    }
  });

  describe("getLiveRegion", () => {
    it("should create a live region element", () => {
      const region = getLiveRegion();
      expect(region).toBeInstanceOf(HTMLElement);
      expect(region.getAttribute("aria-live")).toBe("polite");
      expect(region.getAttribute("role")).toBe("status");
    });

    it("should return the same element on subsequent calls", () => {
      const region1 = getLiveRegion();
      const region2 = getLiveRegion();
      expect(region1).toBe(region2);
    });
  });

  describe("announceToScreenReader", () => {
    it("should set message in live region", async () => {
      announceToScreenReader("Test message");
      const region = getLiveRegion();

      // Wait for debounce
      await new Promise((resolve) =>
        setTimeout(resolve, LIVE_REGION_DEBOUNCE + 50)
      );
      expect(region.textContent).toBe("Test message");
    });
  });

  describe("getSrOnlyStyles", () => {
    it("should return visually hidden styles", () => {
      const styles = getSrOnlyStyles();
      expect(styles.position).toBe("absolute");
      expect(styles.width).toBe("1px");
      expect(styles.height).toBe("1px");
      expect(styles.overflow).toBe("hidden");
    });
  });
});

// ============================================================================
// ACCESSIBILITY AUDIT TESTS
// ============================================================================

describe("Accessibility Audit", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("auditImages", () => {
    it("should report images without alt", () => {
      container.innerHTML = '<img src="test.jpg" />';
      const issues = auditImages(container);
      expect(issues.length).toBe(1);
      expect(issues[0]!.type).toBe("alt-text");
      expect(issues[0]!.severity).toBe("error");
    });

    it("should not report images with alt", () => {
      container.innerHTML = '<img src="test.jpg" alt="Test" />';
      const issues = auditImages(container);
      expect(issues.length).toBe(0);
    });

    it("should warn about empty alt without presentation role", () => {
      container.innerHTML = '<img src="test.jpg" alt="" />';
      const issues = auditImages(container);
      expect(issues.length).toBe(1);
      expect(issues[0]!.severity).toBe("warning");
    });

    it("should not warn about empty alt with presentation role", () => {
      container.innerHTML = '<img src="test.jpg" alt="" role="presentation" />';
      const issues = auditImages(container);
      expect(issues.length).toBe(0);
    });
  });

  describe("auditFormLabels", () => {
    it("should report inputs without labels", () => {
      container.innerHTML = '<input type="text" />';
      const issues = auditFormLabels(container);
      expect(issues.length).toBe(1);
      expect(issues[0]!.type).toBe("label");
    });

    it("should not report inputs with labels", () => {
      container.innerHTML = `
        <label for="name">Name</label>
        <input type="text" id="name" />
      `;
      const issues = auditFormLabels(container);
      expect(issues.length).toBe(0);
    });

    it("should not report inputs with aria-label", () => {
      container.innerHTML = '<input type="text" aria-label="Name" />';
      const issues = auditFormLabels(container);
      expect(issues.length).toBe(0);
    });

    it("should not report hidden inputs", () => {
      container.innerHTML = '<input type="hidden" />';
      const issues = auditFormLabels(container);
      expect(issues.length).toBe(0);
    });
  });

  describe("auditHeadingHierarchy", () => {
    it("should warn about skipped heading levels", () => {
      container.innerHTML = "<h1>Title</h1><h3>Skipped</h3>";
      const issues = auditHeadingHierarchy(container);
      expect(issues.some((i) => i.message.includes("skipped"))).toBe(true);
    });

    it("should not warn about sequential headings", () => {
      container.innerHTML = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
      const issues = auditHeadingHierarchy(container);
      expect(issues.filter((i) => i.message.includes("skipped")).length).toBe(
        0
      );
    });

    it("should warn about multiple h1s", () => {
      container.innerHTML = "<h1>First</h1><h1>Second</h1>";
      const issues = auditHeadingHierarchy(container);
      expect(issues.some((i) => i.message.includes("Multiple h1"))).toBe(true);
    });
  });

  describe("auditLandmarks", () => {
    it("should warn about missing main landmark", () => {
      container.innerHTML = "<div>Content</div>";
      const issues = auditLandmarks(container);
      expect(issues.some((i) => i.message.includes("main landmark"))).toBe(
        true
      );
    });

    it("should not warn when main exists", () => {
      container.innerHTML = "<main>Content</main>";
      const issues = auditLandmarks(container);
      expect(issues.some((i) => i.message.includes("missing a main"))).toBe(
        false
      );
    });

    it("should recognize role attributes", () => {
      container.innerHTML = '<div role="main">Content</div>';
      const issues = auditLandmarks(container);
      expect(issues.some((i) => i.message.includes("missing a main"))).toBe(
        false
      );
    });
  });

  describe("auditKeyboardAccessibility", () => {
    it("should warn about clickable elements without tabindex", () => {
      container.innerHTML = '<div onclick="doSomething()">Click me</div>';
      const issues = auditKeyboardAccessibility(container);
      expect(issues.some((i) => i.type === "keyboard")).toBe(true);
    });

    it("should warn about positive tabindex", () => {
      container.innerHTML = '<div tabindex="5">Focused</div>';
      const issues = auditKeyboardAccessibility(container);
      expect(issues.some((i) => i.message.includes("Positive tabindex"))).toBe(
        true
      );
    });

    it("should not warn about tabindex 0", () => {
      container.innerHTML = '<div tabindex="0">Focused</div>';
      const issues = auditKeyboardAccessibility(container);
      expect(issues.some((i) => i.message.includes("Positive tabindex"))).toBe(
        false
      );
    });
  });

  describe("runAccessibilityAudit", () => {
    it("should run all audits", () => {
      container.innerHTML = `
        <img src="test.jpg" />
        <input type="text" />
        <h1>Title</h1><h3>Skipped</h3>
        <div onclick="test()">Click</div>
      `;
      const issues = runAccessibilityAudit(container);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.type === "alt-text")).toBe(true);
      expect(issues.some((i) => i.type === "label")).toBe(true);
      expect(issues.some((i) => i.type === "heading")).toBe(true);
    });
  });
});

// ============================================================================
// FOCUS MANAGEMENT TESTS
// ============================================================================

describe("Focus Management", () => {
  beforeEach(() => {
    // Mock matchMedia for jsdom
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  describe("getFocusIndicatorStyles", () => {
    it("should return focus indicator styles", () => {
      const styles = getFocusIndicatorStyles();
      expect(styles.outline).toContain("2px");
      expect(styles.outlineOffset).toBe("2px");
    });
  });

  describe("prefersReducedMotion", () => {
    it("should return boolean", () => {
      const result = prefersReducedMotion();
      expect(typeof result).toBe("boolean");
    });

    it("should return true when media query matches", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: () => ({
          matches: true,
          media: "",
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
      const result = prefersReducedMotion();
      expect(result).toBe(true);
    });
  });

  describe("prefersHighContrast", () => {
    it("should return boolean", () => {
      const result = prefersHighContrast();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("skipToMainContent", () => {
    it("should focus main content when exists", () => {
      const main = document.createElement("main");
      main.id = "main-content";
      // Mock scrollIntoView for jsdom
      main.scrollIntoView = () => {};
      document.body.appendChild(main);

      skipToMainContent();
      expect(document.activeElement).toBe(main);

      main.remove();
    });
  });
});

// ============================================================================
// TOUCH TARGET TESTS
// ============================================================================

describe("Touch Target", () => {
  describe("meetsMinimumTouchTarget", () => {
    // Note: jsdom doesn't calculate actual bounding rects based on CSS
    // So we mock getBoundingClientRect for proper testing
    it("should return true for elements meeting minimum size", () => {
      const button = document.createElement("button");
      button.getBoundingClientRect = () => ({
        width: 50,
        height: 50,
        top: 0,
        left: 0,
        bottom: 50,
        right: 50,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      document.body.appendChild(button);

      const result = meetsMinimumTouchTarget(button);
      expect(result).toBe(true);

      button.remove();
    });

    it("should return false for small elements", () => {
      const button = document.createElement("button");
      button.getBoundingClientRect = () => ({
        width: 20,
        height: 20,
        top: 0,
        left: 0,
        bottom: 20,
        right: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      document.body.appendChild(button);

      const result = meetsMinimumTouchTarget(button);
      expect(result).toBe(false);

      button.remove();
    });
  });

  describe("getMinTouchTargetStyles", () => {
    it("should return minimum size styles", () => {
      const styles = getMinTouchTargetStyles();
      expect(styles.minWidth).toBe("44px");
      expect(styles.minHeight).toBe("44px");
    });
  });
});

// ============================================================================
// FIELD UTILITIES TESTS
// ============================================================================

describe("Field Utilities", () => {
  describe("createFieldIds", () => {
    it("should create related IDs for a field", () => {
      const ids = createFieldIds("email");
      expect(ids.inputId).toContain("input");
      expect(ids.labelId).toContain("label");
      expect(ids.descriptionId).toContain("description");
      expect(ids.errorId).toContain("error");
    });

    it("should create unique IDs each time", () => {
      const ids1 = createFieldIds("field");
      const ids2 = createFieldIds("field");
      expect(ids1.inputId).not.toBe(ids2.inputId);
    });
  });

  describe("createFieldAriaAttributes", () => {
    it("should create basic attributes", () => {
      const attrs = createFieldAriaAttributes({
        labelId: "label-1",
      });
      expect(attrs["aria-labelledby"]).toBe("label-1");
    });

    it("should include error ID when has error", () => {
      const attrs = createFieldAriaAttributes({
        errorId: "error-1",
        hasError: true,
      });
      expect(attrs["aria-invalid"]).toBe(true);
      expect(attrs["aria-describedby"]).toContain("error-1");
    });

    it("should combine description and error IDs", () => {
      const attrs = createFieldAriaAttributes({
        descriptionId: "desc-1",
        errorId: "error-1",
        hasError: true,
      });
      expect(attrs["aria-describedby"]).toBe("desc-1 error-1");
    });

    it("should include required attribute", () => {
      const attrs = createFieldAriaAttributes({
        required: true,
      });
      expect(attrs["aria-required"]).toBe(true);
    });

    it("should include disabled attribute", () => {
      const attrs = createFieldAriaAttributes({
        disabled: true,
      });
      expect(attrs["aria-disabled"]).toBe(true);
    });

    it("should include readonly attribute", () => {
      const attrs = createFieldAriaAttributes({
        readOnly: true,
      });
      expect(attrs["aria-readonly"]).toBe(true);
    });
  });
});
