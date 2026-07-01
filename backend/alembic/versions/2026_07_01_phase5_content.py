"""Phase 5 Content Models

Revision ID: phase5_content_001
Revises: 
Create Date: 2026-07-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'phase5_content_001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # import_jobs table
    op.create_table('import_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('file_url', sa.String(length=1024), nullable=False),
        sa.Column('status', sa.Enum('uploaded', 'processing', 'completed', 'failed', name='importjobstatus'), nullable=False),
        sa.Column('parsed_content', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_import_jobs_id'), 'import_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_import_jobs_workspace_id'), 'import_jobs', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_import_jobs_user_id'), 'import_jobs', ['user_id'], unique=False)

    # brand_glossaries table
    op.create_table('brand_glossaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('term', sa.String(length=255), nullable=False),
        sa.Column('replacement', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_brand_glossaries_id'), 'brand_glossaries', ['id'], unique=False)
    op.create_index(op.f('ix_brand_glossaries_workspace_id'), 'brand_glossaries', ['workspace_id'], unique=False)

    # video_translations table
    op.create_table('video_translations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('video_id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('source_language', sa.String(length=50), nullable=False),
        sa.Column('target_language', sa.String(length=50), nullable=False),
        sa.Column('translated_script', sa.Text(), nullable=True),
        sa.Column('voice_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('queued', 'processing', 'completed', 'failed', name='translationstatus'), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['voice_id'], ['voices.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_video_translations_id'), 'video_translations', ['id'], unique=False)
    op.create_index(op.f('ix_video_translations_video_id'), 'video_translations', ['video_id'], unique=False)
    op.create_index(op.f('ix_video_translations_workspace_id'), 'video_translations', ['workspace_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_video_translations_workspace_id'), table_name='video_translations')
    op.drop_index(op.f('ix_video_translations_video_id'), table_name='video_translations')
    op.drop_index(op.f('ix_video_translations_id'), table_name='video_translations')
    op.drop_table('video_translations')
    op.drop_index(op.f('ix_brand_glossaries_workspace_id'), table_name='brand_glossaries')
    op.drop_index(op.f('ix_brand_glossaries_id'), table_name='brand_glossaries')
    op.drop_table('brand_glossaries')
    op.drop_index(op.f('ix_import_jobs_user_id'), table_name='import_jobs')
    op.drop_index(op.f('ix_import_jobs_workspace_id'), table_name='import_jobs')
    op.drop_index(op.f('ix_import_jobs_id'), table_name='import_jobs')
    op.drop_table('import_jobs')
