"""add task generation functions

Revision ID: a1b2c3d4e5f6
Revises: 16ad534761ad,
Create Date: 2026-06-17
"""

from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "16ad534761ad"  # впиши id предыдущей миграции
branch_labels = None
depends_on = None

SCHEMA = "kcell_web"


def upgrade() -> None:
    op.execute(f"""
        CREATE OR REPLACE FUNCTION {SCHEMA}.generate_daily_tasks()
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
        DECLARE
            today_date DATE := CURRENT_DATE;
            new_tasks_count INTEGER := 0;
        BEGIN
            INSERT INTO {SCHEMA}.task (control_id, user_id, date, status)
            SELECT
                c.id,
                NULL,
                today_date,
                'not_started'
            FROM {SCHEMA}.control c
            WHERE c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('ежедневно', 'daily')
                AND NOT EXISTS (
                    SELECT 1
                    FROM {SCHEMA}.task t
                    WHERE t.control_id = c.id
                        AND t.date = today_date
                );

            GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
            RETURN new_tasks_count;
        END;
        $$;
    """)

    op.execute(f"""
        CREATE OR REPLACE FUNCTION {SCHEMA}.generate_weekly_tasks()
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
        DECLARE
            today_date DATE := CURRENT_DATE;
            week_start DATE;
            week_end DATE;
            new_tasks_count INTEGER := 0;
        BEGIN
            -- Генерируем только по понедельникам
            IF EXTRACT(DOW FROM today_date) != 1 THEN
                RETURN 0;
            END IF;

            week_start := today_date;
            week_end := today_date + INTERVAL '6 days';

            INSERT INTO {SCHEMA}.task (control_id, user_id, date, status)
            SELECT
                c.id,
                NULL,
                today_date,
                'not_started'
            FROM {SCHEMA}.control c
            WHERE c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('еженедельно', 'weekly')
                AND NOT EXISTS (
                    SELECT 1
                    FROM {SCHEMA}.task t
                    WHERE t.control_id = c.id
                        AND t.date >= week_start
                        AND t.date <= week_end
                        AND t.status IN ('not_started', 'in_progress')
                );

            GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
            RETURN new_tasks_count;
        END;
        $$;
    """)

    op.execute(f"""
        CREATE OR REPLACE FUNCTION {SCHEMA}.generate_monthly_tasks()
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
        DECLARE
            today_date DATE := CURRENT_DATE;
            month_start DATE;
            month_end DATE;
            new_tasks_count INTEGER := 0;
        BEGIN
            -- Генерируем только 1-го числа
            IF EXTRACT(DAY FROM today_date) != 1 THEN
                RETURN 0;
            END IF;

            month_start := DATE_TRUNC('month', today_date)::DATE;
            month_end := (DATE_TRUNC('month', today_date) + INTERVAL '1 month - 1 day')::DATE;

            INSERT INTO {SCHEMA}.task (control_id, user_id, date, status)
            SELECT
                c.id,
                NULL,
                today_date,
                'not_started'
            FROM {SCHEMA}.control c
            WHERE c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('ежемесячно', 'monthly')
                AND NOT EXISTS (
                    SELECT 1
                    FROM {SCHEMA}.task t
                    WHERE t.control_id = c.id
                        AND t.date >= month_start
                        AND t.date <= month_end
                        AND t.status IN ('not_started', 'in_progress')
                );

            GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
            RETURN new_tasks_count;
        END;
        $$;
    """)

    op.execute(f"""
        CREATE OR REPLACE FUNCTION {SCHEMA}.generate_quarterly_tasks()
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
        DECLARE
            today_date DATE := CURRENT_DATE;
            quarter_start DATE;
            quarter_end DATE;
            quarter_num INTEGER;
            new_tasks_count INTEGER := 0;
        BEGIN
            -- Генерируем только 1-го числа квартала (1, 4, 7, 10 месяц)
            IF EXTRACT(DAY FROM today_date) != 1 OR EXTRACT(MONTH FROM today_date) NOT IN (1, 4, 7, 10) THEN
                RETURN 0;
            END IF;

            quarter_num := (EXTRACT(MONTH FROM today_date)::INTEGER - 1) / 3;
            quarter_start := DATE_TRUNC('year', today_date)::DATE + (quarter_num * 3 || ' months')::INTERVAL;

            IF quarter_num = 3 THEN
                quarter_end := (DATE_TRUNC('year', today_date) + INTERVAL '1 year - 1 day')::DATE;
            ELSE
                quarter_end := (DATE_TRUNC('year', today_date) + ((quarter_num + 1) * 3 || ' months - 1 day')::INTERVAL)::DATE;
            END IF;

            INSERT INTO {SCHEMA}.task (control_id, user_id, date, status)
            SELECT
                c.id,
                NULL,
                quarter_end,
                'not_started'
            FROM {SCHEMA}.control c
            WHERE c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('ежеквартально', 'quarterly')
                AND NOT EXISTS (
                    SELECT 1
                    FROM {SCHEMA}.task t
                    WHERE t.control_id = c.id
                        AND t.date >= quarter_start
                        AND t.date <= quarter_end
                        AND t.status IN ('not_started', 'in_progress')
                );

            GET DIAGNOSTICS new_tasks_count = ROW_COUNT;
            RETURN new_tasks_count;
        END;
        $$;
    """)

    op.execute(f"""
        CREATE OR REPLACE FUNCTION {SCHEMA}.update_overdue_task_dates()
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
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

            IF dow_today = 0 THEN
                days_to_friday := 5;
            ELSIF dow_today <= 5 THEN
                days_to_friday := 5 - dow_today;
                IF days_to_friday = 0 THEN
                    days_to_friday := 7;
                END IF;
            ELSE
                days_to_friday := 6;
            END IF;
            friday_date := today_date + (days_to_friday || ' days')::INTERVAL;

            -- Обновляем еженедельные
            UPDATE {SCHEMA}.task t
            SET date = friday_date
            FROM {SCHEMA}.control c
            WHERE t.control_id = c.id
                AND t.status IN ('not_started', 'in_progress')
                AND t.date < today_date
                AND c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('еженедельно', 'weekly')
                AND NOT EXISTS (
                    SELECT 1 FROM {SCHEMA}.task t2
                    WHERE t2.control_id = t.control_id AND t2.date = friday_date
                );

            GET DIAGNOSTICS updated_count = ROW_COUNT;

            -- Удаляем дубликаты еженедельных
            DELETE FROM {SCHEMA}.task t
            USING {SCHEMA}.control c
            WHERE t.control_id = c.id
                AND t.status IN ('not_started', 'in_progress')
                AND t.date < today_date
                AND c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('еженедельно', 'weekly')
                AND EXISTS (
                    SELECT 1 FROM {SCHEMA}.task t2
                    WHERE t2.control_id = t.control_id
                        AND t2.date >= (friday_date - INTERVAL '6 days')::DATE
                        AND t2.date <= friday_date
                        AND t2.id != t.id
                        AND t2.status IN ('not_started', 'in_progress')
                );

            GET DIAGNOSTICS deleted_count = ROW_COUNT;

            -- Обновляем ежемесячные
            UPDATE {SCHEMA}.task t
            SET date = today_date
            FROM {SCHEMA}.control c
            WHERE t.control_id = c.id
                AND t.status IN ('not_started', 'in_progress')
                AND t.date < today_date
                AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM today_date)
                AND EXTRACT(MONTH FROM t.date) = EXTRACT(MONTH FROM today_date)
                AND c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('ежемесячно', 'monthly')
                AND NOT EXISTS (
                    SELECT 1 FROM {SCHEMA}.task t2
                    WHERE t2.control_id = t.control_id AND t2.date = today_date
                );

            -- Обновляем ежеквартальные
            quarter_num := (EXTRACT(MONTH FROM today_date)::INTEGER - 1) / 3;
            IF quarter_num = 3 THEN
                quarter_end := (DATE_TRUNC('year', today_date) + INTERVAL '1 year - 1 day')::DATE;
            ELSE
                quarter_end := (DATE_TRUNC('year', today_date) + ((quarter_num + 1) * 3 || ' months - 1 day')::INTERVAL)::DATE;
            END IF;

            UPDATE {SCHEMA}.task t
            SET date = quarter_end
            FROM {SCHEMA}.control c
            WHERE t.control_id = c.id
                AND t.status IN ('not_started', 'in_progress')
                AND t.date < today_date
                AND c.status = 'active'
                AND LOWER(TRIM(c.frequency)) IN ('ежеквартально', 'quarterly')
                AND quarter_end >= today_date
                AND NOT EXISTS (
                    SELECT 1 FROM {SCHEMA}.task t2
                    WHERE t2.control_id = t.control_id AND t2.date = quarter_end
                );

            RETURN updated_count + deleted_count;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute(f"DROP FUNCTION IF EXISTS {SCHEMA}.generate_daily_tasks();")
    op.execute(f"DROP FUNCTION IF EXISTS {SCHEMA}.generate_weekly_tasks();")
    op.execute(f"DROP FUNCTION IF EXISTS {SCHEMA}.generate_monthly_tasks();")
    op.execute(f"DROP FUNCTION IF EXISTS {SCHEMA}.generate_quarterly_tasks();")
    op.execute(f"DROP FUNCTION IF EXISTS {SCHEMA}.update_overdue_task_dates();")
