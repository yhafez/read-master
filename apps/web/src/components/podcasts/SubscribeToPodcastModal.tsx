/**
 * Subscribe to Podcast Modal
 *
 * Modal dialog for subscribing to podcasts via RSS URL
 */

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSubscribeToPodcast } from "@/hooks/usePodcasts";

export interface SubscribeToPodcastModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback on successful subscription */
  onSuccess?: () => void;
}

/**
 * SubscribeToPodcastModal - Modal for subscribing to new podcasts
 */
export function SubscribeToPodcastModal({
  open,
  onClose,
  onSuccess,
}: SubscribeToPodcastModalProps) {
  const { t } = useTranslation();
  const [rssUrl, setRssUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const subscribeMutation = useSubscribeToPodcast({
    onSuccess: () => {
      setRssUrl("");
      setError(null);
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      setError(
        err.message ||
          t("podcasts.subscribeError", "Failed to subscribe to podcast")
      );
    },
  });

  const handleSubmit = () => {
    if (!rssUrl.trim()) {
      setError(t("podcasts.rssUrlRequired", "RSS URL is required"));
      return;
    }

    // Basic URL validation
    try {
      new URL(rssUrl);
    } catch {
      setError(t("podcasts.invalidUrl", "Please enter a valid URL"));
      return;
    }

    setError(null);
    subscribeMutation.mutate({ rssUrl: rssUrl.trim() });
  };

  const handleClose = () => {
    if (!subscribeMutation.isPending) {
      setRssUrl("");
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="subscribe-podcast-title"
    >
      <DialogTitle id="subscribe-podcast-title">
        {t("podcasts.subscribe", "Subscribe to Podcast")}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            "podcasts.subscribeDescription",
            "Enter the RSS feed URL of the podcast you want to subscribe to."
          )}
        </Typography>

        <TextField
          autoFocus
          fullWidth
          label={t("podcasts.rssUrl", "RSS Feed URL")}
          placeholder="https://example.com/podcast/feed.xml"
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          disabled={subscribeMutation.isPending}
          error={!!error}
          helperText={error}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !subscribeMutation.isPending) {
              handleSubmit();
            }
          }}
        />

        {subscribeMutation.isPending && (
          <Alert
            severity="info"
            icon={<CircularProgress size={20} />}
            sx={{ mt: 2 }}
          >
            {t("podcasts.subscribing", "Subscribing to podcast...")}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={subscribeMutation.isPending}>
          {t("common.cancel", "Cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={subscribeMutation.isPending || !rssUrl.trim()}
        >
          {subscribeMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            t("podcasts.subscribe", "Subscribe")
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SubscribeToPodcastModal;
