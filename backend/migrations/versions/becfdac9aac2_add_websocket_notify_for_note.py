"""add websocket notify for note

Revision ID: becfdac9aac2
Revises: 599f63e2c34e
Create Date: 2026-07-08 11:03:00.668981

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "becfdac9aac2"
down_revision: str | Sequence[str] | None = "599f63e2c34e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.notify_me_note_changed()
        RETURNS trigger AS $$
               BEGIN
            PERFORM pg_notify(
                'me_note_changed',
                json_build_object(
                    'note_id', COALESCE(NEW.id, OLD.id),
                    'action', TG_OP
                )::text
            );
               RETURN COALESCE(NEW, OLD);
               END;
        $$ LANGUAGE plpgsql;
               """)
    op.execute("""
               CREATE TRIGGER on_me_note_changed
                   AFTER INSERT OR UPDATE OR DELETE ON kcell_web.me_note
                   FOR EACH ROW EXECUTE FUNCTION kcell_web.notify_me_note_changed();
               """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS on_me_note_changed ON kcell_web.me_note;")
    op.execute("DROP FUNCTION IF EXISTS kcell_web.notify_me_note_changed();")
