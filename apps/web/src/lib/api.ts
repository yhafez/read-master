/**
 * API Client Utility
 *
 * Centralized HTTP client for making API requests with error handling
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestOptions extends RequestInit {
  baseUrl?: string;
}

/**
 * Make an authenticated API request
 *
 * @param url - API endpoint URL (relative or absolute)
 * @param options - Fetch options
 * @returns Promise resolving to response data
 * @throws ApiError on HTTP error responses
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { baseUrl = "", ...fetchOptions } = options;
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url;

  // Set default headers
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;

      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorCode = errorData.code;
        } catch {
          // Ignore JSON parse errors for error responses
        }
      }

      throw new ApiError(errorMessage, response.status, errorCode);
    }

    // Return parsed JSON or void for 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    if (isJson) {
      return await response.json();
    }

    // Non-JSON successful response
    return (await response.text()) as T;
  } catch (error) {
    // Re-throw ApiErrors as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors or other exceptions
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      undefined,
      "NETWORK_ERROR"
    );
  }
}

/**
 * Shorthand for GET requests
 */
export async function apiGet<T = unknown>(
  url: string,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "GET" });
}

/**
 * Shorthand for POST requests
 */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : null,
  });
}

/**
 * Shorthand for PUT requests
 */
export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : null,
  });
}

/**
 * Shorthand for PATCH requests
 */
export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : null,
  });
}

/**
 * Shorthand for DELETE requests
 */
export async function apiDelete<T = unknown>(
  url: string,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "DELETE" });
}
