/**
 * CDN Utilities for Read Master
 *
 * Provides helper functions for working with CDN-served assets.
 * Supports Cloudflare CDN with R2 backend for static assets.
 */

// ============================================================================
// Types
// ============================================================================

export interface CDNConfig {
  /** Base URL for CDN-served assets */
  baseUrl: string;
  /** Whether CDN is enabled */
  enabled: boolean;
  /** Default cache duration in seconds */
  defaultCacheDuration: number;
}

export interface ImageTransformOptions {
  /** Target width */
  width?: number;
  /** Target height */
  height?: number;
  /** Image quality (1-100) */
  quality?: number;
  /** Output format */
  format?: "auto" | "webp" | "avif" | "jpeg" | "png";
  /** Fit mode */
  fit?: "cover" | "contain" | "fill" | "scale-down";
  /** Enable blur effect for placeholder */
  blur?: number;
}

export type ImageSize = "thumb" | "medium" | "large" | "original";

// ============================================================================
// Configuration
// ============================================================================

/**
 * CDN configuration from environment
 */
function getCDNConfig(): CDNConfig {
  const cdnUrl = import.meta.env.VITE_CDN_URL;
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

  // Use CDN URL if available, fall back to R2 public URL
  const baseUrl = cdnUrl || r2PublicUrl || "";

  return {
    baseUrl,
    enabled: Boolean(baseUrl),
    defaultCacheDuration: 86400, // 24 hours
  };
}

/**
 * Get the current CDN configuration
 */
export function getConfig(): CDNConfig {
  return getCDNConfig();
}

/**
 * Check if CDN is available
 */
export function isCDNEnabled(): boolean {
  return getCDNConfig().enabled;
}

// ============================================================================
// Image Size Presets
// ============================================================================

/**
 * Standard image size configurations
 */
export const IMAGE_SIZES = {
  thumb: { width: 150, height: 150, suffix: "thumb" },
  medium: { width: 400, height: 400, suffix: "medium" },
  large: { width: 800, height: 800, suffix: "large" },
  original: { suffix: "original" },
} as const;

/**
 * Book cover specific sizes
 */
export const BOOK_COVER_SIZES = {
  thumb: { width: 80, height: 120, suffix: "thumb" },
  medium: { width: 200, height: 300, suffix: "medium" },
  large: { width: 400, height: 600, suffix: "large" },
} as const;

/**
 * Avatar specific sizes
 */
export const AVATAR_SIZES = {
  thumb: { width: 40, height: 40, suffix: "thumb" },
  medium: { width: 96, height: 96, suffix: "medium" },
  large: { width: 200, height: 200, suffix: "large" },
} as const;

// ============================================================================
// URL Building
// ============================================================================

/**
 * Build a CDN URL for an asset
 *
 * @param path - The asset path (relative to CDN root)
 * @returns Full CDN URL or original path if CDN is disabled
 *
 * @example
 * ```typescript
 * const url = getCDNUrl('covers/book-123/cover.jpg');
 * // Returns: 'https://cdn.readmaster.com/covers/book-123/cover.jpg'
 * ```
 */
export function getCDNUrl(path: string): string {
  const config = getCDNConfig();

  if (!config.enabled || !path) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  // Ensure base URL doesn't have trailing slash
  const baseUrl = config.baseUrl.endsWith("/")
    ? config.baseUrl.slice(0, -1)
    : config.baseUrl;

  return `${baseUrl}/${cleanPath}`;
}

/**
 * Build a CDN URL with size variant
 *
 * @param path - The asset path
 * @param size - The desired image size
 * @returns CDN URL with size suffix
 *
 * @example
 * ```typescript
 * const url = getCDNUrlWithSize('covers/book-123/cover.jpg', 'thumb');
 * // Returns: 'https://cdn.readmaster.com/covers/book-123/cover-thumb.jpg'
 * ```
 */
