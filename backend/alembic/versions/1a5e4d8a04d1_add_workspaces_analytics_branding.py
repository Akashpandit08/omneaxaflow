"""Add workspaces, analytics, branding

Revision ID: 1a5e4d8a04d1
Revises: 1096c9f8bb57
Create Date: 2026-07-01 11:19:02.113395

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a5e4d8a04d1'
down_revision: Union[str, None] = '1096c9f8bb57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Workspaces
    op.create_table(
        'workspaces',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('plan', sa.String(length=50), nullable=False, server_default='free'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'workspace_members',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('invited_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('joined_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'workspace_invitations',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('email', sa.String(length=255), nullable=False, index=True),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True)),
        sa.Column('invited_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'workspace_branding',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('company_name', sa.String(length=255)),
        sa.Column('logo_s3_key', sa.String(length=512)),
        sa.Column('favicon_s3_key', sa.String(length=512)),
        sa.Column('primary_color', sa.String(length=50)),
        sa.Column('secondary_color', sa.String(length=50)),
        sa.Column('accent_color', sa.String(length=50)),
        sa.Column('support_email', sa.String(length=255)),
        sa.Column('custom_domain', sa.String(length=255), unique=True, index=True),
        sa.Column('domain_verification_token_hash', sa.String(length=255)),
        sa.Column('domain_verified_at', sa.DateTime(timezone=True)),
        sa.Column('domain_last_checked_at', sa.DateTime(timezone=True)),
        sa.Column('hide_renderflow_branding', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('email_from_name', sa.String(length=255)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'analytics_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('event_type', sa.String(length=100), nullable=False, index=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='SET NULL')),
        sa.Column('video_id', sa.Integer(), sa.ForeignKey('videos.id', ondelete='SET NULL')),
        sa.Column('metadata', sa.JSON()),
        sa.Column('occurred_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'workspace_analytics_daily',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('projects_created', sa.Integer(), server_default='0', nullable=False),
        sa.Column('renders_started', sa.Integer(), server_default='0', nullable=False),
        sa.Column('renders_completed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('renders_failed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('downloads', sa.Integer(), server_default='0', nullable=False),
        sa.Column('api_requests', sa.Integer(), server_default='0', nullable=False),
        sa.Column('webhooks_delivered', sa.Integer(), server_default='0', nullable=False),
        sa.Column('webhooks_failed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_render_seconds', sa.Integer(), server_default='0', nullable=False),
    )

    # 2. Add columns to existing tables
    tables_to_modify = ["projects", "videos", "avatars", "api_keys", "webhooks"]
    
    for table in tables_to_modify:
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), index=True))

    # 3. Backfill data logic (assign personal workspace for users)
    # We will just write the SQL structure for backfill
    op.execute("""
    INSERT INTO workspaces (name, slug, owner_id, plan, is_active, created_at, updated_at)
    SELECT split_part(u.email, '@', 1) || ' Workspace', 'workspace-' || u.id, u.id, 'free', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM users u
    """)

    op.execute("""
    INSERT INTO workspace_members (workspace_id, user_id, role, status, created_at, updated_at)
    SELECT w.id, w.owner_id, 'owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM workspaces w
    """)

    # Link existing resources to their owner's workspace
    op.execute("""
    UPDATE projects SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = projects.owner_id LIMIT 1)
    """)
    op.execute("""
    UPDATE api_keys SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = api_keys.user_id LIMIT 1)
    """)
    op.execute("""
    UPDATE webhooks SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = webhooks.user_id LIMIT 1)
    """)
    # Videos don't have an owner_id directly, they belong to projects
    op.execute("""
    UPDATE videos SET workspace_id = (SELECT workspace_id FROM projects WHERE projects.id = videos.project_id LIMIT 1)
    """)
    op.execute("""
    UPDATE avatars SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = avatars.owner_id LIMIT 1) WHERE owner_id IS NOT NULL
    """)

    # 4. Apply NOT NULL constraints after backfill
    for table in tables_to_modify:
        if table == "avatars":
            continue # Avatars can be system-wide without a workspace
        with op.batch_alter_table(table) as batch_op:
            batch_op.alter_column('workspace_id', existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    tables_to_modify = ["projects", "videos", "avatars", "api_keys", "webhooks"]
    for table in tables_to_modify:
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_column('workspace_id')

    op.drop_table('workspace_analytics_daily')
    op.drop_table('analytics_events')
    op.drop_table('workspace_branding')
    op.drop_table('workspace_invitations')
    op.drop_table('workspace_members')
    op.drop_table('workspaces')
