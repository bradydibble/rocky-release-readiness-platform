"""add start_date and end_date to milestones

Revision ID: 004
Revises: 003
Create Date: 2026-04-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("milestones", sa.Column("start_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("milestones", sa.Column("end_date", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("milestones", "end_date")
    op.drop_column("milestones", "start_date")
