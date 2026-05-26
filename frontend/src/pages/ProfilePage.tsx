import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  Tabs,
  Tab,
  Avatar,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  Chip,
  Button,
  TextField,
  Divider,
  Paper,
  Badge,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CameraAlt as CameraAltIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Star as StarIcon,
  Movie as MovieIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { userContentAPI, usersAPI } from "../services/api";
import ContentCard, { ContentItem } from "../components/ContentCard";
import RatingDialog from "../components/RatingDialog";
import Layout from "../components/Layout";
import { SEOHead } from "../components/SEOHead";
import { ALL_GENRES, localizeGenre } from "../utils/genres";

type MainTab = "library" | "edit" | "security" | "preferences";

interface UserContentItem {
  id: number;
  rating?: number;
  status?: string;
  content: {
    externalId: string;
    title: string;
    type: string;
    year?: number;
    genres?: string[];
    posterUrl?: string;
  };
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<MainTab>("library");
  const [libraryTab, setLibraryTab] = useState<"watched" | "want_to_watch">("watched");
  const [ratingTarget, setRatingTarget] = useState<ContentItem | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Edit profile state
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Genre preferences
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-content", user?.id],
    queryFn: () => userContentAPI.getAll().then((r) => r.data.data as UserContentItem[]),
    enabled: !!user,
  });

  const { data: statsData } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: () => usersAPI.getStats(user!.id).then((r) => r.data.data as { total: number; averageRating: number | null }),
    enabled: !!user,
  });

  const { data: prefData } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: () => usersAPI.getPreferences(user!.id).then((r) => r.data.data as { preferredGenres: string[] }),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (prefData?.preferredGenres) setSelectedGenres(prefData.preferredGenres);
  }, [prefData]);

  React.useEffect(() => {
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userContentAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar("Silindi.");
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, rating, status }: { id: number; rating: number; status: string }) =>
      userContentAPI.patch(id, { rating, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-content"] });
      setSnackbar(t("common.save") + "!");
      setRatingTarget(null);
    },
  });

  const profileMutation = useMutation({
    mutationFn: () => usersAPI.updateProfile(user!.id, { username, email, phone: phone || null }),
    onSuccess: async () => {
      await refreshUser();
      setSnackbar("Profil güncellendi!");
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setSnackbar(err?.response?.data?.error ?? t("common.error"));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => usersAPI.changePassword(user!.id, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setSnackbar("Şifre güncellendi!");
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setPasswordError(err?.response?.data?.error ?? t("common.error"));
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => usersAPI.uploadAvatar(user!.id, file),
    onSuccess: async () => {
      await refreshUser();
      setAvatarPreview(null);
      setSnackbar("Profil fotoğrafı güncellendi!");
    },
    onError: () => setSnackbar("Fotoğraf yüklenemedi."),
  });

  const prefMutation = useMutation({
    mutationFn: (genres: string[]) => usersAPI.updatePreferences(user!.id, genres),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      setSnackbar(t("profile.prefsSaved"));
    },
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const items: UserContentItem[] = data ?? [];
  const watched = items.filter((i) => i.status === "watched" || i.status === "read");
  const wanted = items.filter((i) => i.status === "want" || i.status === "reading");
  const filtered = libraryTab === "watched" ? watched : wanted;

  const toContentItem = (item: UserContentItem): ContentItem => ({
    id: item.content.externalId,
    title: item.content.title,
    type: item.content.type as ContentItem["type"],
    year: item.content.year,
    genres: item.content.genres,
    posterUrl: item.content.posterUrl,
    rating: item.rating,
  });

  const handleRateSave = (externalId: string, rating: number, status: string) => {
    const found = items.find((i) => i.content.externalId === externalId);
    if (found) patchMutation.mutate({ id: found.id, rating, status });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    avatarMutation.mutate(file);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Yeni şifreler eşleşmiyor.");
      return;
    }
    passwordMutation.mutate();
  };

  const avatarSrc = avatarPreview ?? (user?.avatarUrl ? user.avatarUrl : undefined);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Layout>
      <SEOHead title="Profilim" canonicalPath="/profile" />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>

        {/* ── Profile header ── */}
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            mb: 3,
            borderRadius: 4,
            background: "linear-gradient(135deg, #6C63FF15 0%, #FF658415 100%)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            {/* Avatar */}
            <Box sx={{ position: "relative" }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={
                  <IconButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarMutation.isPending}
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      width: 32,
                      height: 32,
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    {avatarMutation.isPending
                      ? <CircularProgress size={14} color="inherit" />
                      : <CameraAltIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                }
              >
                <Avatar
                  src={avatarSrc}
                  sx={{
                    width: 88,
                    height: 88,
                    fontSize: 36,
                    bgcolor: "primary.main",
                    boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
                  }}
                >
                  {user?.username?.[0]?.toUpperCase() ?? "U"}
                </Avatar>
              </Badge>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
            </Box>

            {/* User info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={700}>
                {user?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {user?.email}
              </Typography>
              {user?.phone && (
                <Typography variant="body2" color="text.secondary">
                  📞 {user.phone}
                </Typography>
              )}
            </Box>

            {/* Stats */}
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box textAlign="center">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "center" }}>
                  <MovieIcon fontSize="small" color="primary" />
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {statsData?.total ?? 0}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">İçerik</Typography>
              </Box>
              <Box textAlign="center">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "center" }}>
                  <StarIcon fontSize="small" color="warning" />
                  <Typography variant="h6" fontWeight={700} color="warning.main">
                    {statsData?.averageRating ? statsData.averageRating.toFixed(1) : "—"}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Ort. Puan</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* ── Main tabs ── */}
        <Tabs
          value={mainTab}
          onChange={(_e, val) => setMainTab(val)}
          sx={{ mb: 3, "& .MuiTab-root": { fontWeight: 600, textTransform: "none" } }}
        >
          <Tab value="library" label="Kütüphanem" icon={<MovieIcon />} iconPosition="start" />
          <Tab value="edit" label="Profili Düzenle" icon={<EditIcon />} iconPosition="start" />
          <Tab value="security" label="Şifre" icon={<LockIcon />} iconPosition="start" />
          <Tab value="preferences" label={t("profile.genrePrefs")} icon={<PersonIcon />} iconPosition="start" />
        </Tabs>

        {/* ══ LIBRARY TAB ══ */}
        {mainTab === "library" && (
          <Box>
            <Tabs
              value={libraryTab}
              onChange={(_e, val) => setLibraryTab(val)}
              sx={{ mb: 3 }}
              variant="scrollable"
            >
              <Tab value="watched" label={`${t("content.watched")} / ${t("content.read")} (${watched.length})`} />
              <Tab value="want_to_watch" label={`${t("content.wantToWatch")} / ${t("content.reading")} (${wanted.length})`} />
            </Tabs>

            {isLoading && (
              <Grid container spacing={2}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                  </Grid>
                ))}
              </Grid>
            )}
            {isError && <Alert severity="error">{t("common.error")}</Alert>}
            {!isLoading && !isError && filtered.length === 0 && (
              <Typography color="text.secondary" textAlign="center" py={8}>
                {t("profile.emptyList")}
              </Typography>
            )}
            {!isLoading && !isError && filtered.length > 0 && (
              <Grid container spacing={2}>
                {filtered.map((item) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                    <Box sx={{ position: "relative" }}>
                      <ContentCard
                        content={toContentItem(item)}
                        isSaved={item.status === "watched" || item.status === "read"}
                        isWanted={item.status === "want" || item.status === "reading"}
                        onRate={(c) => setRatingTarget(c)}
                      />
                      <Tooltip title={t("profile.delete")}>
                        <IconButton
                          size="small"
                          color="error"
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            bgcolor: "background.paper",
                            boxShadow: 2,
                            "&:hover": { bgcolor: "error.light", color: "white" },
                          }}
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* ══ EDIT PROFILE TAB ══ */}
        {mainTab === "edit" && (
          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, maxWidth: 520 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>
              Profil Bilgileri
            </Typography>
            <Box
              component="form"
              onSubmit={(e) => { e.preventDefault(); profileMutation.mutate(); }}
              sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
            >
              <TextField
                label={t("auth.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                inputProps={{ minLength: 3 }}
              />
              <TextField
                label={t("auth.email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
              <TextField
                label="Telefon Numarası"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                placeholder="+90 5XX XXX XX XX"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">📞</InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={profileMutation.isPending}
                sx={{ mt: 1 }}
              >
                {profileMutation.isPending ? <CircularProgress size={22} color="inherit" /> : t("common.save")}
              </Button>
            </Box>
          </Paper>
        )}

        {/* ══ SECURITY TAB ══ */}
        {mainTab === "security" && (
          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, maxWidth: 520 }}>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Şifre Değiştir
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Güvenliğiniz için güçlü bir şifre kullanın.
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {passwordError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {passwordError}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handlePasswordSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
            >
              <TextField
                label="Mevcut Şifre"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrent((s) => !s)} edge="end">
                        {showCurrent ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Yeni Şifre"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                fullWidth
                inputProps={{ minLength: 6 }}
                helperText="En az 6 karakter"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNew((s) => !s)} edge="end">
                        {showNew ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Yeni Şifre Tekrar"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
                error={confirmPassword !== "" && confirmPassword !== newPassword}
                helperText={confirmPassword !== "" && confirmPassword !== newPassword ? "Şifreler eşleşmiyor" : ""}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={passwordMutation.isPending}
                sx={{ mt: 1 }}
              >
                {passwordMutation.isPending ? <CircularProgress size={22} color="inherit" /> : "Şifreyi Güncelle"}
              </Button>
            </Box>
          </Paper>
        )}

        {/* ══ PREFERENCES TAB ══ */}
        {mainTab === "preferences" && (
          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={1}>
              {t("profile.genrePrefs")}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {t("profile.genreHint")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              {ALL_GENRES.map((genre) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <Chip
                    key={genre}
                    label={localizeGenre(genre, i18n.language)}
                    clickable
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    onClick={() =>
                      setSelectedGenres((prev) =>
                        prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
                      )
                    }
                  />
                );
              })}
            </Box>
            <Button
              variant="contained"
              disabled={prefMutation.isPending}
              onClick={() => prefMutation.mutate(selectedGenres)}
            >
              {prefMutation.isPending ? <CircularProgress size={22} color="inherit" /> : t("common.save")}
            </Button>
          </Paper>
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
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Layout>
  );
}
