/**
 * SendGrid Webhook Handler Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./webhook.js";
import { db } from "../../src/services/db.js";

// Mock dependencies
vi.mock("../../src/utils/logger.js");

// Mock db with all necessary methods
vi.mock("../../src/services/db.js", () => ({
  db: {
    email: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userEmailPreferences: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("SendGrid Webhook Handler", () => {
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJson = vi.fn();
    mockStatus = vi.fn(() => ({ json: mockJson }));

    mockResponse = {
      status: mockStatus as never,
      json: mockJson,
    };

    process.env.SENDGRID_WEBHOOK_SECRET = "";
  });

  it("should reject non-POST requests", async () => {
    mockRequest = {
      method: "GET",
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    // sendError sends a structured error response
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 405,
        message: "METHOD_NOT_ALLOWED",
      },
    });
  });

  it("should process delivered event", async () => {
    const mockEmail = {
      id: "email-123",
      sendgridMessageId: "sg-msg-123",
      openedAt: null,
      clickedAt: null,
      metadata: {},
      userId: "user-123",
      toEmail: "test@example.com",
      toName: "Test User",
      templateId: null,
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "TRANSACTIONAL",
      tags: [],
      sendgridStatus: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      failedAt: null,
      openCount: 0,
      clickCount: 0,
      uniqueClickCount: 0,
      errorMessage: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(db.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(db.email.update).mockResolvedValue({ ...mockEmail, deliveredAt: new Date() } as any);

    const events = [
      {
        email: "test@example.com",
        timestamp: 1234567890,
        event: "delivered",
        sg_message_id: "sg-msg-123",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    expect(db.email.findUnique).toHaveBeenCalledWith({
      where: { sendgridMessageId: "sg-msg-123" },
    });

    expect(db.email.update).toHaveBeenCalledWith({
      where: { id: "email-123" },
      data: expect.objectContaining({
        sendgridStatus: "delivered",
        deliveredAt: expect.any(Date),
      }),
    });

    expect(mockStatus).toHaveBeenCalledWith(200);
  });

  it("should process open event and increment count", async () => {
    const mockEmail = {
      id: "email-123",
      sendgridMessageId: "sg-msg-123",
      openedAt: null,
      clickedAt: null,
      openCount: 0,
      metadata: {},
      userId: "user-123",
      toEmail: "test@example.com",
      toName: "Test User",
      templateId: null,
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "TRANSACTIONAL",
      tags: [],
      sendgridStatus: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      failedAt: null,
      clickCount: 0,
      uniqueClickCount: 0,
      errorMessage: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(db.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(db.email.update).mockResolvedValue({
      ...mockEmail,
      openedAt: new Date(),
      openCount: 1,
    } as any);

    const events = [
      {
        email: "test@example.com",
        timestamp: 1234567890,
        event: "open",
        sg_message_id: "sg-msg-123",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    expect(db.email.update).toHaveBeenCalledWith({
      where: { id: "email-123" },
      data: expect.objectContaining({
        sendgridStatus: "open",
        openedAt: expect.any(Date),
        openCount: { increment: 1 },
      }),
    });
  });

  it("should not set openedAt on subsequent opens", async () => {
    const mockEmail = {
      id: "email-123",
      sendgridMessageId: "sg-msg-123",
      openedAt: new Date("2023-01-01"),
      clickedAt: null,
      openCount: 1,
      metadata: {},
      userId: "user-123",
      toEmail: "test@example.com",
      toName: "Test User",
      templateId: null,
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "TRANSACTIONAL",
      tags: [],
      sendgridStatus: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      failedAt: null,
      clickCount: 0,
      uniqueClickCount: 0,
      errorMessage: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(db.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(db.email.update).mockResolvedValue({
      ...mockEmail,
      openCount: 2,
    } as any);

    const events = [
      {
        email: "test@example.com",
        timestamp: 1234567890,
        event: "open",
        sg_message_id: "sg-msg-123",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    const updateCall = vi.mocked(db.email.update).mock.calls[0]?.[0];
    expect(updateCall?.data).not.toHaveProperty("openedAt");
    expect(updateCall?.data).toHaveProperty("openCount", { increment: 1 });
  });

  it("should process click event and track URL", async () => {
    const mockEmail = {
      id: "email-123",
      sendgridMessageId: "sg-msg-123",
      openedAt: new Date(),
      clickedAt: null,
      openCount: 1,
      clickCount: 0,
      uniqueClickCount: 0,
      metadata: {},
      userId: "user-123",
      toEmail: "test@example.com",
      toName: "Test User",
      templateId: null,
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "TRANSACTIONAL",
      tags: [],
      sendgridStatus: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      failedAt: null,
      errorMessage: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(db.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(db.email.update).mockResolvedValue({
      ...mockEmail,
      clickedAt: new Date(),
      clickCount: 1,
      uniqueClickCount: 1,
      metadata: {
        clickedUrls: ["https://example.com"],
        lastClickedUrl: "https://example.com",
      },
    } as any);

    const events = [
      {
        email: "test@example.com",
        timestamp: 1234567890,
        event: "click",
        sg_message_id: "sg-msg-123",
        url: "https://example.com",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    expect(db.email.update).toHaveBeenCalledWith({
      where: { id: "email-123" },
      data: expect.objectContaining({
        clickedAt: expect.any(Date),
        clickCount: { increment: 1 },
        uniqueClickCount: { increment: 1 },
        metadata: expect.objectContaining({
          clickedUrls: ["https://example.com"],
          lastClickedUrl: "https://example.com",
        }),
      }),
    });
  });

  it("should process bounce event", async () => {
    const mockEmail = {
      id: "email-123",
      sendgridMessageId: "sg-msg-123",
      openedAt: null,
      clickedAt: null,
      metadata: {},
      userId: "user-123",
      toEmail: "test@example.com",
      toName: "Test User",
      templateId: null,
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "TRANSACTIONAL",
      tags: [],
      sendgridStatus: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      failedAt: null,
      openCount: 0,
      clickCount: 0,
      uniqueClickCount: 0,
      errorMessage: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(db.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(db.email.update).mockResolvedValue({
      ...mockEmail,
      bouncedAt: new Date(),
      bounceReason: "Invalid recipient",
    } as any);

    const events = [
      {
        email: "test@example.com",
        timestamp: 1234567890,
        event: "bounce",
        sg_message_id: "sg-msg-123",
        reason: "Invalid recipient",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    expect(db.email.update).toHaveBeenCalledWith({
      where: { id: "email-123" },
      data: expect.objectContaining({
        sendgridStatus: "bounce",
        bouncedAt: expect.any(Date),
        bounceReason: "Invalid recipient",
      }),
    });
  });

  it("should process unsubscribe event and update preferences", async () => {
    const mockEmail = {
      id: "email-123",
      sendgridMessageId: "sg-msg-123",
      openedAt: null,
      clickedAt: null,
      metadata: {},
      userId: "user-123",
      toEmail: "test@example.com",
      toName: "Test User",
      templateId: null,
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "ENGAGEMENT",
      tags: [],
      sendgridStatus: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      failedAt: null,
      openCount: 0,
      clickCount: 0,
      uniqueClickCount: 0,
      errorMessage: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(db.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(db.email.update).mockResolvedValue({
      ...mockEmail,
      unsubscribedAt: new Date(),
    } as any);

    const mockPrefs = {
      id: "pref-1",
      userId: "user-123",
      emailEnabled: false,
      marketingEmails: true,
      productUpdates: true,
      weeklyDigest: true,
      achievementEmails: true,
      recommendationEmails: true,
      socialEmails: true,
      digestFrequency: "weekly",
      unsubscribedAt: new Date(),
      unsubscribeToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.userEmailPreferences.upsert).mockResolvedValue(mockPrefs);

    const events = [
      {
        email: "test@example.com",
        timestamp: 1234567890,
        event: "unsubscribe",
        sg_message_id: "sg-msg-123",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    expect(db.email.update).toHaveBeenCalledWith({
      where: { id: "email-123" },
      data: expect.objectContaining({
        unsubscribedAt: expect.any(Date),
      }),
    });

    expect(db.userEmailPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      create: expect.objectContaining({
        userId: "user-123",
        emailEnabled: false,
      }),
      update: expect.objectContaining({
        emailEnabled: false,
      }),
    });
  });

  it("should handle multiple events in batch", async () => {
    const mockEmail1 = {
      id: "email-1",
      sendgridMessageId: "sg-msg-1",
      openedAt: null,
      clickedAt: null,
      metadata: {},
      userId: "user-123",
      toEmail: "test1@example.com",
      toName: "Test User 1",
      templateId: null,
      subject: "Test 1",
      htmlBody: "<p>Test 1</p>",
      textBody: "Test 1",
      category: "TRANSACTIONAL",
      tags: [],
      sendgridStatus: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      failedAt: null,
      openCount: 0,
      clickCount: 0,
      uniqueClickCount: 0,
      errorMessage: null,
      bounceReason: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const mockEmail2 = {
      ...mockEmail1,
      id: "email-2",
      sendgridMessageId: "sg-msg-2",
      toEmail: "test2@example.com",
    };

    vi.mocked(db.email.findUnique)
      .mockResolvedValueOnce(mockEmail1 as any)
      .mockResolvedValueOnce(mockEmail2 as any);

    vi.mocked(db.email.update)
      .mockResolvedValueOnce({ ...mockEmail1, deliveredAt: new Date() } as any)
      .mockResolvedValueOnce({ ...mockEmail2, openedAt: new Date(), openCount: 1 } as any);

    const events = [
      {
        email: "test1@example.com",
        timestamp: 1234567890,
        event: "delivered",
        sg_message_id: "sg-msg-1",
      },
      {
        email: "test2@example.com",
        timestamp: 1234567891,
        event: "open",
        sg_message_id: "sg-msg-2",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    expect(db.email.findUnique).toHaveBeenCalledTimes(2);
    expect(db.email.update).toHaveBeenCalledTimes(2);
    expect(mockStatus).toHaveBeenCalledWith(200);
  });

  it("should handle email not found gracefully", async () => {
    vi.mocked(db.email.findUnique).mockResolvedValue(null);

    const events = [
      {
        email: "test@example.com",
        timestamp: 1234567890,
        event: "delivered",
        sg_message_id: "sg-msg-nonexistent",
      },
    ];

    mockRequest = {
      method: "POST",
      body: events,
      headers: {},
    };

    await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

    expect(db.email.update).not.toHaveBeenCalled();
    expect(mockStatus).toHaveBeenCalledWith(200); // Still return 200
  });
});
