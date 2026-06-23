"""add pg_notify trigger

Revision ID: 1cfe310c633e
Revises: 1015870c9630
Create Date: 2026-06-23 09:49:13.064705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1cfe310c633e'
down_revision: Union[str, Sequence[str], None] = '1015870c9630'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.notify_new_notification()
        RETURNS trigger AS $$
               BEGIN
            PERFORM pg_notify(
                'new_notification',
                json_build_object('notification_id', NEW.id)::text
            );
               RETURN NEW;
               END;
        $$ LANGUAGE plpgsql;
               """)

    op.execute("""
               CREATE TRIGGER on_new_notification
                   AFTER INSERT ON kcell_web.notification
                   FOR EACH ROW EXECUTE FUNCTION kcell_web.notify_new_notification();
               """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS on_new_notification ON kcell_web.notification;")
    op.execute("DROP FUNCTION IF EXISTS kcell_web.notify_new_notification();")