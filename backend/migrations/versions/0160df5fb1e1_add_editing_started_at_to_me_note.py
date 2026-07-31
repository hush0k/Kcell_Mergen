"""add editing_started_at to me_note

Revision ID: 0160df5fb1e1
Revises: e08b5b687739
Create Date: 2026-07-15 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0160df5fb1e1"
down_revision: str | Sequence[str] | None = "e08b5b687739"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "me_note",
        sa.Column("editing_started_at", sa.DateTime(timezone=True), nullable=True),
        schema="kcell_web",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("me_note", "editing_started_at", schema="kcell_web")
