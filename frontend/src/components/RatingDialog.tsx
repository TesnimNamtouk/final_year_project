import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { ContentItem } from "./ContentCard";

interface RatingDialogProps {
  open: boolean;
  content: ContentItem | null;
  onClose: () => void;
  onSave: (contentId: string, rating: number, status: string) => void;
}

const STATUS_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "watched", labelKey: "content.watched" },
  { value: "want", labelKey: "content.wantToWatch" },
  { value: "reading", labelKey: "content.reading" },
  { value: "read", labelKey: "content.read" },
];

function getStatusOptions(type?: string) {
  if (type === "book") {
    return STATUS_OPTIONS.filter((s) => s.value === "reading" || s.value === "read");
  }
  return STATUS_OPTIONS.filter(
    (s) => s.value === "watched" || s.value === "want"
  );
}

export default function RatingDialog({ open, content, onClose, onSave }: RatingDialogProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(7);
  const [status, setStatus] = useState<string>("");

  const statusOptions = getStatusOptions(content?.type);

  const handleSave = () => {
    if (!content) return;
    onSave(content.id, rating, status);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("content.rate")}: {content?.title}</DialogTitle>

      <DialogContent>
        <Typography gutterBottom>
          {t("content.rate")}: <strong>{rating}/10</strong>
        </Typography>
        <Slider
          value={rating}
          onChange={(_e, val) => setRating(val as number)}
          min={1}
          max={10}
          step={1}
          marks
          valueLabelDisplay="auto"
          sx={{ mb: 3 }}
        />

        <Typography gutterBottom variant="body2" color="text.secondary">
          Durum / Status
        </Typography>
        <ToggleButtonGroup
          value={status}
          exclusive
          onChange={(_e, val) => { if (val !== null) setStatus(val); }}
          size="small"
          sx={{ flexWrap: "wrap", gap: 0.5 }}
        >
          {statusOptions.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value} sx={{ textTransform: "none" }}>
              {t(opt.labelKey)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSave} variant="contained">
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
