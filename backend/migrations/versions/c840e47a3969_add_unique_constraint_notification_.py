"""add unique constraint notification_recipient

Revision ID: c840e47a3969
Revises: 1cfe310c633e
Create Date: 2026-06-23 10:14:33.293864

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c840e47a3969"
down_revision: str | Sequence[str] | None = "1cfe310c633e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_notification_recipient",
        "notification_recipient",
        ["notification_id", "recipient_id"],
        schema="kcell_web",
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_notification_recipient", "notification_recipient", schema="kcell_web"
    )
