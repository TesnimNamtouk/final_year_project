import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Tabs,
  Tab,
  Skeleton,
  Alert,
  Button,
  Snackbar,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { recommendationsAPI, userContentAPI } from "../services/api";
import ContentCard, { ContentItem } from "../components/ContentCard";
import RatingDialog from "../components/RatingDialog";
import Layout from "../components/Layout";
import { SEOHead } from "../components/SEOHead";

type TabValue = "all" | "movie" | "series" | "book";

const TABS: { value: TabValue; labelKey: string }[] = [
  { value: "all", labelKey: "Tümü" },
  { value: "movie", labelKey: "content.movie" },
  { value: "series", labelKey: "content.series" },
  { value: "book", labelKey: "content.book" },
];

function SkeletonGrid() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          <Skeleton sx={{ mt: 1 }} />
          <Skeleton width="60%" />
        </Grid>
      ))}
    </Grid>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [ratingTarget, setRatingTarget] = useState<ContentItem | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const {
    data: recoData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["recommendations", user?.id],
    queryFn: () => recommendationsAPI.get().then((r) => r.data.data as Array<{ content: ContentItem & { externalId: string } }>),
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      setSnackbar(t("common.save") + "!");
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

  const recommendations: ContentItem[] =
    (recoData ?? []).map((r) => ({ ...r.content, id: r.content.externalId }));

  const filtered =
    activeTab === "all"
      ? recommendations
      : recommendations.filter((r: ContentItem) => r.type === activeTab);

  const handleRateSave = (externalId: string, rating: number, status: string) => {
    rateMutation.mutate({ externalId, rating, status });
    setRatingTarget(null);
  };

  return (
    <Layout>
      <SEOHead
        title="Önerilerim"
        description="Kişiselleştirilmiş film, dizi ve kitap önerileri"
        canonicalPath="/dashboard"
      />
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 3 }}>
        <Typography variant="h4" fontWeight={700} mb={3}>
          {t("recommendations.title")}
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          sx={{ mb: 3 }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.value === "all" ? t("common.all") : t(tab.labelKey)}
            />
          ))}
        </Tabs>

        {isLoading && <SkeletonGrid />}

        {isError && (
          <Box textAlign="center" py={6}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {t("common.error")}
            </Alert>
            <Button variant="outlined" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </Box>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <Box textAlign="center" py={8}>
            <Typography color="text.secondary" variant="h6">
              {t("recommendations.noRecommendations")}
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <Grid container spacing={2}>
            {filtered.map((item: ContentItem) => (
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
        )}
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
