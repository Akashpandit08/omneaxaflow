"""
Seed script — populate avatars, voices, and subscription plans.
Run: docker-compose exec backend python scripts/seed.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.avatar import Avatar
from app.models.subscription import Plan, PlanTier
from app.models.voice import Voice


PLANS = [
    {
        "name": "Free",
        "tier": PlanTier.FREE,
        "monthly_video_limit": 3,
        "max_video_duration_seconds": 60,
        "storage_gb": 1,
        "price_cents": 0,
    },
    {
        "name": "Pro",
        "tier": PlanTier.PRO,
        "monthly_video_limit": 50,
        "max_video_duration_seconds": 300,
        "storage_gb": 50,
        "price_cents": 2900,  # $29/month
        "stripe_price_id": settings.STRIPE_PRO_PRICE_ID or None,
    },
    {
        "name": "Enterprise",
        "tier": PlanTier.ENTERPRISE,
        "monthly_video_limit": 500,
        "max_video_duration_seconds": 600,
        "storage_gb": 500,
        "price_cents": 9900,  # $99/month
        "stripe_price_id": settings.STRIPE_ENTERPRISE_PRICE_ID or None,
    },
]

AVATARS = [
    {"name": "Alex", "gender": "male", "style": "professional", "description": "Professional male presenter", "is_premium": False},
    {"name": "Emma", "gender": "female", "style": "professional", "description": "Professional female presenter", "is_premium": False},
    {"name": "Jordan", "gender": "neutral", "style": "casual", "description": "Casual neutral presenter", "is_premium": False},
    {"name": "Sophia", "gender": "female", "style": "casual", "description": "Casual female presenter", "is_premium": True},
    {"name": "Marcus", "gender": "male", "style": "casual", "description": "Casual male presenter", "is_premium": True},
    {"name": "Luna", "gender": "female", "style": "animated", "description": "Animated female avatar", "is_premium": True},
]

VOICES = [
    {"name": "Rachel (EN-US)", "provider": "gtts", "language": "en", "gender": "female", "accent": "American", "is_premium": False},
    {"name": "James (EN-GB)", "provider": "gtts", "language": "en", "gender": "male", "accent": "British", "is_premium": False},
    {"name": "Sophie (FR)", "provider": "gtts", "language": "fr", "gender": "female", "accent": "French", "is_premium": False},
    {"name": "Carlos (ES)", "provider": "gtts", "language": "es", "gender": "male", "accent": "Spanish", "is_premium": False},
    {"name": "Aria (EN-US)", "provider": "elevenlabs", "language": "en", "gender": "female", "accent": "American", "is_premium": True, "provider_voice_id": "9BWtsMINqrJLrRacOk9x"},
    {"name": "Roger (EN-US)", "provider": "elevenlabs", "language": "en", "gender": "male", "accent": "American", "is_premium": True, "provider_voice_id": "CwhRBWXzGAHq8TQ4Fs17"},
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        await _seed_plans(db)
        await _seed_avatars(db)
        await _seed_voices(db)
        await db.commit()

    await engine.dispose()
    print("✅ Seed complete.")


async def _seed_plans(db: AsyncSession):
    for plan_data in PLANS:
        existing = await db.execute(select(Plan).where(Plan.tier == plan_data["tier"]))
        if existing.scalar_one_or_none():
            print(f"  Plan '{plan_data['name']}' already exists, skipping.")
            continue
        plan = Plan(**plan_data)
        db.add(plan)
        print(f"  Created plan: {plan_data['name']}")


async def _seed_avatars(db: AsyncSession):
    for av_data in AVATARS:
        existing = await db.execute(select(Avatar).where(Avatar.name == av_data["name"]))
        if existing.scalar_one_or_none():
            print(f"  Avatar '{av_data['name']}' already exists, skipping.")
            continue
        avatar = Avatar(**av_data)
        db.add(avatar)
        print(f"  Created avatar: {av_data['name']}")


async def _seed_voices(db: AsyncSession):
    for v_data in VOICES:
        existing = await db.execute(select(Voice).where(Voice.name == v_data["name"]))
        if existing.scalar_one_or_none():
            print(f"  Voice '{v_data['name']}' already exists, skipping.")
            continue
        voice = Voice(**v_data)
        db.add(voice)
        print(f"  Created voice: {v_data['name']}")


if __name__ == "__main__":
    asyncio.run(seed())
