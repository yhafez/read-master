/**
 * React Query hooks for filter presets
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { LibraryFilters } from "@/components/library";

/**
 * Filter preset from API
 */
export interface FilterPreset {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  filters: Partial<LibraryFilters>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a filter preset
 */
export interface CreateFilterPresetInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  filters: Partial<LibraryFilters>;
}

/**
 * Input for updating a filter preset
 */
export interface UpdateFilterPresetInput {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  filters?: Partial<LibraryFilters>;
}

/**
 * API response for list of presets
 */
interface FilterPresetsResponse {
  success: true;
  data: FilterPreset[];
}

/**
 * API response for single preset
 */
interface FilterPresetResponse {
  success: true;
  data: FilterPreset;
}

const FILTER_PRESETS_KEY = "filterPresets";

/**
 * Fetch all filter presets for the current user
 */
async function fetchFilterPresets(): Promise<FilterPreset[]> {
  const response = await fetch("/api/filter-presets");
  if (!response.ok) {
    throw new Error("Failed to fetch filter presets");
  }
  const data: FilterPresetsResponse = await response.json();
  return data.data;
}

/**
 * Fetch a single filter preset by ID
 */
async function fetchFilterPreset(id: string): Promise<FilterPreset> {
  const response = await fetch(`/api/filter-presets/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch filter preset");
  }
  const data: FilterPresetResponse = await response.json();
  return data.data;
}

/**
 * Create a new filter preset
 */
async function createFilterPreset(
  input: CreateFilterPresetInput
): Promise<FilterPreset> {
  const response = await fetch("/api/filter-presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to create filter preset");
  }
  const data: FilterPresetResponse = await response.json();
  return data.data;
}

/**
 * Update an existing filter preset
 */
async function updateFilterPreset(
  id: string,
  input: UpdateFilterPresetInput
): Promise<FilterPreset> {
  const response = await fetch(`/api/filter-presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to update filter preset");
  }
  const data: FilterPresetResponse = await response.json();
  return data.data;
}

/**
 * Delete a filter preset
 */
async function deleteFilterPreset(id: string): Promise<void> {
  const response = await fetch(`/api/filter-presets/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete filter preset");
  }
}

/**
 * Hook to fetch all filter presets
 */
export function useFilterPresets(): UseQueryResult<FilterPreset[], Error> {
  return useQuery({
    queryKey: [FILTER_PRESETS_KEY],
    queryFn: fetchFilterPresets,
  });
}

/**
 * Hook to fetch a single filter preset
 */
export function useFilterPreset(
  id: string
): UseQueryResult<FilterPreset, Error> {
  return useQuery({
    queryKey: [FILTER_PRESETS_KEY, id],
    queryFn: () => fetchFilterPreset(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a filter preset
 */
export function useCreateFilterPreset(): UseMutationResult<
  FilterPreset,
  Error,
  CreateFilterPresetInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFilterPreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FILTER_PRESETS_KEY] });
    },
  });
}

/**
 * Hook to update a filter preset
 */
export function useUpdateFilterPreset(): UseMutationResult<
  FilterPreset,
  Error,
  { id: string; input: UpdateFilterPresetInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }) => updateFilterPreset(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FILTER_PRESETS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [FILTER_PRESETS_KEY, data.id],
      });
    },
  });
}

/**
 * Hook to delete a filter preset
 */
export function useDeleteFilterPreset(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFilterPreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FILTER_PRESETS_KEY] });
    },
  });
}
