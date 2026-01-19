/**
 * Collections store for Read Master
 *
 * Manages book collections/folders with support for:
 * - CRUD operations on collections
 * - Nested collections (parent-child relationships)
 * - Adding/removing books from collections
 * - Drag and drop reordering
 * - localStorage persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const COLLECTIONS_STORAGE_KEY = "read-master-collections";

/**
 * Collection color options
 */
export const collectionColors = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;
export type CollectionColor = (typeof collectionColors)[number];

/**
 * Collection interface
 */
export interface Collection {
  /** Unique identifier */
  id: string;
  /** Collection name */
  name: string;
  /** Optional description */
  description: string;
  /** Parent collection ID for nesting (null for root) */
  parentId: string | null;
  /** Color theme for the collection */
  color: CollectionColor;
  /** Book IDs in this collection */
  bookIds: string[];
  /** Display order within parent */
  order: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Input for creating a collection
 */
export interface CreateCollectionInput {
  name: string;
  description?: string;
  parentId?: string | null;
  color?: CollectionColor;
}

/**
 * Input for updating a collection
 */
export interface UpdateCollectionInput {
  id: string;
  name?: string;
  description?: string;
  parentId?: string | null;
  color?: CollectionColor;
}

/**
 * Generate a unique ID for collections
 */
export function generateCollectionId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate collection name (1-100 chars, not empty)
 */
export function validateCollectionName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

/**
 * Validate collection color
 */
export function validateCollectionColor(color: string): CollectionColor {
  return collectionColors.includes(color as CollectionColor)
    ? (color as CollectionColor)
    : "default";
}

/**
 * Check if moving a collection to a new parent would create a cycle
 */
export function wouldCreateCycle(
  collections: Collection[],
  collectionId: string,
  newParentId: string | null
): boolean {
  if (newParentId === null) return false;
  if (collectionId === newParentId) return true;

  // Walk up the tree from newParentId to check for cycles
  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId !== null) {
    if (visited.has(currentId)) return true; // Already found cycle
    if (currentId === collectionId) return true;
    visited.add(currentId);

    const parent = collections.find((c) => c.id === currentId);
    currentId = parent?.parentId ?? null;
  }

  return false;
}

/**
 * Get all descendant IDs of a collection (children, grandchildren, etc.)
 */
export function getDescendantIds(
  collections: Collection[],
  collectionId: string
): string[] {
  const descendants: string[] = [];
  const directChildren = collections.filter((c) => c.parentId === collectionId);

  for (const child of directChildren) {
    descendants.push(child.id);
    descendants.push(...getDescendantIds(collections, child.id));
  }

  return descendants;
}

/**
 * Get the path from root to a collection (for breadcrumbs)
 */
export function getCollectionPath(
  collections: Collection[],
  collectionId: string
): Collection[] {
  const path: Collection[] = [];
  let currentId: string | null = collectionId;

  while (currentId !== null) {
    const collection = collections.find((c) => c.id === currentId);
    if (!collection) break;
    path.unshift(collection);
    currentId = collection.parentId;
  }

  return path;
}

/**
 * Sanitize collection data for persistence
 */
export function sanitizeCollection(
  collection: Partial<Collection>
): Partial<Collection> {
  const sanitized: Partial<Collection> = {};

  if (typeof collection.id === "string") {
    sanitized.id = collection.id;
  }

  if (typeof collection.name === "string") {
    sanitized.name = collection.name.trim().slice(0, 100);
  }

  if (typeof collection.description === "string") {
    sanitized.description = collection.description.trim().slice(0, 500);
  }

  if (collection.parentId === null || typeof collection.parentId === "string") {
    sanitized.parentId = collection.parentId;
  }

  if (typeof collection.color === "string") {
    sanitized.color = validateCollectionColor(collection.color);
  }

  if (Array.isArray(collection.bookIds)) {
    sanitized.bookIds = collection.bookIds.filter(
      (id) => typeof id === "string"
    );
  }

  if (
    typeof collection.order === "number" &&
    Number.isFinite(collection.order)
  ) {
    sanitized.order = collection.order;
  }

  if (typeof collection.createdAt === "number") {
    sanitized.createdAt = collection.createdAt;
  }

  if (typeof collection.updatedAt === "number") {
    sanitized.updatedAt = collection.updatedAt;
  }

  return sanitized;
}

