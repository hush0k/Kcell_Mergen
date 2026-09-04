from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ReportRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_list_1391(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT *
            FROM app_fraud.hf_numbers_lists_items
            WHERE numbers_list_id = '1391'
              AND valid_from >= :start_time
              AND valid_from < :end_time
            """
        )
        result = await self.db.execute(
            query, {"start_time": start_time, "end_time": end_time}
        )
        return [dict(row) for row in result.mappings().all()]

    async def get_mfs_blacklist(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT
                t.msisdn,
                t.blocked_from,
                t.comment,
                t.author
            FROM app_fraud.msisdn_list_blacklist t
            WHERE t.blocked_from::timestamp BETWEEN :start_time AND :end_time
              AND t.author = 'app_fraud'
            ORDER BY t.blocked_from
            """
        )
        result = await self.db.execute(
            query, {"start_time": start_time, "end_time": end_time}
        )
        return [dict(row) for row in result.mappings().all()]

    async def get_nt_blocked(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT
                i.msisdn,
                i.account,
                i.name,
                b.subs_subs_id,
                rtst.rtlcst_id,
                rtst.def,
                b.navi_date,
                b.navi_user,
                b.note
            FROM rt_subs_states_history b
            JOIN rt_lc_states rtst
                ON rtst.rtlcst_id = b.rtlcst_rtlcst_id
            LEFT JOIN LATERAL app_fraud.get_info_by_subs(b.subs_subs_id) i
                ON TRUE
            WHERE b.navi_date BETWEEN :start_time AND :end_time
              AND now() BETWEEN b.start_date AND b.end_date
              AND rtst.rtlcst_id IN ('40', '48')
            ORDER BY b.navi_date DESC
            """
        )
        result = await self.db.execute(
            query, {"start_time": start_time, "end_time": end_time}
        )
        return [dict(row) for row in result.mappings().all()]

    async def get_top10_countries(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]:
        query = text(
            """
            WITH base AS (
                SELECT
                    CASE
                        WHEN a_country LIKE 'KZ_%' THEN 'KZ'
                        WHEN a_country LIKE 'Russia%' THEN 'Russia'
                        WHEN a_country LIKE 'US %' OR a_country LIKE 'USA%' THEN 'USA'
                        ELSE trim(
                            regexp_replace(a_country, '\\s*(\\(|,).*$', '')
                        )
                    END AS country,
                    SUM(p_count) AS sum_p_count
                FROM app_fraud.x_agr_cdrs_fraud2019
                WHERE callstarttime >= :start_time
                  AND callstarttime < :end_time
                  AND rule_id IN (
                      17, 62, 54, 50, 20, 69, 67, 11, 51,
                      8, 66, 65, 14, 22, 7, 15, 32, 2, 79, 9
                  )
                GROUP BY 1
            )
            SELECT country, sum_p_count
            FROM base
            ORDER BY sum_p_count DESC
            LIMIT 10
            """
        )
        result = await self.db.execute(
            query, {"start_time": start_time, "end_time": end_time}
        )
        return [dict(row) for row in result.mappings().all()]
