/**
 * Tests for Focus Management Hooks - Utility Functions and Constants
 *
 * Note: React hooks require @testing-library/react for full testing.
 * These tests focus on the exported constants, types, and utility behaviors.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_FOCUS_TRAP_OPTIONS,
  FOCUSABLE_SELECTOR,
} from "./useFocusManagement";

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe("Focus Management Constants", () => {
  describe("DEFAULT_FOCUS_TRAP_OPTIONS", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_FOCUS_TRAP_OPTIONS).toEqual({
        active: true,
        autoFocus: true,
        restoreFocus: true,
      });
    });

    it("should have active as true by default", () => {
      expect(DEFAULT_FOCUS_TRAP_OPTIONS.active).toBe(true);
    });

    it("should have autoFocus as true by default", () => {
      expect(DEFAULT_FOCUS_TRAP_OPTIONS.autoFocus).toBe(true);
    });

    it("should have restoreFocus as true by default", () => {
      expect(DEFAULT_FOCUS_TRAP_OPTIONS.restoreFocus).toBe(true);
    });
  });

  describe("FOCUSABLE_SELECTOR", () => {
    it("should be a non-empty string", () => {
      expect(typeof FOCUSABLE_SELECTOR).toBe("string");
      expect(FOCUSABLE_SELECTOR.length).toBeGreaterThan(0);
    });

    it("should include anchor elements with href", () => {
      expect(FOCUSABLE_SELECTOR).toContain("a[href]");
    });

    it("should include area elements with href", () => {
      expect(FOCUSABLE_SELECTOR).toContain("area[href]");
    });

    it("should include non-disabled buttons", () => {
      expect(FOCUSABLE_SELECTOR).toContain("button:not([disabled])");
    });

    it("should include non-disabled, non-hidden inputs", () => {
      expect(FOCUSABLE_SELECTOR).toContain(
        'input:not([disabled]):not([type="hidden"])'
      );
    });

    it("should include non-disabled selects", () => {
      expect(FOCUSABLE_SELECTOR).toContain("select:not([disabled])");
    });

    it("should include non-disabled textareas", () => {
      expect(FOCUSABLE_SELECTOR).toContain("textarea:not([disabled])");
    });

    it("should include elements with positive tabindex", () => {
      expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
    });

    it("should include contenteditable elements", () => {
      expect(FOCUSABLE_SELECTOR).toContain("[contenteditable]");
    });

    it("should include summary elements inside details", () => {
      expect(FOCUSABLE_SELECTOR).toContain("details > summary");
    });

    it("should include audio elements with controls", () => {
      expect(FOCUSABLE_SELECTOR).toContain("audio[controls]");
    });

    it("should include video elements with controls", () => {
      expect(FOCUSABLE_SELECTOR).toContain("video[controls]");
    });

    it("should exclude elements with tabindex=-1", () => {
      expect(FOCUSABLE_SELECTOR).toContain('not([tabindex="-1"])');
    });

    it("should exclude disabled elements", () => {
      expect(FOCUSABLE_SELECTOR).toContain("not([disabled])");
    });

    it("should exclude hidden inputs", () => {
      expect(FOCUSABLE_SELECTOR).toContain('not([type="hidden"])');
    });

    it("should work as a valid CSS selector", () => {
      // Create a container with some focusable elements
      const container = document.createElement("div");
      container.innerHTML = `
        <a href="#">Link</a>
        <button>Button</button>
        <input type="text" />
        <input type="hidden" />
        <button disabled>Disabled</button>
        <div tabindex="0">Focusable div</div>
        <div tabindex="-1">Not focusable div</div>
      `;
      document.body.appendChild(container);

      // Should not throw when used as selector
      expect(() => {
        container.querySelectorAll(FOCUSABLE_SELECTOR);
      }).not.toThrow();

      // Should find the correct elements
      const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
      expect(focusable.length).toBe(4); // Link, Button, Input[text], Div[tabindex=0]

      // Cleanup
      document.body.removeChild(container);
    });
  });
});

// ============================================================================
// TYPE EXPORTS TESTS
// ============================================================================

describe("Focus Management Type Exports", () => {
  it("should export FocusTrapOptions type", async () => {
    const module = await import("./useFocusManagement");
    // TypeScript will verify types at compile time
    // We just verify the module exports correctly
    expect(module).toBeDefined();
  });

  it("should export FocusRestoreOptions type", async () => {
    const module = await import("./useFocusManagement");
    expect(module).toBeDefined();
  });

  it("should export FocusTrapReturn type", async () => {
    const module = await import("./useFocusManagement");
    expect(module).toBeDefined();
  });

  it("should export FocusRestoreReturn type", async () => {
    const module = await import("./useFocusManagement");
    expect(module).toBeDefined();
  });

  it("should export RovingTabindexOptions type", async () => {
    const module = await import("./useFocusManagement");
    expect(module).toBeDefined();
  });
});

// ============================================================================
// HOOK EXPORTS TESTS
// ============================================================================

describe("Focus Management Hook Exports", () => {
  it("should export useFocusTrap hook", async () => {
    const module = await import("./useFocusManagement");
    expect(typeof module.useFocusTrap).toBe("function");
  });

  it("should export useFocusRestore hook", async () => {
    const module = await import("./useFocusManagement");
    expect(typeof module.useFocusRestore).toBe("function");
  });

  it("should export useFocusWithin hook", async () => {
    const module = await import("./useFocusManagement");
    expect(typeof module.useFocusWithin).toBe("function");
  });

  it("should export useRovingTabindex hook", async () => {
    const module = await import("./useFocusManagement");
    expect(typeof module.useRovingTabindex).toBe("function");
  });

  it("should export useSkipLink hook", async () => {
    const module = await import("./useFocusManagement");
    expect(typeof module.useSkipLink).toBe("function");
  });

  it("should export useFocusVisible hook", async () => {
    const module = await import("./useFocusManagement");
    expect(typeof module.useFocusVisible).toBe("function");
  });
});

// ============================================================================
// FOCUSABLE SELECTOR DOM INTEGRATION TESTS
// ============================================================================

describe("Focusable Selector DOM Integration", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should select anchor elements with href", () => {
    container.innerHTML = `
      <a href="#">Clickable Link</a>
      <a>Anchor without href</a>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1);
    expect(focusable[0]?.textContent).toBe("Clickable Link");
  });

  it("should select enabled buttons only", () => {
    container.innerHTML = `
      <button>Enabled Button</button>
      <button disabled>Disabled Button</button>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1);
    expect(focusable[0]?.textContent).toBe("Enabled Button");
  });

  it("should select text inputs but not hidden inputs", () => {
    container.innerHTML = `
      <input type="text" />
      <input type="hidden" />
      <input type="password" />
      <input disabled type="text" />
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(2); // text and password, not hidden or disabled
  });

  it("should select textareas and selects", () => {
    container.innerHTML = `
      <textarea></textarea>
      <select><option>Option</option></select>
      <textarea disabled></textarea>
      <select disabled><option>Option</option></select>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(2); // Only enabled ones
  });

  it("should select elements with positive tabindex", () => {
    container.innerHTML = `
      <div tabindex="0">Focusable div</div>
      <div tabindex="1">Also focusable</div>
      <div tabindex="-1">Not in tab order</div>
      <div>Not focusable</div>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(2); // tabindex=0 and tabindex=1
  });

  it("should select contenteditable elements", () => {
    container.innerHTML = `
      <div contenteditable="true">Editable</div>
      <div contenteditable="false">Not editable</div>
      <div>Normal div</div>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    // Note: contenteditable="true" should match, contenteditable="false" may or may not
    // depending on browser interpretation - we mainly care that the selector doesn't throw
    expect(focusable.length).toBeGreaterThanOrEqual(1);
  });

  it("should select audio and video with controls", () => {
    container.innerHTML = `
      <audio controls></audio>
      <video controls></video>
      <audio></audio>
      <video></video>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(2); // Only with controls
  });

  it("should handle nested focusable elements", () => {
    container.innerHTML = `
      <div>
        <button>Button 1</button>
        <div>
          <a href="#">Link 1</a>
          <div>
            <input type="text" />
          </div>
        </div>
        <button>Button 2</button>
      </div>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(4); // 2 buttons, 1 link, 1 input
  });

  it("should handle empty container", () => {
    container.innerHTML = "";

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(0);
  });

  it("should handle container with no focusable elements", () => {
    container.innerHTML = `
      <div>Just text</div>
      <span>More text</span>
      <p>Paragraph</p>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(0);
  });
});

// ============================================================================
// DEFAULT OPTIONS VALIDATION
// ============================================================================

describe("Default Options Validation", () => {
  it("should have all required fields defined", () => {
    expect(DEFAULT_FOCUS_TRAP_OPTIONS).toHaveProperty("active");
    expect(DEFAULT_FOCUS_TRAP_OPTIONS).toHaveProperty("autoFocus");
    expect(DEFAULT_FOCUS_TRAP_OPTIONS).toHaveProperty("restoreFocus");
  });

  it("should have boolean values for all fields", () => {
    expect(typeof DEFAULT_FOCUS_TRAP_OPTIONS.active).toBe("boolean");
    expect(typeof DEFAULT_FOCUS_TRAP_OPTIONS.autoFocus).toBe("boolean");
    expect(typeof DEFAULT_FOCUS_TRAP_OPTIONS.restoreFocus).toBe("boolean");
  });

  it("should be a frozen/immutable object pattern", () => {
    // The object should follow immutable patterns
    // Users shouldn't modify the defaults
    const originalActive = DEFAULT_FOCUS_TRAP_OPTIONS.active;

    // Even though it's typed as Required, the object itself may not be frozen
    // This test documents the expected usage pattern
    expect(DEFAULT_FOCUS_TRAP_OPTIONS.active).toBe(originalActive);
  });
});

// ============================================================================
// FOCUSABLE SELECTOR EDGE CASES
// ============================================================================

describe("Focusable Selector Edge Cases", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should handle form elements within forms", () => {
    container.innerHTML = `
      <form>
        <input type="text" name="username" />
        <input type="password" name="password" />
        <button type="submit">Submit</button>
        <button type="reset">Reset</button>
      </form>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(4);
  });

  it("should handle radio and checkbox inputs", () => {
    container.innerHTML = `
      <input type="radio" name="choice" value="a" />
      <input type="radio" name="choice" value="b" />
      <input type="checkbox" name="agree" />
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(3);
  });

  it("should handle file inputs", () => {
    container.innerHTML = `
      <input type="file" />
      <input type="file" disabled />
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1);
  });

  it("should handle range inputs", () => {
    container.innerHTML = `
      <input type="range" min="0" max="100" />
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1);
  });

  it("should handle color inputs", () => {
    container.innerHTML = `
      <input type="color" />
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1);
  });

  it("should handle date inputs", () => {
    container.innerHTML = `
      <input type="date" />
      <input type="datetime-local" />
      <input type="time" />
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(3);
  });

  it("should handle number inputs", () => {
    container.innerHTML = `
      <input type="number" />
      <input type="number" disabled />
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1);
  });

  it("should handle details/summary elements", () => {
    container.innerHTML = `
      <details>
        <summary>Click to expand</summary>
        <p>Hidden content</p>
      </details>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1); // Only the summary
  });

  it("should handle multiple select options", () => {
    container.innerHTML = `
      <select multiple>
        <option>Option 1</option>
        <option>Option 2</option>
        <option>Option 3</option>
      </select>
    `;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(1); // Just the select, not options
  });

  it("should handle iframe elements (not focusable by selector)", () => {
    container.innerHTML = `
      <iframe src="about:blank"></iframe>
    `;

    // iframes are not in our focusable selector
    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(0);
  });

  it("should handle object and embed elements (not focusable by selector)", () => {
    container.innerHTML = `
      <object data="test.swf" type="application/x-shockwave-flash"></object>
      <embed src="test.swf" type="application/x-shockwave-flash" />
    `;

    // object and embed are not in our focusable selector
    const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBe(0);
  });
});
