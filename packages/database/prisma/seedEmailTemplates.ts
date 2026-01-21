/**
 * Email Templates Seeding
 *
 * Seeds the database with email templates from filesystem.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Import template loader (will be available after compilation)
import {
  EMAIL_TEMPLATES,
  loadTemplate,
  type EmailTemplateDefinition,
} from "../../../apps/api/src/services/templateLoader.js";

async function seedEmailTemplate(templateDef: EmailTemplateDefinition) {
  console.log(`  Seeding template: ${templateDef.name}`);

  try {
    // Load template content
    const { html, text } = loadTemplate(templateDef.templatePath);

    // Upsert template
    await db.emailTemplate.upsert({
      where: { name: templateDef.name },
      create: {
        name: templateDef.name,
        subject: templateDef.subject,
        description: templateDef.description,
        htmlBody: html,
        textBody: text,
        category: templateDef.category as never,
        isActive: true,
        sentCount: 0,
      },
      update: {
        subject: templateDef.subject,
        description: templateDef.description,
        htmlBody: html,
        textBody: text,
        category: templateDef.category as never,
        isActive: true,
      },
    });

    console.log(`    ✓ ${templateDef.name}`);
  } catch (error) {
    console.error(`    ✗ Failed to seed ${templateDef.name}:`, error);
  }
}

export async function seedEmailTemplates() {
  console.log("\n📧 Seeding Email Templates...");

  for (const template of EMAIL_TEMPLATES) {
    await seedEmailTemplate(template);
  }

  console.log(`✓ Seeded ${EMAIL_TEMPLATES.length} email templates\n`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedEmailTemplates()
    .then(() => {
      console.log("✓ Email templates seeded successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("✗ Failed to seed email templates:", error);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
