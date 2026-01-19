/**
 * Bionic Text Component
 *
 * Renders text with bionic reading formatting, where the beginning
 * of each word is bolded to guide the eye and improve reading speed.
 */

import { useMemo, memo } from "react";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import {
  type BionicReadingConfig,
  DEFAULT_BIONIC_CONFIG,
  transformToBionic,
} from "./advancedReadingTypes";

export interface BionicTextProps {
  /** Text content to render with bionic formatting */
  children: string;
  /** Bionic reading configuration */
  config?: BionicReadingConfig;
  /** Typography variant */
  variant?: "body1" | "body2" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Additional sx props */
  sx?: SxProps<Theme>;
  /** Custom component to use for rendering */
  component?: React.ElementType;
  /** Paragraph spacing multiplier */
  paragraphSpacing?: number;
}

/**
 * BionicText component for enhanced reading
 */
export const BionicText = memo(function BionicText({
  children,
  config = DEFAULT_BIONIC_CONFIG,
  variant = "body1",
  sx,
  component = "div",
  paragraphSpacing = 1.5,
}: BionicTextProps) {
  // Transform text to bionic format
  const paragraphs = useMemo(() => {
    // Split into paragraphs
    const paras = children.split(/\n\n+/);
    return paras.map((para) => transformToBionic(para.trim(), config));
  }, [children, config]);

  return (
    <Box component={component} sx={sx ?? {}}>
      {paragraphs.map((words, paraIndex) => (
        <Typography
          key={paraIndex}
          variant={variant}
          component="p"
          sx={{
            mb: paraIndex < paragraphs.length - 1 ? paragraphSpacing : 0,
            lineHeight: 1.8,
          }}
        >
          {words.map((word, wordIndex) => (
            <BionicWord
              key={wordIndex}
              bold={word.bold}
              normal={word.normal}
              space={word.space}
            />
          ))}
        </Typography>
      ))}
    </Box>
  );
});

/**
 * Individual word with bionic formatting
 */
interface BionicWordProps {
  bold: string;
  normal: string;
  space: string;
}

const BionicWord = memo(function BionicWord({
  bold,
  normal,
  space,
}: BionicWordProps) {
  return (
    <span>
      {bold && (
        <Box
          component="span"
          sx={{
            fontWeight: "bold",
          }}
        >
          {bold}
        </Box>
      )}
      {normal}
      {space}
    </span>
  );
});

/**
 * Process content and render with bionic formatting
 * Handles both plain text and HTML content
 */
export interface ProcessedBionicContentProps {
  /** Raw content to process */
  content: string;
  /** Content type */
  contentType?: "plain" | "html";
  /** Bionic reading configuration */
  config?: BionicReadingConfig;
  /** Font size in rem */
  fontSize?: number;
  /** Line height multiplier */
  lineHeight?: number;
  /** Additional sx props */
  sx?: SxProps<Theme>;
}

/**
 * Processed bionic content component that handles various content types
 */
export const ProcessedBionicContent = memo(function ProcessedBionicContent({
  content,
  contentType = "plain",
  config = DEFAULT_BIONIC_CONFIG,
  fontSize = 1,
  lineHeight = 1.8,
  sx,
}: ProcessedBionicContentProps) {
  // For HTML content, we extract text and apply bionic formatting
  const processedContent = useMemo(() => {
    if (contentType === "html") {
      // Create a temporary div to extract text content
      const temp = document.createElement("div");
      temp.innerHTML = content;
      return temp.textContent || "";
    }
    return content;
  }, [content, contentType]);

  const paragraphs = useMemo(() => {
    const paras = processedContent.split(/\n\n+/);
    return paras.map((para) => ({
      text: para.trim(),
      words: transformToBionic(para.trim(), config),
    }));
  }, [processedContent, config]);

  return (
    <Box sx={sx ?? {}}>
      {paragraphs.map((para, paraIndex) => (
        <Typography
          key={paraIndex}
          component="p"
          sx={{
            mb: paraIndex < paragraphs.length - 1 ? 2 : 0,
            fontSize: `${fontSize}rem`,
            lineHeight,
          }}
        >
          {para.words.map((word, wordIndex) => (
            <BionicWord
              key={wordIndex}
              bold={word.bold}
              normal={word.normal}
              space={word.space}
            />
          ))}
        </Typography>
      ))}
    </Box>
  );
});

/**
 * Hook to apply bionic formatting to text
 */
export function useBionicText(
  text: string,
  config: BionicReadingConfig = DEFAULT_BIONIC_CONFIG
) {
  return useMemo(() => transformToBionic(text, config), [text, config]);
}

export default BionicText;
