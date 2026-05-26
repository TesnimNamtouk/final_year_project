import React from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Rating,
} from "@mui/material";
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { localizeGenre } from "../utils/genres";

export interface ContentItem {
  id: string;
  title: string;
  type: "movie" | "series" | "book";
  year?: number;
  genres?: string[];
  posterUrl?: string;
  rating?: number;
  description?: string;
}

interface ContentCardProps {
  content: ContentItem;
  onSave?: (content: ContentItem) => void;
  onWant?: (content: ContentItem) => void;
  onRate?: (content: ContentItem) => void;
  isSaved?: boolean;
  isWanted?: boolean;
  disableNavigate?: boolean;
}

const FALLBACK_IMG = "https://via.placeholder.com/200x300?text=No+Image";

const TYPE_COLOR: Record<string, "primary" | "secondary" | "success"> = {
  movie: "primary",
  series: "secondary",
  book: "success",
};

export default function ContentCard({
  content,
  onSave,
  onWant,
  onRate,
  isSaved = false,
  isWanted = false,
  disableNavigate = false,
}: ContentCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const typeLabel =
    content.type === "movie"
      ? t("content.movie")
      : content.type === "series"
      ? t("content.series")
      : t("content.book");

  const handleCardClick = () => {
    if (!disableNavigate) {
      navigate(`/content/${encodeURIComponent(content.id)}?type=${content.type}`);
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        overflow: "hidden",
        transition: "transform 0.25s, box-shadow 0.25s",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
        },
        "&:hover .poster-overlay": { opacity: 1 },
      }}
    >
      {/* Poster with overlay */}
      <Box sx={{ position: "relative", height: 220, flexShrink: 0 }} onClick={handleCardClick}>
        <Box
          component="img"
          src={content.posterUrl || FALLBACK_IMG}
          alt={content.title}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = FALLBACK_IMG;
          }}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Gradient overlay */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "50%",
            background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
          }}
        />
        {/* Type badge */}
        <Chip
          label={typeLabel}
          color={TYPE_COLOR[content.type] ?? "default"}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            fontWeight: 600,
            fontSize: "0.7rem",
            backdropFilter: "blur(4px)",
          }}
        />
        {/* Year badge */}
        {content.year && (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              bottom: 8,
              right: 10,
              color: "white",
              fontWeight: 600,
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            {content.year}
          </Typography>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 0, px: 2, pt: 1.5 }} onClick={handleCardClick}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            lineHeight: 1.35,
            mb: 0.75,
          }}
        >
          {content.title}
        </Typography>

        {content.genres && content.genres.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {content.genres.slice(0, 2).map((g) => (
              <Chip
                key={g}
                label={localizeGenre(g, i18n.language)}
                size="small"
                variant="outlined"
                clickable
                sx={{ fontSize: "0.68rem", height: 22 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/search?genre=${encodeURIComponent(g)}&type=${content.type}`);
                }}
              />
            ))}
          </Box>
        )}

        {content.rating != null ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Rating value={content.rating / 2} precision={0.5} readOnly size="small" />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {content.rating}/10
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
            {t("content.rate")}...
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pt: 0.5, pb: 1 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={content.type === "book" ? t("content.wantToRead") : t("content.wantToWatch")}>
            <IconButton
              size="small"
              color={isWanted ? "error" : "default"}
              onClick={(e) => { e.stopPropagation(); onWant?.(content); }}
            >
              {isWanted ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title={isSaved ? t("content.saved") : t("content.save")}>
            <IconButton
              size="small"
              color={isSaved ? "primary" : "default"}
              onClick={(e) => { e.stopPropagation(); onSave?.(content); }}
            >
              {isSaved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        <Tooltip title={t("content.rate")}>
          <IconButton
            size="small"
            color="warning"
            onClick={(e) => { e.stopPropagation(); onRate?.(content); }}
          >
            <StarIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}
