/**
 * Book card component for library grid/list views
 */

import {
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  CardActions,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  MenuBook as ReadIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { Book } from "@/hooks/useBooks";
import type { LibraryViewMode } from "./types";

export interface BookCardProps {
  /** Book data */
  book: Book;
  /** Display mode */
  viewMode: LibraryViewMode;
  /** Callback when delete is clicked */
  onDelete?: ((book: Book) => void) | undefined;
  /** Callback for mouse enter (prefetch) */
  onMouseEnter?: (() => void) | undefined;
}

/**
 * Get status color based on book status
 * Exported for testing
 */
export function getStatusColor(status: Book["status"]) {
  switch (status) {
    case "reading":
      return "info";
    case "completed":
      return "success";
    case "abandoned":
      return "error";
    case "not_started":
    default:
      return "default";
  }
}

/**
 * Get status translation key
 * Exported for testing
 */
export function getStatusKey(status: Book["status"]) {
  switch (status) {
    case "reading":
      return "library.filters.reading";
    case "completed":
      return "library.filters.completed";
    case "abandoned":
      return "library.filters.abandoned";
    case "not_started":
    default:
      return "library.filters.wantToRead";
  }
}

export function BookCard({
  book,
  viewMode,
  onDelete,
  onMouseEnter,
}: BookCardProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  const handleRead = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/reader/${book.id}`);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete?.(book);
  };

  const handleCardClick = () => {
    navigate(`/reader/${book.id}`);
  };

  // Placeholder image for books without covers
  const coverImage =
    book.coverUrl ||
    `https://placehold.co/200x300?text=${encodeURIComponent(book.title.slice(0, 20))}`;

  if (viewMode === "list") {
    return (
      <Card
        sx={{
          display: "flex",
          mb: 1,
          "&:hover": {
            boxShadow: theme.shadows[4],
          },
        }}
        onMouseEnter={onMouseEnter}
      >
        <CardActionArea
          onClick={handleCardClick}
          sx={{ display: "flex", justifyContent: "flex-start" }}
        >
          <CardMedia
            component="img"
            sx={{ width: 80, height: 120, objectFit: "cover" }}
            image={coverImage}
            alt={book.title}
          />
          <CardContent sx={{ flex: 1, py: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  component="h3"
                  noWrap
                  fontWeight="medium"
                >
                  {book.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {book.author}
                </Typography>
              </Box>
              <Chip
                label={t(getStatusKey(book.status))}
                size="small"
                color={getStatusColor(book.status)}
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={book.progress}
                sx={{ flex: 1, height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary">
                {t("library.bookCard.progress", { percent: book.progress })}
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
        <CardActions sx={{ flexDirection: "column", px: 1 }}>
          <Tooltip title={t("library.bookCard.continueReading")}>
            <IconButton
              size="small"
              onClick={handleRead}
              aria-label={t("library.bookCard.continueReading")}
            >
              <ReadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("common.delete")}>
            <IconButton
              size="small"
              onClick={handleDelete}
              aria-label={t("common.delete")}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          boxShadow: theme.shadows[4],
        },
      }}
      onMouseEnter={onMouseEnter}
    >
      <CardActionArea onClick={handleCardClick} sx={{ flex: 1 }}>
        <CardMedia
          component="img"
          height="200"
          image={coverImage}
          alt={book.title}
          sx={{ objectFit: "cover" }}
        />
        <CardContent sx={{ pb: 1 }}>
          <Typography
            variant="subtitle2"
            component="h3"
            noWrap
            fontWeight="medium"
          >
            {book.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {book.author}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip
              label={t(getStatusKey(book.status))}
              size="small"
              color={getStatusColor(book.status)}
            />
          </Box>
        </CardContent>
      </CardActionArea>

      {/* Progress Bar */}
      <Box sx={{ px: 2, pb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={book.progress}
          sx={{ height: 4, borderRadius: 2 }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5, textAlign: "right" }}
        >
          {t("library.bookCard.progress", { percent: book.progress })}
        </Typography>
      </Box>

      {/* Actions */}
      <CardActions sx={{ justifyContent: "space-between", pt: 0 }}>
        <Tooltip
          title={
            book.progress > 0
              ? t("library.bookCard.continueReading")
              : t("library.bookCard.startReading")
          }
        >
          <IconButton
            size="small"
            color="primary"
            onClick={handleRead}
            aria-label={
              book.progress > 0
                ? t("library.bookCard.continueReading")
                : t("library.bookCard.startReading")
            }
          >
            <ReadIcon />
          </IconButton>
        </Tooltip>
        <Box>
          <Tooltip title={t("common.delete")}>
            <IconButton
              size="small"
              onClick={handleDelete}
              aria-label={t("common.delete")}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <IconButton size="small" aria-label={t("library.moreActions")}>
            <MoreIcon />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
}
