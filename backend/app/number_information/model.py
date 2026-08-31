from datetime import date
from decimal import Decimal

from sqlalchemy import Integer, String, Boolean, Date, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.core.mixins import TimeStampMixin
from app.db.database import Base


class NumberInformation(Base, TimeStampMixin):
    __tablename__ = "number_information"
    __table_args__ = {"schema": f"{settings.POSTGRES_SCHEMA}"}


    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    iin: Mapped[str | None] = mapped_column(String, nullable=True)
    account_number: Mapped[str | None] = mapped_column(String, nullable=True)
    client_type: Mapped[str | None] = mapped_column(String, nullable=True)
    client_category: Mapped[str | None] = mapped_column(String, nullable=True)
    payment_type: Mapped[str | None] = mapped_column(String, nullable=True)
    client_status: Mapped[str | None] = mapped_column(String, nullable=True)
    comment_about_client: Mapped[str | None] = mapped_column(String, nullable=True)
    privilege_sign: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    activation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    subscriber_activation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    imsi: Mapped[str | None] = mapped_column(String, nullable=True)
    imsi_2: Mapped[str | None] = mapped_column(String, nullable=True)
    number_status: Mapped[str | None] = mapped_column(String, nullable=True)
    sim_card_type: Mapped[str | None] = mapped_column(String, nullable=True)
    icc: Mapped[str | None] = mapped_column(String, nullable=True)
    sim_card_status_now: Mapped[str | None] = mapped_column(String, nullable=True)
    sim_card_status_historical: Mapped[str | None] = mapped_column(String, nullable=True)
    sim_card_expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    diller: Mapped[str | None] = mapped_column(String, nullable=True)
    diller_number: Mapped[str | None] = mapped_column(String, nullable=True)
    registration_chanel: Mapped[str | None] = mapped_column(String, nullable=True)
    subscriber_status: Mapped[str | None] = mapped_column(String, nullable=True)
    lock_calls: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    subscriber_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    network_type: Mapped[str | None] = mapped_column(String, nullable=True)
    subscriber_lc_status: Mapped[str | None] = mapped_column(String, nullable=True)
    lc_status_change_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    balance_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    roaming_type: Mapped[str | None] = mapped_column(String, nullable=True)
    tariff_plan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    name_of_tariff_plan: Mapped[str | None] = mapped_column(String, nullable=True)
    balance: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    accounts_receivable_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    date_of_last_balance_change: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    vat: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    dealer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    contract_sign_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    dealer_iin: Mapped[str | None] = mapped_column(String, nullable=True)
    dealer_phone_number: Mapped[str | None] = mapped_column(String, nullable=True)


class NumberInformationLogin(Base, TimeStampMixin):
    __tablename__ = "number_information_login"
    __table_args__ = {"schema": f"{settings.POSTGRES_SCHEMA}"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    sql_request: Mapped[str | None] = mapped_column(String, nullable=True)
