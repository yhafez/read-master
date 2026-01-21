/**
 * Social Media Sharing Utilities
 *
 * Generate share links for various social platforms
 */

// ============================================================================
// Types
// ============================================================================

export interface ShareContent {
  title: string;
  text?: string;
  url: string;
  hashtags?: string[];
}

// ============================================================================
// Platform Share URL Generators
// ============================================================================

/**
 * Generate Twitter share URL
 */
export function getTwitterShareUrl(content: ShareContent): string {
  const params = new URLSearchParams();

  const text = content.text
    ? `${content.title} - ${content.text}`
    : content.title;

  params.set("text", text);
  params.set("url", content.url);

  if (content.hashtags && content.hashtags.length > 0) {
    params.set("hashtags", content.hashtags.join(","));
  }

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Generate Facebook share URL
 */
export function getFacebookShareUrl(content: ShareContent): string {
  const params = new URLSearchParams();
  params.set("u", content.url);

  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Generate LinkedIn share URL
 */
export function getLinkedInShareUrl(content: ShareContent): string {
  const params = new URLSearchParams();
  params.set("url", content.url);

  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Generate WhatsApp share URL
 */
export function getWhatsAppShareUrl(content: ShareContent): string {
  const text = content.text
    ? `${content.title} - ${content.text}\n${content.url}`
    : `${content.title}\n${content.url}`;

  const params = new URLSearchParams();
  params.set("text", text);

  return `https://wa.me/?${params.toString()}`;
}

/**
 * Generate Reddit share URL
 */
export function getRedditShareUrl(content: ShareContent): string {
  const params = new URLSearchParams();
  params.set("url", content.url);
  params.set("title", content.title);

  return `https://reddit.com/submit?${params.toString()}`;
}

// ============================================================================
// Native Share API
// ============================================================================

/**
 * Check if Web Share API is available
 */
export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && "share" in navigator;
}

/**
 * Share using native Web Share API
 * Returns true if shared, false if not supported or cancelled
 */
export async function shareNative(content: ShareContent): Promise<boolean> {
  if (!canUseNativeShare()) {
    return false;
  }

  try {
    const shareData: ShareData = {
      title: content.title,
      url: content.url,
    };

    if (content.text) {
      shareData.text = content.text;
    }

    await navigator.share(shareData);
    return true;
  } catch (error) {
    // User cancelled or share failed
    if (error instanceof Error && error.name === "AbortError") {
      // User cancelled, not an error
      return false;
    }
    // Native share failed, return false to allow fallback
    return false;
  }
}

// ============================================================================
// Copy to Clipboard
// ============================================================================

/**
 * Copy share URL to clipboard
 */
export async function copyToClipboard(content: ShareContent): Promise<boolean> {
  const text = content.text
    ? `${content.title} - ${content.text}\n${content.url}`
    : `${content.title}\n${content.url}`;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  } catch {
    // Copy to clipboard failed, return false
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Open share URL in a popup window
 */
export function openSharePopup(url: string, title: string = "Share"): void {
  const width = 600;
  const height = 400;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  window.open(
    url,
    title,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

/**
 * Get current page URL
 */
export function getCurrentUrl(): string {
  return typeof window !== "undefined" ? window.location.href : "";
}

/**
 * Generate reading progress share content
 */
export function getReadingProgressShareContent(
  bookTitle: string,
  percentage: number,
  appUrl: string = "https://readmaster.app"
): ShareContent {
  return {
    title: `Reading "${bookTitle}"`,
    text: `I'm ${percentage}% through this book on Read Master!`,
    url: appUrl,
    hashtags: ["reading", "ReadMaster", "books"],
  };
}

/**
 * Generate book completion share content
 */
export function getBookCompletionShareContent(
  bookTitle: string,
  author: string | null,
  appUrl: string = "https://readmaster.app"
): ShareContent {
  const authorText = author ? ` by ${author}` : "";

  return {
    title: `Finished reading "${bookTitle}"${authorText}!`,
    text: "Just completed this amazing book on Read Master!",
    url: appUrl,
    hashtags: ["reading", "ReadMaster", "bookstagram", "amreading"],
  };
}

/**
 * Generate achievement share content
 */
export function getAchievementShareContent(
  achievementName: string,
  description: string,
  appUrl: string = "https://readmaster.app"
): ShareContent {
  return {
    title: `Achievement Unlocked: ${achievementName}!`,
    text: description,
    url: appUrl,
    hashtags: ["ReadMaster", "reading", "achievement"],
  };
}