export function getCDNUrlWithSize(path: string, size: ImageSize): string {
  if (size === "original") {
    return getCDNUrl(path);
  }

  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1) {
    return getCDNUrl(`${path}-${size}`);
  }

  const base = path.substring(0, lastDot);
  const ext = path.substring(lastDot);

  return getCDNUrl(`${base}-${size}${ext}`);
}

/**
 * Build a CDN URL with Cloudflare Image Resizing parameters
 * Only works if Cloudflare Image Resizing is enabled on the zone
 *
 * @param path - The asset path
 * @param options - Image transformation options
 * @returns CDN URL with transformation parameters
 *
 * @example
 * ```typescript
 * const url = getCDNUrlWithTransform('images/photo.jpg', { width: 300, format: 'webp' });
 * // Returns: 'https://cdn.readmaster.com/cdn-cgi/image/width=300,format=webp/images/photo.jpg'
 * ```
 */
export function getCDNUrlWithTransform(
  path: string,
  options: ImageTransformOptions
): string {
  const config = getCDNConfig();

  if (!config.enabled) {
    return path;
  }

  const params: string[] = [];

  if (options.width) params.push(`width=${options.width}`);
  if (options.height) params.push(`height=${options.height}`);
  if (options.quality) params.push(`quality=${options.quality}`);
  if (options.format) params.push(`format=${options.format}`);
  if (options.fit) params.push(`fit=${options.fit}`);
  if (options.blur) params.push(`blur=${options.blur}`);

  if (params.length === 0) {
    return getCDNUrl(path);
  }

  // Cloudflare Image Resizing URL format
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = config.baseUrl.endsWith("/")
    ? config.baseUrl.slice(0, -1)
    : config.baseUrl;

  return `${baseUrl}/cdn-cgi/image/${params.join(",")}/${cleanPath}`;
}

// ============================================================================
// Cache Busting
// ============================================================================

/**
 * Add a cache-busting version to a URL
 *
 * @param url - The URL to add cache busting to
 * @param version - Version string (defaults to app version)
 * @returns URL with cache-busting parameter
 */
