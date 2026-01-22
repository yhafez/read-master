/**
 * Split Screen Controls Component
 *
 * Controls for managing split-screen reading mode.
 */

import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Typography,
  Switch,
  Slider,
  Tooltip,
  Box,
} from "@mui/material";
import {
  ViewColumn as VerticalSplitIcon,
  ViewStream as HorizontalSplitIcon,
  ViewComfy as SingleViewIcon,
  SwapHoriz as SwapIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  useSplitScreenStore,
  selectIsSplitScreen,
  selectHasBothBooks,
  selectCanSync,
} from "@/stores/useSplitScreenStore";

// ============================================================================
// Types
// ============================================================================

type SplitScreenControlsProps = {
  onSelectBook?: (pane: "left" | "right") => void;
};

// ============================================================================
// Main Component
// ============================================================================

export function SplitScreenControls({
  onSelectBook,
}: SplitScreenControlsProps): React.ReactElement {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const {
    mode,
    setMode,
    syncScroll,
    syncPage,
    setSyncScroll,
    setSyncPage,
    swapPanes,
    splitRatio,
    setSplitRatio,
    resetSplitRatio,
  } = useSplitScreenStore();

  const isSplitScreen = useSplitScreenStore(selectIsSplitScreen);
  const hasBothBooks = useSplitScreenStore(selectHasBothBooks);
  const canSync = useSplitScreenStore(selectCanSync);

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleModeChange = (newMode: typeof mode): void => {
    setMode(newMode);
    handleClose();
  };

  const handleSwapPanes = (): void => {
    swapPanes();
    handleClose();
  };

  return (
    <>
      <Tooltip title={t("splitScreen.controls")}>
        <IconButton
          onClick={handleClick}
          size="small"
          color={isSplitScreen ? "primary" : "default"}
        >
          {mode === "vertical" && <VerticalSplitIcon />}
          {mode === "horizontal" && <HorizontalSplitIcon />}
          {mode === "single" && <SingleViewIcon />}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: { minWidth: 280 },
        }}
      >
        {/* View Mode */}
        <MenuItem
          selected={mode === "single"}
          onClick={() => handleModeChange("single")}
        >
          <ListItemIcon>
            <SingleViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("splitScreen.modes.single")}</ListItemText>
        </MenuItem>

        <MenuItem
          selected={mode === "vertical"}
          onClick={() => handleModeChange("vertical")}
        >
          <ListItemIcon>
            <VerticalSplitIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("splitScreen.modes.vertical")}</ListItemText>
        </MenuItem>

        <MenuItem
          selected={mode === "horizontal"}
          onClick={() => handleModeChange("horizontal")}
        >
          <ListItemIcon>
            <HorizontalSplitIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("splitScreen.modes.horizontal")}</ListItemText>
        </MenuItem>

        {isSplitScreen && (
          <>
            <Divider />

            {/* Swap Panes */}
            {hasBothBooks && (
              <MenuItem onClick={handleSwapPanes}>
                <ListItemIcon>
                  <SwapIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t("splitScreen.swapPanes")}</ListItemText>
              </MenuItem>
            )}

            {/* Select Books */}
            {onSelectBook && (
              <>
                <MenuItem onClick={() => onSelectBook("left")}>
                  <ListItemText inset>
                    {t("splitScreen.selectLeftBook")}
                  </ListItemText>
                </MenuItem>
                <MenuItem onClick={() => onSelectBook("right")}>
                  <ListItemText inset>
                    {t("splitScreen.selectRightBook")}
                  </ListItemText>
                </MenuItem>
              </>
            )}

            <Divider />

            {/* Sync Options */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("splitScreen.synchronization")}
              </Typography>
            </Box>

            <MenuItem
              onClick={() => setSyncScroll(!syncScroll)}
              disabled={!canSync}
            >
              <ListItemIcon>
                {syncScroll ? (
                  <SyncIcon fontSize="small" color="primary" />
                ) : (
                  <SyncDisabledIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{t("splitScreen.syncScroll")}</ListItemText>
              <Switch
                edge="end"
                checked={syncScroll}
                disabled={!canSync}
                size="small"
              />
            </MenuItem>

            <MenuItem
              onClick={() => setSyncPage(!syncPage)}
              disabled={!canSync}
            >
              <ListItemIcon>
                {syncPage ? (
                  <SyncIcon fontSize="small" color="primary" />
                ) : (
                  <SyncDisabledIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{t("splitScreen.syncPage")}</ListItemText>
              <Switch
                edge="end"
                checked={syncPage}
                disabled={!canSync}
                size="small"
              />
            </MenuItem>

            <Divider />

            {/* Split Ratio */}
            <Box sx={{ px: 2, py: 2 }}>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {t("splitScreen.splitRatio")}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="caption">{splitRatio}%</Typography>
                  <Slider
                    value={splitRatio}
                    onChange={(_, value) => setSplitRatio(value as number)}
                    min={20}
                    max={80}
                    step={5}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Typography variant="caption">{100 - splitRatio}%</Typography>
                </Stack>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ cursor: "pointer" }}
                  onClick={resetSplitRatio}
                >
                  {t("splitScreen.resetRatio")}
                </Typography>
              </Stack>
            </Box>
          </>
        )}

        {!hasBothBooks && isSplitScreen && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("splitScreen.selectBooksHint")}
              </Typography>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}

export default SplitScreenControls;
