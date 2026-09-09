import asyncio
from collections import deque
from datetime import date, timedelta

from app.number_information.LogService import LogService
from app.number_information.field_graph import FIELD_TO_TABLE, TABLE_GRAPH
from app.number_information.repository import NumberInformationRepository
from app.number_information.schemas import NumberInformationBulkResponse, NumberInformationResponse

ROOT = "NUMBER_SETS"
PAYMENTS_TABLE = "PAYMENTS"
PAYMENTS_DATE_COLUMN = "PAY_DATE"
PAYMENTS_SUM_COLUMN = "AMOUNT_$"


def default_payment_period() -> tuple[date, date]:
    """Default period for the payment sum: the last 12 months."""
    today = date.today()
    return today - timedelta(days=365), today

def resolve_target_tables(requested_fields: list[str]) -> set[str]:
    tables: set[str] = set()
    for alias in requested_fields:
        table = FIELD_TO_TABLE.get(alias)
        if table is None:
            raise ValueError(f"Unknown table: {alias}")
        tables.add(table)
    return tables

def find_paths(target_tables: set[str]) -> dict[str, list[str]]:
    paths: dict[str, list[str]] = {}
    queue = deque([(ROOT, [ROOT])])
    visited = {ROOT}

    while queue:
        current, path = queue.popleft()
        if current in target_tables:
            paths[current] = path
        for edge in TABLE_GRAPH[current]["fk"]:
            nxt = edge["table"]
            if nxt not in visited:
                visited.add(nxt)
                queue.append((nxt, path + [nxt]))
    return paths

def build_execution_plan(target_tables: set[str]) -> list[str]:
    paths = find_paths(target_tables)
    missing = target_tables - paths.keys()
    if missing:
        raise ValueError(f"No path found to tables: {missing}")

    ordered: list[str] = []
    for path in paths.values():
        for table in path:
            if table not in ordered:
                ordered.append(table)
    return ordered


def _parent_of(table_name: str) -> str | None:
    """The single graph table that owns the FK pointing at `table_name`."""
    for candidate, node in TABLE_GRAPH.items():
        for edge in node["fk"]:
            if edge["table"] == table_name:
                return candidate
    return None


def build_execution_levels(plan: list[str]) -> list[list[str]]:
    plan_set = set(plan)
    depth: dict[str, int] = {}
    for table_name in plan:
        parent = _parent_of(table_name)
        if parent is None or parent not in plan_set:
            depth[table_name] = 0
        else:
            depth[table_name] = depth[parent] + 1

    levels: list[list[str]] = []
    for table_name in plan:
        d = depth[table_name]
        while len(levels) <= d:
            levels.append([])
        levels[d].append(table_name)
    return levels


