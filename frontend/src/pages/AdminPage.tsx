import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Avatar,
  Stack,
  Button,
} from "@mui/material";
import {
  PeopleAlt as UsersIcon,
  BarChart as StatsIcon,
  Assignment as LogsIcon,
  Recommend as RecIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  totalContent: number;
  totalUserContent: number;
  totalRecommendations: number;
  totalSystemLogs: number;
  totalRecLogs: number;
  algorithmBreakdown: { algorithm: string; count: number }[];
}

interface AdminUser {
  id: number;
  email: string;
  username: string;
  language: string;
  createdAt: string;
  onboardingDone: boolean;
  preferredGenres: string[];
  contentCount: number;
  recommendationCount: number;
  activityCount: number;
  ratedCount: number;
  averageRating: number | null;
}

interface SystemLog {
  id: number;
  level: "INFO" | "DEBUG" | "WARNING" | "ERROR";
  category: string;
  message: string;
  details: Record<string, unknown> | null;
  userId: number | null;
  createdAt: string;
}

interface RecLog {
  id: number;
  userId: number;
  algorithm: string;
  itemCount: number;
  executionMs: number | null;
  isColdStart: boolean;
  createdAt: string;
  user: { username: string; email: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, "info" | "default" | "warning" | "error"> = {
  INFO: "info", DEBUG: "default", WARNING: "warning", ERROR: "error",
};
const CATEGORY_COLOR: Record<string, "primary" | "secondary" | "success" | "warning" | "info" | "default"> = {
  ML_HYBRID: "primary", ML_CBF: "secondary", ML_CF: "success", USER_ACTION: "info",
};
const LOG_CATEGORIES = ["Tümü", "ML_HYBRID", "ML_CBF", "ML_CF", "USER_ACTION"];

function StatCard({ label, value, color = "primary.main" }: { label: string; value: number | string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
      <Typography variant="h3" fontWeight={800} color={color}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null) return null;
  return (
    <Box sx={{ display: "flex", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 160, fontWeight: 600 }}>{label}:</Typography>
      <Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
        {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
      </Typography>
    </Box>
  );
}

function DetailsPanel({ details }: { details: Record<string, unknown> | null }) {
  if (!details) return null;
  return (
    <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
      {Object.entries(details).map(([k, v]) => {
        if (v === null || v === undefined) return null;
        if (typeof v === "object" && !Array.isArray(v)) {
          const obj = v as Record<string, unknown>;
          return (
            <Box key={k} sx={{ mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: "uppercase" }}>{k}</Typography>
              {obj.description && <Typography variant="body2" sx={{ mt: 0.25, mb: 0.5 }}>{String(obj.description)}</Typography>}
              <Box sx={{ pl: 1 }}>
                {Object.entries(obj).filter(([ek]) => ek !== "description").map(([ek, ev]) => <DetailRow key={ek} label={ek} value={ev} />)}
              </Box>
            </Box>
          );
        }
        if (Array.isArray(v)) {
          return (
            <Box key={k} sx={{ mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: "uppercase", display: "block", mb: 0.5 }}>{k}</Typography>
              {(v as Record<string, unknown>[]).map((item, i) => (
                <Box key={i} sx={{ pl: 1, mb: 0.75, borderLeft: "2px solid", borderColor: "divider" }}>
                  {typeof item === "object"
                    ? Object.entries(item).map(([ek, ev]) => <DetailRow key={ek} label={ek} value={ev} />)
                    : <Typography variant="caption">{String(item)}</Typography>}
                </Box>
              ))}
            </Box>
          );
        }
        return <DetailRow key={k} label={k} value={v} />;
      })}
    </Box>
  );
}

function LogRow({ log }: { log: SystemLog }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!log.details && Object.keys(log.details).length > 0;
  return (
    <>
      <TableRow
        sx={{ cursor: hasDetails ? "pointer" : "default", "&:hover": hasDetails ? { bgcolor: "action.hover" } : {}, "& > td": { borderBottom: open ? "none" : undefined } }}
        onClick={() => hasDetails && setOpen((p) => !p)}
      >
        <TableCell sx={{ width: 32, p: 0.5 }}>
          {hasDetails && <IconButton size="small">{open ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}</IconButton>}
        </TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>
          <Typography variant="caption" color="text.secondary">{new Date(log.createdAt).toLocaleString("tr-TR")}</Typography>
        </TableCell>
        <TableCell><Chip label={log.level} color={LEVEL_COLOR[log.level] ?? "default"} size="small" /></TableCell>
        <TableCell><Chip label={log.category} color={CATEGORY_COLOR[log.category] ?? "default"} size="small" variant="outlined" /></TableCell>
        <TableCell><Typography variant="body2">{log.message}</Typography></TableCell>
        <TableCell sx={{ textAlign: "center" }}>
          {log.userId != null && <Chip label={`#${log.userId}`} size="small" variant="outlined" />}
        </TableCell>
      </TableRow>
      {hasDetails && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0, px: 2 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5 }}><DetailsPanel details={log.details} /></Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminAPI.stats().then((r) => r.data.data as Stats),
  });
  if (isLoading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  if (!data) return <Alert severity="error">Veriler yüklenemedi.</Alert>;
  return (
    <Box>
      <Grid container spacing={2} mb={4}>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Kullanıcı" value={data.totalUsers} /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="İçerik" value={data.totalContent} color="secondary.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Kullanıcı Listesi" value={data.totalUserContent} color="success.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Öneri" value={data.totalRecommendations} color="warning.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Sistem Logu" value={data.totalSystemLogs} color="info.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Öneri Oturumu" value={data.totalRecLogs} color="error.main" /></Grid>
      </Grid>
      <Typography variant="h6" fontWeight={700} mb={2}>Algoritma Dağılımı</Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {data.algorithmBreakdown.map((a) => (
          <Paper key={a.algorithm} variant="outlined" sx={{ px: 3, py: 2, borderRadius: 2, textAlign: "center" }}>
            <Typography variant="h5" fontWeight={700}>{a.count}</Typography>
            <Typography variant="caption" color="text.secondary">{a.algorithm}</Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

function UsersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminAPI.users().then((r) => r.data.data as AdminUser[]),
  });
  if (isLoading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  if (!data) return <Alert severity="error">Kullanıcılar yüklenemedi.</Alert>;
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "grey.100" }}>
            {["#", "Kullanıcı", "E-posta", "Dil", "Kayıt Tarihi", "Onboarding", "İçerik", "Puan", "Ort. Puan", "Tercih Türleri"].map((h) => (
              <TableCell key={h}><Typography variant="caption" fontWeight={700}>{h}</Typography></TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((u) => (
            <TableRow key={u.id} hover>
              <TableCell><Typography variant="caption">#{u.id}</Typography></TableCell>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "primary.main" }}>
                    {u.username[0]?.toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600}>{u.username}</Typography>
                </Box>
              </TableCell>
              <TableCell><Typography variant="caption">{u.email}</Typography></TableCell>
              <TableCell><Chip label={u.language} size="small" /></TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={u.onboardingDone ? "Tamamlandı" : "Bekliyor"} color={u.onboardingDone ? "success" : "warning"} size="small" />
              </TableCell>
              <TableCell><Typography variant="body2">{u.contentCount}</Typography></TableCell>
              <TableCell><Typography variant="body2">{u.ratedCount}</Typography></TableCell>
              <TableCell>
                <Typography variant="body2">{u.averageRating != null ? `${u.averageRating}/10` : "-"}</Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {u.preferredGenres.slice(0, 3).map((g) => (
                    <Chip key={g} label={g} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
                  ))}
                  {u.preferredGenres.length > 3 && (
                    <Chip label={`+${u.preferredGenres.length - 3}`} size="small" sx={{ fontSize: "0.65rem", height: 20 }} />
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SystemLogsTab() {
  const [category, setCategory] = useState("Tümü");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", category],
    queryFn: () =>
      adminAPI.logs({ category: category === "Tümü" ? undefined : category, limit: 100 })
        .then((r) => r.data as { data: SystemLog[]; total: number }),
    refetchInterval: 30000,
  });
  const logs = data?.data ?? [];
  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="body2" fontWeight={600}>Kategori:</Typography>
        <ToggleButtonGroup value={category} exclusive onChange={(_e, val) => { if (val) setCategory(val); }} size="small">
          {LOG_CATEGORIES.map((c) => <ToggleButton key={c} value={c}>{c}</ToggleButton>)}
        </ToggleButtonGroup>
        {data && <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>Toplam {data.total} kayıt</Typography>}
      </Stack>
      {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {!isLoading && logs.length === 0 && <Alert severity="info">Bu kategoride log kaydı yok.</Alert>}
      {logs.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                {["", "Tarih/Saat", "Seviye", "Kategori", "Mesaj", "Kullanıcı"].map((h) => (
                  <TableCell key={h}><Typography variant="caption" fontWeight={700}>{h}</Typography></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>{logs.map((log) => <LogRow key={log.id} log={log} />)}</TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function RecLogsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-rec-logs"],
    queryFn: () =>
      adminAPI.recommendationLogs({ limit: 100 })
        .then((r) => r.data as { data: RecLog[]; total: number }),
    refetchInterval: 30000,
  });
  const logs = data?.data ?? [];
  const ALGO_COLOR: Record<string, "primary" | "success" | "warning" | "default"> = {
    hybrid: "primary",
    cold_start_hybrid: "warning",
    cold_start_genre: "success",
  };
  return (
    <Box>
      {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {!isLoading && logs.length === 0 && <Alert severity="info">Henüz öneri oturumu kaydı yok.</Alert>}
      {logs.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                {["Tarih/Saat", "Kullanıcı", "Algoritma", "Cold Start", "Önerilen", "Süre (ms)"].map((h) => (
                  <TableCell key={h}><Typography variant="caption" fontWeight={700}>{h}</Typography></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{new Date(log.createdAt).toLocaleString("tr-TR")}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{log.user.username}</Typography>
                    <Typography variant="caption" color="text.secondary">{log.user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.algorithm} color={ALGO_COLOR[log.algorithm] ?? "default"} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={log.isColdStart ? "Evet" : "Hayır"} color={log.isColdStart ? "warning" : "success"} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell><Typography variant="body2">{log.itemCount}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" color={log.executionMs && log.executionMs > 5000 ? "warning.main" : "text.primary"}>
                      {log.executionMs != null ? log.executionMs.toLocaleString() : "-"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { label: "Genel Bakış", icon: <StatsIcon fontSize="small" /> },
  { label: "Kullanıcılar", icon: <UsersIcon fontSize="small" /> },
  { label: "Sistem Logları", icon: <LogsIcon fontSize="small" /> },
  { label: "Öneri Logları", icon: <RecIcon fontSize="small" /> },
];

export default function AdminPage() {
  const [tab, setTab] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* Admin header */}
      <Box sx={{ bgcolor: "grey.900", color: "white", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1, letterSpacing: 1 }}>
          ⚙ Admin Paneli
        </Typography>
        <Typography variant="body2" color="grey.400">{user?.email}</Typography>
        <Button
          size="small"
          color="inherit"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ color: "grey.300", textTransform: "none" }}
        >
          Çıkış
        </Button>
      </Box>

      <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1400, mx: "auto" }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        >
          {TABS.map((t) => (
            <Tab key={t.label} label={t.label} icon={t.icon} iconPosition="start" sx={{ textTransform: "none", fontWeight: 600 }} />
          ))}
        </Tabs>

        <Divider sx={{ mb: 3 }} />

        {tab === 0 && <OverviewTab />}
        {tab === 1 && <UsersTab />}
        {tab === 2 && <SystemLogsTab />}
        {tab === 3 && <RecLogsTab />}
      </Box>
    </Box>
  );
}
