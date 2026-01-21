/**
 * Vote Buttons Component
 *
 * Reusable upvote/downvote buttons for forum posts and replies.
 * Displays current vote count and user's vote state.
 */

import React, { useState } from "react";
import { Stack, IconButton, Typography, Tooltip } from "@mui/material";
import {
  ArrowUpward as UpvoteIcon,
  ArrowDownward as DownvoteIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

export type VoteButtonsProps = {
  /** Current vote score (upvotes - downvotes) */
  voteScore: number;
  /** Current upvote count (for tracking purposes only) */
  upvotes: number;
  /** User's current vote (-1, 0, or 1) */
  userVote?: number;
  /** Callback when vote changes */
  onVote?: ((value: number) => void | Promise<void>) | undefined;
  /** Whether voting is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: "small" | "medium" | "large";
};

// ============================================================================
// Main Component
// ============================================================================

export function VoteButtons({
  voteScore,
  upvotes: _upvotes,
  userVote = 0,
  onVote,
  disabled = false,
  size = "medium",
}: VoteButtonsProps): React.ReactElement {
  const { t } = useTranslation();
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState(userVote);
  const [optimisticScore, setOptimisticScore] = useState(voteScore);

  const handleVote = async (value: number) => {
    if (!onVote || disabled || isVoting) return;

    // Optimistic update
    const oldVote = optimisticVote;
    const scoreDelta = value - oldVote;

    setOptimisticVote(value);
    setOptimisticScore((prev) => prev + scoreDelta);

    setIsVoting(true);
    try {
      await onVote(value);
    } catch (_error) {
      // Revert optimistic update on error
      setOptimisticVote(oldVote);
      setOptimisticScore((prev) => prev - scoreDelta);
    } finally {
      setIsVoting(false);
    }
  };

  const handleUpvote = () => {
    // Toggle upvote: if already upvoted, remove vote; otherwise upvote
    handleVote(optimisticVote === 1 ? 0 : 1);
  };

  const handleDownvote = () => {
    // Toggle downvote: if already downvoted, remove vote; otherwise downvote
    handleVote(optimisticVote === -1 ? 0 : -1);
  };

  const iconSize =
    size === "small" ? "small" : size === "large" ? "large" : "medium";
  const numberSize =
    size === "small" ? "caption" : size === "large" ? "h6" : "body2";

  return (
    <Stack
      direction="column"
      alignItems="center"
      spacing={0}
      sx={{
        minWidth: size === "small" ? 32 : size === "large" ? 48 : 40,
      }}
    >
      {/* Upvote Button */}
      <Tooltip title={t("forum.upvote")}>
        <span>
          <IconButton
            size={iconSize}
            onClick={handleUpvote}
            disabled={disabled || isVoting}
            color={optimisticVote === 1 ? "primary" : "default"}
            sx={{
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <UpvoteIcon fontSize={iconSize} />
          </IconButton>
        </span>
      </Tooltip>

      {/* Vote Score */}
      <Typography
        variant={numberSize}
        fontWeight={optimisticVote !== 0 ? "bold" : "normal"}
        color={
          optimisticVote === 1
            ? "primary"
            : optimisticVote === -1
              ? "error"
              : "text.primary"
        }
        sx={{ userSelect: "none" }}
      >
        {optimisticScore}
      </Typography>

      {/* Downvote Button */}
      <Tooltip title={t("forum.downvote")}>
        <span>
          <IconButton
            size={iconSize}
            onClick={handleDownvote}
            disabled={disabled || isVoting}
            color={optimisticVote === -1 ? "error" : "default"}
            sx={{
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <DownvoteIcon fontSize={iconSize} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

export default VoteButtons;
