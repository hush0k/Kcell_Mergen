
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.number_information.LogService import LogService
from app.number_information.repository import NumberInformationRepository
from app.number_information.resolver import GraphResolver
from app.number_information.schemas import (
    NumberInformationBulkRequest,
    NumberInformationRequest,
)
from app.number_information.service import OracleClientLookupService

PHONES_FILE = Path(__file__).parent / "data" / "stub_phones.txt"

ALL_FIELDS = [
    "full_name", "iin", "account_number", "client_type", "client_category",
    "payment_type", "client_status", "comment_about_client", "privilege_sign",
    "activation_date", "subscriber_activation_date", "imsi", "imsi_2",
    "number_status", "sim_card_type", "icc", "sim_card_status_now",
    "sim_card_status_historical", "sim_card_expiration_date", "diller",
    "registration_chanel", "subscriber_status", "lock_calls",
    "subscriber_close_date", "network_type", "subscriber_lc_status",
    "lc_status_change_date", "balance_end_date", "roaming_type",
    "tariff_plan_id", "name_of_tariff_plan", "balance",
    "accounts_receivable_amount", "date_of_last_balance_change",
    "payment_date", "payment_amount", "vat", "dealer_name",
    "contract_sign_date", "dealer_iin", "dealer_phone_number",
]


def load_phones(count: int | None = None) -> list[str]:
    phones = [line.strip() for line in PHONES_FILE.read_text().splitlines() if line.strip()]
    return phones[:count] if count else phones


@pytest_asyncio.fixture
async def stub_service(db):
    """OracleClientLookupService, читающий из kcell_stub_oracle."""
    await db.execute(text("SET search_path TO kcell_stub_oracle, public"))
    log_service = LogService(db)
    repository = NumberInformationRepository(db, log_service)
    resolver = GraphResolver(repository, log_service)
    yield OracleClientLookupService(resolver)
    await db.execute(text("SET search_path TO public"))


@pytest.mark.asyncio
async def test_get_info_single_performance(stub_service):
    """
    /get-info: одиночный запрос по одному MSISDN со всеми полями
    должен укладываться в разумный порог по времени.
    """
    phone = load_phones(1)[0]
    request = NumberInformationRequest(phone_number=phone, fields=ALL_FIELDS)

    import time
    start = time.perf_counter()
    response = await stub_service.get_client_data(request)
    elapsed = time.perf_counter() - start

    assert response.phone_number == phone or response.id is not None
    print(f"\n[get-info] phone={phone} fields={len(ALL_FIELDS)} elapsed={elapsed:.4f}s")

    assert elapsed < 2.0, f"Одиночный запрос слишком медленный: {elapsed:.4f}s"


@pytest.mark.asyncio
@pytest.mark.parametrize("bulk_size", [100, 1000, 9000])
async def test_get_info_bulk_performance(stub_service, bulk_size):
    """
    /get-info-bulk: массовый запрос растущего размера (100 / 1000 / 9000 MSISDN)
    со всеми полями - измеряем общее время и throughput (номеров/сек).
    """
    phones = load_phones(bulk_size)
    request = NumberInformationBulkRequest(phone_numbers=phones, fields=ALL_FIELDS)

    import time
    start = time.perf_counter()
    response = await stub_service.get_clients_data(request)
    elapsed = time.perf_counter() - start

    throughput = bulk_size / elapsed if elapsed > 0 else float("inf")
    print(
        f"\n[get-info-bulk] size={bulk_size} elapsed={elapsed:.4f}s "
        f"throughput={throughput:.1f} номеров/сек"
    )

    assert len(response.results) == bulk_size

    max_allowed = 1.0 + bulk_size * 0.01
    assert elapsed < max_allowed, (
        f"Bulk-запрос на {bulk_size} номеров слишком медленный: "
        f"{elapsed:.4f}s (порог {max_allowed:.2f}s)"
    )