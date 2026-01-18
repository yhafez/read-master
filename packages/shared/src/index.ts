/**
 * @read-master/shared
 * Shared types, Zod schemas, and utilities
 *
 * @example
 * ```typescript
 * // Import utilities
 * import { truncate, slugify, containsProfanity } from '@read-master/shared';
 *
 * // Import types (from ./types subpath)
 * import type { User, Book, ApiResponse } from '@read-master/shared/types';
 *
 * // Import env utilities (from ./env subpath)
 * import { validateEnv } from '@read-master/shared/env';
 *
 * // Import schemas (from ./schemas subpath)
 * import { createBookSchema, bookQuerySchema } from '@read-master/shared/schemas';
 * ```
 */

// Export string utilities
export * from "./utils/string";

// Export moderation utilities
export * from "./utils/moderation";

// Note: Types are exported via the ./types subpath
// Note: Env utilities are exported via the ./env subpath
// Note: Schemas are exported via the ./schemas subpath
