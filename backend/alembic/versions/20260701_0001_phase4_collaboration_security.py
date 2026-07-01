"""phase 4 collaboration security

Revision ID: 20260701_0001
Revises: 1a5e4d8a04d1
Create Date: 2026-07-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260701_0001"
down_revision: Union[str, None] = "1a5e4d8a04d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("mfa_secret", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("backup_codes", sa.JSON(), nullable=True))
    op.alter_column("users", "mfa_enabled", server_default=None)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("video_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("timestamp_seconds", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_comments_id"), "comments", ["id"], unique=False)
    op.create_index(op.f("ix_comments_user_id"), "comments", ["user_id"], unique=False)
    op.create_index(op.f("ix_comments_video_id"), "comments", ["video_id"], unique=False)
    op.create_index(op.f("ix_comments_workspace_id"), "comments", ["workspace_id"], unique=False)

    op.create_table(
        "templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("creator_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("project_snapshot_json", sa.JSON(), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=512), nullable=True),
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_templates_creator_id"), "templates", ["creator_id"], unique=False)
    op.create_index(op.f("ix_templates_id"), "templates", ["id"], unique=False)
    op.create_index(op.f("ix_templates_workspace_id"), "templates", ["workspace_id"], unique=False)

    op.create_table(
        "content_permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("permission", sa.String(length=50), nullable=False),
        sa.Column("granted_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["granted_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("resource_type", "resource_id", "user_id", "permission", name="uq_content_permission"),
    )
    op.create_index(op.f("ix_content_permissions_id"), "content_permissions", ["id"], unique=False)
    op.create_index(op.f("ix_content_permissions_resource_id"), "content_permissions", ["resource_id"], unique=False)
    op.create_index(op.f("ix_content_permissions_resource_type"), "content_permissions", ["resource_type"], unique=False)
    op.create_index(op.f("ix_content_permissions_user_id"), "content_permissions", ["user_id"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"], unique=False)
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(op.f("ix_audit_logs_resource_id"), "audit_logs", ["resource_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_resource_type"), "audit_logs", ["resource_type"], unique=False)
    op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_workspace_id"), "audit_logs", ["workspace_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_workspace_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_user_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_resource_type"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_resource_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_created_at"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index(op.f("ix_content_permissions_user_id"), table_name="content_permissions")
    op.drop_index(op.f("ix_content_permissions_resource_type"), table_name="content_permissions")
    op.drop_index(op.f("ix_content_permissions_resource_id"), table_name="content_permissions")
    op.drop_index(op.f("ix_content_permissions_id"), table_name="content_permissions")
    op.drop_table("content_permissions")

    op.drop_index(op.f("ix_templates_workspace_id"), table_name="templates")
    op.drop_index(op.f("ix_templates_id"), table_name="templates")
    op.drop_index(op.f("ix_templates_creator_id"), table_name="templates")
    op.drop_table("templates")

    op.drop_index(op.f("ix_comments_workspace_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_video_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_user_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_id"), table_name="comments")
    op.drop_table("comments")

    op.drop_column("users", "backup_codes")
    op.drop_column("users", "mfa_secret")
    op.drop_column("users", "mfa_enabled")
