# AI Destekli İçerik Öneri Platformu — Teknik Rapor

**Tarih:** 15 Mayıs 2026  
**Proje:** OMÜ Bitirme Projesi  
**Tür:** Web tabanlı film, dizi ve kitap öneri sistemi

---

## 1. Genel Mimari

```
[Tarayıcı :3000]
      │
      ▼ /api/* proxy, /avatars/* proxy
[Frontend: React + Vite :3000]
      │
      ▼ HTTP REST (Authorization: Bearer <token>)
[Backend: Node.js + Express :4000]
      │                         │
      ▼ POST /recommend         ▼ Prisma ORM
[ML Service: FastAPI :8000]  [PostgreSQL :5432]
      │
      ▼ psycopg2 (doğrudan bağlantı)
[PostgreSQL :5432]
```

Üç servis birbirinden bağımsız çalışır ve Docker Compose ile ayağa kaldırılır.

---

## 2. Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 18, Vite, Material UI v5, TanStack React Query, react-i18next, axios, react-router-dom v6 |
| Backend | Node.js, Express.js, TypeScript, Prisma ORM, bcrypt, multer, jsonwebtoken, axios |
| ML Servisi | Python 3.11, FastAPI, scikit-learn (TF-IDF + KNN), psycopg2 |
| Veritabanı | PostgreSQL 16 |
| Dış API'ler | TMDB API (film/dizi), Google Books API (kitap) |
| Auth | JWT access token (15 dk) + refresh token (7 gün, httpOnly cookie) |
| Altyapı | Docker, Docker Compose, nginx (production frontend) |

---

## 3. Frontend (`frontend/`)

### 3.1 Klasör Yapısı

```
frontend/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx        ← JWT oturum yönetimi (global state)
│   ├── services/
│   │   └── api.ts                 ← Tüm API çağrıları (tek dosya)
│   ├── components/
│   │   ├── Layout.tsx             ← AppBar + mobil alt navigasyon
│   │   ├── ContentCard.tsx        ← Film/dizi/kitap kartı bileşeni
│   │   └── RatingDialog.tsx       ← Puanlama popup diyaloğu
│   ├── pages/
│   │   ├── HomePage.tsx           ← Giriş yapılmamış karşılama sayfası
│   │   ├── LoginPage.tsx          ← Giriş formu (split layout)
│   │   ├── RegisterPage.tsx       ← Kayıt formu (split layout)
│   │   ├── DashboardPage.tsx      ← Öneriler + kayıtlı içerikler
│   │   ├── SearchPage.tsx         ← TMDB/Google Books arama
│   │   ├── ContentDetailPage.tsx  ← İçerik detay ve kaydetme
│   │   ├── OnboardingPage.tsx     ← İlk kurulum (tür tercihi seçimi)
│   │   └── ProfilePage.tsx        ← Profil yönetimi (4 sekme)
│   └── main.tsx                   ← MUI tema tanımı, router, providers
├── public/
│   └── locales/
│       ├── tr/common.json         ← Türkçe çeviriler
│       └── en/common.json         ← İngilizce çeviriler
└── vite.config.ts                 ← Proxy ayarları (/api, /avatars)
```

### 3.2 Sayfa Açıklamaları

#### `HomePage.tsx`
- Giriş yapılmamış kullanıcılara gösterilen tanıtım sayfası
- Gradient hero bölümü, özellik kartları, istatistik barı
- "Başla" ve "Giriş Yap" butonları

#### `LoginPage.tsx` / `RegisterPage.tsx`
- Sol panel: gradient + özellik listesi
- Sağ panel: form (şifre göster/gizle toggle ile)
- Hata mesajı: `response.data.error` alanından okunur (`.message` değil)

