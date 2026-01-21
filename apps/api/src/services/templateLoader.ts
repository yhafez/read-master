/**
 * Email Template Loader
 *
 * Loads email templates from filesystem and wraps them with base layout.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, "../templates/emails");

/**
 * Load a template file from the templates directory
 */
function loadTemplateFile(templatePath: string): string {
  const fullPath = path.join(TEMPLATES_DIR, templatePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  return fs.readFileSync(fullPath, "utf-8");
}

/**
 * Wrap template content with base layout
 */
export function wrapWithLayout(
  content: string,
  format: "html" | "txt" = "html"
): string {
  const layoutPath = format === "html" ? "layouts/base.html" : "layouts/base.txt";
  const layout = loadTemplateFile(layoutPath);

  // Replace {{content}} placeholder with actual content
  return layout.replace("{{content}}", content);
}

/**
 * Load an email template (returns both HTML and text versions)
 */
export function loadTemplate(templateName: string): {
  html: string;
  text: string;
} {
  const htmlContent = loadTemplateFile(`${templateName}.html`);
  const textContent = loadTemplateFile(`${templateName}.txt`);

  return {
    html: wrapWithLayout(htmlContent, "html"),
    text: wrapWithLayout(textContent, "txt"),
  };
}

/**
 * Get all available templates
 */
export function listTemplates(): string[] {
  const templates: string[] = [];

  function scanDirectory(dir: string, prefix = "") {
    const items = fs.readdirSync(path.join(TEMPLATES_DIR, dir));

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const fullPath = path.join(TEMPLATES_DIR, itemPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip layouts directory
        if (item !== "layouts") {
          scanDirectory(itemPath, `${prefix}${item}/`);
        }
      } else if (item.endsWith(".html")) {
        // Add template without extension
        const templateName = `${prefix}${item.replace(".html", "")}`;
        templates.push(templateName);
      }
    }
  }

  scanDirectory("");
  return templates;
}

/**
 * Email template definitions for seeding database
 */
export interface EmailTemplateDefinition {
  name: string;
  subject: string;
  description: string;
  category: string;
  templatePath: string;
}

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  // Welcome
  {
    name: "welcome",
    subject: "Welcome to Read Master! 🎉",
    description: "Welcome email sent immediately after user signs up",
    category: "WELCOME",
    templatePath: "welcome/welcome",
  },

  // Onboarding
  {
    name: "onboarding_day1",
    subject: "Let's Get You Started with Read Master! 📖",
    description: "Day 1 onboarding - Getting started guide",
    category: "ONBOARDING",
    templatePath: "onboarding/day1-getting-started",
  },

  // Engagement - Streaks
  {
    name: "streak_7_days",
    subject: "🔥 You're on Fire! 7-Day Streak Achieved!",
    description: "Celebration email for 7-day reading streak",
    category: "ENGAGEMENT",
    templatePath: "engagement/streak-7-days",
  },

  // Engagement - Book Completion
  {
    name: "book_completed",
    subject: "🎉 Congratulations! You Finished \"{{bookTitle}}\"",
    description: "Celebration email when user completes a book",
    category: "ENGAGEMENT",
    templatePath: "engagement/book-completed",
  },

  // Conversion
  {
    name: "upgrade_library_limit",
    subject: "📚 You've Hit Your Library Limit - Upgrade to Pro",
    description: "Upgrade prompt when free user reaches 3-book limit",
    category: "CONVERSION",
    templatePath: "conversion/upgrade-library-limit",
  },

  // Digest
  {
    name: "weekly_summary",
    subject: "Your Week in Reading - {{startDate}} to {{endDate}}",
    description: "Weekly reading progress summary",
    category: "DIGEST",
    templatePath: "digest/weekly-summary",
  },
];
