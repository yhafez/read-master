# CDN Setup Guide for Read Master

This guide covers setting up Cloudflare CDN with R2 backend for static assets in Read Master.

## Overview

Read Master uses Cloudflare R2 for storage with Cloudflare CDN for global content delivery. This setup provides:

- **Fast global delivery**: Assets cached at edge locations worldwide
- **Cost-effective**: R2 has zero egress fees
- **Image optimization**: Cloudflare Image Resizing for on-the-fly transformations
- **Automatic caching**: Long-lived cache headers for immutable assets

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client    │────▶│  Cloudflare     │────▶│  Cloudflare R2  │
│  (Browser)  │     │  CDN Edge       │     │  (Origin)       │
└─────────────┘     └─────────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │  Image Resizing │
                    │  (on-the-fly)   │
                    └─────────────────┘
```

## Setup Steps

### 1. Create R2 Bucket

1. Log in to Cloudflare Dashboard
2. Navigate to R2 > Overview
3. Click "Create bucket"
4. Name: `readmaster-assets` (or your preferred name)
5. Location: Choose region closest to your primary users

### 2. Configure R2 Public Access

1. Go to R2 > Your Bucket > Settings
2. Under "Public access", click "Allow Access"
3. Choose one of:
   - **R2.dev subdomain**: Quick setup, `https://pub-xxx.r2.dev`
   - **Custom domain**: Use your own domain (recommended)

### 3. Set Up Custom Domain (Recommended)

1. Navigate to R2 > Your Bucket > Settings > Custom Domains
2. Click "Connect Domain"
3. Enter your CDN subdomain: `cdn.readmaster.com`
4. Cloudflare will automatically:
   - Create DNS record
   - Provision SSL certificate
   - Configure caching rules

### 4. Configure Caching Rules

In Cloudflare Dashboard > Rules > Cache Rules:

```
Rule 1: Immutable Assets
Match: URI Path contains "-thumb" OR "-medium" OR "-large"
Cache: Cache Everything
TTL: 1 year (31536000 seconds)
Cache-Control: public, max-age=31536000, immutable

Rule 2: Image Assets
Match: URI Path matches ".*\.(jpg|jpeg|png|webp|gif|avif)$"
Cache: Cache Everything
TTL: 30 days (2592000 seconds)
Cache-Control: public, max-age=2592000

Rule 3: Audio Assets
Match: URI Path matches ".*\.(mp3|wav|ogg|m4a)$"
Cache: Cache Everything
TTL: 7 days (604800 seconds)
Cache-Control: public, max-age=604800

Rule 4: Documents
Match: URI Path matches ".*\.(pdf|epub)$"
Cache: Cache Everything
TTL: 1 day (86400 seconds)
Cache-Control: public, max-age=86400
```

### 5. Enable Image Resizing (Optional)

Cloudflare Image Resizing enables on-the-fly image transformations.

1. Go to Speed > Optimization > Image Resizing
2. Enable "Resize images from any origin"
3. Configure allowed transformations

**URL Format:**

```
https://cdn.readmaster.com/cdn-cgi/image/width=300,format=webp/path/to/image.jpg
```

**Supported Parameters:**

- `width`: Target width
- `height`: Target height
- `quality`: 1-100 (default: 85)
- `format`: auto, webp, avif, jpeg, png
- `fit`: cover, contain, fill, scale-down
- `blur`: 1-250 (for placeholder images)

### 6. Configure Environment Variables

Add to your `.env` files:

```bash
# R2 Storage Configuration
R2_BUCKET_NAME=readmaster-assets
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key

# CDN URL (custom domain)
R2_PUBLIC_URL=https://cdn.readmaster.com

# Frontend CDN URL
VITE_CDN_URL=https://cdn.readmaster.com
VITE_R2_PUBLIC_URL=https://cdn.readmaster.com
```

### 7. Generate R2 API Tokens

1. Go to R2 > Overview > Manage R2 API Tokens
2. Click "Create API token"
3. Configure:
   - Token name: `readmaster-api`
   - Permissions: Object Read & Write
   - TTL: None (or set expiration)
