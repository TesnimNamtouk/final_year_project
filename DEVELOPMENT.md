# DEVELOPMENT.md

Bu dosya projenin geliştirme ortamı, mimari yapısı ve teknik detaylarını açıklar.

## Project Overview

AI-destekli içerik öneri web platformu. Kullanıcılar film, dizi ve kitap kaydeder (1-10 puan), hibrit öneri algoritması (TF-IDF CBF + KNN CF) ile kişiselleştirilmiş öneriler alır.

## Tech Stack

- **Frontend:** React.js + Vite + Material UI v5 + react-i18next (TR/EN) — port 3000
- **Backend:** Node.js + Express.js + TypeScript + Prisma ORM — port 4000
- **ML Service:** Python 3.11 + FastAPI + scikit-learn — port 8000
- **Database:** PostgreSQL 16
- **External APIs:** TMDB API (film/dizi), Google Books API (kitap)
- **Auth:** JWT access token (15dk) + refresh token (7gün), httpOnly cookie

## Development Commands

```bash
# Tüm servisleri Docker ile başlat
docker-compose up

# Frontend (geliştirme)
cd frontend && npm install && npm run dev

# Backend (geliştirme)
cd backend && npm install && npm run dev

# ML Service (geliştirme)
cd ml-service && pip install -r requirements.txt && uvicorn main:app --reload

# Veritabanı migration
cd backend && npx prisma migrate dev

# Veritabanı seed
cd backend && npx prisma db seed

# Frontend testleri
cd frontend && npm test

# Backend testleri
cd backend && npm test

# ML Service testleri
cd ml-service && pytest
```

## Architecture

3 servis birbirinden bağımsız çalışır:

```
Browser → frontend:3000 → /api/* proxy → backend:4000
                                              ↓
                                   ml-service:8000 (POST /recommend)
                                              ↓
                                       PostgreSQL:5432
```

- Backend, ML servisini HTTP üzerinden çağırır: `POST http://ml-service:8000/recommend`
- ML servisi PostgreSQL'e doğrudan bağlanarak veri çeker
- Frontend, backend proxy üzerinden tüm API çağrılarını yapar

### Recommendation Algorithm

```
Hybrid Score = 0.4 × CBF_score + 0.6 × CF_score
```
- **CBF:** TF-IDF (sklearn.TfidfVectorizer) ile içerik açıklamaları vektörleştirilir, cosine similarity hesaplanır
- **CF:** KNN (sklearn.NearestNeighbors, metric='cosine') ile benzer kullanıcılar bulunur
- Cold start (yeni kullanıcı): CBF ağırlığı 0.9'a çıkar, onboarding seçimlerinden başlangıç profili oluşturulur

### Key Environment Variables

Backend için `.env`:
- `DATABASE_URL` — PostgreSQL bağlantı stringi
- `JWT_SECRET` — Access token secret
- `JWT_REFRESH_SECRET` — Refresh token secret
- `TMDB_API_KEY` — TMDB API anahtarı
- `GOOGLE_BOOKS_API_KEY` — Google Books API anahtarı
- `ML_SERVICE_URL` — ML servis URL'i (default: http://localhost:8000)

## API Conventions

- Tüm endpoint'ler `/api/` prefix'i ile başlar
- Auth gerektiren endpoint'lerde `Authorization: Bearer <token>` header'ı
- Hata yanıtları: `{ error: string, details?: any }`
- Başarı yanıtları: `{ data: any, message?: string }`

## Database Schema (Prisma)

5 ana model: `User`, `Content` (type: movie/series/book), `UserContent` (rating 1-10, status: watched/want), `UserPreference` (onboarding), `Recommendation` (hybrid/cbf/cf scores)
