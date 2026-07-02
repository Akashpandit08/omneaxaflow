"""add provider columns to voice clones

Revision ID: 2026_07_02_provider_cols
Revises: 2026_07_01_cashfree
Create Date: 2026-07-02 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_07_02_provider_cols'
down_revision: Union[str, None] = '2026_07_01_cashfree'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # We add 'if not exists' logic by skipping since it might already exist 
    # if fix_db.py was run, or we can just let Alembic add them normally
    # and handle DuplicateColumnError if needed.
    
    # Check if columns exist
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='voice_clones'"))
    columns = [row[0] for row in result]
    
    if 'provider_status' not in columns:
        op.add_column('voice_clones', sa.Column('provider_status', sa.String(length=50), nullable=True))
    if 'provider_error' not in columns:
        op.add_column('voice_clones', sa.Column('provider_error', sa.Text(), nullable=True))
    if 'provider_metadata' not in columns:
        op.add_column('voice_clones', sa.Column('provider_metadata', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('voice_clones', 'provider_metadata')
    op.drop_column('voice_clones', 'provider_error')
    op.drop_column('voice_clones', 'provider_status')