4. Copy and securely store:
   - Access Key ID
   - Secret Access Key

## Using CDN in Code

### Basic Usage

```typescript
import { getCDNUrl, getCDNUrlWithSize } from "@/lib/cdn";

// Get full CDN URL
const imageUrl = getCDNUrl("covers/book-123/cover.jpg");
// Returns: https://cdn.readmaster.com/covers/book-123/cover.jpg

// Get sized variant
const thumbUrl = getCDNUrlWithSize("covers/book-123/cover.jpg", "thumb");
// Returns: https://cdn.readmaster.com/covers/book-123/cover-thumb.jpg
```

### With Image Transformations

```typescript
import { getCDNUrlWithTransform } from "@/lib/cdn";

// On-the-fly resizing (requires Image Resizing enabled)
const resizedUrl = getCDNUrlWithTransform("covers/book-123/cover.jpg", {
  width: 300,
  height: 450,
  format: "webp",
  quality: 85,
});
// Returns: https://cdn.readmaster.com/cdn-cgi/image/width=300,height=450,format=webp,quality=85/covers/book-123/cover.jpg
```

### Responsive Images

```typescript
import { generateSrcSet, generateSizesAttribute, BOOK_COVER_SIZES } from '@/lib/cdn';

// Generate srcSet
const srcSet = generateSrcSet('covers/book.jpg', [
  BOOK_COVER_SIZES.thumb,
  BOOK_COVER_SIZES.medium,
  BOOK_COVER_SIZES.large,
]);

// Generate sizes attribute
const sizes = generateSizesAttribute([
  { maxWidth: 600, size: '100vw' },
  { maxWidth: 1200, size: '50vw' },
  { size: '400px' },
]);

// Use in JSX
<img
  src={getCDNUrl('covers/book.jpg')}
  srcSet={srcSet}
  sizes={sizes}
  alt="Book cover"
/>
```

### Preloading Critical Assets

```typescript
import { preloadImages, preconnectToCDN } from "@/lib/cdn";

// Preconnect to CDN on app init
useEffect(() => {
  preconnectToCDN();
}, []);

// Preload critical above-the-fold images
preloadImages(
  [getCDNUrl("hero/banner.jpg"), getCDNUrl("icons/logo.svg")],
  "high"
);
```

### Cache Busting

```typescript
import { addCacheBuster, generateContentHash } from "@/lib/cdn";

// Add version-based cache buster
const versionedUrl = addCacheBuster(getCDNUrl("config/settings.json"), "1.0.0");
// Returns: https://cdn.readmaster.com/config/settings.json?v=1.0.0

// Generate content-based hash
const contentHash = generateContentHash(fileContent);
const hashedUrl = `${baseUrl}/file.${contentHash}.js`;
```

## Image Size Strategy

Read Master generates multiple image sizes during upload:

| Size   | Dimensions | Use Case                |
| ------ | ---------- | ----------------------- |
| thumb  | 150x150    | List views, small cards |
| medium | 400x400    | Cards, previews         |
| large  | 800x800    | Detail views, modals    |

### Book Covers

| Size   | Dimensions | Use Case             |
| ------ | ---------- | -------------------- |
| thumb  | 80x120     | Library grid, search |
| medium | 200x300    | Book cards, sidebars |
| large  | 400x600    | Book detail page     |

### Avatars

| Size   | Dimensions | Use Case                 |
| ------ | ---------- | ------------------------ |
| thumb  | 40x40      | Comments, small mentions |
| medium | 96x96      | Profile cards, headers   |
| large  | 200x200    | Profile page, settings   |

## Performance Best Practices

### 1. Use Appropriate Size

Always request the smallest size that fits your UI:

```typescript
// ✅ Good: Use thumb for small display
<BookCover src={getCDNUrlWithSize(coverUrl, 'thumb')} />

// ❌ Bad: Use full size for small display
<BookCover src={getCDNUrl(coverUrl)} style={{ width: 80 }} />
```

### 2. Lazy Load Below-the-Fold

```typescript
<OptimizedImage
  src={coverUrl}
  lazy={true}
  priority={false}
/>
```

