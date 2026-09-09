export interface NumberInformationField {
    code: string;
    label: string;
}

export type PaymentPeriod = "last_year" | "custom";

export interface NumberInformationCategory {
    id: string;
    title: string;
    fields: NumberInformationField[];
}

export const NUMBER_INFORMATION_CATEGORIES: NumberInformationCategory[] = [
    {
        id: "client",
        title: "Личные данные клиента",
        fields: [
            { code: "full_name", label: "ФИО" },
            { code: "iin", label: "ИИН" },
            { code: "account_number", label: "Лицевой счёт" },
            { code: "client_type", label: "Тип клиента B2B/B2C" },
            { code: "client_category", label: "Категория клиента" },
            { code: "payment_type", label: "Способ оплаты" },
            { code: "client_status", label: "Статус клиента" },
            { code: "comment_about_client", label: "Комментарий по клиенту" },
        ],
    },
    {
        id: "subscriber",
        title: "Абонент",
        fields: [
            { code: "activation_date", label: "Дата активации" },
            { code: "subscriber_activation_date", label: "Дата активации абонента" },
            { code: "subscriber_close_date", label: "Дата закрытия абонента" },
            { code: "lock_calls", label: "Признак блокировки исходящих" },
            { code: "subscriber_status", label: "Общий статус абонента" },
            { code: "subscriber_lc_status", label: "LC-статус абонента" },
            { code: "lc_status_change_date", label: "Дата изменения LC-статуса" },
            { code: "balance_end_date", label: "Дата окончания действия баланса" },
        ],
    },
    {
        id: "simCard",
        title: "Номер / SIM",
        fields: [
            { code: "number_status", label: "Статус номера" },
            { code: "registration_chanel", label: "Канал регистрации / точка продажи" },
            { code: "imsi", label: "ИМСИ" },
            { code: "imsi_2", label: "Доп. ИМСИ" },
            { code: "icc", label: "ICC" },
            { code: "sim_card_type", label: "Тип SIM-карты" },
            { code: "sim_card_expiration_date", label: "Дата окончания действия SIM" },
            { code: "sim_card_status_now", label: "Текущий статус SIM-карты" },
            { code: "sim_card_status_historical", label: "Исторический статус SIM-карты" },
            { code: "diller", label: "Дилер SIM" },
            { code: "diller_number", label: "Номер дилера SIM" },
        ],
    },
    {
        id: "tariff",
        title: "Тариф и баланс",
        fields: [
            { code: "tariff_plan_id", label: "ID тарифного плана" },
            { code: "name_of_tariff_plan", label: "Название тарифа" },
            { code: "balance", label: "Баланс" },
            { code: "date_of_last_balance_change", label: "Дата последнего изменения баланса" },
        ],
    },
    {
        id: "payments",
        title: "Платежи",
        fields: [
            { code: "payment_amount", label: "Сумма платежа" }
        ],
    },

];

export interface NumberInformationResult {
    id: number;
    phone_number: string | null;
    full_name?: string | null;
    iin?: string | null;
    account_number?: string | null;
    client_type?: string | null;
    client_category?: string | null;
    payment_type?: string | null;
    client_status?: string | null;
    comment_about_client?: string | null;
    privilege_sign?: boolean | null;
    activation_date?: string | null;
    subscriber_activation_date?: string | null;
    imsi?: string | null;
    imsi_2?: string | null;
    number_status?: string | null;
    sim_card_type?: string | null;
    icc?: string | null;
    sim_card_status_now?: string | null;
    sim_card_status_historical?: string | null;
    sim_card_expiration_date?: string | null;
    diller?: string | null;
    diller_number?: string | null;
    registration_chanel?: string | null;
    subscriber_status?: string | null;
    lock_calls?: boolean | null;
    subscriber_close_date?: string | null;
    network_type?: string | null;
    subscriber_lc_status?: string | null;
    lc_status_change_date?: string | null;
    balance_end_date?: string | null;
    roaming_type?: string | null;
    tariff_plan_id?: number | null;
    name_of_tariff_plan?: string | null;
    balance?: string | null;
    accounts_receivable_amount?: string | null;
    date_of_last_balance_change?: string | null;
    payment_date?: string | null;
    payment_amount?: string | null;
    vat?: string | null;
    dealer_name?: string | null;
    contract_sign_date?: string | null;
    dealer_iin?: string | null;
    dealer_phone_number?: string | null;
    [key: string]: unknown;
}

export interface NumberInformationBulkResult {
    results: NumberInformationResult[];
}

export interface NumberInformationLogEntry {
    id: number;
    sql_request: string | null;
    created_at: string;
}
