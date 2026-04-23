"""backfill new section categories

Revision ID: 007
Revises: 006
Create Date: 2026-04-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORY_MAP = [
    ("Virtualization", "virtualization"),
    ("Guest Compatibility", "guest_compat"),
    ("Upgrade Path", "upgrade"),
    ("Security%Compliance", "security"),
]


def upgrade() -> None:
    conn = op.get_bind()
    for pattern, category in CATEGORY_MAP:
        conn.execute(
            sa.text(
                "UPDATE sections SET category = :cat WHERE name LIKE :pattern"
            ),
            {"cat": category, "pattern": f"%{pattern}%"},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for pattern, category in CATEGORY_MAP:
        conn.execute(
            sa.text(
                "UPDATE sections SET category = NULL WHERE category = :cat"
            ),
            {"cat": category},
        )
