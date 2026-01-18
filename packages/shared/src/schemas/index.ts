/**
 * Zod validation schemas for API operations
 *
 * This module exports all validation schemas used for API request/response
 * validation. Schemas enforce data integrity and provide type inference.
 *
 * @example
 * ```typescript
 * import { createBookSchema, bookQuerySchema } from '@read-master/shared/schemas';
 * import { createAnnotationSchema, annotationSchemas } from '@read-master/shared/schemas';
 *
 * // Server-side validation
 * const result = createBookSchema.safeParse(req.body);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * const book = result.data; // Fully typed!
 *
 * // Annotation validation
 * const annotationResult = createAnnotationSchema.safeParse(req.body);
 * if (!annotationResult.success) {
 *   return res.status(400).json({ errors: annotationResult.error.flatten() });
 * }
 * ```
 */

// Book schemas
export * from "./books";

// Annotation schemas
export * from "./annotations";
