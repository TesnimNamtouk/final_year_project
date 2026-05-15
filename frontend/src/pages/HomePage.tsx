import React from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Container,
  Chip,
} from "@mui/material";
import {
  Recommend as RecommendIcon,
  MovieFilter as MovieFilterIcon,
  Psychology as PsychologyIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SEOHead } from "../components/SEOHead";

const FEATURES = [
  {
    icon: <RecommendIcon sx={{ fontSize: 36 }} />,
    color: "#6C63FF",
    bg: "rgba(108,99,255,0.1)",
    title: "Kişisel Öneriler",
    description: "Zevklerinize göre özelleştirilmiş film, dizi ve kitap önerileri alın.",
  },
  {
    icon: <MovieFilterIcon sx={{ fontSize: 36 }} />,
    color: "#FF6584",
    bg: "rgba(255,101,132,0.1)",
    title: "Film & Dizi & Kitap",
    description: "Üç farklı içerik kategorisinde binlerce eseri keşfedin ve takip edin.",
  },
  {
    icon: <PsychologyIcon sx={{ fontSize: 36 }} />,
    color: "#43D9AD",
    bg: "rgba(67,217,173,0.1)",
    title: "AI Destekli",
    description: "Yapay zeka algoritmamız beğenilerinizi öğrenerek daha iyi öneriler sunar.",
  },
];

const STATS = [
  { value: "3", label: "İçerik Türü" },
  { value: "AI", label: "Hibrit Algoritma" },
  { value: "TR/EN", label: "Dil Desteği" },
];

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: "background.default" }}>
      <SEOHead
        title="Ana Sayfa"
        description="Yapay zeka destekli kişiselleştirilmiş film, dizi ve kitap öneri platformu."
        canonicalPath="/"
      />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(145deg, #6C63FF 0%, #FF6584 100%)",
          color: "white",
          pt: { xs: 10, md: 16 },
          pb: { xs: 12, md: 18 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip
            label="🤖 AI Destekli Öneri Motoru"
            sx={{
              mb: 3,
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.85rem",
              backdropFilter: "blur(8px)",
            }}
          />
          <Typography
            variant="h2"
            fontWeight={800}
            mb={2}
            sx={{ fontSize: { xs: "2.4rem", md: "4rem" }, lineHeight: 1.15 }}
          >
            İçerik Seçimini
            <br />
            <Box component="span" sx={{ opacity: 0.9 }}>
              AI'ya Bırak
            </Box>
          </Typography>
          <Typography
            variant="h6"
            mb={5}
            sx={{ opacity: 0.85, maxWidth: 520, mx: "auto", fontWeight: 400, lineHeight: 1.7 }}
          >
            Film, dizi ve kitap beğenilerinizi kaydederek size özel
            kişiselleştirilmiş öneriler alın.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/register")}
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: "white",
                color: "primary.main",
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                "&:hover": { bgcolor: "grey.50" },
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}
            >
              Ücretsiz Başla
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate("/login")}
              sx={{
                borderColor: "rgba(255,255,255,0.6)",
                color: "white",
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              {t("auth.login")}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Stats */}
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: { xs: 4, md: 8 },
            mt: -4,
            mb: 2,
            bgcolor: "background.paper",
            borderRadius: 4,
            py: 4,
            px: { xs: 3, md: 6 },
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            flexWrap: "wrap",
          }}
        >
          {STATS.map((s) => (
            <Box key={s.label} textAlign="center">
              <Typography variant="h4" fontWeight={800} color="primary.main">
                {s.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography variant="h4" fontWeight={800} textAlign="center" mb={1}>
          Neden RecoApp?
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" mb={6}>
          Tek platformda tüm içerik takibiniz
        </Typography>
        <Grid container spacing={3}>
          {FEATURES.map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <Card
                sx={{
                  height: "100%",
                  p: 1,
                  transition: "transform 0.25s, box-shadow 0.25s",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 3,
                      bgcolor: feature.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: feature.color,
                      mb: 2.5,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Box
        sx={{
          background: "linear-gradient(145deg, #1A1D2E 0%, #2D2F4E 100%)",
          py: { xs: 8, md: 12 },
          textAlign: "center",
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h4" fontWeight={800} color="white" mb={2}>
            Hemen Başlayın
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)", mb: 4 }}>
            Ücretsiz hesap oluşturun ve kişisel önerilerinizi keşfedin.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/register")}
            endIcon={<ArrowForwardIcon />}
            sx={{ px: 5, py: 1.5, fontSize: "1rem" }}
          >
            {t("auth.register")}
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