#### `DashboardPage.tsx`
- Ana sayfa: kullanıcının kayıtlı içerikleri + ML önerileri
- React Query ile veri çekme: `["user-content", user.id]`, `["recommendations", user.id]`
- Her kullanıcıya özel cache (userId query key'e dahil)
- İçerik kaydetme: `status: "watched"` (film/dizi) veya `"reading"` (kitap)
- İsteme kaydetme: `status: "want"` veya `"reading"` (başlamak istenen)

#### `SearchPage.tsx`
- TMDB ve Google Books üzerinden arama
- Sonuçlar ContentCard ile listelenir
- Kaydet (watched) ve İstiyorum (want) butonları her kartta

#### `ContentDetailPage.tsx`
- Seçilen içeriğin tam detayı (poster, açıklama, oyuncular vs.)
- Puan ver, "İzledim/Okudum" veya "İzlemek/Okumak İstiyorum" butonları
- Öneri geri bildirimi (beğendim / beğenmedim)

#### `OnboardingPage.tsx`
- Yeni kullanıcı kayıt sonrası tür tercihi seçer
- Seçimler `UserPreference` tablosuna kaydedilir
- ML servisi cold-start için bu tercihleri kullanır

#### `ProfilePage.tsx` — 4 Sekme
| Sekme | Açıklama |
|-------|---------|
| **Kütüphanem** | İzlendi/Okundu ve İstek listesi; içerik silme |
| **Profili Düzenle** | username, email, phone düzenleme; avatar yükleme |
| **Şifre** | Mevcut şifre doğrulama + yeni şifre belirleme |
| **Tür Tercihlerim** | Beğenilen türleri güncelleme |

### 3.3 Kritik Bileşenler

#### `AuthContext.tsx`
```
mount → localStorage'dan token var mı?
  ├─ Evet → GET /api/auth/me → setUser()
  │         └─ onboardingDone=false → /onboarding'e yönlendir
  └─ Hayır → setIsLoading(false)

login() → POST /auth/login → token sakla → GET /me → setUser()
logout() → token sil → queryClient.clear() → setUser(null)
```

`queryClient.clear()` kritik: çok kullanıcı senaryosunda A kullanıcısının
önbelleği B kullanıcısına karışmasını önler.

#### `api.ts` — Axios Interceptor'lar
- **Request interceptor:** Her isteğe `Authorization: Bearer <token>` header'ı ekler
- **Response interceptor:** 401 gelince refresh token ile yeni access token alır,
  bekleyen istekleri kuyruğa alır (failedQueue), başarısız olursa `/login`'e yönlendirir

#### `ContentCard.tsx`
- `onSave` / `isSaved`: İzlendi/Okundu durumu
- `onWant` / `isWanted`: İstek listesi durumu
- Poster görseli üzerinde tür chip'i ve yıl badge'i
- Hover: `translateY(-6px)` animasyonu

### 3.4 Çok Dil (i18n)
- `i18n.language`: `"tr"` veya `"en"`
- Dil değişince: `localStorage['language']` güncellenir + `usersAPI.updateLanguage()` ile DB'ye yazılır
- Tüm UI metinleri `t('key')` ile çağrılır, hiçbir hardcoded Türkçe/İngilizce string yok

---

## 4. Backend (`backend/`)

### 4.1 Klasör Yapısı

```
backend/
├── src/
│   ├── index.ts              ← Express başlangıç, static dosya sunumu
│   ├── middleware/
│   │   └── auth.ts           ← JWT doğrulama (req.user'a userId ekler)
│   ├── routes/
│   │   ├── auth.ts           ← /api/auth/*
│   │   ├── content.ts        ← /api/content/* (TMDB + Books proxy)
│   │   ├── userContent.ts    ← /api/user-content/*
│   │   ├── recommendations.ts← /api/recommendations/*
│   │   └── users.ts          ← /api/users/*
│   └── utils/
│       └── jwt.ts            ← Token üretme/doğrulama
├── prisma/
│   ├── schema.prisma         ← Veritabanı modelleri
│   └── migrations/           ← SQL migration geçmişi
└── public/
    └── avatars/              ← Yüklenen profil fotoğrafları
```

### 4.2 Tüm API Endpoint'leri

#### Auth (`/api/auth/`)
| Method | URL | Auth | Açıklama |
|--------|-----|------|---------|
| POST | `/register` | ✗ | Kayıt ol → access token (body) + refresh token (cookie) |
| POST | `/login` | ✗ | Giriş yap |
| POST | `/logout` | ✓ | Refresh token DB'den sil, cookie temizle |
| GET | `/me` | ✓ | Mevcut kullanıcı verisi (onboardingDone dahil) |
| POST | `/refresh` | ✗ | httpOnly cookie'deki refresh ile yeni access token al |

#### Content (`/api/content/`)
| Method | URL | Auth | Açıklama |
|--------|-----|------|---------|
| GET | `/search?q=&type=&genre=` | ✓ | TMDB + Google Books araması |
| GET | `/detail?id=&type=&lang=` | ✓ | Tek içerik detayı |

#### UserContent (`/api/user-content/`)
| Method | URL | Auth | Açıklama |
|--------|-----|------|---------|
| POST | `/` | ✓ | İçeriği kaydet (upsert: zaten varsa güncelle) |
| GET | `/?type=movie\|series\|book` | ✓ | Kütüphaneyi getir |
| PATCH | `/:id` | ✓ | Status veya rating güncelle |
| DELETE | `/:id` | ✓ | Kütüphaneden sil |

#### Users (`/api/users/`)
| Method | URL | Auth | Açıklama |
|--------|-----|------|---------|
| PUT | `/:id` | ✓ | Dil tercihi güncelle |
| PATCH | `/:id/profile` | ✓ | username, email, phone güncelle |
| PATCH | `/:id/password` | ✓ | Şifre değiştir (bcrypt doğrulama) |
| POST | `/:id/avatar` | ✓ | Profil fotoğrafı yükle (multipart/form-data) |
| POST | `/:id/onboarding` | ✓ | Tür tercihleri kaydet |
| GET | `/:id/preferences` | ✓ | Tür tercihlerini getir |
| GET | `/:id/stats` | ✓ | Kullanıcı istatistikleri |

#### Recommendations (`/api/recommendations/`)
| Method | URL | Auth | Açıklama |
|--------|-----|------|---------|
| GET | `/` | ✓ | ML servisinden öneriler getir + DB'ye kaydet |
| POST | `/:id/feedback` | ✓ | Öneri için liked/disliked geri bildirimi |

### 4.3 JWT Sistemi (`src/utils/jwt.ts`)

```
Access Token:
  - Payload: { userId, email }
  - Süre: 15 dakika
  - Secret: JWT_SECRET (env)

Refresh Token:
  - Payload: { userId, jti: randomBytes(16) }
  - Süre: 7 gün
  - Secret: JWT_REFRESH_SECRET (env)
  - DB'de saklanır (refresh_tokens tablosu)
  - Her token benzersiz (jti): aynı anda çok kullanıcı girişinde çakışma yok
```

### 4.4 Avatar Yükleme (`src/routes/users.ts`)

```
POST /api/users/:id/avatar
  └─ multer (diskStorage)
       ├─ Hedef klasör: backend/public/avatars/
       ├─ Dosya adı: avatar-{userId}-{timestamp}.{ext}
       ├─ Max boyut: 3MB
       └─ İzin verilen: JPEG, PNG, WebP, GIF
  └─ Eski avatar dosyası fs.unlink() ile silinir
  └─ DB'ye kaydedilir: User.avatarUrl = "/avatars/dosyaadi.jpg"

GET /avatars/dosyaadi.jpg
  └─ backend/src/index.ts → express.static("public/avatars")
  └─ Vite proxy: /avatars → http://localhost:4000
```

---

## 5. Veritabanı (`backend/prisma/`)

### 5.1 Prisma Şeması

```prisma
model User {
  id              Int      @id @default(autoincrement())
  email           String   @unique
  username        String   @unique
  passwordHash    String
  phone           String?                    ← opsiyonel
  avatarUrl       String?  @map("avatar_url")← opsiyonel
  language        String   @default("tr")
  onboardingDone  Boolean  @default(false)
  createdAt       DateTime @default(now())
}

model Content {
  id          Int      @id @default(autoincrement())
  externalId  String                        ← TMDB/Books ID
  type        String                        ← movie / series / book
  title       String
  description String?
  year        Int?
  genres      String[]
  posterUrl   String?
  @@unique([externalId, type])
}

model UserContent {
  id        Int      @id @default(autoincrement())
  userId    Int      → User
  contentId Int      → Content
  status    String   ← watched / want / reading
  rating    Float?   ← 1-10 (opsiyonel)
  createdAt DateTime @default(now())
  @@unique([userId, contentId])   ← aynı içerik iki kez kaydedilemez
}

model UserPreference {
  id     Int    @id @default(autoincrement())
  userId Int    → User
  genre  String
}

model Recommendation {
  id        Int      @id @default(autoincrement())
  userId    Int      → User
  contentId Int      → Content
  score     Float
  cbfScore  Float?
  cfScore   Float?
  feedback  String?  ← liked / disliked
  createdAt DateTime @default(now())
}
```

### 5.2 Migration Geçmişi

| Migration | Açıklama |
|-----------|---------|
| `20260515_init` | Temel şema oluşturma |
| `20260515154959_add_profile_fields` | User modeline `phone` ve `avatar_url` eklendi |

---

## 6. ML Servisi (`ml-service/`)

### 6.1 Endpoint

```
POST http://ml-service:8000/recommend
Body: { "userId": 1, "limit": 20 }
Response: { "recommendations": [{ "contentId": 5, "score": 0.87, ... }] }
```

### 6.2 Algoritma Detayı

```
Hibrit Skor = α × CBF_score + β × CF_score

Normal kullanıcı (onboardingDone, ≥5 izleme): α=0.4, β=0.6
Cold start (yeni kullanıcı):                  α=0.9, β=0.1
```

**CBF — Content-Based Filtering (İçerik Tabanlı)**
1. `Content.description` metinleri `TfidfVectorizer` ile vektörleştirilir
2. Kullanıcının izlediği/okuduğu içeriklerin vektörleri ortalaması alınır (kullanıcı profili)
3. Tüm içeriklerle `cosine_similarity` hesaplanır
4. En yüksek benzerlik skorlu içerikler filtrelenir (zaten izlenenler hariç)

**CF — Collaborative Filtering (İşbirlikçi)**
1. Kullanıcı × İçerik puan matrisi oluşturulur
2. `NearestNeighbors(metric='cosine')` ile en benzer kullanıcılar bulunur
3. O kullanıcıların yüksek puan verdiği, hedef kullanıcının görmediği içerikler önerilir

**⚠️ Kritik:** `description` alanı boşsa TF-IDF vektörü oluşturulamaz, CBF çalışmaz.
Bu yüzden frontend'de her kaydetme işleminde `description` mutlaka gönderilir.

---

## 7. Çok Dil Desteği (i18n)

### Dosya Yapısı
```
frontend/public/locales/
├── tr/common.json   ← Tüm Türkçe metinler
└── en/common.json   ← Tüm İngilizce metinler
```

### Örnek Anahtarlar
```json
{
  "nav": { "home": "Ana Sayfa", "search": "Keşfet", "profile": "Profil", "logout": "Çıkış" },
  "auth": { "login": "Giriş Yap", "register": "Kayıt Ol" },
  "content": { "save": "Kaydet", "rating": "Puan", "wantToRead": "Okumak İstiyorum" },
  "profile": { "editProfile": "Profili Düzenle", "changePassword": "Şifre Değiştir" }
}
```

### Dil Değiştirme Akışı
```
Kullanıcı butona tıklar (Layout.tsx)
  → i18n.changeLanguage("en")
  → localStorage.setItem("language", "en")
  → usersAPI.updateLanguage(userId, "en")  → PUT /api/users/:id
  → DB'de User.language güncellenir
```

---

## 8. Docker Yapılandırması

```yaml
# docker-compose.yml

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: recoapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports: ["5432:5432"]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/recoapp
      JWT_SECRET: <secret>
      JWT_REFRESH_SECRET: <secret>
      TMDB_API_KEY: <key>
      GOOGLE_BOOKS_API_KEY: <key>
      ML_SERVICE_URL: http://ml-service:8000
    depends_on: [postgres]

  ml-service:
    build: ./ml-service
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/recoapp
    depends_on: [postgres]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
```

---

## 9. Geliştirme Komutları

```bash
# Tüm servisleri Docker ile başlat
docker-compose up --build

# Sadece frontend (hot-reload)
cd frontend && npm run dev

# Sadece backend (nodemon)
cd backend && npm run dev

# ML servisi (uvicorn hot-reload)
cd ml-service && uvicorn main:app --reload

# Veritabanı migration uygula
cd backend && npx prisma migrate dev

# Prisma Studio (görsel DB editörü)
cd backend && npx prisma studio

# TypeScript hata kontrolü
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Testler
cd frontend && npm test
cd backend && npm test
cd ml-service && pytest
```

---

## 10. Çözülen Teknik Sorunlar

| Sorun | Kök Neden | Çözüm |
|-------|-----------|-------|
| Aynı anda çok kullanıcı login → 409 P2002 hatası | Refresh token `@unique` kısıtı; aynı ms'de aynı userId → aynı token hash | `jti: randomBytes(16)` eklendi — her token kriptografik olarak benzersiz |
| Farklı hesaplar birbirinin içeriklerini görüyor | React Query `["user-content"]` key'i userId içermiyordu, önbellek paylaşılıyordu | Logout'ta `queryClient.clear()` + tüm query key'lere `user.id` eklendi |
| ML önerileri alakasız/zayıf | Kaydetme sırasında `description` gönderilmiyordu, TF-IDF boş vektörler üretiyordu | `SaveContentPayload`'a `description` eklendi, tüm kaydetme noktaları güncellendi |
| Yanlış şifrede hata görünmüyor | Frontend `error.response.data.message` okuyordu, backend `{ error: string }` dönüyor | `.message` → `.error` düzeltildi (Login + Register sayfaları) |
| Avatar tarayıcıda 404 veriyor | Vite proxy `/avatars` yolunu backend'e iletmiyordu | `vite.config.ts`'e `/avatars → http://localhost:4000` proxy eklendi |
| PATCH profil güncellemesi çalışmıyor | Frontend `api.put()` çağırıyordu, backend `router.patch()` bekliyordu | Endpoint ve API çağrısı hizalandı |
| ML `description` boş kalıyor | Backend userContent upsert'i `description` alanını güncellemeyi atlıyordu | `userContent.ts` upsert sorgusu description'ı da içerecek şekilde düzeltildi |

---

## 11. Proje Durumu (15 Mayıs 2026)

### Tamamlanan Özellikler ✅
- Kullanıcı kayıt / giriş / çıkış (JWT + refresh token rotation)
- Film, dizi, kitap arama (TMDB + Google Books)
- İçerik detay sayfası
- Kütüphaneye kaydetme (izledim/okudum + istek listesi)
- 1-10 arası puanlama
- Hibrit ML önerileri (CBF + CF)
- Öneri geri bildirimi (beğendim/beğenmedim)
- Onboarding (tür tercihi seçimi)
- Profil sayfası (avatar, şifre, kişisel bilgi, tür tercihleri)
- TR/EN çok dil desteği
- Responsive tasarım (mobil + masaüstü)
- Çok kullanıcı veri izolasyonu
- Docker Compose altyapısı

### Test Edilmesi Gereken ⚠️
- Avatar yükleme uçtan uca testi
- Şifre değiştirme akışı
- Profil düzenleme (username/email/phone)
- ML öneri kalitesi (description ile)

---

*Bu rapor projenin tüm teknik detaylarını kapsamaktadır.*
