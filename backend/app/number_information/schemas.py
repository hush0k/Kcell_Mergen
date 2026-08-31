from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class NumberInformationLoginResponse(BaseModel):
    id: int
    sql_request: str | None

    model_config = {"from_attributes": True}

class NumberInformationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: str | None = None
    full_name: str | None = None
    iin: str | None = None
    account_number: str | None = None
    client_type: str | None = None
    client_category: str | None = None
    payment_type: str | None = None
    client_status: str | None = None
    comment_about_client: str | None = None
    privilege_sign: bool | None = None
    activation_date: date | None = None
    subscriber_activation_date: date | None = None
    imsi: str | None = None
    imsi_2: str | None = None
    number_status: str | None = None
    sim_card_type: str | None = None
    icc: str | None = None
    sim_card_status_now: str | None = None
    sim_card_status_historical: str | None = None
    sim_card_expiration_date: date | None = None
    diller: str | None = None
    diller_number: str | None = None
    registration_chanel: str | None = None
    subscriber_status: str | None = None
    lock_calls: bool | None = None
    subscriber_close_date: date | None = None
    network_type: str | None = None
    subscriber_lc_status: str | None = None
    lc_status_change_date: date | None = None
    balance_end_date: date | None = None
    roaming_type: str | None = None
    tariff_plan_id: int | None = None
    name_of_tariff_plan: str | None = None
    balance: Decimal | None = None
    accounts_receivable_amount: Decimal | None = None
    date_of_last_balance_change: date | None = None
    payment_date: date | None = None
    payment_amount: Decimal | None = None
    vat: Decimal | None = None
    dealer_name: str | None = None
    contract_sign_date: date | None = None
    dealer_iin: str | None = None
    dealer_phone_number: str | None = None

class NumberInformationRequest(BaseModel):
    phone_number: str
    fields: list[str]

MAX_BULK_PHONE_NUMBERS = 20_000

class NumberInformationBulkRequest(BaseModel):
    phone_numbers: list[str] = Field(min_length=1, max_length=MAX_BULK_PHONE_NUMBERS)
    fields: list[str]

class NumberInformationBulkResponse(BaseModel):
    results: list[NumberInformationResponse]