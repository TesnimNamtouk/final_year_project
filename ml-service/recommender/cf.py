"""Collaborative Filtering recommender using KNN with cosine distance."""
from __future__ import annotations

from sklearn.neighbors import NearestNeighbors
import numpy as np
import pandas as pd


class CFRecommender:
    """
    Collaborative Filtering using K-Nearest Neighbors.

    Builds a user-item rating matrix from raw ratings and finds similar users
    via cosine similarity to produce weighted score estimates for unseen items.
    """

    def __init__(self, n_neighbors: int = 5) -> None:
        self.n_neighbors = n_neighbors
        self.model = NearestNeighbors(
            metric="cosine",
            algorithm="brute",
            n_neighbors=n_neighbors + 1,  # +1 because the user itself is included
        )
        self.user_item_matrix: np.ndarray | None = None
        self.user_ids: list[int] = []
        self.item_ids: list[int] = []

    def fit(self, ratings: list[dict]) -> "CFRecommender":
        """
        Build the user-item matrix and fit the KNN model.

        ratings: [{ user_id, content_id, rating }, ...]
        """
        if len(ratings) < 2:
            self.user_item_matrix = None
            return self

        df = pd.DataFrame(ratings)

        pivot = df.pivot_table(
            index="user_id",
            columns="content_id",
            values="rating",
            fill_value=0,
        )

        self.user_ids = pivot.index.tolist()
        self.item_ids = pivot.columns.tolist()
        self.user_item_matrix = pivot.values.astype(float)

        if len(self.user_ids) >= 2:
            k = min(self.n_neighbors + 1, len(self.user_ids))
            self.model.n_neighbors = k
            self.model.fit(self.user_item_matrix)

        return self

    def get_cf_scores(
        self, user_id: int, all_content_ids: list[int]
    ) -> dict[int, float]:
        """
        Compute weighted CF score estimates for all candidate items.

        Returns: { content_id: cf_score }
        """
        if self.user_item_matrix is None or user_id not in self.user_ids:
            return {cid: 0.0 for cid in all_content_ids}

        user_idx = self.user_ids.index(user_id)
        user_vector = self.user_item_matrix[user_idx].reshape(1, -1)

        try:
            distances, indices = self.model.kneighbors(user_vector)
        except Exception:
            return {cid: 0.0 for cid in all_content_ids}

        neighbor_indices = [i for i in indices[0] if i != user_idx]
        neighbor_distances = [
            distances[0][j]
            for j, i in enumerate(indices[0])
            if i != user_idx
        ]

        # Cosine distance → similarity weight
        neighbor_weights = [1 - d for d in neighbor_distances]
        total_weight = sum(neighbor_weights) or 1.0

        scores: dict[int, float] = {}
        for item_idx, cid in enumerate(self.item_ids):
            if cid not in all_content_ids:
                continue
            weighted_sum = sum(
                self.user_item_matrix[n_idx][item_idx] * w
                for n_idx, w in zip(neighbor_indices, neighbor_weights)
            )
            scores[cid] = float(weighted_sum / total_weight / 10.0)  # normalise to 0-1

        return scores
