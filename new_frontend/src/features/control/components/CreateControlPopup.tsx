import { Button } from "@/components/Button";
import { IoCloseSharp } from "react-icons/io5";
import { Input } from "@/components/Input";
import { AiOutlinePlus } from "react-icons/ai";
import { useState, useEffect } from "react";
import { api } from "@/api/resources";
import type { User, ControlCreate } from "@/types/api";

interface Props {
    controlId?: number;
    onClose: () => void;
    onSaved: () => void;
}

const emptyForm: ControlCreate = {
    area: "" as any,
    name: "",
    description: "",
    time_estimate: null,
    frequency: "ежедневно",
    responsible_id: null,
    backup_id: null,
    dashboard_url: "",
    status: "ACTIVE",
};

export function CreateControlPopup({ controlId, onClose, onSaved }: Props) {
    const isEdit = controlId != null;
    const [users, setUsers] = useState<User[]>([]);
    const [form, setForm] = useState<ControlCreate>(emptyForm);
    const [errors, setErrors] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        api.users.list().then(setUsers);
    }, []);

    useEffect(() => {
        if (!isEdit) return;
        setLoading(true);
        api.controls.get(controlId!).then(res => {
            setForm({
                area: res.area,
                name: res.name,
                description: res.description ?? "",
                time_estimate: res.time_estimate,
                frequency: res.frequency,
                responsible_id: res.responsible_id,
                backup_id: res.backup_id,
                dashboard_url: res.dashboard_url ?? "",
                status: res.status,
            });
        }).finally(() => setLoading(false));
    }, [controlId, isEdit]);

    const update = (patch: Partial<ControlCreate>) => setForm(prev => ({ ...prev, ...patch }));

    const handleSubmit = async () => {
        if (!form.area || !form.name) {
            setErrors("Заполните обязательные поля: Область, Наименование");
            return;
        }
        setSubmitting(true);
        setErrors(null);
        const payload = {
            ...form,
            time_estimate: form.time_estimate ? Number(form.time_estimate) : null,
            responsible_id: form.responsible_id ? Number(form.responsible_id) : null,
            backup_id: form.backup_id ? Number(form.backup_id) : null,
            dashboard_url: form.dashboard_url || null,
        };
        try {
            if (isEdit) {
                await api.controls.update(controlId!, payload);
            } else {
                await api.controls.create(payload);
            }
            onSaved();
            onClose();
        } catch (e) {
            console.error(e);
            setErrors(isEdit ? "Не удалось сохранить изменения" : "Не удалось создать контроллер");
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
                        <p className="text-xs font-semibold text-mg-text-3 uppercase">Реестр контроллеров</p>
                        <h1 className="text-xl font-bold text-mg-text">{isEdit ? "Редактирование контроллера" : "Новый контроллер"}</h1>
                    </div>
                    <Button
                        icon={<IoCloseSharp size={20}/>}
                        variant="ghost"
                        className="p-2 hover:rotate-90 w-10 h-10"
                        onClick={() => onClose()}
                    />
                </div>
                <div className="border-b-2 border-mg-purple-soft " />

                {errors && <p className="text-sm text-mg-danger-fg">{errors}</p>}

                <h5 className="uppercase text-mg-purple text-sm font-bold">Основное</h5>
                <div className="flex flex-row space-x-8">
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="area" className="font-semibold">Область</label>
                        <select
                            id="area"
                            className="w-80 border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                            value={form.area as string}
                            onChange={(e) => update({ area: e.target.value as any })}
                        >
                            <option value="">Выбрать...</option>
                            <option value="TF">TF</option>
                            <option value="IF">IF</option>
                            <option value="DEV">DEV</option>
                            <option value="RA">RA</option>
                            <option value="A2P">A2P</option>
                        </select>
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="name" className="font-semibold">Наименование</label>
                        <Input
                            id="name"
                            placeholder="Название контроллера"
                            type="text"
                            className="border"
                            value={form.name}
                            onChange={(e) => update({ name: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex flex-col flex-1 space-y-2">
                    <label htmlFor="description" className="font-semibold">Описание</label>
                    <Input
                        id="description"
                        placeholder="Описание контроллера"
                        type="textarea"
                        className="border"
                        value={form.description ?? ""}
                        onChange={(e) => update({ description: e.target.value })}
                    />
                </div>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Расписание</h5>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="time_estimate" className="font-semibold">Затраты, мин</label>
                        <Input
                            id="time_estimate"
                            type="number"
                            className="border"
                            value={form.time_estimate?.toString() ?? ""}
                            onChange={(e) => update({ time_estimate: e.target.value ? Number(e.target.value) : null })}
                        />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="frequency" className="font-semibold">Регулярность</label>
                        <select
                            name="frequency"
                            id="frequency"
                            className="border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                            value={form.frequency}
                            onChange={(e) => update({ frequency: e.target.value as any })}
                        >
                            <option value="ежедневно">Ежедневно</option>
                            <option value="еженедельно">Еженедельно</option>
                            <option value="ежемесячно">Ежемесячно</option>
                            <option value="ежеквартально">Ежеквартально</option>
                            <option value="по запросу">По запросу</option>
                        </select>
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="status" className="font-semibold">Статус</label>
                        <select
                            name="status"
                            id="status"
                            className="border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                            value={form.status}
                            onChange={(e) => update({ status: e.target.value as any })}
                        >
                            <option value="ACTIVE">Активный</option>
                            <option value="SUSPENDED">Приостановлен</option>
                        </select>
                    </div>
                </div>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Ответственные</h5>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="responsible" className="font-semibold">Ответственный</label>
                        <select
                            name="responsible"
                            id="responsible"
                            className="border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                            value={form.responsible_id ?? ""}
                            onChange={(e) => update({ responsible_id: e.target.value ? Number(e.target.value) : null })}
                        >
                            <option value="">Выбрать...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="backup" className="font-semibold">Заменяющий</label>
                        <select
                            name="backup"
                            id="backup"
                            className="border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                            value={form.backup_id ?? ""}
                            onChange={(e) => update({ backup_id: e.target.value ? Number(e.target.value) : null })}
                        >
                            <option value="">Выбрать...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col flex-1 space-y-2">
                    <label htmlFor="dashboard_url" className="font-semibold">Dashboard URL</label>
                    <Input
                        id="dashboard_url"
                        placeholder="https://dashboard.example.com"
                        type="text"
                        className="border"
                        value={form.dashboard_url ?? ""}
                        onChange={(e) => update({ dashboard_url: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex flex-row justify-end border-t-2 pt-6 border-mg-purple-soft bg-mg-purple-soft-2 p-8">
                <Button
                    icon={<AiOutlinePlus size={16}/>}
                    text={submitting ? "Сохранение..." : (isEdit ? "Сохранить изменения" : "Создать контроллер")}
                    className="w-64"
                    onClick={handleSubmit}
                    disabled={submitting}
                />
            </div>
        </div>
    )
}