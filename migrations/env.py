import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import async_engine_from_config

import app.control.model  # noqa: F401
import app.incident.model  # noqa: F401
import app.task.model  # noqa: F401
import app.task.non_working_day  # noqa: F401
import app.user.model  # noqa: F401
import app.vacation_schedule.model  # noqa: F401
from app.core.config import settings
from app.db.database import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=settings.POSTGRES_SCHEMA,
        include_schemas=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        # Создаём схему если не существует — до всего остального
        await connection.execute(
            text(f'CREATE SCHEMA IF NOT EXISTS "{settings.POSTGRES_SCHEMA}"')
        )
        await connection.commit()

        await connection.run_sync(
            lambda conn: context.configure(
                connection=conn,
                target_metadata=target_metadata,
                version_table_schema=settings.POSTGRES_SCHEMA,
                include_schemas=True,
            )
        )
        async with connection.begin():
            await connection.run_sync(lambda conn: context.run_migrations())

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
