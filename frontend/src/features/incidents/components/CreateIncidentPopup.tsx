import { Button } from "@/components/Button";
import { IoCloseSharp } from "react-icons/io5";
import { Input } from "@/components/Input";
import { AiOutlinePlus } from "react-icons/ai";
import { useState, useEffect } from "react";
import { api } from "@/api/resources";
import { ApiError } from "@/api/client";
import type { IncidentCreate, Task, TaskWithControl } from "@/types/api";

const FIELD_LABELS: Record<string, string> = {
    task_id: "Задача",
    control_type: "Тип контроля",
    control_subtype: "Подтип контроля",
    detected_source: "Источник обнаружения",
    reporting_month: "Отчётный месяц",
    occurrence_date: "Дата обнаружения",
    case_type: "Тип кейса",
    incident_name: "Название инцидента",
    description: "Описание",
    risk: "Риск",
    category: "Категория",
    problem_area: "Проблемная область",
    solution_date: "Дата решения",
    close_date: "Дата закрытия",
    taken_measures: "Принятые меры",
    root_cause: "Первопричина",
    estimated_loss: "Оценочный убыток",
    opportunity_loss: "Упущенная выгода",
    bad_debt: "Безнадёжный долг",
    prevented_savings: "Предотвращённая экономия",
    recovered_savings: "Возвращённая экономия",
    overchange: "Переплата",
    kpi_calculation: "Расчёт KPI",
    service_abused: "Используемый сервис",
    count_fraudulent_numbers: "Кол-во номеров",
    confirmed_fraud: "Подтверждённый фрод",
};

interface FastApiValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

function parseFieldErrors(payload: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    if (typeof payload !== "object" || payload === null || !("detail" in payload)) return result;
    const detail = (payload as { detail: unknown }).detail;
    if (!Array.isArray(detail)) return result;

    for (const err of detail as FastApiValidationError[]) {
        const loc = Array.isArray(err.loc) ? err.loc.filter((p) => p !== "body") : [];
        const field = loc.length > 0 ? String(loc[loc.length - 1]) : "";
        if (field) result[field] = err.msg;
    }
    return result;
}

