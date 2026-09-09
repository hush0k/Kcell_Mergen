CURRENT_RECORD_FILTER = "END_DATE IS NULL"

TABLE_GRAPH = {
    "NUMBER_SETS": {
        "pk": "NSET_ID",
        "key": "phone_number",
        "key_column": "MSISDN",
        "fields": {
            "diller_number": "TRGT_DELR_ID",   # raw id дилера номера
        },
        "fk": [
            {"column": "NSET_ID", "table": "PHONE_HISTORIES"},
            {"column": "NSTS_NSTS_ID", "table": "NUMBER_STATUSES"},
            {"column": "TRGT_SLPT_ID", "table": "SALE_POINTS"},
        ],
    },
    "NUMBER_STATUSES": {
        "fk_in": "NSTS_ID", "pk": "NSTS_ID",
        "fields": {"number_status": "DEF"}, "fk": [],
    },
    "SALE_POINTS": {
        "fk_in": "SLPT_ID", "pk": "SLPT_ID",
        "fields": {"registration_chanel": "NAME"}, "fk": [],
    },

    "PHONE_HISTORIES": {
        "fk_in": "NSET_NSET_ID",
        "historized": True,
        "fields": {},
        "fk": [{"column": "SUBS_SUBS_ID", "table": "SUBSCRIBERS"}],
    },

    "SUBSCRIBERS": {
        "fk_in": "SUBS_ID",
        "pk": "SUBS_ID",
        "fields": {
            "subscriber_activation_date": "ACTIVATION_DATE",
            "subscriber_close_date": "CLOSE_DATE",
            "lock_calls": "LOCK_CALLS",
            "activation_date": "ACTIVATION_DATE",
        },
        "fk": [
            {"column": "CLNT_CLNT_ID", "table": "CLIENTS"},
            {"column": "SUBS_ID", "table": "SUBS_HISTORIES"},
            {"column": "SUBS_ID", "table": "RT_SUBS_ACTUAL_STATE"},
            {"column": "SBST_SBST_ID", "table": "SUBS_STATUSES"},
            {"column": "STND_STND_ID", "table": "STANDARTS"},
            {"column": "CURR_ZONE_ID", "table": "ZONES"},
        ],
    },
    "SUBS_STATUSES": {
        "fk_in": "SBST_ID", "pk": "SBST_ID",
        "fields": {"subscriber_status": "DEF"}, "fk": [],
    },
    "STANDARTS": {
        "fk_in": "STND_ID", "pk": "STND_ID",
        "fields": {"network_type": "DEF"}, "fk": [],
    },
    "ZONES": {
        "fk_in": "ZONE_ID", "pk": "ZONE_ID",
        "fields": {"roaming_type": "DEF"}, "fk": [],
    },

    "SUBS_HISTORIES": {
        "fk_in": "SUBS_SUBS_ID",
        "historized": True,
        "fields": {"tariff_plan_id": "RTPL_RTPL_ID"},
        "fk": [
            {"column": "RTPL_RTPL_ID", "table": "RATE_PLANS"},
            {"column": "SCRD_SCRD_ID", "table": "SIM_CARDS"},
        ],
    },
    "RATE_PLANS": {
        "fk_in": "RTPL_ID", "pk": "RTPL_ID",
        "historized": True,
        "fields": {"name_of_tariff_plan": "NAME_R"}, "fk": [],
    },

    "RT_SUBS_ACTUAL_STATE": {
        "fk_in": "SUBS_SUBS_ID",
        "historized": False,
        "fields": {
            "lc_status_change_date": "RTLCST_DATE",
            "balance_end_date": "BALANCE_END_DATE",
        },
        "fk": [{"column": "RTLCST_RTLCST_ID", "table": "RT_LC_STATES"}],
    },
    "RT_LC_STATES": {
        "fk_in": "RTLCST_ID", "pk": "RTLCST_ID",
        "fields": {"subscriber_lc_status": "DEF"}, "fk": [],
    },

    "SIM_CARDS": {
        "fk_in": "SCRD_ID",
        "pk": "SCRD_ID",
        "fields": {
            "imsi": "IMSI",
            "imsi_2": "IMSI_2",
            "icc": "ICC",
            "sim_card_expiration_date": "EXPIRATION_DATE",
        },
        "fk": [
            {"column": "SCRD_ID", "table": "SIM_HISTORIES"},
            {"column": "STYP_STYP_ID", "table": "SIM_TYPES"},
            {"column": "CURR_SSTS_ID", "table": "SIM_STATUSES_NOW"},
        ],
    },
    "SIM_TYPES": {
        "fk_in": "STYP_ID", "pk": "STYP_ID",
        "fields": {"sim_card_type": "DEF"}, "fk": [],
    },
    "SIM_STATUSES_NOW": {
        "fk_in": "SSTS_ID", "table_name": "SIM_STATUSES", "pk": "SSTS_ID",
        "fields": {"sim_card_status_now": "DEF"}, "fk": [],
    },
    "SIM_HISTORIES": {
        "fk_in": "SCRD_SCRD_ID",
        "historized": True,
        "fields": {},
        "fk": [
            {"column": "DELR_DELR_ID", "table": "DEALERS_SIM"},
            {"column": "SSTS_SSTS_ID", "table": "SIM_STATUSES_HIST"},
        ],
    },
    "SIM_STATUSES_HIST": {
        "fk_in": "SSTS_ID", "table_name": "SIM_STATUSES", "pk": "SSTS_ID",
        "fields": {"sim_card_status_historical": "DEF"}, "fk": [],
    },
    "DEALERS_SIM": {
        "fk_in": "DELR_ID", "table_name": "DEALERS", "pk": "DELR_ID",
        "fields": {"diller": "NAME"}, "fk": [],
    },

    "CLIENTS": {
        "fk_in": "CLNT_ID",
        "pk": "CLNT_ID",
        "fields": {
            "privilege_sign": "PRIVILEGE_SIGN",

        },
        "fk": [
            {"column": "CLNT_ID", "table": "CLIENT_HISTORIES"},
            {"column": "CLNT_ID", "table": "JUR_ADDRESSES"},
            {"column": "CLNT_ID", "table": "BALANCES"},
            {"column": "CLNT_ID", "table": "PAYMENTS"},
        ],
    },
    "CLIENT_HISTORIES": {
        "fk_in": "CLNT_CLNT_ID",
        "historized": True,
        "fields": {
            "full_name": "NAME",
            "account_number": "ACCOUNT",
            "comment_about_client": "CLNH_COMMENT",
        },
        "fk": [
            {"column": "CTYP_CTYP_ID", "table": "CLIENT_TYPES"},
            {"column": "CLIS_CLIS_ID", "table": "CLIENT_STATUSES"},
            {"column": "CCAT_CCAT_ID", "table": "CLIENT_CATS"},
            {"column": "CLPT_CLPT_ID", "table": "CLIENT_PAY_TYPES"},
        ],
    },
    "CLIENT_TYPES": {
        "fk_in": "CTYP_ID", "pk": "CTYP_ID",
        "fields": {"client_type": "DEF"}, "fk": [],
    },
    "CLIENT_STATUSES": {
        "fk_in": "CLIS_ID", "pk": "CLIS_ID",
        "fields": {"client_status": "DEF"}, "fk": [],
    },
    "CLIENT_CATS": {
        "fk_in": "CCAT_ID", "pk": "CCAT_ID",
        "fields": {"client_category": "DEF"}, "fk": [],
    },
    "CLIENT_PAY_TYPES": {
        "fk_in": "CLPT_ID", "pk": "CLPT_ID",
        "fields": {"payment_type": "DEF"}, "fk": [],
    },
    "JUR_ADDRESSES": {
        "fk_in": "CLNT_CLNT_ID",
        "historized": True,
        "fields": {"iin": "INN"},
        "fk": [],
    },
    "BALANCES": {
        "fk_in": "CLNT_CLNT_ID",
        "extra_filter": "SCRD_SCRD_ID IS NULL",
        "pk": "BLNC_ID",
        "fields": {
            "balance": "BALANCE_$",
            "accounts_receivable_amount": "DEBIT_$",
            "date_of_last_balance_change": "ADJ_DATE",
        },
        "fk": [],
    },
    "PAYMENTS": {
        "fk_in": "CLNT_CLNT_ID",
        "pk": "PAY_ID",
        "fields": {
            "payment_date": "PAY_DATE",
            "payment_amount": "AMOUNT_$",
            "vat": "VAT_$",
        },
        "fk": [{"column": "DELR_DELR_ID", "table": "DEALERS_PAYMENT"}],
    },
    "DEALERS_PAYMENT": {
        "fk_in": "DELR_ID", "table_name": "DEALERS", "pk": "DELR_ID",
        "fields": {
            "dealer_name": "NAME",
            "contract_sign_date": "SIGN_DATE",
            "dealer_iin": "INN",
            "dealer_phone_number": "CONTACT_PHONE",
        },
        "fk": [],
    },
}

FIELD_TO_TABLE = {
    alias: table_name
    for table_name, node in TABLE_GRAPH.items()
    for alias in node["fields"]
}