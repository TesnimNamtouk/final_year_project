import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)


def get_user_content(user_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT uc.content_id, uc.rating, uc.status,
                       c.title, c.description, c.genres, c.type, c.year
                FROM user_content uc
                JOIN content c ON c.id = uc.content_id
                WHERE uc.user_id = %s
                """,
                (user_id,),
            )
            return cur.fetchall()
    finally:
        conn.close()


def get_user_preferences(user_id: int) -> list[str]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT preferred_genres FROM user_preferences WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            return list(row["preferred_genres"]) if row and row["preferred_genres"] else []
    finally:
        conn.close()


def get_all_content():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, description, genres, type, year FROM content"
            )
            return cur.fetchall()
    finally:
        conn.close()


def get_all_user_ratings():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, content_id, rating
                FROM user_content
                WHERE rating IS NOT NULL
                """
            )
            return cur.fetchall()
    finally:
        conn.close()


def save_recommendations(user_id: int, recommendations: list):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for rec in recommendations:
                cur.execute(
                    """
                    INSERT INTO recommendations (user_id, content_id, hybrid_score, cbf_score, cf_score, generated_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (user_id, content_id) DO UPDATE SET
                        hybrid_score = EXCLUDED.hybrid_score,
                        cbf_score    = EXCLUDED.cbf_score,
                        cf_score     = EXCLUDED.cf_score,
                        generated_at = NOW()
                    """,
                    (
                        user_id,
                        rec["content_id"],
                        rec["hybrid_score"],
                        rec["cbf_score"],
                        rec["cf_score"],
                    ),
                )
        conn.commit()
    finally:
        conn.close()
