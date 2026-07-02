"""
Seed only system voices.

Run:
  docker compose exec backend python scripts/seed_voices.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.voice import Voice


VOICES = [
    {
        "name": "Free English (gTTS)",
        "provider": "gtts",
        "language": "en",
        "gender": "neutral",
        "accent": "Basic",
        "is_premium": False,
        "provider_voice_id": None,
    },
    {
        "name": "Free French (gTTS)",
        "provider": "gtts",
        "language": "fr",
        "gender": "neutral",
        "accent": "Basic",
        "is_premium": False,
        "provider_voice_id": None,
    },
    {
        "name": "Free Spanish (gTTS)",
        "provider": "gtts",
        "language": "es",
        "gender": "neutral",
        "accent": "Basic",
        "is_premium": False,
        "provider_voice_id": None,
    },
    {
        "name": "Cartesia Default",
        "provider": "cartesia",
        "language": "en",
        "gender": "neutral",
        "accent": "Hosted",
        "is_premium": False,
        "provider_voice_id": settings.CARTESIA_DEFAULT_VOICE_ID or None,
    },
    {
        "name": "Polly Joanna",
        "provider": "polly",
        "language": "en",
        "gender": "female",
        "accent": "American",
        "is_premium": False,
        "provider_voice_id": "Joanna",
    },
    {
        "name": "Polly Matthew",
        "provider": "polly",
        "language": "en",
        "gender": "male",
        "accent": "American",
        "is_premium": False,
        "provider_voice_id": "Matthew",
    },
]


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        for data in VOICES:
            result = await db.execute(select(Voice).where(Voice.name == data["name"]))
            voice = result.scalar_one_or_none()
            if voice:
                for key, value in data.items():
                    setattr(voice, key, value)
                print(f"Updated voice: {data['name']}")
            else:
                db.add(Voice(**data, is_active=True))
                print(f"Created voice: {data['name']}")
        await db.commit()

    await engine.dispose()
    print("Voice seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
