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
 * Update filter preset schema
 */
const UpdateFilterPresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
  filters: FilterPresetFiltersSchema.optional(),
});

/**
 * GET /api/filter-presets/[id] - Get a specific filter preset
 * PUT /api/filter-presets/[id] - Update a filter preset
 * DELETE /api/filter-presets/[id] - Delete a filter preset
 */
export default withAuth(async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  const userId = req.auth.userId;

  try {
    // Get preset ID from URL
    const presetId = req.query.id as string;
    if (!presetId) {
      return sendError(res, "VALIDATION_ERROR", "Preset ID is required", 400);
    }

    // Handle GET - Get specific filter preset
    if (req.method === "GET") {
      const preset = await db.filterPreset.findFirst({
        where: {
          id: presetId,
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
      });

      if (!preset) {
        return sendError(res, "NOT_FOUND", "Filter preset not found", 404);
      }

      // Increment use count and update lastUsed
      await db.filterPreset.update({
        where: { id: presetId },
        data: {
          useCount: { increment: 1 },
          lastUsed: new Date(),
        },
      });

      return sendSuccess(res, { preset });
    }

    // Handle PUT - Update filter preset
    if (req.method === "PUT") {
      const parsed = UpdateFilterPresetSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(
          res,
          "VALIDATION_ERROR",
          "Invalid request",
          400,
          parsed.error.errors
        );
      }

      // Check if preset exists and belongs to user
      const existingPreset = await db.filterPreset.findFirst({
        where: {
          id: presetId,
          userId,
          deletedAt: null,
        },
      });

      if (!existingPreset) {
        return sendError(res, "NOT_FOUND", "Filter preset not found", 404);
      }

      const { name, description, isDefault, filters } = parsed.data;

      // If setting as default, unset any existing default
      if (isDefault) {
        await db.filterPreset.updateMany({
          where: {
            userId,
            isDefault: true,
            deletedAt: null,
            id: { not: presetId },
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Update the preset
      const preset = await db.filterPreset.update({
        where: { id: presetId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(isDefault !== undefined && { isDefault }),
          ...(filters !== undefined && { filters }),
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

      return sendSuccess(res, { preset });
    }

    // Handle DELETE - Soft delete filter preset
    if (req.method === "DELETE") {
      // Check if preset exists and belongs to user
      const existingPreset = await db.filterPreset.findFirst({
        where: {
          id: presetId,
          userId,
          deletedAt: null,
        },
      });

      if (!existingPreset) {
        return sendError(res, "NOT_FOUND", "Filter preset not found", 404);
      }

      // Soft delete
      await db.filterPreset.update({
        where: { id: presetId },
        data: {
          deletedAt: new Date(),
        },
      });

      return sendSuccess(res, { message: "Filter preset deleted" });
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
