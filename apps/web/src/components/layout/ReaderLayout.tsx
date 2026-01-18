import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import { Box, IconButton, LinearProgress, Tooltip } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/router/routes";

type ReaderLayoutProps = {
  progress?: number;
  showProgress?: boolean;
};

/**
 * ReaderLayout provides a minimal, distraction-free reading interface.
 * It includes:
 * - A back button to return to library
 * - An optional reading progress bar
 * - A settings button for reader preferences
 * - The main reading content area (via Outlet)
 */
export function ReaderLayout({
  progress = 0,
  showProgress = true,
}: ReaderLayoutProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(ROUTES.LIBRARY);
  };

  const handleSettings = () => {
    navigate(ROUTES.SETTINGS_READING);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      {/* Minimal Header */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: "appBar",
          backgroundColor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
            py: 0.5,
            minHeight: 48,
          }}
        >
          <Tooltip title={t("reader.backToLibrary")}>
            <IconButton
              onClick={handleBack}
              aria-label={t("reader.backToLibrary")}
              size="medium"
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={t("reader.settings")}>
            <IconButton
              onClick={handleSettings}
              aria-label={t("reader.settings")}
              size="medium"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Progress Bar */}
        {showProgress && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 3,
              "& .MuiLinearProgress-bar": {
                transition: "transform 0.3s ease",
              },
            }}
            aria-label={t("reader.progress", { percent: Math.round(progress) })}
          />
        )}
      </Box>

      {/* Reader Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default ReaderLayout;
