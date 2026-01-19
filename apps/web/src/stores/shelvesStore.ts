/**
 * Shelves store for Read Master
 *
 * Manages custom book shelves with support for:
 * - CRUD operations on shelves
 * - Adding/removing books from shelves (books can be on multiple shelves)
 * - Reordering shelves
 * - localStorage persistence
 *
 * Shelves differ from Collections:
 * - Shelves are flat (no nesting/hierarchy)
 * - Books can be on multiple shelves simultaneously
 * - Designed for simple categorization (e.g., "To Read", "Favorites", "Sci-Fi")
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SHELVES_STORAGE_KEY = "read-master-shelves";

/**
 * Shelf icon options
 */
export const shelfIcons = [
  "shelf",
  "book",
  "star",
  "heart",
  "bookmark",
  "flag",
  "tag",
  "folder",
] as const;
export type ShelfIcon = (typeof shelfIcons)[number];

/**
 * Shelf interface
 */
export interface Shelf {
  /** Unique identifier */
  id: string;
  /** Shelf name */
  name: string;
  /** Optional description */
  description: string;
  /** Icon for the shelf */
  icon: ShelfIcon;
  /** Book IDs on this shelf */
  bookIds: string[];
  /** Display order */
  order: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Input for creating a shelf
 */
export interface CreateShelfInput {
  name: string;
  description?: string;
  icon?: ShelfIcon;
}

/**
 * Input for updating a shelf
 */
export interface UpdateShelfInput {
  id: string;
  name?: string;
  description?: string;
  icon?: ShelfIcon;
}

/**
 * Generate a unique ID for shelves
 */
export function generateShelfId(): string {
  return `shelf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate shelf name (1-50 chars, not empty)
 */
export function validateShelfName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
}

/**
 * Validate shelf icon
 */
export function validateShelfIcon(icon: string): ShelfIcon {
  return shelfIcons.includes(icon as ShelfIcon) ? (icon as ShelfIcon) : "shelf";
}

/**
 * Sanitize shelf data for persistence
 */
export function sanitizeShelf(shelf: Partial<Shelf>): Partial<Shelf> {
  const sanitized: Partial<Shelf> = {};

  if (typeof shelf.id === "string") {
    sanitized.id = shelf.id;
  }

  if (typeof shelf.name === "string") {
    sanitized.name = shelf.name.trim().slice(0, 50);
  }

  if (typeof shelf.description === "string") {
    sanitized.description = shelf.description.trim().slice(0, 200);
  }

  if (typeof shelf.icon === "string") {
    sanitized.icon = validateShelfIcon(shelf.icon);
  }

  if (Array.isArray(shelf.bookIds)) {
    sanitized.bookIds = shelf.bookIds.filter((id) => typeof id === "string");
  }

  if (typeof shelf.order === "number" && Number.isFinite(shelf.order)) {
    sanitized.order = shelf.order;
  }

  if (typeof shelf.createdAt === "number") {
    sanitized.createdAt = shelf.createdAt;
  }

  if (typeof shelf.updatedAt === "number") {
    sanitized.updatedAt = shelf.updatedAt;
  }

  return sanitized;
}

/**
 * Get shelves containing a specific book
 */
export function getShelvesForBook(shelves: Shelf[], bookId: string): Shelf[] {
  return shelves.filter((s) => s.bookIds.includes(bookId));
}

/**
 * Get all unique book IDs across shelves
 */
export function getAllBookIds(shelves: Shelf[]): string[] {
  const allIds = new Set<string>();
  for (const shelf of shelves) {
    for (const bookId of shelf.bookIds) {
      allIds.add(bookId);
    }
  }
  return Array.from(allIds);
}

interface ShelvesState {
  /** All shelves */
  shelves: Shelf[];
  /** Currently selected shelf ID for viewing */
  selectedShelfId: string | null;
}

interface ShelvesActions {
  /** Create a new shelf */
  createShelf: (input: CreateShelfInput) => Shelf;
  /** Update an existing shelf */
  updateShelf: (input: UpdateShelfInput) => boolean;
  /** Delete a shelf */
  deleteShelf: (id: string) => boolean;
  /** Add a book to a shelf */
  addBookToShelf: (shelfId: string, bookId: string) => boolean;
  /** Remove a book from a shelf */
  removeBookFromShelf: (shelfId: string, bookId: string) => boolean;
  /** Add a book to multiple shelves at once */
  addBookToShelves: (shelfIds: string[], bookId: string) => void;
  /** Remove a book from all shelves */
  removeBookFromAllShelves: (bookId: string) => void;
  /** Reorder shelves */
  reorderShelves: (orderedIds: string[]) => void;
  /** Select a shelf */
  selectShelf: (id: string | null) => void;
  /** Get all shelves sorted by order */
  getShelves: () => Shelf[];
  /** Get a shelf by ID */
  getShelf: (id: string) => Shelf | undefined;
  /** Get shelves containing a book */
  getShelvesForBook: (bookId: string) => Shelf[];
  /** Check if a book is on a shelf */
  isBookOnShelf: (shelfId: string, bookId: string) => boolean;
  /** Reset to default state */
  reset: () => void;
}

type ShelvesStore = ShelvesState & ShelvesActions;

const DEFAULT_STATE: ShelvesState = {
  shelves: [],
  selectedShelfId: null,
};

export const useShelvesStore = create<ShelvesStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Actions
      createShelf: (input: CreateShelfInput) => {
        const now = Date.now();

        // Get max order
        const maxOrder = get().shelves.reduce(
          (max, s) => Math.max(max, s.order),
          -1
        );

        const newShelf: Shelf = {
          id: generateShelfId(),
          name: input.name.trim().slice(0, 50),
          description: (input.description ?? "").trim().slice(0, 200),
          icon: validateShelfIcon(input.icon ?? "shelf"),
          bookIds: [],
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          shelves: [...state.shelves, newShelf],
        }));

        return newShelf;
      },

      updateShelf: (input: UpdateShelfInput) => {
        const { id, ...updates } = input;
        const shelf = get().shelves.find((s) => s.id === id);
        if (!shelf) return false;

        set((state) => ({
          shelves: state.shelves.map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...(updates.name !== undefined && {
                    name: updates.name.trim().slice(0, 50),
                  }),
                  ...(updates.description !== undefined && {
                    description: updates.description.trim().slice(0, 200),
                  }),
                  ...(updates.icon !== undefined && {
                    icon: validateShelfIcon(updates.icon),
                  }),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }));

        return true;
      },

      deleteShelf: (id: string) => {
        const shelf = get().shelves.find((s) => s.id === id);
        if (!shelf) return false;

        set((state) => ({
          shelves: state.shelves.filter((s) => s.id !== id),
          selectedShelfId:
            state.selectedShelfId === id ? null : state.selectedShelfId,
        }));

        return true;
      },

      addBookToShelf: (shelfId: string, bookId: string) => {
        const shelf = get().shelves.find((s) => s.id === shelfId);
        if (!shelf) return false;
        if (shelf.bookIds.includes(bookId)) return true; // Already added

        set((state) => ({
          shelves: state.shelves.map((s) =>
            s.id === shelfId
              ? {
                  ...s,
                  bookIds: [...s.bookIds, bookId],
                  updatedAt: Date.now(),
                }
              : s
          ),
        }));

        return true;
      },

      removeBookFromShelf: (shelfId: string, bookId: string) => {
        const shelf = get().shelves.find((s) => s.id === shelfId);
        if (!shelf) return false;

        set((state) => ({
          shelves: state.shelves.map((s) =>
            s.id === shelfId
              ? {
                  ...s,
                  bookIds: s.bookIds.filter((id) => id !== bookId),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }));

        return true;
      },

      addBookToShelves: (shelfIds: string[], bookId: string) => {
        set((state) => ({
          shelves: state.shelves.map((s) => {
            if (!shelfIds.includes(s.id)) return s;
            if (s.bookIds.includes(bookId)) return s;
            return {
              ...s,
              bookIds: [...s.bookIds, bookId],
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      removeBookFromAllShelves: (bookId: string) => {
        set((state) => ({
          shelves: state.shelves.map((s) =>
            s.bookIds.includes(bookId)
              ? {
                  ...s,
                  bookIds: s.bookIds.filter((id) => id !== bookId),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }));
      },

      reorderShelves: (orderedIds: string[]) => {
        set((state) => ({
          shelves: state.shelves.map((s) => {
            const newOrder = orderedIds.indexOf(s.id);
            if (newOrder === -1) return s;
            return { ...s, order: newOrder, updatedAt: Date.now() };
          }),
        }));
      },

      selectShelf: (id: string | null) => {
        set({ selectedShelfId: id });
      },

      getShelves: () => {
        return [...get().shelves].sort((a, b) => a.order - b.order);
      },

      getShelf: (id: string) => {
        return get().shelves.find((s) => s.id === id);
      },

      getShelvesForBook: (bookId: string) => {
        return get().shelves.filter((s) => s.bookIds.includes(bookId));
      },

      isBookOnShelf: (shelfId: string, bookId: string) => {
        const shelf = get().shelves.find((s) => s.id === shelfId);
        return shelf?.bookIds.includes(bookId) ?? false;
      },

      reset: () => {
        set(DEFAULT_STATE);
      },
    }),
    {
      name: SHELVES_STORAGE_KEY,
      partialize: (state) => ({
        shelves: state.shelves,
        // Note: selectedShelfId is not persisted (session-only)
      }),
    }
  )
);
