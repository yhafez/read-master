import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  requireRole,
  requireAdmin,
  requireModerator,
  requireSuperAdmin,
  hasRole,
  checkUserRole,
  type RoleAuthenticatedRequest,
} from "./requireAdmin.js";
import type { UserRole } from "@read-master/shared/types";

// Mock the database
vi.mock("@read-master/database", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock the auth middleware
vi.mock("./auth.js", () => ({
  authenticateRequest: vi.fn(),
}));

// Mock the logger
vi.mock("../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked modules
import { prisma } from "@read-master/database";
import { authenticateRequest } from "./auth.js";
import { logger } from "../utils/logger.js";

// Helper to create mock request
function createMockRequest(
  overrides: Partial<VercelRequest> = {}
): VercelRequest {
  return {
    method: "GET",
    headers: {},
    body: {},
    query: {},
    url: "/api/admin/test",
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

// Helper to create mock user
function createMockUser(role: UserRole = "USER") {
  return {
    id: "user_db_123",
    clerkId: "user_123",
    email: "user@example.com",
    username: "testuser",
    role,
    tier: "FREE" as const,
  };
}

describe("Role Hierarchy", () => {
  describe("hasRole", () => {
    it("should return true if user role equals required role", () => {
      expect(hasRole("USER", "USER")).toBe(true);
      expect(hasRole("MODERATOR", "MODERATOR")).toBe(true);
      expect(hasRole("ADMIN", "ADMIN")).toBe(true);
      expect(hasRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true);
    });

    it("should return true if user role is higher than required role", () => {
      expect(hasRole("MODERATOR", "USER")).toBe(true);
      expect(hasRole("ADMIN", "USER")).toBe(true);
      expect(hasRole("ADMIN", "MODERATOR")).toBe(true);
      expect(hasRole("SUPER_ADMIN", "USER")).toBe(true);
      expect(hasRole("SUPER_ADMIN", "MODERATOR")).toBe(true);
      expect(hasRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    });

    it("should return false if user role is lower than required role", () => {
      expect(hasRole("USER", "MODERATOR")).toBe(false);
      expect(hasRole("USER", "ADMIN")).toBe(false);
      expect(hasRole("USER", "SUPER_ADMIN")).toBe(false);
      expect(hasRole("MODERATOR", "ADMIN")).toBe(false);
      expect(hasRole("MODERATOR", "SUPER_ADMIN")).toBe(false);
      expect(hasRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    });

    it("should handle all role combinations correctly", () => {
      const roles: UserRole[] = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

      for (const userRole of roles) {
        for (const requiredRole of roles) {
          const roleHierarchy = {
            USER: 0,
            MODERATOR: 1,
            ADMIN: 2,
            SUPER_ADMIN: 3,
          };

          const expected =
            roleHierarchy[userRole] >= roleHierarchy[requiredRole];
          expect(hasRole(userRole, requiredRole)).toBe(expected);
        }
      }
    });
  });
});

describe("checkUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true if user has sufficient role", async () => {
    const mockUser = createMockUser("ADMIN");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

    const result = await checkUserRole("user_123", "ADMIN");
    expect(result).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        clerkId: "user_123",
        deletedAt: null,
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        role: true,
        tier: true,
      },
    });
  });

  it("should return false if user has insufficient role", async () => {
    const mockUser = createMockUser("USER");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

    const result = await checkUserRole("user_123", "ADMIN");
    expect(result).toBe(false);
  });

  it("should return false if user not found", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const result = await checkUserRole("user_123", "ADMIN");
    expect(result).toBe(false);
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call handler if user has sufficient role", async () => {
    const mockUser = createMockUser("ADMIN");
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: "admin@example.com",
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

    const handler = vi.fn().mockResolvedValue(undefined);
    const middleware = requireRole("ADMIN", handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).toHaveBeenCalled();
    const callArgs = handler.mock.calls[0];
    if (callArgs) {
      const authReq = callArgs[0] as RoleAuthenticatedRequest;
      expect(authReq.userRole).toBe("ADMIN");
      expect(authReq.userDbId).toBe("user_db_123");
    }

    // Should log access attempt
    expect(logger.info).toHaveBeenCalledWith(
      "Admin access attempt",
      expect.objectContaining({
        role: "ADMIN",
        success: true,
      })
    );
  });

  it("should return 401 if authentication fails", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: false,
      error: "No token provided",
      statusCode: 401,
    });

    const handler = vi.fn();
    const middleware = requireRole("ADMIN", handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(401);
    expect(res._jsonData).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "No token provided",
      },
    });
  });

  it("should return 403 if user not found in database", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: null,
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const handler = vi.fn();
    const middleware = requireRole("ADMIN", handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(403);
    expect(res._jsonData).toEqual({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "User not found in system",
      },
    });
    expect(logger.warn).toHaveBeenCalledWith("User not found in database", {
      clerkId: "user_123",
    });
  });

  it("should return 403 if user has insufficient role", async () => {
    const mockUser = createMockUser("USER");
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: null,
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
    const handler = vi.fn();
    const middleware = requireRole("ADMIN", handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(403);
    expect(res._jsonData).toEqual({
      success: false,
      error: {
        code: "FORBIDDEN",
        message:
          "This endpoint requires ADMIN role or higher. Your current role: USER",
      },
    });

    // Should log failed access attempt
    expect(logger.info).toHaveBeenCalledWith(
      "Admin access attempt",
      expect.objectContaining({
        role: "USER",
        success: false,
      })
    );
  });

  it("should allow higher roles to access lower role endpoints", async () => {
    const mockUser = createMockUser("SUPER_ADMIN");
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: null,
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

    const handler = vi.fn().mockResolvedValue(undefined);
    const middleware = requireRole("MODERATOR", handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).toHaveBeenCalled();
    const callArgs = handler.mock.calls[0];
    if (callArgs) {
      const authReq = callArgs[0] as RoleAuthenticatedRequest;
      expect(authReq.userRole).toBe("SUPER_ADMIN");
    }
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow ADMIN users", async () => {
    const mockUser = createMockUser("ADMIN");
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: null,
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

    const handler = vi.fn().mockResolvedValue(undefined);
    const middleware = requireAdmin(handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).toHaveBeenCalled();
  });

  it("should allow SUPER_ADMIN users", async () => {
    const mockUser = createMockUser("SUPER_ADMIN");
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: null,
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

    const handler = vi.fn().mockResolvedValue(undefined);
    const middleware = requireAdmin(handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).toHaveBeenCalled();
  });

  it("should block USER and MODERATOR users", async () => {
    const testRoles: UserRole[] = ["USER", "MODERATOR"];

    for (const role of testRoles) {
      vi.clearAllMocks();

      const mockUser = createMockUser(role);
      vi.mocked(authenticateRequest).mockResolvedValue({
        success: true,
        user: {
          userId: "user_123",
          email: null,
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: null,
          sessionId: "sess_123",
          orgId: null,
          orgRole: null,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
      const handler = vi.fn();
      const middleware = requireAdmin(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res as unknown as VercelResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(res._statusCode).toBe(403);
    }
  });
});

describe("requireModerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow MODERATOR, ADMIN, and SUPER_ADMIN users", async () => {
    const allowedRoles: UserRole[] = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

    for (const role of allowedRoles) {
      vi.clearAllMocks();

      const mockUser = createMockUser(role);
      vi.mocked(authenticateRequest).mockResolvedValue({
        success: true,
        user: {
          userId: "user_123",
          email: null,
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: null,
          sessionId: "sess_123",
          orgId: null,
          orgRole: null,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
      const handler = vi.fn().mockResolvedValue(undefined);
      const middleware = requireModerator(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res as unknown as VercelResponse);

      expect(handler).toHaveBeenCalled();
    }
  });

  it("should block USER", async () => {
    const mockUser = createMockUser("USER");
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: null,
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
    const handler = vi.fn();
    const middleware = requireModerator(handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(403);
  });
});

describe("requireSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should only allow SUPER_ADMIN users", async () => {
    const mockUser = createMockUser("SUPER_ADMIN");
    vi.mocked(authenticateRequest).mockResolvedValue({
      success: true,
      user: {
        userId: "user_123",
        email: null,
        firstName: null,
        lastName: null,
        imageUrl: null,
        username: null,
        sessionId: "sess_123",
        orgId: null,
        orgRole: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

    const handler = vi.fn().mockResolvedValue(undefined);
    const middleware = requireSuperAdmin(handler);

    const req = createMockRequest();
    const res = createMockResponse();

    await middleware(req, res as unknown as VercelResponse);

    expect(handler).toHaveBeenCalled();
  });

  it("should block USER, MODERATOR, and ADMIN users", async () => {
    const blockedRoles: UserRole[] = ["USER", "MODERATOR", "ADMIN"];

    for (const role of blockedRoles) {
      vi.clearAllMocks();

      const mockUser = createMockUser(role);
      vi.mocked(authenticateRequest).mockResolvedValue({
        success: true,
        user: {
          userId: "user_123",
          email: null,
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: null,
          sessionId: "sess_123",
          orgId: null,
          orgRole: null,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

      const handler = vi.fn();
      const middleware = requireSuperAdmin(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res as unknown as VercelResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(res._statusCode).toBe(403);
    }
  });
});
