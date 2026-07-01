<!-- Hero Section -->
<div align="center">

# 🎬 OmneaxaFlow

### Enterprise AI Content Creation & Learning Platform

**An enterprise AI content creation and learning platform enabling organizations to create, localize, collaborate on, and distribute AI-powered video experiences.**

<p align="center">
  <img src="https://img.shields.io/github/license/Akashpandit08/RenderFlow-?style=flat-square&color=5c6bc0" alt="License" />
  <img src="https://img.shields.io/github/stars/Akashpandit08/RenderFlow-?style=flat-square&color=ffd54f" alt="Stars" />
  <img src="https://img.shields.io/github/forks/Akashpandit08/RenderFlow-?style=flat-square&color=81c784" alt="Forks" />
  <img src="https://img.shields.io/github/issues/Akashpandit08/RenderFlow-?style=flat-square&color=e57373" alt="Issues" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-red?style=flat-square&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Celery-5-green?style=flat-square&logo=celery" alt="Celery" />
  <img src="https://img.shields.io/badge/FFmpeg-6-007800?style=flat-square&logo=ffmpeg" alt="FFmpeg" />
  <img src="https://img.shields.io/badge/AWS_S3-Storage-569A31?style=flat-square&logo=amazons3" alt="AWS S3" />
</p>

</div>

---

## 📌 Product Overview

OmneaxaFlow is a comprehensive, enterprise-grade AI-powered platform tailored for corporate training, content creation, and e-learning localization. By consolidating modern web architectures with advanced AI technologies, OmneaxaFlow bridges the gap between text-based materials and engaging, interactive video courses.

Whether you need to generate high-fidelity voice cloned narrations, transform static PowerPoint/PDF slide decks into interactive video tracks, overlay real-time learning check-point quizzes, or bundle videos into SCORM packages for instant Learning Management System (LMS) deployments—OmneaxaFlow automates the entire pipeline.

---

## 🏗️ Architecture Diagram

OmneaxaFlow is designed with a decoupled architecture to ensure horizontal scaling, fault tolerance, and secure data flow. Below is the technical schema showcasing the communication topology:

```
                            ┌────────────────────────┐
                            │   Next.js Frontend     │
                            │   (React 19 / Zustand) │
                            └────────────────────────┘
                                         │  (HTTP / Webhook Hooks)
                                         ▼
                            ┌────────────────────────┐
                            │    FastAPI Backend     │◄────────┐
                            │  (JWT / MFA / Auth)    │         │
                            └────────────────────────┘         │
                              │                      │         │
                              ▼ (SQLAlchemy)         ▼ (Broker)│
                      ┌──────────────┐       ┌───────────────┐ │
                      │  PostgreSQL  │       │  Redis Cache  │ │
                      │  Database    │       │  & Message    │ │
                      └──────────────┘       │  Queue        │ │
                                             └───────────────┘ │
                                                     │         │
                                                     ▼         │
                                             ┌───────────────┐ │
                                             │ Celery Worker │─┘
                                             │ (FFmpeg Engine│
                                             └───────────────┘
                                               │           │
                                               ▼           ▼
                                            ┌────┐   ┌─────────────┐
                                            │ S3 │   │ External AI │
                                            │    │   │ ElevenLabs  │
                                            │    │   │ AWS Polly   │
                                            └────┘   └─────────────┘
```

---

## ✨ Features

### 🛡️ Security & Authentication
- **Multi-Factor Authentication (MFA)** — Optional authenticator app (TOTP) pairing.
- **Role-Based Access Control (RBAC)** — Granular permission definitions per user role.
- **Enterprise Logs** — Tamper-evident audit logging for workspace state changes and resource edits.
- **Secured Tokens** — Strict JWT tokens with rotation policies and refresh schemas.

### 👥 Collaboration & Workspaces
- **Multi-Tenant Workspaces** — Isolated corporate boundaries containing distinct sets of projects, settings, and billing contracts.
- **Granular Permissions** — Read, write, and execute permissions applied at the individual folder or project level.
- **Comment Overlay** — Context-aware, timestamp-linked threads on videos for team feedback cycles.

