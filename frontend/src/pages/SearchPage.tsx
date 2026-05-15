import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contentAPI, userContentAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { localizeGenre } from "../utils/genres";
import ContentCard, { ContentItem } from "../components/ContentCard";
import RatingDialog from "../components/RatingDialog";
import Layout from "../components/Layout";
import { SEOHead } from "../components/SEOHead";
import { useDebounce } from "../hooks/useDebounce";

type ContentType = "all" | "movie" | "series" | "book";

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [genreFilter, setGenreFilter] = useState(searchParams.get("genre") ?? "");
  const [contentType, setContentType] = useState<ContentType>(
    (searchParams.get("type") as ContentType) ?? "all"
  );

  // Sync when URL params change (e.g. genre chip click from another page)
  useEffect(() => {
    const q = searchParams.get("q");
    const genre = searchParams.get("genre");
    const type = searchParams.get("type") as ContentType | null;
    if (q !== null) { setQuery(q); setGenreFilter(""); }
    if (genre !== null) { setGenreFilter(genre); setQuery(""); }
    if (type && ["all", "movie", "series", "book"].includes(type)) setContentType(type);
  }, [searchParams]);
  const [ratingTarget, setRatingTarget] = useState<ContentItem | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  const isGenreMode = genreFilter.length > 0;

  const { data: searchData, isFetching, error: searchError } = useQuery({
    queryKey: ["search", debouncedQuery, contentType, genreFilter],
    queryFn: () =>
      contentAPI
        .search(
          isGenreMode ? "" : debouncedQuery,
          contentType === "all" ? undefined : contentType,
          isGenreMode ? genreFilter : undefined
        )
        .then((r) => r.data.data as ContentItem[]),
    enabled: isGenreMode || debouncedQuery.length > 1,
    retry: false,
  });

  const { data: savedData } = useQuery({
    queryKey: ["user-content", user?.id],
    queryFn: () => userContentAPI.getAll().then((r) => r.data.data as Array<{ content: { externalId: string }; status: string }>),
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: (content: ContentItem) =>
      userContentAPI.save({
        externalId: content.id,
        title: content.title,
        type: content.type,
        description: content.description ?? null,
        year: content.year,
        genres: content.genres,
        posterUrl: content.posterUrl ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(t("content.saved"));
    },
  });

  const rateMutation = useMutation({
    mutationFn: ({
      externalId,
      rating,
      status,
    }: {
      externalId: string;
      rating: number;
      status: string;
    }) =>
      userContentAPI.save({
        externalId,
        title: ratingTarget?.title ?? "",
        type: ratingTarget?.type ?? "movie",
        description: ratingTarget?.description ?? null,
        year: ratingTarget?.year,
        genres: ratingTarget?.genres,
        posterUrl: ratingTarget?.posterUrl ?? null,
        status,
        rating,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(t("common.save") + "!");
      setRatingTarget(null);
    },
  });

  const wantMutation = useMutation({
    mutationFn: (content: ContentItem) =>
      userContentAPI.save({
        externalId: content.id,
        title: content.title,
        type: content.type,
        description: content.description ?? null,
        year: content.year,
        genres: content.genres,
        posterUrl: content.posterUrl ?? null,
        status: content.type === "book" ? "reading" : "want",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(t("content.wantToWatch"));
    },
  });

  const savedIds: Set<string> = new Set(
    (savedData ?? []).map((s) => s.content.externalId)
  );
  const wantIds: Set<string> = new Set(
    (savedData ?? []).filter((s) => s.status === "want" || s.status === "reading").map((s) => s.content.externalId)
  );

  const results: ContentItem[] = searchData ?? [];

  const handleRateSave = (externalId: string, rating: number, status: string) => {
    rateMutation.mutate({ externalId, rating, status });
  };

  return (
    <Layout>
      <SEOHead
        title="İçerik Ara"
        description="Milyonlarca film, dizi ve kitap arasında ara"
        canonicalPath="/search"
      />
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 3 }}>
        <Typography variant="h4" fontWeight={700} mb={1}>
          {isGenreMode
            ? `"${localizeGenre(genreFilter, i18n.language)}" Türündeki İçerikler`
            : t("nav.search")}
        </Typography>

        {isGenreMode && (
          <Typography
            variant="body2"
            color="text.secondary"
            mb={3}
            sx={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => { setGenreFilter(""); setQuery(""); }}
          >
            ← Aramaya dön
          </Typography>
        )}

        {!isGenreMode && (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder={t("content.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              endAdornment: isFetching ? (
                <CircularProgress size={18} />
              ) : null,
            }}
          />

          <ToggleButtonGroup
            value={contentType}
            exclusive
            onChange={(_e, val) => { if (val) setContentType(val); }}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="all">{t("common.all")}</ToggleButton>
            <ToggleButton value="movie">{t("content.movie")}</ToggleButton>
            <ToggleButton value="series">{t("content.series")}</ToggleButton>
            <ToggleButton value="book">{t("content.book")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        )}

        {!isGenreMode && !debouncedQuery && (
          <Typography color="text.secondary" textAlign="center" py={6}>
            {t("content.searchPlaceholder")}
          </Typography>
        )}

        {searchError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {(searchError as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Arama sırasında hata oluştu."}
          </Alert>
        )}

        {(isGenreMode || debouncedQuery) && results.length === 0 && !isFetching && !searchError && (
          <Typography color="text.secondary" textAlign="center" py={6}>
            Sonuç bulunamadı.
          </Typography>
        )}

        <Grid container spacing={2}>
          {results.map((item: ContentItem) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <ContentCard
                content={item}
                isSaved={savedIds.has(item.id)}
                isWanted={wantIds.has(item.id)}
                onSave={(c) => saveMutation.mutate(c)}
                onWant={(c) => wantMutation.mutate(c)}
                onRate={(c) => setRatingTarget(c)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      <RatingDialog
        open={!!ratingTarget}
        content={ratingTarget}
        onClose={() => setRatingTarget(null)}
        onSave={handleRateSave}
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
