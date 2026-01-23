/**
 * Optimized Image Component
 *
 * Provides progressive loading with blur-up effect for images.
 * Supports multiple image sizes and lazy loading for better performance.
 */

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { Box, Skeleton } from "@mui/material";

// ============================================================================
// Types
// ============================================================================

export interface ImageSize {
  width: number;
  height: number;
  url: string;
}

export interface OptimizedImageProps {
  /** Source URL of the full-resolution image */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Optional low-quality placeholder URL for blur-up effect */
  placeholderSrc?: string;
  /** Image width */
  width?: number | string;
  /** Image height */
  height?: number | string;
  /** Object fit style */
  objectFit?: CSSProperties["objectFit"];
  /** Object position style */
  objectPosition?: CSSProperties["objectPosition"];
  /** Border radius */
  borderRadius?: number | string;
  /** Whether to lazy load the image */
  lazy?: boolean;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Additional MUI sx prop */
  sx?: Record<string, unknown>;
  /** Blur amount for placeholder (default: 20) */
  blurAmount?: number;
  /** Transition duration in ms (default: 300) */
  transitionDuration?: number;
  /** Aspect ratio (e.g., "16/9", "4/3", "1/1") */
  aspectRatio?: string;
  /** Priority loading (disables lazy loading) */
  priority?: boolean;
  /** Srcset for responsive images */
  srcSet?: string;
  /** Sizes attribute for responsive images */
  sizes?: string;
}

// ============================================================================
// Image URL Utilities
// ============================================================================

/**
 * Generate image URL with size suffix
 * Assumes image naming convention: image.jpg -> image-{size}.jpg
 */
export function getImageUrlWithSize(
  url: string,
  size: "thumb" | "medium" | "large"
): string {
  const lastDot = url.lastIndexOf(".");
  if (lastDot === -1) return url;

  const base = url.substring(0, lastDot);
  const ext = url.substring(lastDot);

  return `${base}-${size}${ext}`;
}

/**
 * Generate srcSet for responsive images
 */
export function generateSrcSet(
  url: string,
  sizes: Array<{ width: number; suffix: string }>
): string {
  return sizes
    .map(({ width, suffix }) => {
      const lastDot = url.lastIndexOf(".");
      if (lastDot === -1) return `${url} ${width}w`;

      const base = url.substring(0, lastDot);
      const ext = url.substring(lastDot);
      return `${base}-${suffix}${ext} ${width}w`;
    })
    .join(", ");
}

/**
 * Default responsive sizes for common use cases
 */
export const DEFAULT_IMAGE_SIZES = {
  thumbnail: { width: 150, suffix: "thumb" },
  medium: { width: 400, suffix: "medium" },
  large: { width: 800, suffix: "large" },
};

// ============================================================================
// Component
// ============================================================================

export function OptimizedImage({
  src,
  alt,
  placeholderSrc,
  width = "100%",
  height = "auto",
  objectFit = "cover",
  objectPosition = "center",
  borderRadius = 0,
  lazy = true,
  onLoad,
  onError,
  className,
  sx,
  blurAmount = 20,
  transitionDuration = 300,
  aspectRatio,
  priority = false,
  srcSet,
  sizes,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px", // Start loading slightly before visible
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, isInView]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // Check if image is already cached
  useEffect(() => {
    if (
      isInView &&
      imgRef.current?.complete &&
      imgRef.current.naturalWidth > 0
    ) {
      setIsLoaded(true);
    }
  }, [isInView]);

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius,
        aspectRatio,
        ...sx,
      }}
    >
      {/* Placeholder/Blur layer */}
      {placeholderSrc && !isLoaded && !hasError && (
        <Box
          component="img"
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit,
            objectPosition,
            filter: `blur(${blurAmount}px)`,
            transform: "scale(1.1)", // Prevent blur edge artifacts
            transition: `opacity ${transitionDuration}ms ease-out`,
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && !placeholderSrc && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius,
          }}
        />
      )}

      {/* Main image */}
      {isInView && (
        <Box
          ref={imgRef}
          component="img"
          src={src}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          loading={lazy && !priority ? "lazy" : "eager"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          sx={{
            width: "100%",
            height: "100%",
            objectFit,
            objectPosition,
            transition: `opacity ${transitionDuration}ms ease-out`,
            opacity: isLoaded ? 1 : 0,
          }}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.200",
            color: "grey.500",
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 24 24"
            sx={{ width: 48, height: 48, fill: "currentColor" }}
          >
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Presets for Common Use Cases
// ============================================================================

/**
 * Book cover image with optimized settings
 */
export function BookCoverImage({
  src,
  alt,
  width = 120,
  height = 180,
  ...props
}: Omit<OptimizedImageProps, "aspectRatio">) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      objectFit="cover"
      borderRadius={1}
      {...props}
    />
  );
}

/**
 * Avatar image with circular style
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  ...props
}: Omit<OptimizedImageProps, "width" | "height" | "borderRadius"> & {
  size?: number;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      objectFit="cover"
      borderRadius="50%"
      {...props}
    />
  );
}

/**
 * Forum post image with responsive sizing
 */
export function ForumImage({
  src,
  alt,
  ...props
}: Omit<OptimizedImageProps, "width" | "height">) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width="100%"
      height="auto"
      objectFit="contain"
      borderRadius={1}
      sx={{ maxHeight: 500 }}
      {...props}
    />
  );
}

export default OptimizedImage;
