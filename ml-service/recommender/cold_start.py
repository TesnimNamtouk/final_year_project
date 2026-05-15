"""Cold-start handler for new users with limited interaction history."""
from __future__ import annotations

# Kitap genre'ları film/dizi genre'larından farklı olabiliyor.
# Bu harita, kullanıcının tercihini ilgili kitap genre'larına da genişletir.
GENRE_ALIASES: dict[str, list[str]] = {
    "action":      ["action", "adventure", "thriller", "spy"],
    "adventure":   ["adventure", "action", "thriller"],
    "sci-fi":      ["sci-fi", "science fiction", "dystopia", "dystopian", "speculative fiction"],
    "fantasy":     ["fantasy", "magic", "supernatural", "mythological fiction"],
    "horror":      ["horror", "gothic", "supernatural", "dark fantasy"],
    "romance":     ["romance", "love stories", "romantic fiction"],
    "crime":       ["crime", "detective", "mystery", "noir"],
    "mystery":     ["mystery", "detective", "crime", "suspense"],
    "thriller":    ["thriller", "suspense", "crime", "spy", "action"],
    "drama":       ["drama", "fiction", "literary fiction"],
    "classic":     ["classic", "classic literature", "classics"],
    "biography":   ["biography", "autobiography", "memoir"],
    "history":     ["history", "historical fiction", "historical"],
    "documentary": ["documentary", "non-fiction", "narrative nonfiction"],
    "animation":   ["animation", "children", "picture books"],
    "family":      ["family", "children", "young adult"],
    "war":         ["war", "military", "historical"],
    "western":     ["western", "frontier"],
}


def expand_genres(genres: list[str]) -> set[str]:
    """Preferred genre listesini alias'larla genişlet."""
    expanded: set[str] = set()
    for g in genres:
        expanded.add(g.lower())
        for alias in GENRE_ALIASES.get(g.lower(), []):
            expanded.add(alias.lower())
    return expanded


class ColdStartHandler:
    """
    Yeni kullanıcılar için (rating sayısı < 3) CBF ağırlıklı öneri.
    Onboarding'de seçilen genre'lara ve içeriklere göre başlangıç profili oluşturur.
    """

    def get_genre_based_content(
        self,
        preferred_genres: list[str],
        all_contents: list[dict],
        already_saved: list[int],
        top_n: int = 60,
    ) -> list[dict]:
        """
        Genre eşleşmesine göre basit öneri — CBF fit olmadan önce kullanılır.
        Her içerik türünden (movie/series/book) eşit sayıda döner.
        """
        buckets: dict[str, list[dict]] = {"movie": [], "series": [], "book": []}
        preferred_lower = set(g.lower() for g in preferred_genres)
        expanded_lower = expand_genres(preferred_genres)

        for content in all_contents:
            if content["id"] in already_saved:
                continue

            content_genres = content.get("genres") or []
            if isinstance(content_genres, str):
                content_genres = [content_genres]

            content_genres_lower = set(g.lower() for g in content_genres)
            # Direct overlap with preferred genres
            overlap = len(content_genres_lower & preferred_lower)
            # If no direct match, try aliases (smaller boost)
            if overlap == 0:
                alias_overlap = len(content_genres_lower & expanded_lower)
                if alias_overlap > 0:
                    overlap = alias_overlap * 0.5  # half weight for alias matches

            if overlap > 0:
                score = round(overlap / max(len(preferred_genres), 1), 4)
                ctype = content.get("type", "movie")
                buckets.setdefault(ctype, []).append(
                    {
                        "content_id": content["id"],
                        "hybrid_score": score,
                        "cbf_score": score,
                        "cf_score": 0.0,
                    }
                )

        # Sort each bucket and take top per_type items
        per_type = max(top_n // 3, 10)
        combined: list[dict] = []
        for bucket in buckets.values():
            bucket.sort(key=lambda x: x["hybrid_score"], reverse=True)
            combined.extend(bucket[:per_type])

        # Fill remaining slots if any bucket was small
        if len(combined) < top_n:
            included = {r["content_id"] for r in combined}
            for bucket in buckets.values():
                for item in bucket[per_type:]:
                    if len(combined) >= top_n:
                        break
                    if item["content_id"] not in included:
                        combined.append(item)
                        included.add(item["content_id"])

        combined.sort(key=lambda x: x["hybrid_score"], reverse=True)
        return combined[:top_n]

    def is_cold_start(self, rating_count: int) -> bool:
        """Return True when the user has fewer than 5 ratings."""
        return rating_count < 5