export function addCacheBuster(url: string, version?: string): string {
  const v =
    version || import.meta.env.VITE_APP_VERSION || Date.now().toString();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${v}`;
}

/**
 * Generate a content hash for cache busting
 * Uses a simple hash based on content length and first/last bytes
 *
 * @param content - Content to hash
 * @returns Short hash string
 */
export function generateContentHash(content: string | ArrayBuffer): string {
  let data: string;

  if (content instanceof ArrayBuffer) {
    const view = new Uint8Array(content);
    data = `${view.length}-${view[0] || 0}-${view[view.length - 1] || 0}`;
  } else {
    data = `${content.length}-${content.charCodeAt(0) || 0}-${content.charCodeAt(content.length - 1) || 0}`;
  }

  // Simple hash algorithm
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36).slice(0, 8);
}

// ============================================================================
// Preloading
// ============================================================================

/**
 * Preload critical images for better perceived performance
 *
 * @param urls - Array of image URLs to preload
 * @param priority - Link priority (high, low, auto)
 */
export function preloadImages(
  urls: string[],
  priority: "high" | "low" | "auto" = "auto"
): void {
  if (typeof document === "undefined") return;

  urls.forEach((url) => {
    // Check if already preloaded
    const existing = document.querySelector(`link[href="${url}"]`);
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    link.fetchPriority = priority;

    document.head.appendChild(link);
  });
}

/**
 * Preload a single critical image
 *
 * @param url - Image URL to preload
 * @returns Promise that resolves when the image is loaded
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * Preconnect to CDN origin for faster subsequent requests
 */
export function preconnectToCDN(): void {
  if (typeof document === "undefined") return;

  const config = getCDNConfig();
  if (!config.enabled) return;

  // Check if already preconnected
  const existing = document.querySelector(`link[href="${config.baseUrl}"]`);
  if (existing) return;

  // Add preconnect link
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = config.baseUrl;
  preconnect.crossOrigin = "anonymous";
  document.head.appendChild(preconnect);

  // Also add dns-prefetch for browsers that don't support preconnect
  const dnsPrefetch = document.createElement("link");
  dnsPrefetch.rel = "dns-prefetch";
  dnsPrefetch.href = config.baseUrl;
  document.head.appendChild(dnsPrefetch);
}

// ============================================================================
// Responsive Images
// ============================================================================

/**
 * Generate srcSet for responsive images with CDN support
 *
 * @param basePath - Base path of the image
 * @param sizes - Array of size configurations
 * @returns srcSet string for use in img element
 *
 * @example
 * ```typescript
 * const srcSet = generateSrcSet('covers/book.jpg', [
 *   { width: 150, suffix: 'thumb' },
 *   { width: 400, suffix: 'medium' },
 *   { width: 800, suffix: 'large' },
 * ]);
 * // Returns: 'https://cdn.../covers/book-thumb.jpg 150w, https://cdn.../covers/book-medium.jpg 400w, ...'
 * ```
 */
export function generateSrcSet(
  basePath: string,
  sizes: Array<{ width: number; suffix: string }>
): string {
  return sizes
    .map(({ width, suffix }) => {
      const url = getCDNUrlWithSize(basePath, suffix as ImageSize);
      return `${url} ${width}w`;
    })
    .join(", ");
}

/**
 * Generate sizes attribute for responsive images
 *
 * @param breakpoints - Array of breakpoint configurations
 * @returns sizes string for use in img element
 *
 * @example
 * ```typescript
 * const sizes = generateSizesAttribute([
 *   { maxWidth: 600, size: '100vw' },
 *   { maxWidth: 1200, size: '50vw' },
 *   { size: '400px' },
 * ]);
 * // Returns: '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 400px'
 * ```
 */
export function generateSizesAttribute(
  breakpoints: Array<{ maxWidth?: number; size: string }>
): string {
  return breakpoints
    .map(({ maxWidth, size }) => {
      if (maxWidth) {
        return `(max-width: ${maxWidth}px) ${size}`;
      }
      return size;
    })
    .join(", ");
}

// ============================================================================
// Cache Headers
// ============================================================================

/**
 * Standard cache durations for different asset types
 */
export const CACHE_DURATIONS = {
  /** Immutable assets (hashed names): 1 year */
  immutable: 31536000,
  /** Static images: 30 days */
  images: 2592000,
  /** Dynamic content: 1 hour */
  dynamic: 3600,
  /** No cache */
  none: 0,
} as const;

/**
 * Get cache control header value for an asset type
 *
 * @param assetType - Type of asset
 * @param maxAge - Optional custom max-age in seconds
 * @returns Cache-Control header value
 */
export function getCacheControlHeader(
  assetType: "immutable" | "images" | "dynamic" | "none",
  maxAge?: number
): string {
  const duration = maxAge ?? CACHE_DURATIONS[assetType];

  switch (assetType) {
    case "immutable":
      return `public, max-age=${duration}, immutable`;
    case "images":
      return `public, max-age=${duration}`;
    case "dynamic":
      return `public, max-age=${duration}, must-revalidate`;
    case "none":
      return "no-cache, no-store, must-revalidate";
    default:
      return `public, max-age=${duration}`;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const cdn = {
  // Configuration
  getConfig,
  isCDNEnabled,

  // URL building
  getCDNUrl,
  getCDNUrlWithSize,
  getCDNUrlWithTransform,

  // Cache busting
  addCacheBuster,
  generateContentHash,

  // Preloading
  preloadImages,
  preloadImage,
  preconnectToCDN,

  // Responsive images
  generateSrcSet,
  generateSizesAttribute,

  // Cache headers
  getCacheControlHeader,

  // Size presets
  IMAGE_SIZES,
  BOOK_COVER_SIZES,
  AVATAR_SIZES,
  CACHE_DURATIONS,
} as const;

export default cdn;