class GraphResolver:
    def __init__(
            self,
            repository: NumberInformationRepository,
            log_service: LogService,
    ) -> None:
        self._repo = repository
        self._log_service = log_service

    async def resolve_fields(
            self,
            phone_number: str,
            requested_fields: list[str],
            payment_date_from: date | None = None,
            payment_date_to: date | None = None,
    ) -> NumberInformationResponse:
        sum_payments = "payment_amount" in requested_fields
        target_tables = resolve_target_tables(requested_fields)
        plan = build_execution_plan(target_tables)

        fetched_ids: dict[str, int | str] = {}
        output: dict[str, str | int | None] = {alias: None for alias in requested_fields}
        executed_sql: list[str] = []

        if payment_date_from is None and payment_date_to is None:
            payment_date_from, payment_date_to = default_payment_period()

        for step_index, table_name in enumerate(plan):
            node = TABLE_GRAPH[table_name]
            real_table = node.get("table_name", table_name)

            if table_name == ROOT:
                where_column = node["key_column"]
                where_value = phone_number
            else:
                where_column = node["fk_in"]
                where_value = fetched_ids.get(table_name)
                if where_value is None:
                    continue

            if table_name == PAYMENTS_TABLE and sum_payments:
                row = await self._repo.fetch_one_sum(
                    table_name=real_table,
                    where_column=where_column,
                    where_value=where_value,
                    sum_column=PAYMENTS_SUM_COLUMN,
                    date_column=PAYMENTS_DATE_COLUMN,
                    date_from=payment_date_from,
                    date_to=payment_date_to,
                    log_sink=executed_sql,
                )
                if row is not None:
                    output["payment_amount"] = row.get(PAYMENTS_SUM_COLUMN)
                continue

            select_columns = list(node["fields"].values())
            for edge in node["fk"]:
                if edge["table"] in plan and edge["column"] not in select_columns:
                    select_columns.append(edge["column"])
            if node.get("pk") and node["pk"] not in select_columns:
                select_columns.append(node["pk"])

            row = await self._repo.fetch_one(
                table_name=real_table,
                where_column=where_column,
                where_value=where_value,
                select_columns=select_columns,
                extra_filter=node.get("extra_filter"),
                historized=node.get("historized", False),
                log_sink=executed_sql,
            )
            if row is None:
                continue

            for alias, column in node["fields"].items():
                if alias in requested_fields:
                    output[alias] = row.get(column)

            if node.get("pk"):
                fetched_ids[table_name] = row.get(node["pk"])
            for edge in node["fk"]:
                if edge["column"] in row:
                    fetched_ids[edge["table"]] = row[edge["column"]]

        log_id = await self._log_service.create_log(
            sql_request="; ".join(executed_sql) + ";" if executed_sql else "no queries executed"
        )
        output["id"] = log_id
        output["phone_number"] = phone_number

        return NumberInformationResponse(**output)

    async def resolve_fields_bulk(
            self,
            phone_numbers: list[str],
            requested_fields: list[str],
            payment_date_from: date | None = None,
            payment_date_to: date | None = None,
    ) -> NumberInformationBulkResponse:
        sum_payments = "payment_amount" in requested_fields
        if payment_date_from is None and payment_date_to is None:
            payment_date_from, payment_date_to = default_payment_period()
        target_tables = resolve_target_tables(requested_fields)
        plan = build_execution_plan(target_tables)
        levels = build_execution_levels(plan)

        fetched_ids: dict[str, dict[str, int | str]] = {phone: {} for phone in phone_numbers}
        outputs: dict[str, dict[str, str | int | None]] = {
            phone: {alias: None for alias in requested_fields} for phone in phone_numbers
        }
        alive = list(phone_numbers)
        sample_phone = phone_numbers[0]
        executed_sql: list[str] = []

        for level in levels:
            if not alive:
                break

            step_inputs: list[tuple[str, dict, str, dict[int | str, list[str]]]] = []
            for table_name in level:
                node = TABLE_GRAPH[table_name]

                if table_name == ROOT:
                    where_column = node["key_column"]
                    value_to_phones: dict[int | str, list[str]] = {}
                    for phone in alive:
                        value_to_phones.setdefault(phone, []).append(phone)
                else:
                    where_column = node["fk_in"]
                    value_to_phones = {}
                    for phone in alive:
                        value = fetched_ids[phone].get(table_name)
                        if value is None:
                            continue
                        value_to_phones.setdefault(value, []).append(phone)

                if value_to_phones:
                    step_inputs.append((table_name, node, where_column, value_to_phones))

            if not step_inputs:
                continue

            async def run_step(table_name: str, node: dict, where_column: str,
                                value_to_phones: dict[int | str, list[str]]):
                real_table = node.get("table_name", table_name)

                sample_value = None
                for value, phones in value_to_phones.items():
                    if sample_phone in phones:
                        sample_value = value
                        break

                sample_log: list[str] = []

                if table_name == PAYMENTS_TABLE and sum_payments:
                    rows = await self._repo.fetch_many_sum(
                        table_name=real_table,
                        where_column=where_column,
                        where_values=list(value_to_phones.keys()),
                        sum_column=PAYMENTS_SUM_COLUMN,
                        date_column=PAYMENTS_DATE_COLUMN,
                        date_from=payment_date_from,
                        date_to=payment_date_to,
                        log_sample_value=sample_value,
                        log_sink=sample_log,
                    )
                    return table_name, where_column, value_to_phones, rows, sample_log, True

                select_columns = list(node["fields"].values())
                for edge in node["fk"]:
                    if edge["table"] in plan and edge["column"] not in select_columns:
                        select_columns.append(edge["column"])
                if node.get("pk") and node["pk"] not in select_columns:
                    select_columns.append(node["pk"])
                if where_column not in select_columns:
                    select_columns.append(where_column)

                rows = await self._repo.fetch_many(
                    table_name=real_table,
                    where_column=where_column,
                    where_values=list(value_to_phones.keys()),
                    select_columns=select_columns,
                    extra_filter=node.get("extra_filter"),
                    historized=node.get("historized", False),
                    log_sample_value=sample_value,
                    log_sink=sample_log,
                )
                return table_name, where_column, value_to_phones, rows, sample_log, False


            step_results = [await run_step(*step) for step in step_inputs]

            matched_by_table: dict[str, set[str]] = {}
            for table_name, where_column, value_to_phones, rows, sample_log, is_sum in step_results:
                executed_sql.extend(sample_log)

                node = TABLE_GRAPH[table_name]
                matched_phones: set[str] = set()

                if is_sum:
                    for row in rows:
                        key_value = row.get(where_column)
                        phones_for_row = value_to_phones.get(key_value, [])
                        for phone in phones_for_row:
                            matched_phones.add(phone)
                            outputs[phone]["payment_amount"] = row.get(PAYMENTS_SUM_COLUMN)
                    matched_by_table[table_name] = matched_phones
                    continue

                for row in rows:
                    key_value = row.get(where_column)
                    phones_for_row = value_to_phones.get(key_value, [])
                    for phone in phones_for_row:
                        matched_phones.add(phone)
                        for alias, column in node["fields"].items():
                            if alias in requested_fields:
                                outputs[phone][alias] = row.get(column)
                        if node.get("pk"):
                            fetched_ids[phone][table_name] = row.get(node["pk"])
                        for edge in node["fk"]:
                            if edge["column"] in row:
                                fetched_ids[phone][edge["table"]] = row[edge["column"]]
                matched_by_table[table_name] = matched_phones

            still_alive = set()
            for matched in matched_by_table.values():
                still_alive.update(matched)
            alive = [phone for phone in alive if phone in still_alive]

        log_id = await self._log_service.create_log(
            sql_request="; ".join(executed_sql) + ";" if executed_sql else "no queries executed"
        )

        results = [
            NumberInformationResponse(id=log_id, phone_number=phone, **outputs[phone])
            for phone in phone_numbers
        ]
        return NumberInformationBulkResponse(results=results)
