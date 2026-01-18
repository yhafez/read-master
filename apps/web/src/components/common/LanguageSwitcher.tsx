import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import CheckIcon from "@mui/icons-material/Check";

import type { SupportedLanguage } from "@/i18n";
import { supportedLanguages, languageNames, isRtlLanguage } from "@/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    handleClose();
  };

  const currentLanguage = i18n.language as SupportedLanguage;

  return (
    <Box>
      <Button
        id="language-button"
        aria-controls={open ? "language-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        aria-label={t("settings.language.select")}
        onClick={handleClick}
        startIcon={<LanguageIcon />}
        sx={{ textTransform: "none" }}
      >
        <Typography variant="body2">
          {languageNames[currentLanguage] || languageNames.en}
        </Typography>
      </Button>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "language-button",
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {supportedLanguages.map((lang) => (
          <MenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            selected={currentLanguage === lang}
            dir={isRtlLanguage(lang) ? "rtl" : "ltr"}
          >
            <ListItemText
              primary={languageNames[lang]}
              secondary={t(`languages.${lang}`)}
              primaryTypographyProps={{
                fontWeight: currentLanguage === lang ? 600 : 400,
              }}
            />
            {currentLanguage === lang && (
              <ListItemIcon sx={{ minWidth: "auto", ml: 2 }}>
                <CheckIcon fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
