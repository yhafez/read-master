/**
 * Study Guide Generation Prompt Template
 *
 * Generates comprehensive study guides from book content and user annotations.
 */

// No imports needed - standalone prompt configuration

export type StudyGuideStyle =
  | "comprehensive" // Detailed, in-depth coverage
  | "summary" // Brief overview and key points
  | "exam-prep" // Focused on testable material
  | "discussion" // Discussion questions and themes
  | "visual"; // Includes diagrams, charts suggestions

export type StudyGuideSections = {
  includeOverview?: boolean;
  includeKeyPoints?: boolean;
  includeVocabulary?: boolean;
  includeQuestions?: boolean;
  includeTimeline?: boolean;
  includeThemes?: boolean;
  includeSummary?: boolean;
};

export type StudyGuideInput = {
  bookTitle: string;
  bookAuthor?: string;
  content: string;
  annotations?: Array<{
    type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
    text?: string;
    note?: string;
  }>;
  style: StudyGuideStyle;
  sections: StudyGuideSections;
  targetAudience?: "high-school" | "college" | "graduate" | "general";
};

export type StudyGuideOutput = {
  studyGuide: string; // Markdown formatted study guide
};

// For backwards compatibility
export type StudyGuideContext = StudyGuideInput;

/**
 * System prompt for study guide generation
 */
const STUDY_GUIDE_SYSTEM_PROMPT = `You are an expert educational content creator specializing in creating comprehensive, well-structured study guides. Your study guides are:

1. **Clear and Organized**: Use headings, bullet points, and logical flow
2. **Comprehensive**: Cover all major concepts and key details
3. **Educational**: Explain complex ideas in accessible language
4. **Actionable**: Include practice questions and learning activities
5. **Structured**: Follow a consistent format for easy navigation

When creating study guides, consider:
- The target audience's knowledge level
- Key concepts and themes that need emphasis
- Important vocabulary and terminology
- Connections between ideas
- Practical applications of the material

Always format your response in clean Markdown with clear headings and structure.`;

/**
 * Build the study guide generation prompt
 */
export function buildStudyGuidePrompt(context: StudyGuideInput): string {
  const {
    bookTitle,
    bookAuthor,
    content,
    annotations = [],
    style,
    sections,
    targetAudience = "general",
  } = context;

  const contentPreview = content.slice(0, 15000); // Limit content length
  const highlights = annotations
    .filter((a) => a.type === "HIGHLIGHT")
    .slice(0, 20);
  const notes = annotations.filter((a) => a.type === "NOTE").slice(0, 20);

  let prompt = `Create a ${style} study guide for the following book:\n\n`;
  prompt += `**Title**: ${bookTitle}\n`;
  if (bookAuthor) {
    prompt += `**Author**: ${bookAuthor}\n`;
  }
  prompt += `**Target Audience**: ${targetAudience}\n\n`;

  // Content
  prompt += `## Book Content\n\n${contentPreview}\n\n`;
  if (content.length > 15000) {
    prompt += `_(Content truncated for length)_\n\n`;
  }

  // User annotations
  if (highlights.length > 0) {
    prompt += `## Reader's Highlights\n\n`;
    highlights.forEach((h, i) => {
      prompt += `${i + 1}. "${h.text}"\n`;
      if (h.note) {
        prompt += `   _Note: ${h.note}_\n`;
      }
    });
    prompt += `\n`;
  }

  if (notes.length > 0) {
    prompt += `## Reader's Notes\n\n`;
    notes.forEach((n, i) => {
      prompt += `${i + 1}. ${n.note}\n`;
      if (n.text) {
        prompt += `   _Context: "${n.text}"_\n`;
      }
    });
    prompt += `\n`;
  }

  // Instructions
  prompt += `## Instructions\n\n`;
  prompt += `Create a ${getStyleDescription(style)} study guide that includes:\n\n`;

  const requestedSections: string[] = [];
  if (sections.includeOverview) {
    requestedSections.push("**Overview**: Brief introduction and main thesis");
  }
  if (sections.includeKeyPoints) {
    requestedSections.push(
      "**Key Points**: Main concepts, arguments, and findings"
    );
  }
  if (sections.includeVocabulary) {
    requestedSections.push("**Vocabulary**: Important terms and definitions");
  }
  if (sections.includeThemes) {
    requestedSections.push("**Themes**: Major themes and motifs");
  }
  if (sections.includeTimeline) {
    requestedSections.push(
      "**Timeline**: Key events or developments (if applicable)"
    );
  }
  if (sections.includeQuestions) {
    requestedSections.push(
      "**Study Questions**: Discussion and review questions"
    );
  }
  if (sections.includeSummary) {
    requestedSections.push("**Summary**: Concise recap of main points");
  }

  prompt += requestedSections.join("\n") + "\n\n";

  // Style-specific instructions
  switch (style) {
    case "comprehensive":
      prompt += `Provide thorough explanations and examples. Include context and background information.\n`;
      break;
    case "summary":
      prompt += `Focus on brevity and clarity. Highlight only the most essential information.\n`;
      break;
    case "exam-prep":
      prompt += `Emphasize testable material. Include practice questions and key facts to memorize.\n`;
      break;
    case "discussion":
      prompt += `Focus on thought-provoking questions and interpretative elements. Encourage critical thinking.\n`;
      break;
    case "visual":
      prompt += `Suggest diagrams, charts, or visual aids where appropriate. Describe how to visualize key concepts.\n`;
      break;
  }

  prompt += `\nFormat the guide in clean Markdown with clear headings, bullet points, and numbered lists where appropriate.`;

  return prompt;
}

/**
 * Get description for study guide style
 */
function getStyleDescription(style: StudyGuideStyle): string {
  switch (style) {
    case "comprehensive":
      return "detailed and thorough";
    case "summary":
      return "concise and focused";
    case "exam-prep":
      return "test-focused";
    case "discussion":
      return "discussion-oriented";
    case "visual":
      return "visual and diagram-rich";
    default:
      return "well-structured";
  }
}

/**
 * Study guide generation prompt configuration
 */
export const studyGuidePrompt = {
  name: "study-guide",
  description: "Generate comprehensive study guides from book content",
  systemPrompt: STUDY_GUIDE_SYSTEM_PROMPT,
  buildPrompt: buildStudyGuidePrompt,
  version: "1.0.0",
  maxTokens: 4000,
  temperature: 0.7,
} as const;

/**
 * Default study guide sections
 */
export const DEFAULT_STUDY_GUIDE_SECTIONS: StudyGuideSections = {
  includeOverview: true,
  includeKeyPoints: true,
  includeVocabulary: true,
  includeQuestions: true,
  includeThemes: true,
  includeSummary: true,
  includeTimeline: false, // Optional, not always applicable
};
