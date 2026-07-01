# RenderFlow — AI Video Generation SaaS 

A production-ready AI video generation platform built with Next.js, FastAPI, PostgreSQL, Redis, Celery, and FFmpeg.

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

- **Authentication** — JWT-based register/login with refresh tokens.
- **Dashboard** — Video project management with status tracking.
- **Script Editor** — Rich text editor for video scripts with scene management.
- **Voice Generation** — TTS integration (ElevenLabs / AWS Polly / gTTS fallback).
- **Avatar Selection** — Predefined avatar library and custom user avatars.
- **Video Rendering Pipeline** — Async Celery workers with FFmpeg.
- **Video Export** — S3-hosted download with signed URLs.
- **Subscription Support** — Razorpay billing integration with subscription tiers.
- **Developer API** — Generate API keys for programmatic access.
- **Webhooks** — Register webhooks to receive real-time rendering lifecycle events.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis
- FFmpeg
- AWS account (S3 bucket)
- Razorpay account (for billing)

### Setup & Run (Local Development)

**1. Clone & Configure**
```bash
git clone <repo>
cd aivideo
cp .env.example .env
# Edit .env with your local DB, Redis, and API credentials
```

**2. Database & Backend API**
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed initial data (optional)
python scripts/seed.py

# Start the FastAPI server
uvicorn app.main:app --reload
```

**3. Celery Worker (In a new terminal)**
```bash
cd backend
# Activate venv
# Note: Windows users must use --pool=solo
celery -A app.workers.celery_app worker --loglevel=info --pool=solo
```

**4. Frontend Dashboard (In a new terminal)**
```bash
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

---

## Environment Variables

See `.env.example` in both `backend` and `frontend` directories for required variables with descriptions.

---

## API Design

The API is fully documented via Swagger UI at `/docs`. Below is a high-level summary:

### Auth & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get JWT tokens |

### Developer Tools (API Keys & Webhooks)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/api-keys` | Manage API keys |
| DELETE | `/api/v1/api-keys/{id}` | Revoke API key |
| GET/POST | `/api/v1/webhooks` | Manage Webhooks |
| PATCH/DEL | `/api/v1/webhooks/{id}` | Update/Delete Webhook |

### Core Logic
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/v1/projects` | Manage video projects |
| POST | `/api/v1/videos/render` | Trigger render task |
| GET | `/api/v1/videos/{id}/status` | Poll render status |
| GET | `/api/v1/avatars` | List system & custom avatars |
| GET | `/api/v1/voices` | List TTS voices |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/subscriptions/checkout` | Create Razorpay order |

---

## Development Roadmap

### Phase 1 — MVP  ✅
- [x] Project scaffolding & Architecture setup
- [x] Auth (register, login, JWT)
- [x] Dashboard UI
- [x] Project CRUD
- [x] Basic FFmpeg pipeline
- [x] S3 upload/download
- [x] Subscription plans (Razorpay)

### Phase 2 — Core Features ✅
- [x] Voice synthesis integration
- [x] Custom avatar support (DB & UI)
- [x] Multi-scene video support
- [x] Email notifications

### Phase 3 — Scale 🔄
- [x] API access & webhooks for users
- [ ] Team workspaces
- [ ] CDN integration (CloudFront)
- [ ] Advanced analytics
- [ ] Custom branding / white-label
- [ ] Mobile-responsive polish

---

## License

MIT