### 🎥 Video Creation & Rendering
- **Script Timeline Editor** — Drag-and-drop scene-by-scene script writing with dynamic template support.
- **FFmpeg Render Core** — Blazing fast programmatic assembly of videos containing slides, subtitles, overlays, transitions, and audio.
- **Real-time Preview Engine** — Instantly listen to audio scripts and visual layouts before initiating a full render task.

### 📁 Content Creation
- **PowerPoint & PDF Import** — Automatically extracts text, layouts, and structures from `.ppt`, `.pptx`, and `.pdf` files to generate baseline video scripts.
- **Brand Glossary Engine** — Define translation maps, prohibited phrases, and brand terminology to correct or adjust voice clone translations and auto-scripts.
- **Interactive Multi-Scene Timeline** — Manage multiple transitions, subtitles, aspect ratios, and visual elements concurrently.

### 🤖 AI Features
- **Few-Shot Voice Cloning** — Clone corporate narrators or executives using ElevenLabs custom trainer with AWS Polly voice fallback logic.
- **Enterprise Dubbing & Translation** — Translate, adapt, and render scripts into over 175+ languages while maintaining synchronized audio timestamps.
- **Dynamic Text-to-Speech** — Integration of multiple high-fidelity TTS systems (ElevenLabs, Polly, gTTS).

### 🎓 Learning & LMS
- **Interactive Checkpoint Quizzes** — Embed multiple-choice questionnaire checkpoints into videos at designated timestamps to pause playback and test learners.
- **SCORM 1.2 & SCORM 2004 Export** — Pack resources, media references, client API scripts, and quizzes directly into standard LMS zip packages.

### 🛠️ Developer Platform
- **API Key Management** — Programmatic API key creation and revocation for backend operations.
- **Robust Webhooks** — Subscribe to rendering start, progress updates, failure states, or SCORM compilation hooks.

---

## 📸 Screenshots

### Dashboard
*(Add screenshot)*

### Video Editor
*(Add screenshot)*

### Analytics
*(Add screenshot)*

### Voice Cloning
*(Add screenshot)*

---

## ⚙️ Installation

### 🐳 Docker Compose (Recommended)
The easiest way to spin up the entire cluster (Frontend, Backend, Postgres, Redis, Celery, and FFmpeg) is via Docker Compose:

1. Clone the repository and configure `.env`:
   ```bash
   git clone https://github.com/Akashpandit08/RenderFlow-.git
   cd RenderFlow-
   cp .env.example .env
   ```
2. Run the environment services:
   ```bash
   docker-compose up --build
   ```

---

### 💻 Manual Setup

#### 1. Backend Application Setup
1. Navigate to directory and initialize a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   # On Windows: .\venv\Scripts\activate
   # On Linux/Mac: source venv/bin/activate
   ```
2. Install Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Run Alembic migrations to construct database schemas:
   ```bash
   alembic upgrade head
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 2. Frontend Application Setup
1. Navigate to directory and install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```

#### 3. Celery Async Task Worker Setup
1. Open a new terminal instance, navigate to the backend, and activate the virtual environment.
2. Run the worker daemon:
   ```bash
   # On Windows (Single worker thread pool fallback):
   celery -A app.workers.celery_app worker --loglevel=info --pool=solo

   # On Linux / MacOS:
   celery -A app.workers.celery_app worker --loglevel=info --concurrency=4
   ```

---

## 🔑 Environment Variables

OmneaxaFlow requires the following key variables to run. Add them to your environment or configure them within `.env` at the root folder:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://user:pass@host:5432/db`) |
| `REDIS_URL` | Redis instance URL for Celery message broker and cache system (`redis://localhost:6379/0`) |
| `AWS_ACCESS_KEY_ID` | Access key for AWS integrations (S3 asset uploads) |
| `AWS_SECRET_ACCESS_KEY` | Secret access key for AWS S3 |
| `S3_BUCKET` | AWS S3 bucket name designated for storing avatars, raw media, and rendered files |
| `JWT_SECRET` | Secret key used to encrypt and sign JWT credentials |
| `ELEVENLABS_API_KEY` | ElevenLabs developer key for Custom Voice Cloning and high-fidelity TTS |
| `GEMINI_API_KEY` | **Primary** Google Gemini API key for AI script generation and content processing |
| `OPENAI_API_KEY` | *(Optional)* OpenAI API key — only needed if switching `PRIMARY_PROVIDER` to `openai` |
| `RAZORPAY_KEY` | Razorpay payment gateway key |
| `RAZORPAY_SECRET` | Razorpay integration secret |

