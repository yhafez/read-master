/**
 * Email Service
 *
 * Handles sending emails via SendGrid and tracking email events.
 * Provides a simple interface for sending transactional and marketing emails.
 */

import sgMail from "@sendgrid/mail";
import type { MailDataRequired } from "@sendgrid/mail";
import type { Prisma } from "@read-master/database";
import { db } from "./db.js";
import { logger } from "../utils/logger.js";

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL || "no-reply@readmaster.ai";
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "Read Master";
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";
const SEND_REAL_EMAILS = process.env.EMAIL_SEND_REAL_EMAILS === "true";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Email categories
export type EmailCategory =
  | "TRANSACTIONAL"
  | "WELCOME"
  | "ONBOARDING"
  | "ENGAGEMENT"
  | "CONVERSION"
  | "DIGEST"
  | "ANNOUNCEMENT"
  | "SYSTEM";

// Email sending options
export interface SendEmailOptions {
  to: string; // Recipient email
  toName?: string; // Recipient name
  subject: string;
  htmlBody: string;
  textBody: string;
  category: EmailCategory;
  templateName?: string; // For tracking which template was used
  metadata?: Record<string, unknown>; // Additional data to store
  tags?: string[]; // Tags for filtering
  replyTo?: string; // Reply-to address
}

// Template rendering options
export interface RenderTemplateOptions {
  templateName: string;
  variables: Record<string, unknown>;
  userId?: string;
}

// Email sending result
export interface SendEmailResult {
  success: boolean;
  emailId?: string; // Database ID
  sendgridMessageId?: string; // SendGrid message ID
  error?: string;
}

/**
 * Check if email service is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL);
}

/**
 * Check if emails should be sent (not just logged)
 */
export function shouldSendRealEmails(): boolean {
  return EMAIL_ENABLED && SEND_REAL_EMAILS && isEmailServiceConfigured();
}

/**
 * Send an email via SendGrid and track in database
 */
