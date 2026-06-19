"""add reassign vacation function

Revision ID: b96d1913e935
Revises: 0b1d75388d62
Create Date: 2026-06-18 17:43:12.119655

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b96d1913e935'
down_revision: Union[str, Sequence[str], None] = '0b1d75388d62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.reassign_tasks_for_vacation()
        RETURNS void AS $$
               BEGIN
               UPDATE kcell_web.control
               SET responsible_id = CASE
                                        WHEN EXISTS (
                                            SELECT 1 FROM kcell_web.vacation_schedule v
                                            WHERE v.user_id = original_user_id
                                              AND v.status = 'ACTIVE'
                                              AND v.start_date <= CURRENT_DATE
                                              AND v.end_date >= CURRENT_DATE
                                        ) THEN backup_id
                                        ELSE original_user_id
                   END
               WHERE backup_id IS NOT NULL;
               END;
        $$ LANGUAGE plpgsql;
               """)

def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS kcell_web.reassign_tasks_for_vacation();")
