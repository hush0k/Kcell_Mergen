import { useEffect, useState } from "react"
import { NumberInformationInput } from "@/features/numberInformation/NumberInformationInput"
import { NumberInformationCheckboxes } from "@/features/numberInformation/NumberInformationCheckboxes"
import { NumberInformationLoadingOverlay } from "@/features/numberInformation/NumberInformationLoadingOverlay"
import { NumberInformationLogTable } from "@/features/numberInformation/NumberInformationLogTable"
import { api } from "@/api/resources"
import type { NumberInformationLogEntry, PaymentPeriod } from "@/features/numberInformation/types"
import { Button } from "@/components/Button"

export function NumberInformationPage() {
    const [numbersText, setNumbersText] = useState("")
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [logs, setLogs] = useState<NumberInformationLogEntry[]>([])
    const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>("last_year")
    const [paymentDateFrom, setPaymentDateFrom] = useState("")
    const [paymentDateTo, setPaymentDateTo] = useState("")

    const loadLogs = async () => {
        try {
            const data = await api.numberInformation.listLogs()
            setLogs(data)
        } catch {
            // ignore log loading errors, keep previous state
        }
    }

    useEffect(() => {
        void loadLogs()
    }, [])

    const numbers = numbersText
        .split("\n")
        .map((n) => n.trim())
        .filter((n) => n.length > 0)

    const isCustomPaymentPeriod = selectedFields.has("payment_amount") && paymentPeriod === "custom"
    const customPaymentPeriodFilled = paymentDateFrom.length > 0 && paymentDateTo.length > 0

    const canRequest =
        numbers.length > 0 &&
        selectedFields.size > 0 &&
        !loading &&
        (!isCustomPaymentPeriod || customPaymentPeriodFilled)

    const handleRequest = async () => {
        if (!canRequest) return
        setLoading(true)
        setError(null)
        try {
            await api.numberInformation.downloadExcelBulk({
                phone_numbers: numbers,
                fields: Array.from(selectedFields),
                ...(isCustomPaymentPeriod
                    ? { payment_date_from: paymentDateFrom, payment_date_to: paymentDateTo }
                    : {}),
            })
            await loadLogs()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось загрузить данные")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={"flex flex-col space-y-6 p-12"}>
            <h1 className={"text-4xl font-bold"}>Информация о номере</h1>
            <NumberInformationInput value={numbersText} onChange={setNumbersText} />
            <NumberInformationCheckboxes
                selected={selectedFields}
                onChange={setSelectedFields}
                paymentPeriod={paymentPeriod}
                onPaymentPeriodChange={setPaymentPeriod}
                paymentDateFrom={paymentDateFrom}
                onPaymentDateFromChange={setPaymentDateFrom}
                paymentDateTo={paymentDateTo}
                onPaymentDateToChange={setPaymentDateTo}
            />
            <div>
                <Button
                    text="Запросить информацию"
                    onClick={handleRequest}
                    disabled={!canRequest}
                    className={!canRequest ? "opacity-50 cursor-not-allowed" : ""}
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            <NumberInformationLogTable logs={logs} />
            <NumberInformationLoadingOverlay visible={loading} />
        </div>
    )
}