export async function sendEmail(
  userId: string,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  try {
    // Check if user has opted out of emails
    const emailPrefs = await db.userEmailPreferences.findUnique({
      where: { userId },
    });

    if (emailPrefs && !emailPrefs.emailEnabled) {
      logger.info("User has opted out of emails", {
        userId,
        email: options.to,
      });
      return {
        success: false,
        error: "User has opted out of emails",
      };
    }

    // Check category-specific preferences
    if (emailPrefs && options.category !== "TRANSACTIONAL") {
      const shouldSkip = shouldSkipEmailByCategory(
        emailPrefs,
        options.category
      );
      if (shouldSkip) {
        logger.info("User has opted out of this email category", {
          userId,
          category: options.category,
        });
        return {
          success: false,
          error: `User has opted out of ${options.category} emails`,
        };
      }
    }

    // Find template if specified
    let template = null;
    if (options.templateName) {
      template = await db.emailTemplate.findUnique({
        where: { name: options.templateName },
      });
    }

    // Create email record in database
    const email = await db.email.create({
      data: {
        userId,
        toEmail: options.to,
        ...(options.toName !== undefined && { toName: options.toName }),
        ...(template?.id !== undefined && { templateId: template.id }),
        subject: options.subject,
        htmlBody: options.htmlBody,
        textBody: options.textBody,
        category: options.category,
        tags: options.tags || [],
        metadata: (options.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    // If real emails are disabled, just log and return
    if (!shouldSendRealEmails()) {
      logger.info("Email logged (not sent - SEND_REAL_EMAILS=false)", {
        emailId: email.id,
        to: options.to,
        subject: options.subject,
        category: options.category,
      });

      // Update email record with "logged" status
      await db.email.update({
        where: { id: email.id },
        data: {
          sendgridStatus: "logged",
          sentAt: new Date(),
        },
      });

      return {
        success: true,
        emailId: email.id,
      };
    }

    // Send via SendGrid
    const msg: MailDataRequired = {
      to: {
        email: options.to,
        ...(options.toName && { name: options.toName }),
      },
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      subject: options.subject,
      text: options.textBody,
      html: options.htmlBody,
      ...(options.replyTo && { replyTo: options.replyTo }),
      categories: [options.category, ...(options.tags || [])],
      customArgs: {
        emailId: email.id,
        userId,
      },
    };

    const [response] = await sgMail.send(msg);

    // Extract SendGrid message ID from response headers
    const sendgridMessageId = response.headers["x-message-id"] as string;

    // Update email record with SendGrid info
    await db.email.update({
      where: { id: email.id },
      data: {
        sendgridMessageId,
        sendgridStatus: "processed",
        sentAt: new Date(),
      },
    });

    // Increment template sent count
    if (template) {
      await db.emailTemplate.update({
        where: { id: template.id },
        data: {
          sentCount: {
            increment: 1,
          },
        },
      });
    }

    logger.info("Email sent successfully", {
      emailId: email.id,
      sendgridMessageId,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: true,
      emailId: email.id,
      sendgridMessageId,
    };
  } catch (error) {
    logger.error("Failed to send email", {
      error: error instanceof Error ? error.message : String(error),
      to: options.to,
      subject: options.subject,
    });

    // Try to update email record with error (if it was created)
    if (error instanceof Error) {
      try {
        const failedEmail = await db.email.findFirst({
          where: {
            userId,
            toEmail: options.to,
            subject: options.subject,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (failedEmail) {
          await db.email.update({
            where: { id: failedEmail.id },
            data: {
              sendgridStatus: "failed",
              errorMessage: error.message,
              failedAt: new Date(),
            },
          });
        }
      } catch (updateError) {
        logger.error("Failed to update email record with error", {
          updateError,
        });
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if email should be skipped based on user preferences
 */
function shouldSkipEmailByCategory(
  prefs: {
    marketingEmails: boolean;
    productUpdates: boolean;
    weeklyDigest: boolean;
    achievementEmails: boolean;
    recommendationEmails: boolean;
    socialEmails: boolean;
  },
  category: EmailCategory
): boolean {
  switch (category) {
    case "WELCOME":
    case "ONBOARDING":
      return !prefs.marketingEmails;
    case "ENGAGEMENT":
      return !prefs.achievementEmails;
    case "CONVERSION":
      return !prefs.marketingEmails;
    case "DIGEST":
      return !prefs.weeklyDigest;
    case "ANNOUNCEMENT":
      return !prefs.productUpdates;
    case "SYSTEM":
      return false; // System emails always send
    case "TRANSACTIONAL":
      return false; // Transactional emails always send
    default:
      return false;
  }
}

/**
 * Render an email template with variables
 */
export async function renderTemplate(
  options: RenderTemplateOptions
): Promise<{ subject: string; htmlBody: string; textBody: string } | null> {
  try {
    const template = await db.emailTemplate.findUnique({
      where: { name: options.templateName },
    });

    if (!template || !template.isActive) {
      logger.warn("Template not found or inactive", {
        templateName: options.templateName,
      });
      return null;
    }

    // Simple variable replacement (can be enhanced with Handlebars later)
    const subject = replaceVariables(template.subject, options.variables);
    const htmlBody = replaceVariables(template.htmlBody, options.variables);
    const textBody = replaceVariables(template.textBody, options.variables);

    return {
      subject,
      htmlBody,
      textBody,
    };
  } catch (error) {
    logger.error("Failed to render template", {
      error: error instanceof Error ? error.message : String(error),
      templateName: options.templateName,
    });
    return null;
  }
}

/**
 * Simple variable replacement in template strings
 * Replaces {{variable}} with values from the variables object
 */
function replaceVariables(
  template: string,
  variables: Record<string, unknown>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(regex, String(value ?? ""));
  }

  return result;
}

/**
 * Send email using a template
 */
export async function sendTemplateEmail(
  userId: string,
  templateName: string,
  to: string,
  variables: Record<string, unknown>,
  options?: {
    toName?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    replyTo?: string;
  }
): Promise<SendEmailResult> {
  try {
    // Render template
    const rendered = await renderTemplate({
      templateName,
      variables,
      userId,
    });

    if (!rendered) {
      return {
        success: false,
        error: "Failed to render template",
      };
    }

    // Get template for category
    const template = await db.emailTemplate.findUnique({
      where: { name: templateName },
    });

    if (!template) {
      return {
        success: false,
        error: "Template not found",
      };
    }

    // Send email
    return await sendEmail(userId, {
      to,
      ...(options?.toName && { toName: options.toName }),
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      textBody: rendered.textBody,
      category: template.category,
      templateName,
      ...(options?.tags && { tags: options.tags }),
      ...(options?.metadata && { metadata: options.metadata }),
      ...(options?.replyTo && { replyTo: options.replyTo }),
    });
  } catch (error) {
    logger.error("Failed to send template email", {
      error: error instanceof Error ? error.message : String(error),
      templateName,
      to,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update email preferences for a user
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: {
    emailEnabled?: boolean;
    marketingEmails?: boolean;
    productUpdates?: boolean;
    weeklyDigest?: boolean;
    achievementEmails?: boolean;
    recommendationEmails?: boolean;
    socialEmails?: boolean;
    digestFrequency?: string;
  }
): Promise<void> {
  await db.userEmailPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...preferences,
    },
    update: preferences,
  });

  logger.info("Email preferences updated", { userId, preferences });
}

/**
 * Get email preferences for a user
 */
export async function getEmailPreferences(userId: string) {
  const prefs = await db.userEmailPreferences.findUnique({
    where: { userId },
  });

  // Return defaults if no preferences found
  if (!prefs) {
    return {
      emailEnabled: true,
      marketingEmails: true,
      productUpdates: true,
      weeklyDigest: true,
      achievementEmails: true,
      recommendationEmails: true,
      socialEmails: true,
      digestFrequency: "weekly",
    };
  }

  return prefs;
}

/**
 * Unsubscribe user from all emails (one-click unsubscribe)
 */
export async function unsubscribeUser(userId: string): Promise<void> {
  await db.userEmailPreferences.upsert({
    where: { userId },
    create: {
      userId,
      emailEnabled: false,
      unsubscribedAt: new Date(),
    },
    update: {
      emailEnabled: false,
      unsubscribedAt: new Date(),
    },
  });

  logger.info("User unsubscribed from all emails", { userId });
}

/**
 * Get email statistics for a user
 */
export async function getUserEmailStats(userId: string) {
  const stats = await db.email.groupBy({
    by: ["category"],
    where: {
      userId,
      deletedAt: null,
    },
    _count: {
      id: true,
    },
    _sum: {
      openCount: true,
      clickCount: true,
    },
  });

  return stats.map((stat) => ({
    category: stat.category,
    sent: stat._count.id,
    opens: stat._sum.openCount || 0,
    clicks: stat._sum.clickCount || 0,
  }));
}

/**
 * Get recent emails for a user (for debugging/admin)
 */
export async function getUserRecentEmails(userId: string, limit = 10) {
  return await db.email.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      toEmail: true,
      subject: true,
      category: true,
      sendgridStatus: true,
      sentAt: true,
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      openCount: true,
      clickCount: true,
      createdAt: true,
    },
  });
}
