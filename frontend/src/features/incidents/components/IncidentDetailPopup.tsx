import { useState, useEffect } from "react";
import { api } from "@/api/resources";
import { Button } from "@/components/Button";
import { IoCloseSharp } from "react-icons/io5";
import { AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import type { IncidentResponse, IncidentStatus, CurrentUser } from "@/types/api";
import { IncidentStatusIcon } from "@/features/incidents/components/IncidentStatusIcon";

interface Props {
    incidentId: number;
    me: CurrentUser | null;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (id: number) => void;
}

const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
    "Открыт": ["На согласовании"],
    "На согласовании": ["Согласован", "Отклонён"],
    "Согласован": [],
    "Отклонён": ["На согласовании"],
};

const FIELD_LABELS: [keyof IncidentResponse, string][] = [
    ["control_type", "Тип контроля"],
    ["control_subtype", "Подтип контроля"],
    ["detected_source", "Источник обнаружения"],
    ["reporting_month", "Отчётный месяц"],
    ["occurrence_date", "Дата обнаружения"],
    ["case_type", "Тип кейса"],
    ["risk", "Риск"],
    ["category", "Категория"],
    ["problem_area", "Проблемная область"],
    ["solution_date", "Дата решения"],
    ["close_date", "Дата закрытия"],
    ["root_cause", "Первопричина"],
    ["taken_measures", "Принятые меры"],
    ["estimated_loss", "Оценочный убыток"],
    ["opportunity_loss", "Упущенная выгода"],
    ["bad_debt", "Безнадёжный долг"],
    ["prevented_savings", "Предотвращённая экономия"],
    ["recovered_savings", "Возвращённая экономия"],
    ["overchange", "Переплата"],
    ["kpi_calculation", "Расчёт KPI"],
    ["service_abused", "Используемый сервис"],
    ["count_fraudulent_numbers", "Кол-во номеров"],
    ["confirmed_fraud", "Подтверждённый фрод"],
];

export function IncidentDetailPopup({ incidentId, me, onClose, onChanged, onEdit }: Props) {
    const [item, setItem] = useState<IncidentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        api.incidents.get(incidentId)
            .then(setItem)
            .catch(() => setError("Не удалось загрузить инцидент"))
            .finally(() => setLoading(false));
    }, [incidentId]);

    if (loading) {
        return <div className="p-8 text-center text-sm text-mg-text-3">Загрузка...</div>;
    }
    if (!item) {
        return <div className="p-8 text-center text-sm text-mg-danger-fg">{error ?? "Инцидент не найден"}</div>;
    }

    const isAdmin = me?.role === "ADMIN";
    const isAuthor = me?.username === item.username;
    const nextStatuses = ALLOWED_TRANSITIONS[item.status] ?? [];
    const canEdit = (isAuthor || isAdmin) && (item.status === "Открыт" || item.status === "Отклонён");

    const canApplyTransition = (target: IncidentStatus) => {
        if ((item.status === "Открыт" || item.status === "Отклонён") && target === "На согласовании") return isAuthor || isAdmin;
        if (item.status === "На согласовании") return isAdmin;
        return false;
    };

    const handleTransition = async (target: IncidentStatus) => {
        setBusy(true);
        setError(null);
        const prev = item;
        setItem({ ...item, status: target });
        try {
            const updated = await api.incidents.updateStatus(incidentId, target);
            setItem(updated);
            onChanged();
        } catch (e) {
            console.error(e);
            setItem(prev);
            setError("Не удалось изменить статус");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        setBusy(true);
        setError(null);
        try {
            await api.incidents.remove(incidentId);
            onChanged();
            onClose();
        } catch (e) {
            console.error(e);
            setError("Не удалось удалить инцидент");
            setBusy(false);
        }
    };

    const formatValue = (val: unknown) => {
        if (val === null || val === undefined || val === "") return "—";
        return String(val);
    };

    return (
        <div>
            <div className="flex flex-col space-y-4 p-8">
                <div className="flex flex-row justify-between">
                    <div className="flex flex-col space-y-2">
                        <p className="text-xs font-semibold text-mg-text-3 uppercase">Реестр инцидентов</p>
                        <h1 className="text-xl font-bold text-mg-text">{item.incident_name}</h1>
                    </div>
                    <Button
                        icon={<IoCloseSharp size={20}/>}
                        variant="ghost"
                        className="p-2 hover:rotate-90 w-10 h-10"
                        onClick={() => onClose()}
                    />
                </div>
                <div className="border-b-2 border-mg-purple-soft" />

                {error && <p className="text-sm text-mg-danger-fg">{error}</p>}

                <div className="flex flex-row items-center justify-between">
                    <div className="w-48"><IncidentStatusIcon status={item.status} /></div>
                    <p className="text-sm text-mg-text-3">Автор: <span className="font-semibold text-mg-text">{item.username}</span></p>
                </div>

                {item.status === "Согласован" && item.approved_at && (
                    <p className="text-sm text-mg-text-3">Согласовано: <span className="font-semibold text-mg-text">{new Date(item.approved_at).toLocaleString("ru-RU")}</span></p>
                )}
                {item.status === "Отклонён" && item.rejected_at && (
                    <p className="text-sm text-mg-text-3">Отклонено: <span className="font-semibold text-mg-text">{new Date(item.rejected_at).toLocaleString("ru-RU")}</span></p>
                )}

                <h5 className="uppercase text-mg-purple text-sm font-bold">Описание</h5>
                <p className="text-sm text-mg-text whitespace-pre-wrap">{item.description}</p>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Детали</h5>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {FIELD_LABELS.map(([key, label]) => (
                        <div key={String(key)} className="flex flex-col">
                            <span className="text-xs text-mg-text-3 uppercase">{label}</span>
                            <span className="text-sm text-mg-text">{formatValue(item[key])}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-row justify-between items-center border-t-2 pt-6 border-mg-purple-soft bg-mg-purple-soft-2 p-8">
                <div className="flex gap-2">
                    {isAdmin && (
                        <Button
                            icon={<AiOutlineDelete size={16}/>}
                            variant="danger"
                            text="Удалить"
                            onClick={handleDelete}
                            disabled={busy}
                        />
                    )}
                    {canEdit && (
                        <Button
                            icon={<AiOutlineEdit size={16}/>}
                            variant="outline"
                            text="Редактировать"
                            onClick={() => onEdit(incidentId)}
                            disabled={busy}
                        />
                    )}
                </div>
                <div className="flex gap-2">
                    {nextStatuses.filter(canApplyTransition).map(target => (
                        <Button
                            key={target}
                            variant={target === "Отклонён" ? "danger" : "primary"}
                            text={target === "На согласовании" ? "Отправить на согласование" : target === "Согласован" ? "Согласовать" : "Отклонить"}
                            onClick={() => handleTransition(target)}
                            disabled={busy}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}