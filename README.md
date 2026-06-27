# AiVideo — AI Video Generation SaaS 

A production-ready AI video generation platform built with Next.js 16, FastAPI, PostgreSQL, AWS S3, and FFmpeg.

---

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Next.js Frontend  │────▶│   FastAPI Backend     │────▶│   PostgreSQL DB  │
│   (Port 3000)       │     │   (Port 8000)         │     │   (Port 5432)    │
└─────────────────────┘     └──────────────────────┘     └──────────────────┘
                                       │                          │
                              ┌────────┴────────┐       ┌────────┴────────┐
                              │  Celery Worker  │       │   Redis Cache   │
                              │  (FFmpeg jobs)  │       │   (Port 6379)   │
                              └─────────────────┘       └─────────────────┘
                                       │
                              ┌────────┴────────┐
                              │    AWS S3       │
                              │  (Media Store)  │
                              └─────────────────┘
```

## Features

- **Authentication** — JWT-based register/login with refresh tokens
- **Dashboard** — Video project management with status tracking
- **Script Editor** — Rich text editor for video scripts with scene management
- **Voice Generation** — TTS integration (ElevenLabs / AWS Polly)
- **Avatar Selection** — Predefined avatar library with preview
- **Video Rendering Pipeline** — Async Celery workers with FFmpeg
- **Video Export** — S3-hosted download with signed URLs
- **Subscription Support** — Stripe integration with Free/Pro/Enterprise tiers

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- AWS account (S3 bucket)
- Stripe account (optional for billing)
- ElevenLabs API key (optional, falls back to gTTS)

### Option A: Using Docker (Recommended)

**1. Clone & Configure**
```bash
git clone <repo>
cd aivideo
cp .env.example .env
# Edit .env with your credentials
```

**2. Start Services**
```bash
docker-compose up --build
```

**3. Run Database Migrations**
```bash
docker-compose exec backend alembic upgrade head
```

**4. Seed Initial Data**
```bash
docker-compose exec backend python scripts/seed.py
```

### Option B: Manual Setup (No Docker)

**Prerequisites:** Python 3.10+, Node.js 18+, PostgreSQL, Redis, and FFmpeg.

**1. Database Setup**
Ensure PostgreSQL and Redis are running locally. Create a database named `aivideo`. Update your `.env` in the `backend` folder to point to `localhost`.

**2. Start Backend API**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload
```

**3. Start Celery Worker (In a new terminal)**
```powershell
cd backend
.\venv\Scripts\activate
# IMPORTANT for Windows users: you must use --pool=solo
celery -A app.workers.celery_app worker --loglevel=info --pool=solo
```

**4. Start Frontend Dashboard (In a new terminal)**
```powershell
cd frontend
npm install
npm run dev
```

### Access

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| API        | http://localhost:8000      |
| API Docs   | http://localhost:8000/docs |
| Flower     | http://localhost:5555      |

---

## Environment Variables

See `.env.example` for all required variables with descriptions.

---

## Project Structure

```
aivideo/
├── frontend/          # Next.js 16 app
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/
│   │   ├── lib/       # API client, utilities
│   │   ├── store/     # Zustand stores
│   │   └── types/
│   └── ...
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, security, deps
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic
│   │   └── workers/   # Celery tasks
│   ├── alembic/       # DB migrations
│   └── scripts/       # Seed & utilities
├── docker-compose.yml
└── .env.example
```

---

## API Design

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate token |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List user projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/{id}` | Get project detail |
| PUT | `/api/v1/projects/{id}` | Update project |
| DELETE | `/api/v1/projects/{id}` | Delete project |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/videos/render` | Trigger render |
| GET | `/api/v1/videos/{id}/status` | Poll status |
| GET | `/api/v1/videos/{id}/download` | Signed download URL |

### Avatars
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/avatars` | List avatars |

### Voices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/voices` | List available voices |
| POST | `/api/v1/voices/preview` | Generate voice preview |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscriptions/plans` | List plans |
| POST | `/api/v1/subscriptions/checkout` | Create Stripe session |
| POST | `/api/v1/subscriptions/webhook` | Stripe webhook |

---

## Development Roadmap

### Phase 1 — MVP  ✅
- [x] Project scaffolding & Docker setup
- [x] Auth (register, login, JWT)
- [x] Dashboard UI
- [x] Project CRUD
- [x] Avatar library
- [x] Script editor
- [x] Basic FFmpeg pipeline (text-on-video)
- [x] S3 upload/download
- [x] Subscription plans (Stripe)

### Phase 2 — Core Features
- [ ] ElevenLabs voice synthesis integration
- [ ] Lip-sync with Wav2Lip or SadTalker
- [ ] Custom avatar upload
- [ ] Multi-scene video support
- [ ] Video preview player
- [ ] Email notifications (SendGrid)

### Phase 3 — Scale
- [ ] Team workspaces
- [ ] API access & webhooks for users
- [ ] CDN integration (CloudFront)
- [ ] Advanced analytics
- [ ] Custom branding / white-label
- [ ] Mobile-responsive polish

---

## License

MIT
;