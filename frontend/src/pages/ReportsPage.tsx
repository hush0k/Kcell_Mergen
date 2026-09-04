import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { api } from "@/api/resources";
import { apiEndpoints } from "@/api/endpoints";

type Period = "last_month" | "custom";

export function ReportsPage() {
    return (
        <div className="flex flex-col  h-screen p-16 space-y-16">
            <ReportSection
                title="Отчет по заблокированным номерам в MFS"
                endpoint={apiEndpoints.reports.mfsBlacklistExcel}
                filename="mfs_blacklist.xlsx"
            />
            <ReportSection
                title="Отчет по заблокированным номерам в NX"
                endpoint={apiEndpoints.reports.ntBlockedExcel}
                filename="nt_blocked.xlsx"
            />
            <ReportSection
                title="ТОП 10 по странам"
                endpoint={apiEndpoints.reports.top10CountriesExcel}
                filename="top10_countries.xlsx"
            />
            <ReportSection
                title="1391"
                endpoint={apiEndpoints.reports.list1391Excel}
                filename="list_1391.xlsx"
                lastSection
            />
        </div>
    );
}

function ReportSection({
    title,
    endpoint,
    filename,
    lastSection,
}: {
    title: string;
    endpoint: string;
    filename: string;
    lastSection?: boolean;
}) {
    const [period, setPeriod] = useState<Period>("last_month");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const params =
                period === "custom" && dateFrom && dateTo
                    ? {
                          start_time: new Date(dateFrom).toISOString(),
                          end_time: new Date(dateTo).toISOString(),
                      }
                    : undefined;
            await api.reports.downloadExcel(endpoint, filename, params);
        } finally {
            setDownloading(false);
        }
    };

    const canDownload = period === "last_month" || (dateFrom !== "" && dateTo !== "");

    return (
        <div className={`flex flex-col ип space-y-4${lastSection ? " pb-16" : ""}`}>
            <h1 className={"font-bold text-4xl text-mg-purple"}>{title}</h1>

            <div className="flex flex-col space-y-3">
                <RadioOption
                    label="Последний месяц"
                    checked={period === "last_month"}
                    onClick={() => setPeriod("last_month")}
                />
                <RadioOption
                    label="Указать дату"
                    checked={period === "custom"}
                    onClick={() => setPeriod("custom")}
                />

                {period === "custom" && (
                    <div className="flex flex-row space-x-4 pl-9">
                        <div className="flex flex-col space-y-1 w-48">
                            <span className="mg-field-label">Дата начала</span>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className={"bg-mg-surface"}
                            />
                        </div>
                        <div className="flex flex-col space-y-1 w-48">
                            <span className="mg-field-label">Дата окончания</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className={"bg-mg-surface"}
                            />
                        </div>
                    </div>
                )}
            </div>

            <Button
                className={"w-36"}
                text={downloading ? "Скачивание..." : "Скачать"}
                disabled={downloading || !canDownload}
                onClick={handleDownload}
            />
        </div>
    );
}

function RadioOption({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
    return (
        <div className="flex flex-row items-center space-x-3 cursor-pointer" onClick={onClick}>
            <div className={`w-5 h-5 rounded-full ${checked ? "bg-mg-purple" : "bg-mg-surface border-2 border-mg-text-3"} flex justify-center items-center transition-all duration-200`}>
                <div className={"w-2 h-2 bg-mg-surface rounded-full"} />
            </div>
            <p className="text-mg-text text-md font-semibold">{label}</p>
        </div>
    );
}
