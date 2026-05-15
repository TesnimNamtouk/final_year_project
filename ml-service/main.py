from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from recommender.hybrid import HybridRecommender
from recommender.cold_start import ColdStartHandler
from db import get_all_content, get_all_user_ratings, get_user_content, save_recommendations
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _diversify_by_type(
    recs: list[dict], all_contents: list[dict], top_n: int
) -> list[dict]:
    """Return top_n recs with balanced movie / series / book representation."""
    type_map = {c["id"]: c.get("type", "movie") for c in all_contents}
    per_type = max(top_n // 3, 10)

    buckets: dict[str, list[dict]] = {"movie": [], "series": [], "book": []}
    for rec in recs:
        ctype = type_map.get(rec["content_id"], "movie")
        bucket = buckets.setdefault(ctype, [])
        if len(bucket) < per_type:
            bucket.append(rec)

    combined = [r for bucket in buckets.values() for r in bucket]

    # Fill remaining slots with best-scored items not yet included
    if len(combined) < top_n:
        included = {r["content_id"] for r in combined}
        for rec in recs:
            if len(combined) >= top_n:
                break
            if rec["content_id"] not in included:
                combined.append(rec)
                included.add(rec["content_id"])

    combined.sort(key=lambda x: x["hybrid_score"], reverse=True)
    return combined[:top_n]

app = FastAPI(title="Content Recommendation ML Service", version="1.0.0")


class RecommendRequest(BaseModel):
    user_id: int
    top_n: int = 60
    preferred_genres: list[str] = []


class RecommendResponse(BaseModel):
    user_id: int
    recommendations: list[dict]
    algorithm: str
    count: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    try:
        # Load data from DB
        all_contents = get_all_content()
        all_ratings = get_all_user_ratings()
        user_ratings = get_user_content(req.user_id)

        # psycopg2 RealDictRow → plain dict
        all_contents = [dict(row) for row in all_contents]
        all_ratings = [dict(row) for row in all_ratings]
        user_ratings = [dict(row) for row in user_ratings]

        user_content_ids = [r["content_id"] for r in user_ratings]
        rating_count = len([r for r in user_ratings if r.get("rating")])

        cold_start = ColdStartHandler()
        is_cold = cold_start.is_cold_start(rating_count)

        # Use preferred_genres from request; fall back to DB if not provided
        genres = req.preferred_genres
        if not genres:
            from db import get_user_preferences
            genres = get_user_preferences(req.user_id)

        if is_cold and genres:
            # Cold start: genre-based recommendation (no ML model needed)
            recs = cold_start.get_genre_based_content(
                genres, all_contents, user_content_ids, req.top_n
            )
            algorithm = "cold_start_genre"
        else:
            # Normal flow: hybrid CBF + CF + genre boost
            recommender = HybridRecommender()
            recommender.fit(all_contents, all_ratings)
            recs = recommender.recommend(
                req.user_id, user_content_ids, all_contents,
                preferred_genres=genres, top_n=req.top_n * 3, is_cold_start=is_cold
            )
            # Diversify: ensure balanced mix of movie / series / book
            recs = _diversify_by_type(recs, all_contents, req.top_n)
            algorithm = "cold_start_hybrid" if is_cold else "hybrid"

        # Persist recommendations
        if recs:
            save_recommendations(req.user_id, recs)

        return RecommendResponse(
            user_id=req.user_id,
            recommendations=recs,
            algorithm=algorithm,
            count=len(recs),
        )

    except Exception as e:
        logger.error(f"Recommendation error for user {req.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
