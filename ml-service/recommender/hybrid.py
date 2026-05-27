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
    ) -> tuple[list[dict], dict]:
        """
        Generate top_n hybrid recommendations for the given user.

        Returns:
            (recommendations, log_details)
            recommendations: [{ content_id, hybrid_score, cbf_score, cf_score }, ...]
            log_details: dict with detailed calculation info for logging
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
            return [], {}

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
        final = results[:top_n]

        # Build log details for presentation
        cbf_feature_count = (
            self.cbf.content_matrix.shape[1]
            if self.cbf.content_matrix is not None
            else 0
        )
        cf_user_count = len(self.cf.user_ids) if self.cf.user_ids else 0
        cf_item_count = len(self.cf.item_ids) if self.cf.item_ids else 0

        top5 = [
            {
                "rank": i + 1,
                "content_id": r["content_id"],
                "hybrid_score": r["hybrid_score"],
                "cbf_score": r["cbf_score"],
                "cf_score": r["cf_score"],
            }
            for i, r in enumerate(final[:5])
        ]

        log_details = {
            "weights": {
                "cbf_weight": round(cbf_w, 4),
                "cf_weight": round(cf_w, 4),
                "genre_weight": round(genre_w, 4),
            },
            "is_cold_start": is_cold_start,
            "preferred_genres": list(preferred_genres or []),
            "user_content_count": len(user_content_ids),
            "candidate_count": len(candidate_ids),
            "cbf": {
                "tfidf_features": cbf_feature_count,
                "total_content_indexed": len(self.cbf.content_ids),
                "user_items_used_for_profile": len(
                    [cid for cid in user_content_ids if cid in self.cbf.content_ids]
                ),
            },
            "cf": {
                "user_item_matrix_users": cf_user_count,
                "user_item_matrix_items": cf_item_count,
                "knn_neighbors": self.cf.n_neighbors,
                "user_in_matrix": user_id in self.cf.user_ids,
            },
            "top5_recommendations": top5,
            "total_recommendations_returned": len(final),
        }

        return final, log_details
