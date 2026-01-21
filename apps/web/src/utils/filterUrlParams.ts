/**
 * Utility functions for persisting filter state in URL query parameters
 */

import type { LibraryFilters, DateRangeFilter } from "@/components/library";

/**
 * Serialize filters to URL search params
 */
export function filtersToSearchParams(
  filters: LibraryFilters
): URLSearchParams {
  const params = new URLSearchParams();

  // Status
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  // Search
  if (filters.search) {
    params.set("q", filters.search);
  }

  // Sort
  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  // Order
  if (filters.order) {
    params.set("order", filters.order);
  }

  // Genres (comma-separated)
  if (filters.genres.length > 0) {
    params.set("genres", filters.genres.join(","));
  }

  // Tags (comma-separated)
  if (filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }

  // Progress
  if (filters.progress !== "all") {
    params.set("progress", filters.progress);
  }

  // File type
  if (filters.fileType !== "all") {
    params.set("fileType", filters.fileType);
  }

  // Source
  if (filters.source !== "all") {
    params.set("source", filters.source);
  }

  // Date ranges
  if (filters.dateAdded.from) {
    params.set("addedFrom", filters.dateAdded.from.toISOString());
  }
  if (filters.dateAdded.to) {
    params.set("addedTo", filters.dateAdded.to.toISOString());
  }

  if (filters.dateStarted.from) {
    params.set("startedFrom", filters.dateStarted.from.toISOString());
  }
  if (filters.dateStarted.to) {
    params.set("startedTo", filters.dateStarted.to.toISOString());
  }

  if (filters.dateCompleted.from) {
    params.set("completedFrom", filters.dateCompleted.from.toISOString());
  }
  if (filters.dateCompleted.to) {
    params.set("completedTo", filters.dateCompleted.to.toISOString());
  }

  return params;
}

/**
 * Parse URL search params into filter state
 */
export function searchParamsToFilters(
  searchParams: URLSearchParams,
  defaultFilters: LibraryFilters
): LibraryFilters {
  const filters: LibraryFilters = { ...defaultFilters };

  // Status
  const status = searchParams.get("status");
  if (status && isValidStatus(status)) {
    filters.status = status as LibraryFilters["status"];
  }

  // Search
  const search = searchParams.get("q");
  if (search) {
    filters.search = search;
  }

  // Sort
  const sort = searchParams.get("sort");
  if (sort) {
    filters.sort = sort as LibraryFilters["sort"];
  }

  // Order
  const order = searchParams.get("order");
  if (order && (order === "asc" || order === "desc")) {
    filters.order = order;
  }

  // Genres
  const genres = searchParams.get("genres");
  if (genres) {
    filters.genres = genres.split(",").filter(Boolean);
  }

  // Tags
  const tags = searchParams.get("tags");
  if (tags) {
    filters.tags = tags.split(",").filter(Boolean);
  }

  // Progress
  const progress = searchParams.get("progress");
  if (progress && isValidProgress(progress)) {
    filters.progress = progress as LibraryFilters["progress"];
  }

  // File type
  const fileType = searchParams.get("fileType");
  if (fileType && isValidFileType(fileType)) {
    filters.fileType = fileType as LibraryFilters["fileType"];
  }

  // Source
  const source = searchParams.get("source");
  if (source && isValidSource(source)) {
    filters.source = source as LibraryFilters["source"];
  }

  // Date ranges
  filters.dateAdded = parseDateRange(
    searchParams.get("addedFrom"),
    searchParams.get("addedTo")
  );

  filters.dateStarted = parseDateRange(
    searchParams.get("startedFrom"),
    searchParams.get("startedTo")
  );

  filters.dateCompleted = parseDateRange(
    searchParams.get("completedFrom"),
    searchParams.get("completedTo")
  );

  return filters;
}

/**
 * Helper: Parse date range from URL params
 */
function parseDateRange(
  fromStr: string | null,
  toStr: string | null
): DateRangeFilter {
  const range: DateRangeFilter = { from: null, to: null };

  if (fromStr) {
    const fromDate = new Date(fromStr);
    if (!isNaN(fromDate.getTime())) {
      range.from = fromDate;
    }
  }

  if (toStr) {
    const toDate = new Date(toStr);
    if (!isNaN(toDate.getTime())) {
      range.to = toDate;
    }
  }

  return range;
}

/**
 * Validation helpers
 */
function isValidStatus(value: string): boolean {
  return ["all", "reading", "completed", "not_started", "abandoned"].includes(
    value
  );
}

function isValidProgress(value: string): boolean {
  return ["all", "0-25", "26-50", "51-75", "76-99", "100"].includes(value);
}

function isValidFileType(value: string): boolean {
  return ["all", "PDF", "EPUB", "DOC", "DOCX", "TXT", "HTML"].includes(value);
}

function isValidSource(value: string): boolean {
  return [
    "all",
    "UPLOAD",
    "URL",
    "PASTE",
    "GOOGLE_BOOKS",
    "OPEN_LIBRARY",
  ].includes(value);
}

/**
 * Compare two filter states for equality (ignoring sort/order)
 */
export function areFiltersEqual(
  a: Partial<LibraryFilters>,
  b: Partial<LibraryFilters>
): boolean {
  // Compare simple fields
  if (a.status !== b.status) return false;
  if (a.search !== b.search) return false;
  if (a.progress !== b.progress) return false;
  if (a.fileType !== b.fileType) return false;
  if (a.source !== b.source) return false;

  // Compare arrays
  if (!arrayEqual(a.genres, b.genres)) return false;
  if (!arrayEqual(a.tags, b.tags)) return false;

  // Compare date ranges
  if (!dateRangeEqual(a.dateAdded, b.dateAdded)) return false;
  if (!dateRangeEqual(a.dateStarted, b.dateStarted)) return false;
  if (!dateRangeEqual(a.dateCompleted, b.dateCompleted)) return false;

  return true;
}

function arrayEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}

function dateRangeEqual(
  a: DateRangeFilter | undefined,
  b: DateRangeFilter | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const aFromTime = a.from?.getTime() ?? null;
  const bFromTime = b.from?.getTime() ?? null;
  const aToTime = a.to?.getTime() ?? null;
  const bToTime = b.to?.getTime() ?? null;

  return aFromTime === bFromTime && aToTime === bToTime;
}
