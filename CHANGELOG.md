# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - Phase 5 Content Creation Features
### Added
- **PowerPoint & PDF Import**: Upload `.ppt`, `.pptx`, and `.pdf` files to automatically generate a video project with scenes. Includes background processing using Celery and `python-pptx`/`pymupdf`.
- **Brand Glossary**: Define approved words and terminology (e.g., "AI -> Artificial Intelligence") for an organization. Includes glossary application during translation and script processing.
- **Video Translation**: Translate videos into 175+ languages using Google Cloud Translation API. Includes a new translation queue system.
- **Database Models**: Added `ImportJob`, `BrandGlossary`, and `VideoTranslation` models to PostgreSQL.
- **Zustand Stores**: Added `importStore.ts`, `glossaryStore.ts`, and `translationStore.ts`.
- **Frontend Views**: 
  - `/imports` for PPT/PDF uploads and progress tracking.
  - `/settings/glossary` to manage brand terminology rules.
  - `/translations` and `TranslationModal` component for handling video language conversion.
