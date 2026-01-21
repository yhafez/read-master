/**
 * Share Curriculum Dialog Component
 *
 * Allows users to share curriculums via:
 * - Direct link copying
 * - Social media sharing (Twitter, Facebook, LinkedIn)
 * - Email sharing
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  Typography,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Twitter as TwitterIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export interface ShareCurriculumDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Curriculum ID to share */
  curriculumId: string;
  /** Curriculum title for social sharing */
  curriculumTitle: string;
}

export function ShareCurriculumDialog({
  open,
  onClose,
  curriculumId,
  curriculumTitle,
}: ShareCurriculumDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [showCopied, setShowCopied] = useState(false);

  // Generate share URL
  const shareUrl = `${window.location.origin}/curriculum/${curriculumId}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(curriculumTitle);

  // Social share URLs
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const emailUrl = `mailto:?subject=${encodedTitle}&body=${t("curriculum.share.emailBody", { url: shareUrl })}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
    } catch (_error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setShowCopied(true);
    }
  };

  const handleSocialShare = (url: string) => {
    window.open(url, "_blank", "width=600,height=400");
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">{t("curriculum.share.title")}</Typography>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {/* Share Link */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("curriculum.share.linkLabel")}
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  value={shareUrl}
                  InputProps={{
                    readOnly: true,
                  }}
                  size="small"
                />
                <Button
                  variant="contained"
                  startIcon={<CopyIcon />}
                  onClick={handleCopyLink}
                >
                  {t("common.copy")}
                </Button>
              </Stack>
            </Box>

            {/* Social Media Share */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("curriculum.share.socialLabel")}
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton
                  color="primary"
                  onClick={() => handleSocialShare(twitterUrl)}
                  sx={{ bgcolor: "#1DA1F2", color: "white", "&:hover": { bgcolor: "#1a8cd8" } }}
                >
                  <TwitterIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={() => handleSocialShare(facebookUrl)}
                  sx={{ bgcolor: "#4267B2", color: "white", "&:hover": { bgcolor: "#365899" } }}
                >
                  <FacebookIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={() => handleSocialShare(linkedInUrl)}
                  sx={{ bgcolor: "#0077B5", color: "white", "&:hover": { bgcolor: "#006399" } }}
                >
                  <LinkedInIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={() => handleSocialShare(emailUrl)}
                  sx={{ bgcolor: "grey.700", color: "white", "&:hover": { bgcolor: "grey.800" } }}
                >
                  <EmailIcon />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>{t("common.close")}</Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={showCopied}
        autoHideDuration={3000}
        onClose={() => setShowCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setShowCopied(false)}>
          {t("curriculum.share.copied")}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ShareCurriculumDialog;
