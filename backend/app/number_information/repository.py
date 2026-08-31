from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.number_information.LogService import LogService

ORACLE_IN_CHUNK_SIZE = 1000


QUOTED_DDL_COLUMNS = {
    ("CLIENT_HISTORIES", "NAME"),
    ("DEALERS", "INN"),
    ("JUR_ADDRESSES", "INN"),
    ("BALANCES", "BALANCE_$"),
    ("BALANCES", "DEBIT_$"),
    ("PAYMENTS", "AMOUNT_$"),
    ("PAYMENTS", "VAT_$"),
}


def _column_ref(table_name: str, column: str) -> str:
    return f'"{column}"' if (table_name, column) in QUOTED_DDL_COLUMNS else column


class NumberInformationRepository:
    def __init__(self, session: AsyncSession, log_service: LogService) -> None:
        self._session = session
        self._log_service = log_service

    async def fetch_one(
            self,
            table_name: str,
            where_column: str,
            where_value: int | str,
            select_columns: list[str],
            extra_filter: str | None = None,
            historized: bool = False,
            log_sink: list[str] | None = None,
    ) -> dict | None:
        columns_sql = ", ".join(f'{_column_ref(table_name, c)} AS "{c}"' for c in select_columns)
        conditions = [f"{_column_ref(table_name, where_column)} = :value"]
        if historized:
            conditions.append("NOW() BETWEEN START_DATE AND END_DATE")
        if extra_filter:
            conditions.append(extra_filter)

        query = text(
            f"SELECT {columns_sql} FROM {table_name} "
            f"WHERE {' AND '.join(conditions)}"
        )

        rendered_sql = self._render_for_log(query, {"value": where_value})
        if log_sink is None:
            await self._log_service.create_log(sql_request=rendered_sql)
        else:
            log_sink.append(rendered_sql)

        result = await self._session.execute(query, {"value": where_value})
        row = result.mappings().first()
        return dict(row) if row else None

    async def fetch_many(
            self,
            table_name: str,
            where_column: str,
            where_values: list[int | str],
            select_columns: list[str],
            extra_filter: str | None = None,
            historized: bool = False,
            log_sink: list[str] | None = None,
            log_sample_value: int | str | None = None,
    ) -> list[dict]:
        if not where_values:
            return []

        columns_sql = ", ".join(f'{_column_ref(table_name, c)} AS "{c}"' for c in select_columns)
        conditions = [f"{_column_ref(table_name, where_column)} IN :values"]
        if historized:
            conditions.append("NOW() BETWEEN START_DATE AND END_DATE")
        if extra_filter:
            conditions.append(extra_filter)

        query = text(
            f"SELECT {columns_sql} FROM {table_name} "
            f"WHERE {' AND '.join(conditions)}"
        ).bindparams(bindparam("values", expanding=True))

        rows: list[dict] = []
        unique_values = list(dict.fromkeys(where_values))
        for i in range(0, len(unique_values), ORACLE_IN_CHUNK_SIZE):
            chunk = unique_values[i:i + ORACLE_IN_CHUNK_SIZE]
            result = await self._session.execute(query, {"values": chunk})
            rows.extend(dict(row) for row in result.mappings().all())

        if log_sink is not None:
            if log_sample_value is not None:
                sample_query = text(
                    f"SELECT {columns_sql} FROM {table_name} "
                    f"WHERE {_column_ref(table_name, where_column)} = :value"
                    + "".join(f" AND {c}" for c in conditions[1:])
                )
                log_sink.append(self._render_for_log(sample_query, {"value": log_sample_value}))
        else:
            await self._log_service.create_log(
                sql_request=(
                    f"BULK SELECT {columns_sql} FROM {table_name} "
                    f"WHERE {where_column} IN (...{len(unique_values)} values...)"
                )
            )

        return rows

    @staticmethod
    def _render_for_log(query, params: dict) -> str:
        compiled = query.bindparams(**params).compile(
            compile_kwargs={"literal_binds": True}
        )
        return str(compiled)