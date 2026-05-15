import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { SEOHead } from "../components/SEOHead";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, username);
      navigate("/onboarding", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? t("common.error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <SEOHead title="Kayıt Ol" canonicalPath="/register" />

      {/* Sol panel — gradient */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(145deg, #6C63FF 0%, #FF6584 100%)",
          color: "white",
          p: 6,
          gap: 3,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 56 }} />
        <Typography variant="h3" fontWeight={800} textAlign="center">
          RecoApp
        </Typography>
        <Typography variant="h6" textAlign="center" sx={{ opacity: 0.9, maxWidth: 320 }}>
          Ücretsiz kayıt olun, kişisel önerilerinizi keşfedin
        </Typography>
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5, width: "100%", maxWidth: 300 }}>
          {["✨ Ücretsiz & Hızlı kayıt", "🎯 Size özel öneriler", "📊 İzleme listesi takibi"].map((item) => (
            <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body1" sx={{ opacity: 0.95 }}>{item}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Sağ panel — form */}
      <Box
        sx={{
          flex: { xs: 1, md: "0 0 440px" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 3, sm: 6 },
          py: 6,
          bgcolor: "background.default",
        }}
      >
        <Box sx={{ maxWidth: 360, width: "100%", mx: "auto" }}>
          <Typography variant="h4" fontWeight={800} mb={0.5}>
            {t("auth.registerTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Birkaç saniyede hesabınızı oluşturun
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label={t("auth.username")}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              autoComplete="username"
              inputProps={{ minLength: 3 }}
            />
            <TextField
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
            />
            <TextField
              label={t("auth.password")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="new-password"
              inputProps={{ minLength: 6 }}
              helperText="En az 6 karakter"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              size="large"
              sx={{ mt: 0.5 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : t("auth.register")}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
            {t("auth.hasAccount")}{" "}
            <Link component={RouterLink} to="/login" fontWeight={600} underline="hover">
              {t("auth.login")}
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
