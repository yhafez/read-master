import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  verifyClerkToken,
  authenticateRequest,
  verifyWebhookSignature,
  withAuth,
  withWebhook,
  optionalAuth,
  type AuthenticatedRequest,
  type ClerkWebhookEvent,
} from "./auth.js";
import crypto from "crypto";

// Mock the @clerk/backend module
vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({
    users: {
      getUser: vi.fn(),
    },
  })),
  verifyToken: vi.fn(),
}));

// Mock the logger module
vi.mock("../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked modules
import { verifyToken } from "@clerk/backend";
import { logger } from "../utils/logger.js";

// Helper to create a mock JWT payload
function createMockJwtPayload(overrides: Record<string, unknown> = {}) {
  return {
    __raw: "mock-raw-token",
    sub: "user_123",
    sid: "sess_456",
    iss: "https://clerk.dev",
    azp: "client_id",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    nbf: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

// Helper to create mock request
function createMockRequest(
  overrides: Partial<VercelRequest> = {}
): VercelRequest {
  return {
    method: "GET",
    headers: {},
    body: {},
    query: {},
    ...overrides,
  } as VercelRequest;
}

// Helper to create mock response
type MockResponse = {
  _statusCode: number;
  _jsonData: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    _statusCode: 200,
    _jsonData: null,
    status(code: number) {
      res._statusCode = code;
      return res;
    },
    json(data: unknown) {
      res._jsonData = data;
      return res;
    },
  };
  return res;
}

describe("Auth Middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.CLERK_SECRET_KEY = "sk_test_secret_key";
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test_webhook_secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("verifyClerkToken", () => {
    it("should return error when CLERK_SECRET_KEY is not configured", async () => {
      delete process.env.CLERK_SECRET_KEY;

      const result = await verifyClerkToken("some-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Authentication service not configured");
        expect(result.statusCode).toBe(500);
      }
    });

    it("should return success with user info for valid token", async () => {
      vi.mocked(verifyToken).mockResolvedValue(
        createMockJwtPayload({
          org_id: "org_789",
          org_role: "admin",
        })
      );

      const result = await verifyClerkToken("valid-token");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.userId).toBe("user_123");
        expect(result.user.sessionId).toBe("sess_456");
        expect(result.user.orgId).toBe("org_789");
        expect(result.user.orgRole).toBe("admin");
      }
    });

    it("should return success with user info without optional fields", async () => {
      vi.mocked(verifyToken).mockResolvedValue(
        createMockJwtPayload({
          sid: undefined,
          org_id: undefined,
          org_role: undefined,
        })
      );

      const result = await verifyClerkToken("valid-token");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.userId).toBe("user_123");
        expect(result.user.sessionId).toBe("");
        expect(result.user.orgId).toBeNull();
        expect(result.user.orgRole).toBeNull();
      }
    });

    it("should handle expired token error", async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error("Token has expired"));

      const result = await verifyClerkToken("expired-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Token expired");
        expect(result.statusCode).toBe(401);
      }
    });

    it("should handle invalid token error", async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error("Token is invalid"));

      const result = await verifyClerkToken("invalid-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid token");
        expect(result.statusCode).toBe(401);
      }
    });

    it("should handle generic authentication errors", async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error("Unknown error"));

      const result = await verifyClerkToken("bad-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Authentication failed");
        expect(result.statusCode).toBe(401);
      }
    });

    it("should handle non-Error rejection", async () => {
      vi.mocked(verifyToken).mockRejectedValue("string error");

      const result = await verifyClerkToken("bad-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Authentication failed");
        expect(result.statusCode).toBe(401);
      }
    });
  });

  describe("authenticateRequest", () => {
    it("should return error when no authorization header", async () => {
      const req = createMockRequest();

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No authorization token provided");
        expect(result.statusCode).toBe(401);
      }
    });

    it("should return error for invalid authorization format", async () => {
      const req = createMockRequest({
        headers: { authorization: "InvalidFormat token123" },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No authorization token provided");
        expect(result.statusCode).toBe(401);
      }
    });

    it("should return error for missing Bearer keyword", async () => {
      const req = createMockRequest({
        headers: { authorization: "Basic token123" },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No authorization token provided");
        expect(result.statusCode).toBe(401);
      }
    });

    it("should return error for too many parts in header", async () => {
      const req = createMockRequest({
        headers: { authorization: "Bearer token1 token2" },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No authorization token provided");
        expect(result.statusCode).toBe(401);
      }
    });

    it("should extract token and verify for valid Bearer token", async () => {
      vi.mocked(verifyToken).mockResolvedValue(createMockJwtPayload());

      const req = createMockRequest({
        headers: { authorization: "Bearer valid-token" },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(true);
      expect(verifyToken).toHaveBeenCalledWith("valid-token", {
        secretKey: "sk_test_secret_key",
      });
    });

    it("should be case-insensitive for Bearer keyword", async () => {
      vi.mocked(verifyToken).mockResolvedValue(createMockJwtPayload());

      const req = createMockRequest({
        headers: { authorization: "BEARER valid-token" },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(true);
    });
  });

  describe("verifyWebhookSignature", () => {
    const generateSignature = (
      payload: string,
      svixId: string,
      svixTimestamp: string,
      secret: string
    ): string => {
      const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;
      const secretKey = secret.startsWith("whsec_") ? secret.slice(6) : secret;
      const secretBytes = Buffer.from(secretKey, "base64");
      const signature = crypto
        .createHmac("sha256", secretBytes)
        .update(signedPayload)
        .digest("base64");
      return `v1,${signature}`;
    };

    it("should return false when CLERK_WEBHOOK_SECRET is not configured", () => {
      delete process.env.CLERK_WEBHOOK_SECRET;

      const result = verifyWebhookSignature("{}", {
        "svix-id": "msg_123",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,abc123",
      });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "CLERK_WEBHOOK_SECRET is not configured"
      );
    });

    it("should return false when svix-id is missing", () => {
      const result = verifyWebhookSignature("{}", {
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,abc123",
      });

      expect(result).toBe(false);
    });

    it("should return false when svix-timestamp is missing", () => {
      const result = verifyWebhookSignature("{}", {
        "svix-id": "msg_123",
        "svix-signature": "v1,abc123",
      });

      expect(result).toBe(false);
    });

    it("should return false when svix-signature is missing", () => {
      const result = verifyWebhookSignature("{}", {
        "svix-id": "msg_123",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
      });

      expect(result).toBe(false);
    });

    it("should return false when timestamp is too old", () => {
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 400); // 400 seconds ago

      const result = verifyWebhookSignature("{}", {
        "svix-id": "msg_123",
        "svix-timestamp": oldTimestamp,
        "svix-signature": "v1,abc123",
      });

      expect(result).toBe(false);
    });

    it("should return false when timestamp is in the future", () => {
      const futureTimestamp = String(Math.floor(Date.now() / 1000) + 400); // 400 seconds in future

      const result = verifyWebhookSignature("{}", {
        "svix-id": "msg_123",
        "svix-timestamp": futureTimestamp,
        "svix-signature": "v1,abc123",
      });

      expect(result).toBe(false);
    });

    it("should return false for invalid signature", () => {
      const timestamp = String(Math.floor(Date.now() / 1000));

      const result = verifyWebhookSignature("{}", {
        "svix-id": "msg_123",
        "svix-timestamp": timestamp,
        "svix-signature": "v1,invalidbase64signature==",
      });

      expect(result).toBe(false);
    });

    it("should return false for non-v1 signature version", () => {
      const timestamp = String(Math.floor(Date.now() / 1000));

      const result = verifyWebhookSignature("{}", {
        "svix-id": "msg_123",
        "svix-timestamp": timestamp,
        "svix-signature": "v2,abc123",
      });

      expect(result).toBe(false);
    });

    it("should return true for valid signature with whsec_ prefix", () => {
      // Use a properly base64-encoded secret
      const base64Secret = Buffer.from("test-secret-key-123").toString(
        "base64"
      );
      process.env.CLERK_WEBHOOK_SECRET = `whsec_${base64Secret}`;

      const payload = '{"type":"user.created"}';
      const svixId = "msg_123";
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = generateSignature(
        payload,
        svixId,
        timestamp,
        process.env.CLERK_WEBHOOK_SECRET
      );

      const result = verifyWebhookSignature(payload, {
        "svix-id": svixId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      });

      expect(result).toBe(true);
    });

    it("should return true for valid signature without whsec_ prefix", () => {
      const base64Secret = Buffer.from("test-secret-key-456").toString(
        "base64"
      );
      process.env.CLERK_WEBHOOK_SECRET = base64Secret;

      const payload = '{"type":"user.updated"}';
      const svixId = "msg_456";
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = generateSignature(
        payload,
        svixId,
        timestamp,
        process.env.CLERK_WEBHOOK_SECRET
      );

      const result = verifyWebhookSignature(payload, {
        "svix-id": svixId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      });

      expect(result).toBe(true);
    });

    it("should accept multiple signatures and match any", () => {
      const base64Secret = Buffer.from("test-secret-key-789").toString(
        "base64"
      );
      process.env.CLERK_WEBHOOK_SECRET = base64Secret;

      const payload = '{"type":"user.deleted"}';
      const svixId = "msg_789";
      const timestamp = String(Math.floor(Date.now() / 1000));
      const validSignature = generateSignature(
        payload,
        svixId,
        timestamp,
        process.env.CLERK_WEBHOOK_SECRET
      );

      // Multiple signatures separated by space
      const multipleSignatures = `v1,invalid123== ${validSignature}`;

      const result = verifyWebhookSignature(payload, {
        "svix-id": svixId,
        "svix-timestamp": timestamp,
        "svix-signature": multipleSignatures,
      });

      expect(result).toBe(true);
    });
  });

  describe("withAuth", () => {
    it("should return 401 for unauthenticated request", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(res._statusCode).toBe(401);
      expect(res._jsonData).toEqual({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "No authorization token provided",
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid token", async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error("Token is invalid"));

      const req = createMockRequest({
        headers: { authorization: "Bearer invalid-token" },
      });
      const res = createMockResponse();

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(res._statusCode).toBe(401);
      expect(res._jsonData).toEqual({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token",
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should call handler with authenticated user for valid token", async () => {
      vi.mocked(verifyToken).mockResolvedValue(createMockJwtPayload());

      const req = createMockRequest({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = createMockResponse();

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(handler).toHaveBeenCalledTimes(1);
      const calledReq = handler.mock.calls[0]?.[0] as AuthenticatedRequest;
      expect(calledReq.auth).toBeDefined();
      expect(calledReq.auth.userId).toBe("user_123");
      expect(calledReq.auth.sessionId).toBe("sess_456");
    });

    it("should handle async handlers", async () => {
      vi.mocked(verifyToken).mockResolvedValue(createMockJwtPayload());

      const req = createMockRequest({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = createMockResponse();

      const handler = vi.fn(async (authReq: AuthenticatedRequest) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        res.status(200).json({ userId: authReq.auth.userId });
      });
      const wrappedHandler = withAuth(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(res._statusCode).toBe(200);
      expect(res._jsonData).toEqual({ userId: "user_123" });
    });
  });

  describe("withWebhook", () => {
    it("should return 405 for non-POST requests", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      const handler = vi.fn();
      const wrappedHandler = withWebhook(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(res._statusCode).toBe(405);
      expect(res._jsonData).toEqual({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST requests are allowed for webhooks",
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid signature", async () => {
      const req = createMockRequest({
        method: "POST",
        body: '{"type":"user.created"}',
        headers: {
          "svix-id": "msg_123",
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
          "svix-signature": "v1,invalid==",
        },
      });
      const res = createMockResponse();

      const handler = vi.fn();
      const wrappedHandler = withWebhook(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(res._statusCode).toBe(401);
      expect(res._jsonData).toEqual({
        success: false,
        error: {
          code: "INVALID_SIGNATURE",
          message: "Invalid webhook signature",
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should call handler with parsed event for valid signature", async () => {
      const base64Secret = Buffer.from("test-secret-webhook").toString(
        "base64"
      );
      process.env.CLERK_WEBHOOK_SECRET = `whsec_${base64Secret}`;

      const payload =
        '{"type":"user.created","data":{"id":"user_123"},"object":"event"}';
      const svixId = "msg_123";
      const timestamp = String(Math.floor(Date.now() / 1000));

      // Generate valid signature
      const signedPayload = `${svixId}.${timestamp}.${payload}`;
      const secretBytes = Buffer.from(base64Secret, "base64");
      const signature = crypto
        .createHmac("sha256", secretBytes)
        .update(signedPayload)
        .digest("base64");

      const req = createMockRequest({
        method: "POST",
        body: payload,
        headers: {
          "svix-id": svixId,
          "svix-timestamp": timestamp,
          "svix-signature": `v1,${signature}`,
        },
      });
      const res = createMockResponse();

      const handler = vi.fn();
      const wrappedHandler = withWebhook(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(handler).toHaveBeenCalledTimes(1);
      const calledEvent = handler.mock.calls[0]?.[2] as ClerkWebhookEvent;
      expect(calledEvent.type).toBe("user.created");
      expect(calledEvent.data).toEqual({ id: "user_123" });
    });

    it("should handle object body (already parsed JSON)", async () => {
      const base64Secret = Buffer.from("test-secret-obj").toString("base64");
      process.env.CLERK_WEBHOOK_SECRET = `whsec_${base64Secret}`;

      const bodyObj = {
        type: "user.updated",
        data: { id: "user_456" },
        object: "event",
      };
      const payload = JSON.stringify(bodyObj);
      const svixId = "msg_456";
      const timestamp = String(Math.floor(Date.now() / 1000));

      // Generate valid signature
      const signedPayload = `${svixId}.${timestamp}.${payload}`;
      const secretBytes = Buffer.from(base64Secret, "base64");
      const signature = crypto
        .createHmac("sha256", secretBytes)
        .update(signedPayload)
        .digest("base64");

      const req = createMockRequest({
        method: "POST",
        body: bodyObj, // Object instead of string
        headers: {
          "svix-id": svixId,
          "svix-timestamp": timestamp,
          "svix-signature": `v1,${signature}`,
        },
      });
      const res = createMockResponse();

      const handler = vi.fn();
      const wrappedHandler = withWebhook(handler);

      await wrappedHandler(req, res as unknown as VercelResponse);

      expect(handler).toHaveBeenCalledTimes(1);
      const calledEvent = handler.mock.calls[0]?.[2] as ClerkWebhookEvent;
      expect(calledEvent.type).toBe("user.updated");
    });
  });

  describe("optionalAuth", () => {
    it("should return null when no authorization header", async () => {
      const req = createMockRequest();

      const result = await optionalAuth(req);

      expect(result).toBeNull();
    });

    it("should return null for invalid token", async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error("Token is invalid"));

      const req = createMockRequest({
        headers: { authorization: "Bearer invalid-token" },
      });

      const result = await optionalAuth(req);

      expect(result).toBeNull();
    });

    it("should return user info for valid token", async () => {
      vi.mocked(verifyToken).mockResolvedValue(createMockJwtPayload());

      const req = createMockRequest({
        headers: { authorization: "Bearer valid-token" },
      });

      const result = await optionalAuth(req);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe("user_123");
      expect(result?.sessionId).toBe("sess_456");
    });

    it("should return null for invalid bearer format", async () => {
      const req = createMockRequest({
        headers: { authorization: "Basic invalid" },
      });

      const result = await optionalAuth(req);

      expect(result).toBeNull();
    });
  });
});
