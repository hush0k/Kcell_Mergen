"""Операции с blacklist MSISDN — отдельная PostgreSQL (см. app/mfs/database.py)."""
import re
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.mfs.enums import Action

_MSISDN_RE = re.compile(r"\d+")


def parse_msisdn_list(text_: str) -> list[str]:
    """Нормализация номеров: последние 10 цифр + префикс 7, без дублей."""
    seen: set[str] = set()
    out: list[str] = []
    for line in (text_ or "").splitlines():
        line = line.strip()
        if not line:
            continue
        digits = "".join(_MSISDN_RE.findall(line))
        if len(digits) < 10:
            continue
        msisdn = "7" + digits[-10:]
        if msisdn not in seen:
            seen.add(msisdn)
            out.append(msisdn)
    return out


class MfsBlacklistService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check(self, msisdns: list[str]) -> list[dict[str, Any]]:
        results = []
        for msisdn in msisdns:
            count = await self._count_blocked(msisdn)
            blocked = count > 0
            results.append({
                "msisdn": msisdn,
                "status": "blocked" if blocked else "not_blocked",
                "message": "В чёрном списке" if blocked else "Не в чёрном списке",
            })
        return results

    async def block(self, msisdns: list[str], author: str) -> list[dict[str, Any]]:
        comment = f"Кейс антифрода от {datetime.now():%d.%m.%Y}"
        results = []
        for msisdn in msisdns:
            try:
                count = await self._count_blocked(msisdn)
                if count > 0:
                    results.append({
                        "msisdn": msisdn,
                        "status": "already_blocked",
                        "message": "Уже в чёрном списке",
                    })
                    continue

                await self.db.execute(
                    text(
                        """
                        INSERT INTO blacklist.msisdn_list(
                            msisdn, blocked_reason_id, blocked_from, blocked_till,
                            author, comment, sms_send, activity_dt, type
                        ) VALUES (
                                     :msisdn, 3, now(), '2099-01-01 00:00:00'::timestamp,
                                     :author, :comment, false, now(), 'msisdn'
                                 )
                        """
                    ),
                    {"msisdn": msisdn, "author": author, "comment": comment},
                )
                await self.db.commit()
                results.append({
                    "msisdn": msisdn,
                    "status": "blocked",
                    "message": "Заблокирован",
                })
            except Exception as e:
                await self.db.rollback()
                results.append({
                    "msisdn": msisdn,
                    "status": "error",
                    "message": str(e),
                })
        return results

    async def unblock(self, msisdns: list[str], author: str) -> list[dict[str, Any]]:
        results = []
        for msisdn in msisdns:
            try:
                count = await self._count_blocked(msisdn)
                if count == 0:
                    results.append({
                        "msisdn": msisdn,
                        "status": "not_found",
                        "message": "Нет в чёрном списке",
                    })
                    continue

                await self.db.execute(
                    text(
                        """
                        INSERT INTO blacklist_hist.msisdn_list(
                            msisdn, blocked_reason_id, blocked_from, blocked_till,
                            author, comment, sms_send, activity_dt, hist_dt, action, type
                        ) VALUES (
                                     :msisdn, 3, now(), '2099-01-01 00:00:00'::timestamp,
                                     :author, 'Кейс антифрода', false, now(), now(),
                                     'Record delete', 'msisdn'
                                 )
                        """
                    ),
                    {"msisdn": msisdn, "author": author},
                )
                await self.db.execute(
                    text("DELETE FROM blacklist.msisdn_list WHERE msisdn = :msisdn"),
                    {"msisdn": msisdn},
                )
                await self.db.commit()
                results.append({
                    "msisdn": msisdn,
                    "status": "unblocked",
                    "message": "Разблокирован",
                })
            except Exception as e:
                await self.db.rollback()
                results.append({
                    "msisdn": msisdn,
                    "status": "error",
                    "message": str(e),
                })
        return results

    async def run_action(
            self, action: Action, raw_text: str, author: str
    ) -> tuple[list[str], list[dict[str, Any]], dict[str, int]]:
        msisdns = parse_msisdn_list(raw_text)
        if not msisdns:
            return [], [], {"total": 0, "ok": 0, "skipped": 0, "error": 0}

        if action == Action.CHECK:
            rows = await self.check(msisdns)
        elif action == Action.BLOCK:
            rows = await self.block(msisdns, author)
        elif action == Action.UNBLOCK:
            rows = await self.unblock(msisdns, author)
        else:
            raise ValueError(f"Unsupported action: {action}")

        err = sum(1 for r in rows if r["status"] == "error")
        if action == Action.CHECK:
            ok, skipped = len(rows) - err, 0
        else:
            ok = sum(1 for r in rows if r["status"] in ("blocked", "unblocked"))
            skipped = sum(1 for r in rows if r["status"] in ("already_blocked", "not_found"))

        summary = {"total": len(rows), "ok": ok, "skipped": skipped, "error": err}
        return msisdns, rows, summary

    async def _count_blocked(self, msisdn: str) -> int:
        result = await self.db.execute(
            text("SELECT count(*) FROM blacklist.msisdn_list WHERE msisdn = :msisdn"),
            {"msisdn": msisdn},
        )
        return result.scalar_one()