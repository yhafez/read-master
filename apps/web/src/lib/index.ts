export {
  // Client and configuration
  queryClient,
  createQueryClient,
  queryKeys,
  // Constants
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
  DEFAULT_RETRY_COUNT,
  // Error handling
  setGlobalErrorHandler,
  type QueryErrorHandler,
} from "./queryClient";

export {
  QueryProvider,
  TestQueryProvider,
  useTestQueryClient,
  type QueryProviderProps,
} from "./QueryProvider";
