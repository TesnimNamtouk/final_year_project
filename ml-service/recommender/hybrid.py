"""Hybrid recommender combining CBF and CF scores."""
from __future__ import annotations

from .cbf import CBFRecommender
from .cf import CFRecommender
from .cold_start import expand_genres


class HybridRecommender:
    """
    Hybrid Recommender: combines Content-Based Filtering and Collaborative
    Filtering scores with configurable weights.

    Default weight formula:
        hybrid_score = cbf_weight * cbf_score + cf_weight * cf_score

    For normal users:   cbf_weight=0.4, cf_weight=0.6
    For cold-start:     cbf_weight=0.9, cf_weight=0.1  (handled internally)
    """

    def __init__(
        self,
        cbf_weight: float = 0.4,
        cf_weight: float = 0.6,
    ) -> None:
        self.cbf_weight = cbf_weight
        self.cf_weight = cf_weight
        self.cbf = CBFRecommender()
        self.cf = CFRecommender()

    def fit(
        self, all_contents: list[dict], all_ratings: list[dict]
    ) -> "HybridRecommender":
        """Fit both CBF and CF models."""
        self.cbf.fit(all_contents)
        self.cf.fit(all_ratings)
        return self

    def recommend(
        self,
        user_id: int,
        user_content_ids: list[int],
        all_contents: list[dict],
        preferred_genres: list[str] | None = None,
        top_n: int = 20,
        is_cold_start: bool = False,
    ) -> list[dict]:
        """
        Generate top_n hybrid recommendations for the given user.

        Returns list of dicts:
            [{ content_id, hybrid_score, cbf_score, cf_score }, ...]
        """
        # Adjust weights for cold-start users
        cbf_w = 0.9 if is_cold_start else self.cbf_weight
        cf_w = 0.1 if is_cold_start else self.cf_weight
        # Reserve 20% weight for genre preference boost when genres are provided
        genre_w = 0.2 if preferred_genres else 0.0
        if genre_w > 0:
            cbf_w *= 0.8
            cf_w *= 0.8

        preferred_lower = set(g.lower() for g in (preferred_genres or []))
        expanded_lower = expand_genres(preferred_genres or [])
        content_genre_map: dict[int, list[str]] = {
            c["id"]: [g.lower() for g in (c.get("genres") or [])]
            for c in all_contents
        }

        all_content_ids = [c["id"] for c in all_contents]
        candidate_ids = [cid for cid in all_content_ids if cid not in user_content_ids]

        if not candidate_ids:
            return []

        cbf_scores = self.cbf.get_cbf_scores(user_content_ids, candidate_ids)
        cf_scores = self.cf.get_cf_scores(user_id, candidate_ids)

        results: list[dict] = []
        for cid in candidate_ids:
            cbf_s = cbf_scores.get(cid, 0.0)
            cf_s = cf_scores.get(cid, 0.0)

            genre_s = 0.0
            if preferred_lower:
                content_genres = set(content_genre_map.get(cid, []))
                direct_overlap = len(content_genres & preferred_lower)
                if direct_overlap > 0:
                    genre_s = min(direct_overlap / len(preferred_lower), 1.0)
                else:
                    alias_overlap = len(content_genres & expanded_lower)
                    if alias_overlap > 0:
                        genre_s = min(alias_overlap / len(preferred_lower), 1.0) * 0.5

            hybrid_s = cbf_w * cbf_s + cf_w * cf_s + genre_w * genre_s

            results.append(
                {
                    "content_id": cid,
                    "hybrid_score": round(hybrid_s, 4),
                    "cbf_score": round(cbf_s, 4),
                    "cf_score": round(cf_s, 4),
                }
            )

        results.sort(key=lambda x: x["hybrid_score"], reverse=True)
        return results[:top_n]
