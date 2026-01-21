/**
 * Share Button Component
 *
 * Provides social sharing functionality with multiple platforms
 */

import { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  Share as ShareIcon,
  Twitter as TwitterIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  WhatsApp as WhatsAppIcon,
  Reddit as RedditIcon,
  ContentCopy as CopyIcon,
  IosShare as IosShareIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  getTwitterShareUrl,
  getFacebookShareUrl,
  getLinkedInShareUrl,
  getWhatsAppShareUrl,
  getRedditShareUrl,
  openSharePopup,
  copyToClipboard,
  shareNative,
  canUseNativeShare,
  type ShareContent,
} from "@/utils/socialShare";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ShareButtonProps {
  content: ShareContent;
  size?: "small" | "medium" | "large";
  tooltip?: string;
  iconOnly?: boolean;
  platforms?: Platform[];
}

type Platform =
  | "native"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "whatsapp"
  | "reddit"
  | "copy";

// ============================================================================
// Component
// ============================================================================

export function ShareButton({
  content,
  size = "medium",
  tooltip,
  platforms = [
    "native",
    "twitter",
    "facebook",
    "linkedin",
    "whatsapp",
    "reddit",
    "copy",
  ],
}: ShareButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const open = Boolean(anchorEl);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    logger.info("Share menu opened");
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleNativeShare = async () => {
    handleClose();
    const success = await shareNative(content);
    if (success) {
      logger.info("Native share successful");
    }
  };

  const handleTwitterShare = () => {
    handleClose();
    const url = getTwitterShareUrl(content);
    openSharePopup(url, "Share on Twitter");
    logger.info("Shared to Twitter");
  };

  const handleFacebookShare = () => {
    handleClose();
    const url = getFacebookShareUrl(content);
    openSharePopup(url, "Share on Facebook");
    logger.info("Shared to Facebook");
  };

  const handleLinkedInShare = () => {
    handleClose();
    const url = getLinkedInShareUrl(content);
    openSharePopup(url, "Share on LinkedIn");
    logger.info("Shared to LinkedIn");
  };

  const handleWhatsAppShare = () => {
    handleClose();
    const url = getWhatsAppShareUrl(content);
    openSharePopup(url, "Share on WhatsApp");
    logger.info("Shared to WhatsApp");
  };

  const handleRedditShare = () => {
    handleClose();
    const url = getRedditShareUrl(content);
    openSharePopup(url, "Share on Reddit");
    logger.info("Shared to Reddit");
  };

  const handleCopy = async () => {
    handleClose();
    const success = await copyToClipboard(content);
    if (success) {
      showSnackbar(t("common.copiedToClipboard", "Copied to clipboard!"));
      logger.info("Link copied to clipboard");
    } else {
      showSnackbar(t("common.copyFailed", "Failed to copy link"));
      logger.error("Failed to copy to clipboard");
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderMenuItem = (
    platform: Platform,
    icon: React.ReactElement,
    label: string,
    onClick: () => void
  ) => {
    if (!platforms.includes(platform)) {
      return null;
    }

    return (
      <MenuItem onClick={onClick} key={platform}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText>{label}</ListItemText>
      </MenuItem>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <Tooltip title={tooltip || t("common.share", "Share")}>
        <IconButton onClick={handleClick} size={size}>
          <ShareIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {canUseNativeShare() &&
          renderMenuItem(
            "native",
            <IosShareIcon />,
            t("share.native", "Share..."),
            handleNativeShare
          )}

        {renderMenuItem(
          "twitter",
          <TwitterIcon />,
          t("share.twitter", "Twitter"),
          handleTwitterShare
        )}

        {renderMenuItem(
          "facebook",
          <FacebookIcon />,
          t("share.facebook", "Facebook"),
          handleFacebookShare
        )}

        {renderMenuItem(
          "linkedin",
          <LinkedInIcon />,
          t("share.linkedin", "LinkedIn"),
          handleLinkedInShare
        )}

        {renderMenuItem(
          "whatsapp",
          <WhatsAppIcon />,
          t("share.whatsapp", "WhatsApp"),
          handleWhatsAppShare
        )}

        {renderMenuItem(
          "reddit",
          <RedditIcon />,
          t("share.reddit", "Reddit"),
          handleRedditShare
        )}

        {renderMenuItem(
          "copy",
          <CopyIcon />,
          t("share.copyLink", "Copy Link"),
          handleCopy
        )}
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ShareButton;