### 3. Preload Critical Images

```typescript
// In your page component
useEffect(() => {
  preloadImages([getCDNUrl("hero/main-banner.jpg")], "high");
}, []);
```

### 4. Use WebP/AVIF When Possible

```typescript
// Let Cloudflare auto-negotiate format
const url = getCDNUrlWithTransform(imagePath, {
  format: "auto", // Serves WebP/AVIF based on browser support
});
```

### 5. Implement Progressive Loading

```typescript
<OptimizedImage
  src={getCDNUrlWithSize(imagePath, 'large')}
  placeholderSrc={getCDNUrlWithTransform(imagePath, {
    width: 20,
    blur: 10,
    quality: 10,
  })}
  blurAmount={20}
/>
```

## Cache Purging

### Manual Purge via Dashboard

1. Go to Caching > Configuration
2. Click "Purge Everything" or "Custom Purge"
3. Enter specific URLs to purge

### Programmatic Purge via API

```typescript
// Cache purge utility
async function purgeCache(urls: string[]): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: urls }),
    }
  );

  if (!response.ok) {
    throw new Error("Cache purge failed");
  }
}

// Usage after image update
await purgeCache([
  "https://cdn.readmaster.com/covers/book-123/cover.jpg",
  "https://cdn.readmaster.com/covers/book-123/cover-thumb.jpg",
  "https://cdn.readmaster.com/covers/book-123/cover-medium.jpg",
  "https://cdn.readmaster.com/covers/book-123/cover-large.jpg",
]);
```

## Monitoring

### Cloudflare Analytics

1. Go to Analytics > Traffic
2. Monitor:
   - Cache hit ratio (target: >90%)
   - Bandwidth saved
   - Request distribution by location

### Key Metrics

| Metric          | Target | Description                     |
| --------------- | ------ | ------------------------------- |
| Cache Hit Ratio | >90%   | % of requests served from cache |
| TTFB            | <200ms | Time to first byte              |
| Error Rate      | <0.1%  | 4xx/5xx responses               |

### Alerts

Set up alerts for:

- Cache hit ratio drops below 85%
- Error rate exceeds 1%
- Origin bandwidth spikes (indicates cache issues)

## Troubleshooting

### Issue: Images Not Loading

1. Check R2 bucket permissions
2. Verify CORS settings
3. Check DNS propagation for custom domain

### Issue: Stale Content

1. Check cache headers being sent
2. Verify cache rules are correctly configured
3. Try manual cache purge

### Issue: Slow Initial Load

1. Check origin response time
2. Verify CDN edge location
3. Enable HTTP/2 or HTTP/3

### Issue: Image Resizing Not Working

1. Verify Image Resizing is enabled in zone
2. Check URL format is correct
3. Ensure origin allows transformations

## Security Considerations

### Hotlink Protection

In Cloudflare Dashboard > Scrape Shield > Hotlink Protection:

- Enable protection
- Add allowed domains

### Signed URLs for Private Content

For sensitive content, use signed URLs with expiration:

```typescript
import { getSignedDownloadUrl } from "./services/storage";

// Generate time-limited URL
const signedUrl = await getSignedDownloadUrl(privateFilePath, {
  expiresIn: 3600, // 1 hour
});
```

### Content Security Policy

Add CDN domain to your CSP:

```typescript
// In your HTTP headers
'Content-Security-Policy': "img-src 'self' https://cdn.readmaster.com"
```

## Cost Optimization

### R2 Pricing (as of 2024)

- Storage: $0.015/GB/month
- Class A Operations (writes): $4.50/million
- Class B Operations (reads): $0.36/million
- Egress: **Free**

### Tips to Minimize Costs

1. **Optimize image sizes** before upload
2. **Use aggressive caching** to reduce origin reads
3. **Clean up unused assets** regularly
4. **Compress files** where appropriate

## Related Documentation

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Image Resizing](https://developers.cloudflare.com/images/image-resizing/)
- [Cloudflare Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/)
- [Read Master Storage Service](../apps/api/src/services/storage.ts)
- [OptimizedImage Component](../apps/web/src/components/common/OptimizedImage.tsx)
