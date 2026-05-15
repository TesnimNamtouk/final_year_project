import pytest
from recommender.cbf import CBFRecommender
from recommender.cf import CFRecommender
from recommender.hybrid import HybridRecommender
from recommender.cold_start import ColdStartHandler

SAMPLE_CONTENTS = [
    {"id": 1, "title": "Inception", "description": "A thief who enters dreams", "genres": ["Sci-Fi", "Action"], "type": "movie", "year": 2010},
    {"id": 2, "title": "The Godfather", "description": "Crime family saga", "genres": ["Drama", "Crime"], "type": "movie", "year": 1972},
    {"id": 3, "title": "Interstellar", "description": "Space exploration adventure", "genres": ["Sci-Fi", "Drama"], "type": "movie", "year": 2014},
    {"id": 4, "title": "Parasite", "description": "Class divide thriller", "genres": ["Drama", "Thriller"], "type": "movie", "year": 2019},
    {"id": 5, "title": "Dune", "description": "Desert planet sci-fi epic", "genres": ["Sci-Fi", "Adventure"], "type": "book", "year": 1965},
]

SAMPLE_RATINGS = [
    {"user_id": 1, "content_id": 1, "rating": 9},
    {"user_id": 1, "content_id": 3, "rating": 8},
    {"user_id": 2, "content_id": 1, "rating": 7},
    {"user_id": 2, "content_id": 2, "rating": 9},
    {"user_id": 3, "content_id": 3, "rating": 10},
    {"user_id": 3, "content_id": 4, "rating": 6},
]


def test_cbf_fit_and_score():
    cbf = CBFRecommender()
    cbf.fit(SAMPLE_CONTENTS)
    assert cbf.content_matrix is not None
    assert len(cbf.content_ids) == 5


def test_cbf_scores_exclude_seen():
    cbf = CBFRecommender()
    cbf.fit(SAMPLE_CONTENTS)
    scores = cbf.get_cbf_scores([1, 3], [2, 4, 5])
    assert set(scores.keys()) == {2, 4, 5}
    assert all(0.0 <= v <= 1.0 for v in scores.values())


def test_cf_fit():
    cf = CFRecommender()
    cf.fit(SAMPLE_RATINGS)
    assert cf.user_item_matrix is not None


def test_cf_cold_start_no_data():
    cf = CFRecommender()
    cf.fit([])
    scores = cf.get_cf_scores(99, [1, 2, 3])
    assert all(v == 0.0 for v in scores.values())


def test_hybrid_recommend():
    h = HybridRecommender()
    h.fit(SAMPLE_CONTENTS, SAMPLE_RATINGS)
    recs = h.recommend(1, [1, 3], SAMPLE_CONTENTS, top_n=3)
    assert len(recs) <= 3
    assert all("hybrid_score" in r for r in recs)
    assert all(r["content_id"] not in [1, 3] for r in recs)


def test_cold_start_genre():
    cs = ColdStartHandler()
    recs = cs.get_genre_based_content(["Sci-Fi"], SAMPLE_CONTENTS, [1], top_n=5)
    # Sci-Fi contents: 3 (Interstellar), 5 (Dune) — id:1 already saved
    assert all(r["content_id"] != 1 for r in recs)
    assert len(recs) >= 1


def test_cold_start_detection():
    cs = ColdStartHandler()
    assert cs.is_cold_start(0) is True
    assert cs.is_cold_start(4) is True
    assert cs.is_cold_start(5) is False
