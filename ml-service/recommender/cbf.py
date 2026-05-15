"""Content-Based Filtering recommender using TF-IDF and cosine similarity."""
from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import pandas as pd


class CBFRecommender:
    """
    Content-Based Filtering using TF-IDF vectorization.

    Builds a TF-IDF matrix from content features (description, genres, type, year)
    and computes cosine similarity between a user profile and all content items.
    """

    def __init__(self) -> None:
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words="english",
            ngram_range=(1, 2),
        )
        self.content_matrix = None
        self.content_ids: list[int] = []

    def fit(self, contents: list[dict]) -> "CBFRecommender":
        """
        Fit the TF-IDF model on content features.

        contents: [{ id, title, description, genres, type, year }, ...]
        """
        if not contents:
            return self

        df = pd.DataFrame(contents)

        def build_features(row: dict) -> str:
            parts = []
            if row.get("description"):
                parts.append(str(row["description"]))
            if row.get("genres"):
                genres = row["genres"] if isinstance(row["genres"], list) else []
                parts.extend(genres)
            if row.get("type"):
                parts.append(str(row["type"]))
            if row.get("year"):
                parts.append(str(row["year"]))
            return " ".join(parts).lower()

        df["features"] = df.apply(build_features, axis=1)
        self.content_ids = df["id"].tolist()
        self.content_matrix = self.vectorizer.fit_transform(df["features"])
        return self

    def get_cbf_scores(
        self, user_content_ids: list[int], all_content_ids: list[int]
    ) -> dict[int, float]:
        """
        Compute similarity scores between a user's content profile and all candidates.

        Returns: { content_id: cbf_score }
        """
        if self.content_matrix is None or not user_content_ids:
            return {cid: 0.0 for cid in all_content_ids}

        user_indices = [
            self.content_ids.index(cid)
            for cid in user_content_ids
            if cid in self.content_ids
        ]

        if not user_indices:
            return {cid: 0.0 for cid in all_content_ids}

        # Build user profile as mean of their content vectors
        user_profile = self.content_matrix[user_indices].mean(axis=0)
        user_profile = np.asarray(user_profile)

        # Cosine similarity against all items
        similarities = cosine_similarity(user_profile, self.content_matrix)[0]

        scores: dict[int, float] = {}
        for i, cid in enumerate(self.content_ids):
            if cid in all_content_ids:
                scores[cid] = float(similarities[i])

        return scores
