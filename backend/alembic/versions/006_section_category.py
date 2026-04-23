"""add category to sections

Revision ID: 006
Revises: 005
Create Date: 2026-04-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Mapping from section name patterns to categories
CATEGORY_MAP = [
    ("Installer Requirements", "installer"),
    ("Cloud Image", "cloud"),
    ("Post-Installation", "post_install"),
    ("Community Testable", "post_install"),
    ("Repository Checks", "repository"),
    ("SIG/AltArch", "hardware"),
    ("Operations", "operations"),
    ("Final Release", "release_gate"),
]


def upgrade() -> None:
    op.add_column("sections", sa.Column("category", sa.String(50), nullable=True))
    # Backfill from section names
    conn = op.get_bind()
    for pattern, category in CATEGORY_MAP:
        conn.execute(
            sa.text(
                "UPDATE sections SET category = :cat WHERE name LIKE :pattern"
            ),
            {"cat": category, "pattern": f"%{pattern}%"},
        )


def downgrade() -> None:
    op.drop_column("sections", "category")
