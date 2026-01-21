/**
 * Share Highlight Dialog
 *
 * Allows users to share highlights with privacy controls.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Public as PublicIcon,
  People as FriendsIcon,
  Lock as PrivateIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export type SharePrivacy = "PUBLIC" | "FRIENDS" | "PRIVATE";

export interface ShareHighlightDialogProps {
  open: boolean;
  onClose: () => void;
  onShare: (privacy: SharePrivacy) => Promise<void> | void;
  highlightText: string;
  note?: string;
}

export function ShareHighlightDialog({
  open,
  onClose,
  onShare,
  highlightText,
  note,
}: ShareHighlightDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [privacy, setPrivacy] = useState<SharePrivacy>("PUBLIC");
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setError(null);
    setIsSharing(true);

    try {
      await onShare(privacy);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    if (!isSharing) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("reader.annotations.shareHighlight")}</DialogTitle>

      <DialogContent>
        {/* Preview */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            bgcolor: "background.default",
            borderRadius: 1,
            borderLeft: 3,
            borderColor: "primary.main",
          }}
        >
          <Typography variant="body2" sx={{ fontStyle: "italic", mb: 1 }}>
            "{highlightText}"
          </Typography>
          {note && (
            <Typography variant="body2" color="text.secondary">
              {note}
            </Typography>
          )}
        </Box>

        {/* Privacy Settings */}
        <FormControl component="fieldset">
          <FormLabel component="legend">
            {t("reader.annotations.sharePrivacy")}
          </FormLabel>
          <RadioGroup
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as SharePrivacy)}
            sx={{ mt: 1 }}
          >
            <FormControlLabel
              value="PUBLIC"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PublicIcon fontSize="small" />
                  <Box>
                    <Typography variant="body2">
                      {t("reader.annotations.privacy.public")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("reader.annotations.privacy.publicDesc")}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="FRIENDS"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FriendsIcon fontSize="small" />
                  <Box>
                    <Typography variant="body2">
                      {t("reader.annotations.privacy.friends")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("reader.annotations.privacy.friendsDesc")}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="PRIVATE"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PrivateIcon fontSize="small" />
                  <Box>
                    <Typography variant="body2">
                      {t("reader.annotations.privacy.private")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("reader.annotations.privacy.privateDesc")}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSharing}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleShare}
          variant="contained"
          disabled={isSharing}
          startIcon={
            isSharing ? <CircularProgress size={16} /> : undefined
          }
        >
          {isSharing ? t("reader.annotations.sharing") : t("common.share")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ShareHighlightDialog;
