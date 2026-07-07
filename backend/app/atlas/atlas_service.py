"""Комментарии в Atlas (CODA) — сторонний сервис, вызывается через HTTP API.

Портировано из легаси atlas_service.py: поиск клиента по MSISDN через функцию
в основной БД, затем POST заметки во внешний Atlas API.
"""

import asyncio
import re
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.mfs.blacklist_service import parse_msisdn_list
from app.mfs.enums import Action

_SCHEMA_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")

ATLAS_DELETE_NOTE_TEXT = "."

NOTE_TEMPLATES: dict[str, str] = {
    "restriction_full": (
        "ПО НОМЕРУ БЫЛО УСТАНОВЛЕНО ОГРАНИЧЕНИЕ ПО ОКАЗАНИЮ МОБИЛЬНЫХ ФИНАНСОВЫХ "
        "УСЛУГ, В СВЯЗИ С НЕСАНКЦИОНИРОВАННЫМИ ДЕЙСТВИЯМИ И НАРУШЕНИЕМ УСЛОВИЙ "
        "ПОЛЬЗОВАТЕЛЬСКОГО СОГЛАШЕНИЯ."
    ),
    "restriction_short": (
        "На абонентском номере ограничен доступ к сервису МФС - проведение "
        "финансовых операций с баланса."
    ),
}

NOTE_TEMPLATE_LABELS: dict[str, str] = {
    "restriction_full": "Полное (п. 4.2.3, несанкционированные действия)",
    "restriction_short": "Краткое (ограничение доступа к МФС)",
}

_AUDIT_ACTION_FOR_MODE: dict[str, dict[str, Action]] = {
    "add": {
        "restriction_full": Action.NOTE_ADD_FULL,
        "restriction_short": Action.NOTE_ADD_SHORT,
    },
    "delete": {
        "restriction_full": Action.NOTE_DELETE,
        "restriction_short": Action.NOTE_DELETE,
    },
}


def atlas_configured() -> tuple[bool, str | None]:
    if not settings.ATLAS_USER or not settings.ATLAS_PASSWORD:
        return False, "Не заданы ATLAS_USER / ATLAS_PASSWORD"
    return True, None


def note_templates_for_api() -> list[dict[str, str]]:
    return [
        {"id": key, "label": NOTE_TEMPLATE_LABELS.get(key, key), "text": text_}
        for key, text_ in NOTE_TEMPLATES.items()
    ]


def _clnt_lookup_sql_parts() -> tuple[str, str]:
    schema = settings.ATLAS_GET_CLNT_SCHEMA
    fn = settings.ATLAS_GET_CLNT_FN
    if not _SCHEMA_RE.match(schema) or not _SCHEMA_RE.match(fn):
        raise ValueError(
            f"Некорректное имя схемы/функции для поиска клиента: {schema}.{fn}"
        )
    return schema, fn


def clnt_lookup_sql_example() -> str:
    schema, fn = _clnt_lookup_sql_parts()
    return f"SELECT {schema}.{fn}(:msisdn)"


def _msisdn_for_clnt_lookup(msisdn: str) -> str:
    return msisdn


async def get_clnt_by_msisdn(db: AsyncSession, msisdn: str) -> str | None:
    schema, fn = _clnt_lookup_sql_parts()
    result = await db.execute(
        text(f"SELECT {schema}.{fn}(:msisdn)"),
        {"msisdn": _msisdn_for_clnt_lookup(msisdn)},
    )
    clnt_id = result.scalar_one_or_none()
    return str(clnt_id) if clnt_id is not None else None


def _atlas_base_url() -> str:
    return settings.ATLAS_API_BASE_URL.rstrip("/")


async def _post_customer_note(clnt_id: str, note_text: str) -> dict[str, Any]:
    url = f"{_atlas_base_url()}/customers/{clnt_id}/notes"
    async with httpx.AsyncClient(
        auth=(settings.ATLAS_USER, settings.ATLAS_PASSWORD),
        verify=settings.ATLAS_VERIFY_SSL,
        timeout=settings.ATLAS_REQUEST_TIMEOUT,
    ) as client:
        response = await client.post(
            url,
            params={"getObject": "false", "fields": "id"},
            json={"text": note_text},
        )
        response.raise_for_status()
        return response.json() if response.content else {}


async def run_atlas_notes(
    db: AsyncSession, mode: str, raw_text: str, template_id: str
) -> tuple[list[str], list[dict[str, Any]], dict[str, int], Action]:
    configured, hint = atlas_configured()
    if not configured:
        raise RuntimeError(hint)

    if mode == "add" and template_id not in NOTE_TEMPLATES:
        raise ValueError(f"Неизвестный шаблон: {template_id}")

    note_text = ATLAS_DELETE_NOTE_TEXT if mode == "delete" else NOTE_TEMPLATES[template_id]
    audit_action = _AUDIT_ACTION_FOR_MODE[mode].get(template_id, Action.NOTE_DELETE)

    msisdns = parse_msisdn_list(raw_text)
    if not msisdns:
        return [], [], {"total": 0, "ok": 0, "skipped": 0, "error": 0}, audit_action

    results: list[dict[str, Any]] = []
    for i, msisdn in enumerate(msisdns):
        try:
            clnt_id = await get_clnt_by_msisdn(db, msisdn)
            if not clnt_id:
                results.append(
                    {
                        "msisdn": msisdn,
                        "status": "not_found",
                        "message": "Клиент не найден в Atlas",
                    }
                )
                continue

            await _post_customer_note(clnt_id, note_text)
            results.append(
                {
                    "msisdn": msisdn,
                    "status": "ok",
                    "message": "Комментарий добавлен" if mode == "add" else "Комментарий удалён",
                }
            )
        except Exception as e:
            results.append({"msisdn": msisdn, "status": "error", "message": str(e)})

        if i < len(msisdns) - 1 and settings.ATLAS_NOTE_DELAY_SEC:
            await asyncio.sleep(settings.ATLAS_NOTE_DELAY_SEC)

    err = sum(1 for r in results if r["status"] == "error")
    skipped = sum(1 for r in results if r["status"] == "not_found")
    ok = len(results) - err - skipped
    summary = {"total": len(results), "ok": ok, "skipped": skipped, "error": err}

    return msisdns, results, summary, audit_action
