import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Stack,
} from "@mui/material";
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { logsAPI } from "../services/api";

interface SystemLog {
  id: number;
  level: "INFO" | "DEBUG" | "WARNING" | "ERROR";
  category: string;
  message: string;
  details: Record<string, unknown> | null;
  userId: number | null;
  createdAt: string;
}

const LEVEL_COLOR: Record<string, "info" | "default" | "warning" | "error"> = {
  INFO: "info",
  DEBUG: "default",
  WARNING: "warning",
  ERROR: "error",
};

const CATEGORY_COLOR: Record<string, "primary" | "secondary" | "success" | "warning" | "info" | "default"> = {
  ML_HYBRID: "primary",
  ML_CBF: "secondary",
  ML_CF: "success",
  USER_ACTION: "info",
};

const CATEGORIES = ["Tümü", "ML_HYBRID", "ML_CBF", "ML_CF", "USER_ACTION"];

function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null) return null;
  return (
    <Box sx={{ display: "flex", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 160, fontWeight: 600 }}>
        {label}:
      </Typography>
      <Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
        {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
      </Typography>
    </Box>
  );
}

function DetailsPanel({ details }: { details: Record<string, unknown> | null }) {
  if (!details) return null;

  const renderSection = (key: string, val: unknown) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      // If has 'description' key, highlight it
      if (obj.description) {
        return (
          <Box key={key} sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: "uppercase" }}>
              {key}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25, mb: 0.5, color: "text.primary" }}>
              {String(obj.description)}
            </Typography>
            {Object.entries(obj)
              .filter(([k]) => k !== "description")
              .map(([k, v]) => <DetailRow key={k} label={k} value={v} />)}
          </Box>
        );
      }
      return (
        <Box key={key} sx={{ mb: 1.5 }}>
          <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: "uppercase" }}>
            {key}
          </Typography>
          <Box sx={{ pl: 1, mt: 0.25 }}>
            {Object.entries(obj).map(([k, v]) => <DetailRow key={k} label={k} value={v} />)}
          </Box>
        </Box>
      );
    }
    if (Array.isArray(val)) {
      return (
        <Box key={key} sx={{ mb: 1.5 }}>
          <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: "uppercase", mb: 0.5, display: "block" }}>
            {key}
          </Typography>
          {(val as Record<string, unknown>[]).map((item, i) => (
            <Box key={i} sx={{ pl: 1, mb: 0.75, borderLeft: "2px solid", borderColor: "divider" }}>
              {typeof item === "object"
                ? Object.entries(item).map(([k, v]) => <DetailRow key={k} label={k} value={v} />)
                : <Typography variant="caption">{String(item)}</Typography>}
            </Box>
          ))}
        </Box>
      );
    }
    return <DetailRow key={key} label={key} value={val} />;
  };

  return (
    <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
      {Object.entries(details).map(([k, v]) => renderSection(k, v))}
    </Box>
  );
}

function LogRow({ log }: { log: SystemLog }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!log.details && Object.keys(log.details).length > 0;

  return (
    <>
      <TableRow
        sx={{
          "& > td": { borderBottom: open ? "none" : undefined },
          cursor: hasDetails ? "pointer" : "default",
          "&:hover": hasDetails ? { bgcolor: "action.hover" } : {},
        }}
        onClick={() => hasDetails && setOpen((p) => !p)}
      >
        <TableCell sx={{ width: 32, p: 0.5 }}>
          {hasDetails && (
            <IconButton size="small">
              {open ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
        <TableCell sx={{ width: 150, whiteSpace: "nowrap" }}>
          <Typography variant="caption" color="text.secondary">
            {new Date(log.createdAt).toLocaleString("tr-TR")}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: 80 }}>
          <Chip label={log.level} color={LEVEL_COLOR[log.level] ?? "default"} size="small" />
        </TableCell>
        <TableCell sx={{ width: 120 }}>
          <Chip
            label={log.category}
            color={CATEGORY_COLOR[log.category] ?? "default"}
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2">{log.message}</Typography>
        </TableCell>
        <TableCell sx={{ width: 60, textAlign: "center" }}>
          {log.userId != null && (
            <Chip label={`#${log.userId}`} size="small" variant="outlined" />
          )}
        </TableCell>
      </TableRow>

      {hasDetails && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0, px: 2 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5 }}>
                <DetailsPanel details={log.details} />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function LogsPage() {
  const [category, setCategory] = useState("Tümü");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-logs", category],
    queryFn: () =>
      logsAPI
        .get({ category: category === "Tümü" ? undefined : category, limit: 100 })
        .then((r) => r.data as { data: SystemLog[]; total: number }),
    refetchInterval: 30000,
  });

  const logs = data?.data ?? [];

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Sistem Logları
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Kullanıcı eylemleri ve ML hesaplama detayları. Her 30 saniyede otomatik yenilenir.
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="body2" fontWeight={600}>Kategori:</Typography>
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_e, val) => { if (val) setCategory(val); }}
          size="small"
        >
          {CATEGORIES.map((c) => (
            <ToggleButton key={c} value={c}>{c}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        {data && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            Toplam {data.total} kayıt — gösterilen: {logs.length}
          </Typography>
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">Loglar yüklenirken hata oluştu.</Alert>
      )}

      {!isLoading && !isError && logs.length === 0 && (
        <Alert severity="info">Bu kategoride henüz log kaydı yok.</Alert>
      )}

      {logs.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell />
                <TableCell><Typography variant="caption" fontWeight={700}>Tarih/Saat</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Seviye</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Kategori</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Mesaj</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Kullanıcı</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
