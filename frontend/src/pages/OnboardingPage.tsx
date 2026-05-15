import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { usersAPI, contentAPI, userContentAPI } from "../services/api";
import ContentCard, { ContentItem } from "../components/ContentCard";

const GENRES = [
  "Action", "Drama", "Comedy", "Sci-Fi", "Romance",
  "Thriller", "Horror", "Documentary", "Animation", "Crime",
];

const STEPS = ["Türler", "İçerikler"];

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "movie" | "series" | "book">("all");
  const [selectedContents, setSelectedContents] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["onboarding-search", searchQuery, searchType],
    queryFn: () =>
      contentAPI
        .search(searchQuery, searchType === "all" ? undefined : searchType)
        .then((r) => r.data.data as ContentItem[]),
    enabled: searchQuery.length > 2,
  });

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      // Save all selected contents to DB first
      if (selectedContents.length > 0) {
        await Promise.all(
          selectedContents.map((c) =>
            userContentAPI.save({
              externalId: c.id,
              title: c.title,
              type: c.type,
              year: c.year,
              genres: c.genres,
              posterUrl: c.posterUrl ?? null,
              status: "watched",
            })
          )
        );
      }
      // Mark onboarding done with genres
      return usersAPI.onboarding(user!.id, selectedGenres, []);
    },
    onSuccess: async () => {
      // Refresh user in AuthContext so onboardingDone = true, then navigate
      await refreshUser();
      navigate("/dashboard", { replace: true });
    },
    onError: () => setError(t("common.error")),
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleContent = (item: ContentItem) => {
    setSelectedContents((prev) =>
      prev.some((c) => c.id === item.id)
        ? prev.filter((c) => c.id !== item.id)
        : [...prev, item]
    );
  };

  const handleFinish = () => {
    onboardingMutation.mutate();
  };

  const handleSkip = () => {
    navigate("/dashboard", { replace: true });
  };

  const results: ContentItem[] = searchResults ?? [];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.50",
        px: 2,
        py: 4,
      }}
    >
      <Paper sx={{ maxWidth: 720, width: "100%", p: { xs: 3, md: 5 } }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" mb={1}>
          {t("onboarding.title")}
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" mb={4}>
          {t("onboarding.subtitle")}
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 1: Genre selection */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" mb={2}>
              {t("onboarding.selectGenres")}
            </Typography>
            <Grid container spacing={1}>
              {GENRES.map((genre) => (
                <Grid item xs={6} sm={4} md={3} key={genre}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      textAlign: "center",
                      cursor: "pointer",
                      bgcolor: selectedGenres.includes(genre)
                        ? "primary.light"
                        : "background.paper",
                      color: selectedGenres.includes(genre)
                        ? "primary.contrastText"
                        : "text.primary",
                      border: selectedGenres.includes(genre)
                        ? "2px solid"
                        : "1px solid",
                      borderColor: selectedGenres.includes(genre)
                        ? "primary.main"
                        : "divider",
                      transition: "all 0.2s",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                    onClick={() => toggleGenre(genre)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedGenres.includes(genre)}
                          size="small"
                          sx={{ display: "none" }}
                        />
                      }
                      label={genre}
                      sx={{ m: 0, cursor: "pointer" }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 2: Content search */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" mb={1}>
              {t("onboarding.selectContent")}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Seçilen içerikler: {selectedContents.length > 0
                ? selectedContents.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.title}
                      size="small"
                      onDelete={() => toggleContent(c)}
                      sx={{ ml: 0.5 }}
                    />
                  ))
                : " Henüz seçilmedi"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                placeholder={t("content.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  endAdornment: isFetching ? <CircularProgress size={18} /> : null,
                }}
              />
              <ToggleButtonGroup
                value={searchType}
                exclusive
                onChange={(_e, val) => { if (val) setSearchType(val); }}
                size="small"
                sx={{ flexShrink: 0 }}
              >
                <ToggleButton value="all">Tümü</ToggleButton>
                <ToggleButton value="movie">{t("content.movie")}</ToggleButton>
                <ToggleButton value="series">{t("content.series")}</ToggleButton>
                <ToggleButton value="book">{t("content.book")}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Grid container spacing={2}>
              {results.map((item: ContentItem) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <ContentCard
                    content={item}
                    isSaved={selectedContents.some((c) => c.id === item.id)}
                    onSave={() => toggleContent(item)}
                    disableNavigate
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Actions */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 4,
          }}
        >
          <Button variant="text" color="inherit" onClick={handleSkip}>
            {t("onboarding.skip")}
          </Button>

          <Box sx={{ display: "flex", gap: 1 }}>
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={() => setActiveStep((s) => s - 1)}
              >
                Geri
              </Button>
            )}
            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => setActiveStep((s) => s + 1)}
              >
                {t("onboarding.continue")}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleFinish}
                disabled={onboardingMutation.isPending}
              >
                {onboardingMutation.isPending ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  t("onboarding.continue")
                )}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
