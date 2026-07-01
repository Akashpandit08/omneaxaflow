"""add cashfree fields

Revision ID: 2026_07_01_cashfree
Revises: 2026_07_01_phase6
Create Date: 2026-07-01 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_07_01_cashfree'
down_revision: Union[str, None] = '2026_07_01_phase6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('plans', sa.Column('cashfree_plan_id', sa.String(length=100), nullable=True))
    op.add_column('subscriptions', sa.Column('cashfree_order_id', sa.String(length=100), nullable=True))
    op.add_column('subscriptions', sa.Column('cashfree_customer_id', sa.String(length=100), nullable=True))
    op.add_column('billing_history', sa.Column('cashfree_payment_id', sa.String(length=100), nullable=True))

    op.create_index(op.f('ix_subscriptions_cashfree_order_id'), 'subscriptions', ['cashfree_order_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_subscriptions_cashfree_order_id'), table_name='subscriptions')
    op.drop_column('billing_history', 'cashfree_payment_id')
    op.drop_column('subscriptions', 'cashfree_customer_id')
    op.drop_column('subscriptions', 'cashfree_order_id')
    op.drop_column('plans', 'cashfree_plan_id')
