/**
 * React Query hooks for Stripe payment operations
 */

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface CreateCheckoutSessionRequest {
  tier: "PRO" | "SCHOLAR";
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface BillingPortalRequest {
  returnUrl?: string;
}

export interface BillingPortalResponse {
  url: string;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a Stripe Checkout session for upgrading to Pro or Scholar
 */
export function useCreateCheckoutSession(options?: {
  onSuccess?: (data: CreateCheckoutSessionResponse) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: async (
      request: CreateCheckoutSessionRequest
    ): Promise<CreateCheckoutSessionResponse> => {
      logger.info("Creating checkout session", { tier: request.tier });

      const response = await apiRequest<CreateCheckoutSessionResponse>(
        "/api/payments/create-checkout-session",
        {
          method: "POST",
          body: JSON.stringify(request),
        }
      );

      return response;
    },
    onSuccess: (data, variables) => {
      logger.info("Checkout session created", {
        tier: variables.tier,
        sessionId: data.sessionId,
      });
      options?.onSuccess?.(data);
    },
    onError: (error: Error, variables) => {
      logger.error("Failed to create checkout session", {
        tier: variables.tier,
        error: error.message,
      });
      options?.onError?.(error);
    },
  });
}

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export function useCreateBillingPortalSession(options?: {
  onSuccess?: (data: BillingPortalResponse) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: async (
      request: BillingPortalRequest = {}
    ): Promise<BillingPortalResponse> => {
      logger.info("Creating billing portal session");

      const response = await apiRequest<BillingPortalResponse>(
        "/api/payments/customer-portal",
        {
          method: "POST",
          body: JSON.stringify(request),
        }
      );

      return response;
    },
    onSuccess: (data) => {
      logger.info("Billing portal session created");
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      logger.error("Failed to create billing portal session", {
        error: error.message,
      });
      options?.onError?.(error);
    },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Redirect to Stripe Checkout
 */
export function redirectToCheckout(url: string): void {
  window.location.href = url;
}

/**
 * Redirect to Stripe Customer Portal
 */
export function redirectToCustomerPortal(url: string): void {
  window.location.href = url;
}
