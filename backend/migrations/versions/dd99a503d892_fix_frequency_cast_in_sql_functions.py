"""fix_frequency_cast_in_sql_functions

Revision ID: dd99a503d892
Revises: a8f3c2e91b47
Create Date: 2026-06-18 11:25:07.083976

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "dd99a503d892"
down_revision: str | Sequence[str] | None = "a8f3c2e91b47"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.generate_daily_tasks()
        RETURNS INTEGER LANGUAGE plpgsql AS $$
        DECLARE
               today_date DATE := CURRENT_DATE;
            deadline_ts TIMESTAMP WITH TIME ZONE;
            new_tasks_count INTEGER := 0;
               BEGIN
            deadline_ts := (today_date || ' 23:59:59')::TIMESTAMP WITH TIME ZONE;
               INSERT INTO kcell_web.task (control_id, user_id, deadline_time, status)
               SELECT c.id, NULL, deadline_ts, 'not_started'
               FROM kcell_web.control c
               WHERE c.status::TEXT = 'active'
                AND LOWER(TRIM(c.frequency::TEXT)) IN ('ежедневно', 'daily')
                AND NOT EXISTS (
                    SELECT 1 FROM kcell_web.task t
                    WHERE t.control_id = c.id
                        AND t.deadline_time::DATE = today_date
                        AND t.status::TEXT IN ('not_started', 'in_progress')
                );
               GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
               RETURN new_tasks_count;
               END; $$;
               """)

    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.generate_weekly_tasks()
        RETURNS INTEGER LANGUAGE plpgsql AS $$
        DECLARE
               today_date DATE := CURRENT_DATE;
            week_start DATE;
            week_end DATE;
            deadline_ts TIMESTAMP WITH TIME ZONE;
            new_tasks_count INTEGER := 0;
               BEGIN
            IF EXTRACT(DOW FROM today_date) != 1 THEN RETURN 0; END IF;
            week_start := today_date;
            week_end := today_date + INTERVAL '6 days';
            deadline_ts := (week_end || ' 23:59:59')::TIMESTAMP WITH TIME ZONE;
               INSERT INTO kcell_web.task (control_id, user_id, deadline_time, status)
               SELECT c.id, NULL, deadline_ts, 'not_started'
               FROM kcell_web.control c
               WHERE c.status::TEXT = 'active'
                AND LOWER(TRIM(c.frequency::TEXT)) IN ('еженедельно', 'weekly')
                AND NOT EXISTS (
                    SELECT 1 FROM kcell_web.task t
                    WHERE t.control_id = c.id
                        AND t.deadline_time::DATE >= week_start
                        AND t.deadline_time::DATE <= week_end
                        AND t.status::TEXT IN ('not_started', 'in_progress')
                );
               GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
               RETURN new_tasks_count;
               END; $$;
               """)

    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.generate_monthly_tasks()
        RETURNS INTEGER LANGUAGE plpgsql AS $$
        DECLARE
               today_date DATE := CURRENT_DATE;
            month_start DATE;
            month_end DATE;
            deadline_ts TIMESTAMP WITH TIME ZONE;
            new_tasks_count INTEGER := 0;
               BEGIN
            IF EXTRACT(DAY FROM today_date) != 1 THEN RETURN 0; END IF;
            month_start := DATE_TRUNC('month', today_date)::DATE;
            month_end := (DATE_TRUNC('month', today_date) + INTERVAL '1 month - 1 day')::DATE;
            deadline_ts := (month_end || ' 23:59:59')::TIMESTAMP WITH TIME ZONE;
               INSERT INTO kcell_web.task (control_id, user_id, deadline_time, status)
               SELECT c.id, NULL, deadline_ts, 'not_started'
               FROM kcell_web.control c
               WHERE c.status::TEXT = 'active'
                AND LOWER(TRIM(c.frequency::TEXT)) IN ('ежемесячно', 'monthly')
                AND NOT EXISTS (
                    SELECT 1 FROM kcell_web.task t
                    WHERE t.control_id = c.id
                        AND t.deadline_time::DATE >= month_start
                        AND t.deadline_time::DATE <= month_end
                        AND t.status::TEXT IN ('not_started', 'in_progress')
                );
               GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
               RETURN new_tasks_count;
               END; $$;
               """)

    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.generate_quarterly_tasks()
        RETURNS INTEGER LANGUAGE plpgsql AS $$
        DECLARE
               today_date DATE := CURRENT_DATE;
            quarter_start DATE;
            quarter_end DATE;
            quarter_num INTEGER;
            deadline_ts TIMESTAMP WITH TIME ZONE;
            new_tasks_count INTEGER := 0;
               BEGIN
            IF EXTRACT(DAY FROM today_date) != 1 OR EXTRACT(MONTH FROM today_date) NOT IN (1, 4, 7, 10) THEN RETURN 0; END IF;
            quarter_num := (EXTRACT(MONTH FROM today_date)::INTEGER - 1) / 3;
            quarter_start := DATE_TRUNC('year', today_date)::DATE + (quarter_num * 3 || ' months')::INTERVAL;
            IF quarter_num = 3 THEN
                quarter_end := (DATE_TRUNC('year', today_date) + INTERVAL '1 year - 1 day')::DATE;
               ELSE
                quarter_end := (DATE_TRUNC('year', today_date) + ((quarter_num + 1) * 3 || ' months - 1 day')::INTERVAL)::DATE;
               END IF;
            deadline_ts := (quarter_end || ' 23:59:59')::TIMESTAMP WITH TIME ZONE;
               INSERT INTO kcell_web.task (control_id, user_id, deadline_time, status)
               SELECT c.id, NULL, deadline_ts, 'not_started'
               FROM kcell_web.control c
               WHERE c.status::TEXT = 'active'
                AND LOWER(TRIM(c.frequency::TEXT)) IN ('ежеквартально', 'quarterly')
                AND NOT EXISTS (
                    SELECT 1 FROM kcell_web.task t
                    WHERE t.control_id = c.id
                        AND t.deadline_time::DATE >= quarter_start
                        AND t.deadline_time::DATE <= quarter_end
                        AND t.status::TEXT IN ('not_started', 'in_progress')
                );
               GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
               RETURN new_tasks_count;
               END; $$;
               """)

    op.execute("""
               CREATE OR REPLACE FUNCTION kcell_web.update_overdue_task_dates()
        RETURNS INTEGER LANGUAGE plpgsql AS $$
        DECLARE
               today_date DATE := CURRENT_DATE;
            friday_date DATE;
            quarter_end DATE;
            quarter_num INTEGER;
            updated_count INTEGER := 0;
            deleted_count INTEGER := 0;
            dow_today INTEGER;
            days_to_friday INTEGER;
               BEGIN
            dow_today := EXTRACT(DOW FROM today_date)::INTEGER;
            IF dow_today = 0 THEN days_to_friday := 5;
            ELSIF dow_today <= 5 THEN
                days_to_friday := 5 - dow_today;
                IF days_to_friday = 0 THEN days_to_friday := 7; END IF;
               ELSE days_to_friday := 6;
               END IF;
            friday_date := today_date + (days_to_friday || ' days')::INTERVAL;

               UPDATE kcell_web.task t
               SET deadline_time = (friday_date || ' 23:59:59')::TIMESTAMP WITH TIME ZONE
               FROM kcell_web.control c
               WHERE t.control_id = c.id
                 AND t.status::TEXT IN ('not_started', 'in_progress')
                 AND t.deadline_time::DATE < today_date
                 AND c.status::TEXT = 'active'
                 AND LOWER(TRIM(c.frequency::TEXT)) IN ('еженедельно', 'weekly')
                 AND NOT EXISTS (
                   SELECT 1 FROM kcell_web.task t2
                   WHERE t2.control_id = t.control_id AND t2.deadline_time::DATE = friday_date
                   );
               GET DIAGNOSTICS updated_count = ROW_COUNT;

               DELETE FROM kcell_web.task t
                   USING kcell_web.control c
               WHERE t.control_id = c.id
                 AND t.status::TEXT IN ('not_started', 'in_progress')
                 AND t.deadline_time::DATE < today_date
                 AND c.status::TEXT = 'active'
                 AND LOWER(TRIM(c.frequency::TEXT)) IN ('еженедельно', 'weekly')
                 AND EXISTS (
                   SELECT 1 FROM kcell_web.task t2
                   WHERE t2.control_id = t.control_id
                 AND t2.deadline_time::DATE >= (friday_date - INTERVAL '6 days')::DATE
                 AND t2.deadline_time::DATE <= friday_date
                 AND t2.id != t.id
                 AND t2.status::TEXT IN ('not_started', 'in_progress')
                   );
               GET DIAGNOSTICS deleted_count = ROW_COUNT;

               UPDATE kcell_web.task t
               SET deadline_time = (
                   (DATE_TRUNC('month', today_date) + INTERVAL '1 month - 1 day')::DATE || ' 23:59:59'
            )::TIMESTAMP WITH TIME ZONE
               FROM kcell_web.control c
               WHERE t.control_id = c.id
                 AND t.status::TEXT IN ('not_started', 'in_progress')
                 AND t.deadline_time::DATE < today_date
                 AND EXTRACT(YEAR FROM t.deadline_time) = EXTRACT(YEAR FROM today_date)
                 AND EXTRACT(MONTH FROM t.deadline_time) = EXTRACT(MONTH FROM today_date)
                 AND c.status::TEXT = 'active'
                 AND LOWER(TRIM(c.frequency::TEXT)) IN ('ежемесячно', 'monthly');

               quarter_num := (EXTRACT(MONTH FROM today_date)::INTEGER - 1) / 3;
            IF quarter_num = 3 THEN
                quarter_end := (DATE_TRUNC('year', today_date) + INTERVAL '1 year - 1 day')::DATE;
               ELSE
                quarter_end := (DATE_TRUNC('year', today_date) + ((quarter_num + 1) * 3 || ' months - 1 day')::INTERVAL)::DATE;
               END IF;

               UPDATE kcell_web.task t
               SET deadline_time = (quarter_end || ' 23:59:59')::TIMESTAMP WITH TIME ZONE
               FROM kcell_web.control c
               WHERE t.control_id = c.id
                 AND t.status::TEXT IN ('not_started', 'in_progress')
                 AND t.deadline_time::DATE < today_date
                 AND c.status::TEXT = 'active'
                 AND LOWER(TRIM(c.frequency::TEXT)) IN ('ежеквартально', 'quarterly')
                 AND quarter_end >= today_date
                 AND NOT EXISTS (
                   SELECT 1 FROM kcell_web.task t2
                   WHERE t2.control_id = t.control_id AND t2.deadline_time::DATE = quarter_end
                   );

               RETURN updated_count + deleted_count;
               END; $$;
               """)


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###
