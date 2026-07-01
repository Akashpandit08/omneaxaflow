import sys
from alembic.autogenerate import produce_migrations
from alembic.migration import MigrationContext
from sqlalchemy import create_engine
from app.models.base import Base

# Import all models to register with Base
import app.models

engine = create_engine('sqlite:///:memory:')
conn = engine.connect()

mc = MigrationContext.configure(conn)

from alembic.autogenerate import compare_metadata

diff = compare_metadata(mc, Base.metadata)

from alembic.autogenerate import render_python_code; print(render_python_code(diff))