interface CollectionsState {
  /** All collections */
  collections: Collection[];
  /** Currently selected collection ID */
  selectedCollectionId: string | null;
  /** Expanded collection IDs (for tree view) */
  expandedIds: string[];
}

interface CollectionsActions {
  /** Create a new collection */
  createCollection: (input: CreateCollectionInput) => Collection;
  /** Update an existing collection */
  updateCollection: (input: UpdateCollectionInput) => boolean;
  /** Delete a collection (and optionally its children) */
  deleteCollection: (id: string, deleteChildren?: boolean) => boolean;
  /** Add a book to a collection */
  addBookToCollection: (collectionId: string, bookId: string) => boolean;
  /** Remove a book from a collection */
  removeBookFromCollection: (collectionId: string, bookId: string) => boolean;
  /** Move a collection to a new parent */
  moveCollection: (collectionId: string, newParentId: string | null) => boolean;
  /** Reorder collections within a parent */
  reorderCollections: (parentId: string | null, orderedIds: string[]) => void;
  /** Select a collection */
  selectCollection: (id: string | null) => void;
  /** Toggle collection expansion */
  toggleExpanded: (id: string) => void;
  /** Set expanded IDs */
  setExpandedIds: (ids: string[]) => void;
  /** Get root collections */
  getRootCollections: () => Collection[];
  /** Get children of a collection */
  getChildCollections: (parentId: string) => Collection[];
  /** Get a collection by ID */
  getCollection: (id: string) => Collection | undefined;
  /** Get collections containing a book */
  getCollectionsForBook: (bookId: string) => Collection[];
  /** Reset to default state */
  reset: () => void;
}

type CollectionsStore = CollectionsState & CollectionsActions;

const DEFAULT_STATE: CollectionsState = {
  collections: [],
  selectedCollectionId: null,
  expandedIds: [],
};

