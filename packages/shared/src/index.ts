/**
 * @read-master/shared
 * Shared types, Zod schemas, and utilities
 *
 * @example
 * ```typescript
 * // Import utilities
 * import { truncate, slugify } from '@read-master/shared';
 *
 * // Import types (from ./types subpath)
 * import type { User, Book, ApiResponse } from '@read-master/shared/types';
 *
 * // Import env utilities (from ./env subpath)
 * import { validateEnv } from '@read-master/shared/env';
 * ```
 */

// Export utilities
export * from "./utils/string";

// Note: Types are exported via the ./types subpath
// Note: Env utilities are exported via the ./env subpath
