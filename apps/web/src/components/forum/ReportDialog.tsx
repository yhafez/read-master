/**
 * Report Dialog Component
 *
 * Dialog for reporting inappropriate forum content (posts or replies).
 */

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useReportContent, type ReportInput } from "../../hooks";

// ============================================================================
// Types
// ============================================================================

export interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  postId?: string;
  replyId?: string;
  contentType: "post" | "reply";
  onSuccess?: () => void;
}

type ReportType =
  | "SPAM"
  | "HARASSMENT"
  | "INAPPROPRIATE"
  | "OFF_TOPIC"
  | "OTHER";

// ============================================================================
// Component
// ============================================================================

export function ReportDialog({
  open,
  onClose,
  postId,
  replyId,
  contentType,
  onSuccess,
}: ReportDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const reportMutation = useReportContent();

  const [reportType, setReportType] = useState<ReportType>("SPAM");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    const reportInput: ReportInput = {
      ...(postId ? { postId } : {}),
      ...(replyId ? { replyId } : {}),
      type: reportType,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    };

    try {
      await reportMutation.mutateAsync(reportInput);
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    }
  };

  const handleClose = () => {
    setReportType("SPAM");
    setReason("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("forum.reportContent")}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
          <InputLabel id="report-type-label">
            {t("forum.reportType")}
          </InputLabel>
          <Select
            labelId="report-type-label"
            value={reportType}
            label={t("forum.reportType")}
            onChange={(e) => setReportType(e.target.value as ReportType)}
          >
            <MenuItem value="SPAM">{t("forum.reportTypes.spam")}</MenuItem>
            <MenuItem value="HARASSMENT">
              {t("forum.reportTypes.harassment")}
            </MenuItem>
            <MenuItem value="INAPPROPRIATE">
              {t("forum.reportTypes.inappropriate")}
            </MenuItem>
            <MenuItem value="OFF_TOPIC">
              {t("forum.reportTypes.offTopic")}
            </MenuItem>
            <MenuItem value="OTHER">{t("forum.reportTypes.other")}</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={4}
          label={t("forum.reportReason")}
          placeholder={t("forum.reportReasonPlaceholder")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info">
          {t("forum.reportInfo", {
            contentType: t(`forum.${contentType}`),
          })}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={reportMutation.isPending}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={reportMutation.isPending}
          startIcon={
            reportMutation.isPending ? (
              <CircularProgress size={16} />
            ) : undefined
          }
        >
          {t("forum.submitReport")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
