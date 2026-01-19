export {
  useBooks,
  useBook,
  useUpdateBook,
  useDeleteBook,
  usePrefetchBook,
  type Book,
  type BookListFilters,
  type PaginatedResponse,
} from "./useBooks";

export {
  useFocusTrap,
  useFocusRestore,
  useFocusWithin,
  useRovingTabindex,
  useSkipLink,
  useFocusVisible,
  DEFAULT_FOCUS_TRAP_OPTIONS,
  FOCUSABLE_SELECTOR,
  type FocusTrapOptions,
  type FocusRestoreOptions,
  type FocusTrapReturn,
  type FocusRestoreReturn,
  type RovingTabindexOptions,
} from "./useFocusManagement";

export {
  useLeaderboard,
  type LeaderboardParams,
  type FullLeaderboardResponse,
  type LeaderboardEntry,
} from "./useLeaderboard";

export {
  useScreenReaderAnnouncement,
  useRouteAnnouncements,
  useLoadingAnnouncements,
  useErrorAnnouncements,
  useSuccessAnnouncements,
  useContentChangeAnnouncements,
} from "./useScreenReaderAnnouncement";

export { useGestureDetection } from "./useGestureDetection";

export {
  useOfflineReadingSync,
  type UseOfflineReadingSyncOptions,
  type UseOfflineReadingSyncReturn,
} from "./useOfflineReadingSync";
