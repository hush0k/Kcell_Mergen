"""convert_strenum_to_enum_and_fix_enum_schemas

Revision ID: convert_strenum_to_enum_fix_schemas
Revises: ffdf13638949
Create Date: 2026-06-18 11:08:53.709308

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a8f3c2e91b47"
down_revision: str | Sequence[str] | None = "ffdf13638949"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "kcell_web"


def upgrade() -> None:
    # Move taskstatus, controlstatus, frequency from public schema to kcell_web
    op.execute("ALTER TYPE public.taskstatus SET SCHEMA kcell_web")
    op.execute("ALTER TYPE public.controlstatus SET SCHEMA kcell_web")
    op.execute("ALTER TYPE public.frequency SET SCHEMA kcell_web")

    # Rename frequency values from English to Russian
    op.execute("ALTER TYPE kcell_web.frequency RENAME VALUE 'DAILY' TO 'ежедневно'")
    op.execute("ALTER TYPE kcell_web.frequency RENAME VALUE 'WEEKLY' TO 'еженедельно'")
    op.execute("ALTER TYPE kcell_web.frequency RENAME VALUE 'MONTHLY' TO 'ежемесячно'")
    op.execute(
        "ALTER TYPE kcell_web.frequency RENAME VALUE 'QUARTERLY' TO 'ежеквартально'"
    )
    op.execute(
        "ALTER TYPE kcell_web.frequency RENAME VALUE 'AS_REQUIRED' TO 'по запросу'"
    )


def downgrade() -> None:
    # Rename frequency values back to English
    op.execute("ALTER TYPE kcell_web.frequency RENAME VALUE 'ежедневно' TO 'DAILY'")
    op.execute("ALTER TYPE kcell_web.frequency RENAME VALUE 'еженедельно' TO 'WEEKLY'")
    op.execute("ALTER TYPE kcell_web.frequency RENAME VALUE 'ежемесячно' TO 'MONTHLY'")
    op.execute(
        "ALTER TYPE kcell_web.frequency RENAME VALUE 'ежеквартально' TO 'QUARTERLY'"
    )
    op.execute(
        "ALTER TYPE kcell_web.frequency RENAME VALUE 'по запросу' TO 'AS_REQUIRED'"
    )

    # Move types back to public schema
    op.execute("ALTER TYPE kcell_web.taskstatus SET SCHEMA public")
    op.execute("ALTER TYPE kcell_web.controlstatus SET SCHEMA public")
    op.execute("ALTER TYPE kcell_web.frequency SET SCHEMA public")
