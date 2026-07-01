
import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.base import Base
import app.models  # load models

async def create_all():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(create_all())

