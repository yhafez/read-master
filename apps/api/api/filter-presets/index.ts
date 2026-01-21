import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../src/middleware/auth.js";
import { withAuth } from "../../src/middleware/auth.js";
import { sendSuccess, sendError } from "../../src/utils/response.js";
import { db } from "../../src/services/db.js";

/**
 * Filter preset data schema
 */
const FilterPresetFiltersSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  progress: z
    .object({
      min: z.number().min(0).max(100),
      max: z.number().min(0).max(100),
    })
    .optional(),
  fileTypes: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  dateAdded: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  lastRead: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

/**
 * Create filter preset schema
 */
const CreateFilterPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  filters: FilterPresetFiltersSchema,
});

/**
 * GET /api/filter-presets - List user's filter presets
 * POST /api/filter-presets - Create new filter preset
 */
export default withAuth(async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  const userId = req.auth.userId;

  try {
    // Handle GET - List filter presets
    if (req.method === "GET") {
      const presets = await db.filterPreset.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          filters: true,
          useCount: true,
          lastUsed: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ isDefault: "desc" }, { lastUsed: "desc" }, { name: "asc" }],
      });

      return sendSuccess(res, { presets });
    }

    // Handle POST - Create filter preset
    if (req.method === "POST") {
      const parsed = CreateFilterPresetSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(
          res,
          "VALIDATION_ERROR",
          "Invalid request",
          400,
          parsed.error.errors
        );
      }

      const { name, description, isDefault, filters } = parsed.data;

      // If setting as default, unset any existing default
      if (isDefault) {
        await db.filterPreset.updateMany({
          where: {
            userId,
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Create the preset
      const preset = await db.filterPreset.create({
        data: {
          userId,
          name,
          description: description ?? null,
          isDefault: isDefault ?? false,
          filters,
        },
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          filters: true,
          useCount: true,
          lastUsed: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return sendSuccess(res, { preset }, 201);
    }

    // Method not allowed
    return sendError(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  } catch (error) {
    return sendError(
      res,
      "INTERNAL_ERROR",
      "Internal server error",
      500,
      error
    );
  }
});