interface Props {
    incidentId?: number;
    taskId?: number;
    task?: TaskWithControl;
    onClose: () => void;
    onSaved: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonthIso = () => `${new Date().toISOString().slice(0, 7)}-01`;

const emptyForm: IncidentCreate = {
    task_id: 0,
    control_type: "",
    control_subtype: "",
    detected_source: "",
    reporting_month: "",
    occurrence_date: "",
    case_type: "",
    incident_name: "",
    description: "",
    risk: "",
    category: "",
    problem_area: "",
    solution_date: "",
    close_date: "",
    taken_measures: "",
    root_cause: "",
    estimated_loss: "",
    opportunity_loss: "",
    bad_debt: "",
    prevented_savings: "",
    recovered_savings: "",
    overchange: "",
    kpi_calculation: "",
    service_abused: "",
    count_fraudulent_numbers: null,
    confirmed_fraud: "",
};

export function CreateIncidentPopup({ incidentId, taskId, task, onClose, onSaved }: Props) {
    const isEdit = incidentId != null;
    const isTaskLocked = !isEdit && taskId != null;
    const [tasks, setTasks] = useState<Task[]>([]);
    const [form, setForm] = useState<IncidentCreate>(() => {
        if (!isTaskLocked) return emptyForm;
        return {
            ...emptyForm,
            task_id: taskId,
            control_type: task?.control?.area ?? "",
            risk: task?.control?.risk ?? "",
            problem_area: task?.control?.name ?? "",
            occurrence_date: todayIso(),
            reporting_month: currentMonthIso(),
        };
    });
    const [errors, setErrors] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (isTaskLocked) return;
        Promise.all([api.tasks.inProgress(), api.tasks.completed()]).then(([inProgress, completed]) => {
            setTasks([...inProgress, ...completed]);
        });
    }, [isTaskLocked]);

    useEffect(() => {
        if (!isEdit) return;
        setLoading(true);
        api.incidents.get(incidentId!).then(res => {
            setForm({
                task_id: res.task_id ?? 0,
                status: res.status,
                control_type: res.control_type,
                control_subtype: res.control_subtype,
                detected_source: res.detected_source,
                reporting_month: res.reporting_month,
                occurrence_date: res.occurrence_date,
                case_type: res.case_type,
                incident_name: res.incident_name,
                description: res.description,
                risk: res.risk ?? "",
                category: res.category ?? "",
                problem_area: res.problem_area ?? "",
                solution_date: res.solution_date ?? "",
                close_date: res.close_date ?? "",
                taken_measures: res.taken_measures ?? "",
                root_cause: res.root_cause ?? "",
                estimated_loss: res.estimated_loss ?? "",
                opportunity_loss: res.opportunity_loss ?? "",
                bad_debt: res.bad_debt ?? "",
                prevented_savings: res.prevented_savings ?? "",
                recovered_savings: res.recovered_savings ?? "",
                overchange: res.overchange ?? "",
                kpi_calculation: res.kpi_calculation ?? "",
                service_abused: res.service_abused ?? "",
                count_fraudulent_numbers: res.count_fraudulent_numbers,
                confirmed_fraud: res.confirmed_fraud ?? "",
            });
        }).finally(() => setLoading(false));
    }, [incidentId, isEdit]);

    const update = (patch: Partial<IncidentCreate>) => setForm(prev => ({ ...prev, ...patch }));

    const handleSubmit = async () => {
        setFieldErrors({});

        if (!isEdit && !form.task_id) {
            setErrors("Выберите задачу");
            setFieldErrors({ task_id: "Обязательное поле" });
            return;
        }

        const requiredFields: (keyof IncidentCreate)[] = [
            "control_type", "control_subtype", "detected_source", "reporting_month",
            "incident_name", "description", "occurrence_date", "case_type",
        ];
        const missing = requiredFields.filter((f) => !form[f]);
        if (missing.length > 0) {
            setErrors(`Заполните обязательные поля: ${missing.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`);
            setFieldErrors(Object.fromEntries(missing.map((f) => [f, "Обязательное поле"])));
            return;
        }

        setSubmitting(true);
        setErrors(null);

        const numOrNull = (v: unknown) => (v === "" || v == null ? null : Number(v));

        const payload = {
            ...form,
            estimated_loss: numOrNull(form.estimated_loss),
            opportunity_loss: numOrNull(form.opportunity_loss),
            bad_debt: numOrNull(form.bad_debt),
            prevented_savings: numOrNull(form.prevented_savings),
            recovered_savings: numOrNull(form.recovered_savings),
            overchange: numOrNull(form.overchange),
            kpi_calculation: numOrNull(form.kpi_calculation),
            count_fraudulent_numbers: numOrNull(form.count_fraudulent_numbers),
            solution_date: form.solution_date || null,
            close_date: form.close_date || null,
            risk: form.risk || null,
            category: form.category || null,
            problem_area: form.problem_area || null,
            taken_measures: form.taken_measures || null,
            root_cause: form.root_cause || null,
            service_abused: form.service_abused || null,
            confirmed_fraud: form.confirmed_fraud || null,
        };

        try {
            if (isEdit) {
                const { task_id, status, ...updatePayload } = payload;
                void task_id;
                void status;
                await api.incidents.update(incidentId!, updatePayload);
            } else {
                await api.incidents.create(payload);
            }
            onSaved();
            onClose();
        } catch (e) {
            console.error(e);
            if (e instanceof ApiError) {
                const parsed = parseFieldErrors(e.payload);
                if (Object.keys(parsed).length > 0) {
                    setFieldErrors(parsed);
                    const summary = Object.entries(parsed)
                        .map(([field, msg]) => `${FIELD_LABELS[field] ?? field}: ${msg}`)
                        .join("; ");
                    setErrors(summary);
                } else {
                    setErrors(e.message);
                }
            } else {
                setErrors(isEdit ? "Не удалось сохранить изменения" : "Не удалось создать инцидент");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-sm text-mg-text-3">Загрузка...</div>;
    }

    return (
        <div>
            <div className="flex flex-col space-y-4 p-8">
                <div className="flex flex-row justify-between">
                    <div className="flex flex-col space-y-2">
                        <p className="text-xs font-semibold text-mg-text-3 uppercase">Реестр инцидентов</p>
                        <h1 className="text-xl font-bold text-mg-text">{isEdit ? "Редактирование инцидента" : "Новый инцидент"}</h1>
                    </div>
                    <Button
                        icon={<IoCloseSharp size={20}/>}
                        variant="ghost"
                        className="p-2 hover:rotate-90 w-10 h-10"
                        onClick={() => onClose()}
                    />
                </div>
                <div className="border-b-2 border-mg-purple-soft" />

                {errors && <p className="text-sm text-mg-danger-fg">{errors}</p>}

                <h5 className="uppercase text-mg-purple text-sm font-bold">Основное</h5>
                {isTaskLocked && (
                    <p className="text-sm text-mg-text-3">Задача: <span className="font-semibold text-mg-text">#{taskId}</span></p>
                )}
                {!isEdit && !isTaskLocked && (
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="task_id" className="font-semibold">Задача</label>
                        <select
                            id="task_id"
                            className={`border rounded-xl appearance-none py-3 px-4 outline-none bg-mg-purple-soft-2 ${
                                fieldErrors.task_id ? "border-mg-danger-fg" : "border-mg-purple-soft"
                            }`}
                            value={form.task_id || ""}
                            onChange={(e) => update({ task_id: Number(e.target.value) })}
                        >
                            <option value="">Выбрать завершённую задачу...</option>
                            {tasks.map(t => (
                                <option key={t.id} value={t.id}>
                                    #{t.id} — control {t.control_id} {t.status === "IN_PROGRESS" ? "(в процессе)" : "(завершена)"}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.task_id && <p className="text-xs text-mg-danger-fg px-1">{fieldErrors.task_id}</p>}
                    </div>
                )}

                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="control_type" className="font-semibold">Тип контроля</label>
                        <Input id="control_type" type="text" placeholder="Например, Финансовый контроль" className="border" value={form.control_type} onChange={(e) => update({ control_type: e.target.value })} error={fieldErrors.control_type} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="control_subtype" className="font-semibold">Подтип контроля</label>
                        <Input id="control_subtype" type="text" placeholder="Например, Проверка платежей" className="border" value={form.control_subtype} onChange={(e) => update({ control_subtype: e.target.value })} error={fieldErrors.control_subtype} />
                    </div>
                </div>

                <div className="flex flex-col flex-1 space-y-2">
                    <label htmlFor="incident_name" className="font-semibold">Название инцидента</label>
                    <Input id="incident_name" type="text" placeholder="Краткое название инцидента" className="border" value={form.incident_name} onChange={(e) => update({ incident_name: e.target.value })} error={fieldErrors.incident_name} />
                </div>

                <div className="flex flex-col flex-1 space-y-2">
                    <label htmlFor="description" className="font-semibold">Описание</label>
                    <Input id="description" type="textarea" placeholder="Подробное описание инцидента" className="border" value={form.description} onChange={(e) => update({ description: e.target.value })} error={fieldErrors.description} />
                </div>

                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="detected_source" className="font-semibold">Источник обнаружения</label>
                        <Input id="detected_source" type="text" placeholder="Например, Внутренний аудит" className="border" value={form.detected_source} onChange={(e) => update({ detected_source: e.target.value })} error={fieldErrors.detected_source} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="case_type" className="font-semibold">Тип кейса</label>
                        <Input id="case_type" type="text" placeholder="Например, Фрод" className="border" value={form.case_type} onChange={(e) => update({ case_type: e.target.value })} error={fieldErrors.case_type} />
                    </div>
                </div>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Даты</h5>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="reporting_month" className="font-semibold">Отчётный месяц</label>
                        <Input id="reporting_month" type="date" className="border" value={form.reporting_month} onChange={(e) => update({ reporting_month: e.target.value })} error={fieldErrors.reporting_month} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="occurrence_date" className="font-semibold">Дата обнаружения</label>
                        <Input id="occurrence_date" type="date" className="border" value={form.occurrence_date} onChange={(e) => update({ occurrence_date: e.target.value })} error={fieldErrors.occurrence_date} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="solution_date" className="font-semibold">Дата решения <span className="text-mg-text-3 font-normal normal-case">(необязательно)</span></label>
                        <Input id="solution_date" type="date" className="border" value={form.solution_date ?? ""} onChange={(e) => update({ solution_date: e.target.value || null })} error={fieldErrors.solution_date} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="close_date" className="font-semibold">Дата закрытия <span className="text-mg-text-3 font-normal normal-case">(необязательно)</span></label>
                        <Input id="close_date" type="date" className="border" value={form.close_date ?? ""} onChange={(e) => update({ close_date: e.target.value || null })} error={fieldErrors.close_date} />
                    </div>
                </div>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Анализ</h5>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="risk" className="font-semibold">Риск</label>
                        <Input id="risk" type="text" placeholder="Например, Репутационный" className="border" value={form.risk ?? ""} onChange={(e) => update({ risk: e.target.value })} error={fieldErrors.risk} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="category" className="font-semibold">Категория</label>
                        <Input id="category" type="text" placeholder="Например, Операционный" className="border" value={form.category ?? ""} onChange={(e) => update({ category: e.target.value })} error={fieldErrors.category} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="problem_area" className="font-semibold">Проблемная область</label>
                        <Input id="problem_area" type="text" placeholder="Например, Биллинг" className="border" value={form.problem_area ?? ""} onChange={(e) => update({ problem_area: e.target.value })} error={fieldErrors.problem_area} />
                    </div>
                </div>
                <div className="flex flex-col flex-1 space-y-2">
                    <label htmlFor="root_cause" className="font-semibold">Первопричина</label>
                    <Input id="root_cause" type="textarea" placeholder="Опишите первопричину инцидента" className="border" value={form.root_cause ?? ""} onChange={(e) => update({ root_cause: e.target.value })} error={fieldErrors.root_cause} />
                </div>
                <div className="flex flex-col flex-1 space-y-2">
                    <label htmlFor="taken_measures" className="font-semibold">Принятые меры</label>
                    <Input id="taken_measures" type="textarea" placeholder="Какие меры были приняты" className="border" value={form.taken_measures ?? ""} onChange={(e) => update({ taken_measures: e.target.value })} error={fieldErrors.taken_measures} />
                </div>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Финансы</h5>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="estimated_loss" className="font-semibold">Оценочный убыток</label>
                        <Input id="estimated_loss" type="number" placeholder="0.00" className="border" value={form.estimated_loss?.toString() ?? ""} onChange={(e) => update({ estimated_loss: e.target.value })} error={fieldErrors.estimated_loss} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="opportunity_loss" className="font-semibold">Упущенная выгода</label>
                        <Input id="opportunity_loss" type="number" placeholder="0.00" className="border" value={form.opportunity_loss?.toString() ?? ""} onChange={(e) => update({ opportunity_loss: e.target.value })} error={fieldErrors.opportunity_loss} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="bad_debt" className="font-semibold">Безнадёжный долг</label>
                        <Input id="bad_debt" type="number" placeholder="0.00" className="border" value={form.bad_debt?.toString() ?? ""} onChange={(e) => update({ bad_debt: e.target.value })} error={fieldErrors.bad_debt} />
                    </div>
                </div>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="prevented_savings" className="font-semibold">Предотвращённая экономия</label>
                        <Input id="prevented_savings" type="number" placeholder="0.00" className="border" value={form.prevented_savings?.toString() ?? ""} onChange={(e) => update({ prevented_savings: e.target.value })} error={fieldErrors.prevented_savings} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="recovered_savings" className="font-semibold">Возвращённая экономия</label>
                        <Input id="recovered_savings" type="number" placeholder="0.00" className="border" value={form.recovered_savings?.toString() ?? ""} onChange={(e) => update({ recovered_savings: e.target.value })} error={fieldErrors.recovered_savings} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="overchange" className="font-semibold">Переплата</label>
                        <Input id="overchange" type="number" placeholder="0.00" className="border" value={form.overchange?.toString() ?? ""} onChange={(e) => update({ overchange: e.target.value })} error={fieldErrors.overchange} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="kpi_calculation" className="font-semibold">Расчёт KPI</label>
                        <Input id="kpi_calculation" type="number" placeholder="0.00" className="border" value={form.kpi_calculation?.toString() ?? ""} onChange={(e) => update({ kpi_calculation: e.target.value })} error={fieldErrors.kpi_calculation} />
                    </div>
                </div>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Фрод</h5>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="service_abused" className="font-semibold">Используемый сервис</label>
                        <Input id="service_abused" type="text" placeholder="Например, SMS-рассылка" className="border" value={form.service_abused ?? ""} onChange={(e) => update({ service_abused: e.target.value })} error={fieldErrors.service_abused} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="count_fraudulent_numbers" className="font-semibold">Кол-во номеров</label>
                        <Input id="count_fraudulent_numbers" type="number" placeholder="0" className="border" value={form.count_fraudulent_numbers?.toString() ?? ""} onChange={(e) => update({ count_fraudulent_numbers: e.target.value ? Number(e.target.value) : null })} error={fieldErrors.count_fraudulent_numbers} />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="confirmed_fraud" className="font-semibold">Подтверждённый фрод</label>
                        <select
                            id="confirmed_fraud"
                            className={`border rounded-xl appearance-none py-3 px-4 outline-none bg-mg-purple-soft-2 ${
                                fieldErrors.confirmed_fraud ? "border-mg-danger-fg" : "border-mg-purple-soft"
                            }`}
                            value={form.confirmed_fraud ?? ""}
                            onChange={(e) => update({ confirmed_fraud: e.target.value })}
                        >
                            <option value="">Выбрать...</option>
                            <option value="Да">Да</option>
                            <option value="Нет">Нет</option>
                        </select>
                        {fieldErrors.confirmed_fraud && <p className="text-xs text-mg-danger-fg px-1">{fieldErrors.confirmed_fraud}</p>}
                    </div>
                </div>
            </div>

            <div className="flex flex-row justify-end border-t-2 pt-6 border-mg-purple-soft bg-mg-purple-soft-2 p-8">
                <Button
                    icon={<AiOutlinePlus size={16}/>}
                    text={submitting ? "Сохранение..." : (isEdit ? "Сохранить изменения" : "Создать инцидент")}
                    className="w-64"
                    onClick={handleSubmit}
                    disabled={submitting}
                />
            </div>
        </div>
    )
}