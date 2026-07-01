"""add custom avatar fields

Revision ID: 20260630_0001
Revises:
Create Date: 2026-06-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260630_0001"
down_revision: Union[str, None] = '0da74c07314b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("avatars", schema=None) as batch_op:
        batch_op.add_column(sa.Column("owner_id", sa.Integer(), nullable=True))
        
    with op.batch_alter_table("avatars", schema=None) as batch_op:
        batch_op.add_column(sa.Column("is_custom", sa.Boolean(), server_default=sa.false(), nullable=False))
        # batch_op.create_foreign_key("fk_avatars_owner_id_users", "users", ["owner_id"], ["id"], ondelete="CASCADE")
        batch_op.alter_column("is_custom", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("avatars", schema=None) as batch_op:
        # batch_op.drop_constraint("fk_avatars_owner_id_users", type_="foreignkey")
        batch_op.drop_column("is_custom")
        
    with op.batch_alter_table("avatars", schema=None) as batch_op:
        batch_op.drop_column("owner_id")
