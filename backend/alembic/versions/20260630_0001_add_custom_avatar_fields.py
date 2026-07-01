"""add custom avatar fields

Revision ID: 20260630_0001
Revises:
Create Date: 2026-06-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260630_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("avatars", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.add_column(
        "avatars",
        sa.Column("is_custom", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_foreign_key(
        "fk_avatars_owner_id_users",
        "avatars",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("avatars", "is_custom", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_avatars_owner_id_users", "avatars", type_="foreignkey")
    op.drop_column("avatars", "is_custom")
    op.drop_column("avatars", "owner_id")
