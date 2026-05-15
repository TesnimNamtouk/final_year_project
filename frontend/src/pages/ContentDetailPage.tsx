import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Skeleton,
  Alert,
  Snackbar,
  Rating,
  Divider,
} from "@mui/material";
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
} from "@mui/icons-material";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { localizeGenre } from "../utils/genres";
import { useAuth } from "../contexts/AuthContext";
import { userContentAPI, contentAPI } from "../services/api";
import RatingDialog from "../components/RatingDialog";
import Layout from "../components/Layout";
import { SEOHead } from "../components/SEOHead";
import { ContentItem } from "../components/ContentCard";

const FALLBACK_IMG = "https://via.placeholder.com/300x450?text=No+Image";

const TYPE_COLOR: Record<string, "primary" | "secondary" | "success"> = {
  movie: "primary",
  series: "secondary",
  book: "success",
};

export default function ContentDetailPage() {
  const { id: encodedId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const id = decodeURIComponent(encodedId ?? "");
  const type = searchParams.get("type") ?? undefined;

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ratingOpen, setRatingOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Fetch content details from API
  const { data: detailData, isLoading, isError } = useQuery({
    queryKey: ["content-detail", id],
    queryFn: () =>
      contentAPI.detail(id, type, i18n.language).then((r) => r.data.data as ContentItem & {
        description?: string;
        director?: string;
        cast?: string;
        runtime?: string;
        status?: string;
        network?: string;
      }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch saved items
  const { data: savedData } = useQuery({
    queryKey: ["user-content", user?.id],
    queryFn: () =>
      userContentAPI.getAll().then(
        (r) => r.data.data as Array<{ id: number; status: string; content: { externalId: string } }>
      ),
    enabled: !!user,
  });

  const savedItems = savedData ?? [];
  const savedEntry = savedItems.find((s) => s.content.externalId === id);
  const isSaved = !!savedEntry;
  const isWanted = savedEntry?.status === "want" || savedEntry?.status === "reading";

  const content = detailData;

  const contentItem: ContentItem = content ?? {
    id: id,
    title: id,
    type: (type as ContentItem["type"]) ?? "movie",
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      userContentAPI.save({
        externalId: id,
        title: content?.title ?? id,
        type: content?.type ?? "movie",
        description: content?.description ?? null,
        year: content?.year,
        genres: content?.genres,
        posterUrl: content?.posterUrl ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(t("content.saved"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => userContentAPI.delete(savedEntry!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(t("content.remove") + ".");
    },
  });

  const wantMutation = useMutation({
    mutationFn: () =>
      userContentAPI.save({
        externalId: id,
        title: content?.title ?? id,
        type: content?.type ?? "movie",
        description: content?.description ?? null,
        year: content?.year,
        genres: content?.genres,
        posterUrl: content?.posterUrl ?? null,
        status: content?.type === "book" ? "reading" : "want",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(content?.type === "book" ? t("content.wantToRead") : t("content.wantToWatch"));
    },
  });

  const rateMutation = useMutation({
    mutationFn: ({ rating, status }: { rating: number; status: string }) => {
      if (savedEntry) {
        return userContentAPI.patch(savedEntry.id, { rating, status });
      }
      return userContentAPI.save({
        externalId: id,
        title: content?.title ?? id,
        type: content?.type ?? "movie",
        description: content?.description ?? null,
        year: content?.year,
        genres: content?.genres,
        posterUrl: content?.posterUrl ?? null,
        status,
        rating,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(t("common.save") + "!");
      setRatingOpen(false);
    },
  });

  const typeLabel = content?.type === "movie"
    ? t("content.movie")
    : content?.type === "series"
    ? t("content.series")
    : t("content.book");

  return (
    <Layout>
      <SEOHead
        title={content?.title ?? "İçerik Detayı"}
        description={content?.description ?? undefined}
        canonicalPath={`/content/${encodedId}`}
      />
      <Box sx={{ maxWidth: 1000, mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>
        {isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t("content.loadError")}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Poster */}
          <Grid item xs={12} sm={4}>
            {isLoading ? (
              <Skeleton variant="rectangular" sx={{ width: "100%", height: 420, borderRadius: 2 }} />
            ) : (
              <Box
                component="img"
                src={content?.posterUrl || FALLBACK_IMG}
                alt={content?.title}
                sx={{ width: "100%", borderRadius: 2, boxShadow: 4, objectFit: "cover" }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.src = FALLBACK_IMG;
                }}
              />
            )}
          </Grid>

          {/* Info */}
          <Grid item xs={12} sm={8}>
            {isLoading ? (
              <>
                <Skeleton variant="text" sx={{ fontSize: "2rem", mb: 1 }} />
                <Skeleton width="40%" sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
              </>
            ) : (
              <>
                <Typography variant="h4" fontWeight={700} mb={1}>
                  {content?.title}
                </Typography>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
                  {content?.type && (
                    <Chip label={typeLabel} color={TYPE_COLOR[content.type] ?? "default"} size="small" />
                  )}
                  {content?.year && (
                    <Typography variant="body2" color="text.secondary">{content.year}</Typography>
                  )}
                  {detailData?.runtime && (
                    <Typography variant="body2" color="text.secondary">{detailData.runtime}</Typography>
                  )}
                  {detailData?.status && (
                    <Chip label={detailData.status} size="small" variant="outlined" />
                  )}
                </Box>

                {content?.rating != null && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Rating value={content.rating / 2} precision={0.5} readOnly />
                    <Typography variant="body2" color="text.secondary">
                      {content.rating}/10
                    </Typography>
                  </Box>
                )}

                {content?.genres && content.genres.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                    {content.genres.map((g) => (
                      <Chip
                        key={g}
                        label={localizeGenre(g, i18n.language)}
                        size="small"
                        variant="outlined"
                        clickable
                        onClick={() => navigate(`/search?q=${encodeURIComponent(g)}&type=${content.type}`)}
                      />
                    ))}
                  </Box>
                )}

                {content?.description && (
                  <Typography variant="body1" color="text.secondary" mb={2} sx={{ lineHeight: 1.7 }}>
                    {content.description}
                  </Typography>
                )}

                {(detailData?.director || detailData?.cast || detailData?.network) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    {detailData.director && (
                      <Typography variant="body2" mb={0.5}>
                        <strong>{t("content.director")}:</strong> {detailData.director}
                      </Typography>
                    )}
                    {detailData.cast && (
                      <Typography variant="body2" mb={0.5}>
                        <strong>{t("content.cast")}:</strong> {detailData.cast}
                      </Typography>
                    )}
                    {detailData.network && (
                      <Typography variant="body2" mb={0.5}>
                        <strong>{t("content.network")}:</strong> {detailData.network}
                      </Typography>
                    )}
                  </>
                )}

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 3 }}>
                  <Button
                    variant={isSaved ? "contained" : "outlined"}
                    color={isSaved ? "error" : "primary"}
                    startIcon={isSaved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    onClick={() => isSaved ? deleteMutation.mutate() : saveMutation.mutate()}
                    disabled={saveMutation.isPending || deleteMutation.isPending}
                  >
                    {isSaved ? t("content.saved") : t("content.save")}
                  </Button>

                  <Button
                    variant={isWanted ? "contained" : "outlined"}
                    color="secondary"
                    startIcon={isWanted ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                    onClick={() => wantMutation.mutate()}
                    disabled={wantMutation.isPending}
                  >
                    {content?.type === "book" ? t("content.wantToRead") : t("content.wantToWatch")}
                  </Button>

                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<StarIcon />}
                    onClick={() => setRatingOpen(true)}
                  >
                    {t("content.rate")}
                  </Button>
                </Box>
              </>
            )}
          </Grid>
        </Grid>
      </Box>

      <RatingDialog
        open={ratingOpen}
        content={contentItem}
        onClose={() => setRatingOpen(false)}
        onSave={(_contentId, rating, status) => rateMutation.mutate({ rating, status })}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={2500}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Layout>
  );
}