---

## 📖 API Documentation

OmneaxaFlow provides auto-generated documentation via Swagger UI. Once running the backend, navigate to `http://localhost:8000/docs` to inspect active schemas. Below is a summary of major endpoints:

### Auth
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user accounts |
| `POST` | `/api/v1/auth/login` | Login and acquire token pairs |
| `POST` | `/api/v1/auth/mfa/setup` | Generate TOTP authenticator QR payload |

### Projects & Videos
| Method | Route | Description |
|---|---|---|
| `GET` / `POST` | `/api/v1/projects` | List or create video projects |
| `GET` / `PUT` | `/api/v1/projects/{id}` | Read or modify project metadata |
| `POST` | `/api/v1/videos/render` | Trigger FFmpeg rendering task |

### Voice Cloning & TTS
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/voices/clone` | Request voice training from audio sample |
| `GET` | `/api/v1/voices/clones` | Fetch list of custom cloned voices |
| `POST` | `/api/v1/voices/clones/{id}/preview` | Generate preview script using voice |

### Localization & Translation
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/translations` | Translate script to specified language |
| `GET` | `/api/v1/translations/languages` | Return list of 175+ supported target languages |

### Quizzes & SCORM Export
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/videos/{id}/quizzes` | Create/Insert checkpoint quiz overlays |
| `POST` | `/api/v1/videos/{id}/scorm` | Queue SCORM 1.2 or 2004 ZIP package assembly |
| `GET` | `/api/v1/scorm/{id}/download` | Retrieve S3 download link for compiled package |

### API Keys & Webhooks
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/api-keys` | Generate workspace API key |
| `POST` | `/api/v1/webhooks` | Register endpoint webhook endpoint |

---

## 🗺️ Product Roadmap

- [x] **Phase 1 — MVP** (Next.js/FastAPI foundation, Auth, basic rendering pipelines, AWS integration, simple templates).
- [x] **Phase 2 — Core Features** (Sub scene support, custom Avatars, basic text-to-speech, payments).
- [x] **Phase 3 — Scale** (Team invites, CDN setups, custom workspace branding, detailed dashboards, Developer API keys).
- [x] **Phase 4 — Security & Collaboration** (MFA, granular resource permissions, audit logs, commenting system).
- [x] **Phase 5 — Content Creation** (PowerPoint / PDF ingestion, brand glossary terminology replacement, multi-language dubbing).
- [x] **Phase 6 — Advanced Features** (Voice Cloning, in-video checkpoint quizzes, SCORM 1.2 and 2004 exports).

---

## 🚀 Deployment

### Production Deployment Strategy

For high-availability configurations, we suggest splitting the workload:

1. **Database layer**: Managed PostgreSQL (AWS RDS / GCP Cloud SQL).
2. **Broker layer**: Managed Redis (AWS ElastiCache).
3. **API server**: Deployed on container orchestrators (AWS ECS, Kubernetes, or GCP Cloud Run) with autoscaling policies targeting CPU and Memory utilization.
4. **Celery Worker**: Deployed on GPU/CPU optimized virtual machine instances. CPU-concurrency configurations should be scaled according to active rendering threads. Ensure FFmpeg is pre-configured with GPU wrappers (e.g., NVENC for NVIDIA hardware) to optimize media rendering pipelines.
5. **Asset delivery**: AWS CloudFront or another CDN sitting in front of the AWS S3 media bucket to speed up video distributions globally.

---

## 🤝 Contributing

We welcome contributions to OmneaxaFlow! Please follow these guidelines:

1. Fork the Project.
2. Create a Feature Branch (`git checkout -b feature/AwesomeFeature`).
3. Commit your changes (`git commit -m 'Add some AwesomeFeature'`).
4. Push to the Branch (`git push origin feature/AwesomeFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more details.

---

<div align="center">
Built with ❤️ using Next.js, FastAPI, PostgreSQL, Redis, Celery, FFmpeg, and AI technologies.
</div>