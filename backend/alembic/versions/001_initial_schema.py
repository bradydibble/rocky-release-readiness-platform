"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "releases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("version", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "milestones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "release_id",
            sa.Integer(),
            sa.ForeignKey("releases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_milestones_release_id", "milestones", ["release_id"])

    op.create_table(
        "sections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "milestone_id",
            sa.Integer(),
            sa.ForeignKey("milestones.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("architecture", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_sections_milestone_id", "sections", ["milestone_id"])

    op.create_table(
        "test_cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "section_id",
            sa.Integer(),
            sa.ForeignKey("sections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("procedure_url", sa.Text(), nullable=True),
        sa.Column("blocking", sa.String(20), nullable=False, server_default="normal"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("admin_signoff", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("signoff_by", sa.String(255), nullable=True),
        sa.Column("signoff_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_test_cases_section_id", "test_cases", ["section_id"])

    op.create_table(
        "results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "test_case_id",
            sa.Integer(),
            sa.ForeignKey("test_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("outcome", sa.String(20), nullable=False),
        sa.Column("arch", sa.String(50), nullable=False),
        sa.Column("deploy_type", sa.String(100), nullable=False),
        sa.Column("hardware_notes", sa.Text(), nullable=True),
        sa.Column("submitter_name", sa.String(255), nullable=True),
        sa.Column(
            "submit_time",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "carried_from_milestone_id",
            sa.Integer(),
            sa.ForeignKey("milestones.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_results_test_case_id", "results", ["test_case_id"])
    op.create_index("ix_results_outcome", "results", ["outcome"])


def downgrade() -> None:
    op.drop_table("results")
    op.drop_table("test_cases")
    op.drop_table("sections")
    op.drop_table("milestones")
    op.drop_table("releases")