export const useCollectionsStore = create<CollectionsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Actions
      createCollection: (input: CreateCollectionInput) => {
        const now = Date.now();
        const parentId = input.parentId ?? null;

        // Get max order in parent
        const siblings = get().collections.filter(
          (c) => c.parentId === parentId
        );
        const maxOrder = siblings.reduce(
          (max, c) => Math.max(max, c.order),
          -1
        );

        const newCollection: Collection = {
          id: generateCollectionId(),
          name: input.name.trim().slice(0, 100),
          description: (input.description ?? "").trim().slice(0, 500),
          parentId,
          color: validateCollectionColor(input.color ?? "default"),
          bookIds: [],
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          collections: [...state.collections, newCollection],
        }));

        return newCollection;
      },

      updateCollection: (input: UpdateCollectionInput) => {
        const { id, ...updates } = input;
        const collection = get().collections.find((c) => c.id === id);
        if (!collection) return false;

        // Check for cycle if moving to new parent
        if (
          updates.parentId !== undefined &&
          updates.parentId !== collection.parentId
        ) {
          if (wouldCreateCycle(get().collections, id, updates.parentId)) {
            return false;
          }
        }

        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...(updates.name !== undefined && {
                    name: updates.name.trim().slice(0, 100),
                  }),
                  ...(updates.description !== undefined && {
                    description: updates.description.trim().slice(0, 500),
                  }),
                  ...(updates.parentId !== undefined && {
                    parentId: updates.parentId,
                  }),
                  ...(updates.color !== undefined && {
                    color: validateCollectionColor(updates.color),
                  }),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));

        return true;
      },

      deleteCollection: (id: string, deleteChildren = false) => {
        const collection = get().collections.find((c) => c.id === id);
        if (!collection) return false;

        if (deleteChildren) {
          // Delete collection and all descendants
          const descendantIds = getDescendantIds(get().collections, id);
          const idsToDelete = new Set([id, ...descendantIds]);

          set((state) => ({
            collections: state.collections.filter(
              (c) => !idsToDelete.has(c.id)
            ),
            selectedCollectionId:
              state.selectedCollectionId &&
              idsToDelete.has(state.selectedCollectionId)
                ? null
                : state.selectedCollectionId,
            expandedIds: state.expandedIds.filter(
              (eid) => !idsToDelete.has(eid)
            ),
          }));
        } else {
          // Move children to parent and delete only this collection
          set((state) => ({
            collections: state.collections
              .map((c) =>
                c.parentId === id ? { ...c, parentId: collection.parentId } : c
              )
              .filter((c) => c.id !== id),
            selectedCollectionId:
              state.selectedCollectionId === id
                ? null
                : state.selectedCollectionId,
            expandedIds: state.expandedIds.filter((eid) => eid !== id),
          }));
        }

        return true;
      },

      addBookToCollection: (collectionId: string, bookId: string) => {
        const collection = get().collections.find((c) => c.id === collectionId);
        if (!collection) return false;
        if (collection.bookIds.includes(bookId)) return true; // Already added

        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  bookIds: [...c.bookIds, bookId],
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));

        return true;
      },

      removeBookFromCollection: (collectionId: string, bookId: string) => {
        const collection = get().collections.find((c) => c.id === collectionId);
        if (!collection) return false;

        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  bookIds: c.bookIds.filter((id) => id !== bookId),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));

        return true;
      },

      moveCollection: (collectionId: string, newParentId: string | null) => {
        if (wouldCreateCycle(get().collections, collectionId, newParentId)) {
          return false;
        }

        // Get max order in new parent
        const siblings = get().collections.filter(
          (c) => c.parentId === newParentId && c.id !== collectionId
        );
        const maxOrder = siblings.reduce(
          (max, c) => Math.max(max, c.order),
          -1
        );

        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  parentId: newParentId,
                  order: maxOrder + 1,
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));

        return true;
      },

      reorderCollections: (parentId: string | null, orderedIds: string[]) => {
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.parentId !== parentId) return c;
            const newOrder = orderedIds.indexOf(c.id);
            if (newOrder === -1) return c;
            return { ...c, order: newOrder, updatedAt: Date.now() };
          }),
        }));
      },

      selectCollection: (id: string | null) => {
        set({ selectedCollectionId: id });
      },

      toggleExpanded: (id: string) => {
        set((state) => ({
          expandedIds: state.expandedIds.includes(id)
            ? state.expandedIds.filter((eid) => eid !== id)
            : [...state.expandedIds, id],
        }));
      },

      setExpandedIds: (ids: string[]) => {
        set({ expandedIds: ids });
      },

      getRootCollections: () => {
        return get()
          .collections.filter((c) => c.parentId === null)
          .sort((a, b) => a.order - b.order);
      },

      getChildCollections: (parentId: string) => {
        return get()
          .collections.filter((c) => c.parentId === parentId)
          .sort((a, b) => a.order - b.order);
      },

      getCollection: (id: string) => {
        return get().collections.find((c) => c.id === id);
      },

      getCollectionsForBook: (bookId: string) => {
        return get().collections.filter((c) => c.bookIds.includes(bookId));
      },

      reset: () => {
        set(DEFAULT_STATE);
      },
    }),
    {
      name: COLLECTIONS_STORAGE_KEY,
      partialize: (state) => ({
        collections: state.collections,
        expandedIds: state.expandedIds,
        // Note: selectedCollectionId is not persisted (session-only)
      }),
    }
  )
);
