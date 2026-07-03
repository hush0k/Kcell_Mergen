import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { api } from "@/api/resources";
import type { User } from "@/types/api";
import type { VacationScheduleCreate } from "@/types/vacation";
import { IoCloseSharp } from "react-icons/io5";
import { AiOutlinePlus } from "react-icons/ai";
import { vacationStatusOptions, vacationTypeOptions } from "@/features/vacation/components/vacationOptions";

interface Props {
    vacationId?: number;
    onClose: () => void;
    onSaved: () => void;
}

const emptyForm: VacationScheduleCreate = {
    user_id: 0,
    start_date: "",
    end_date: "",
    vacation_type: "ANNUAL_LEAVE",
    status: "ACTIVE",
};

export function CreateVacationPopup({ vacationId, onClose, onSaved }: Props) {
    const isEdit = vacationId != null;
    const [users, setUsers] = useState<User[]>([]);
    const [form, setForm] = useState<VacationScheduleCreate>(emptyForm);
    const [errors, setErrors] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        api.users.list().then(setUsers);
    }, []);

    useEffect(() => {
        if (!isEdit) {
            setForm(emptyForm);
            return;
        }
        setLoading(true);
        api.vacationSchedule.get(vacationId!).then(res => {
            setForm({
                user_id: res.user_id,
                start_date: res.start_date,
                end_date: res.end_date,
                vacation_type: res.vacation_type,
                status: res.status,
            });
        }).finally(() => setLoading(false));
    }, [vacationId, isEdit]);

    const update = (patch: Partial<VacationScheduleCreate>) => setForm(prev => ({ ...prev, ...patch }));

    const handleSubmit = async () => {
        if (!form.user_id || !form.start_date || !form.end_date) {
            setErrors("Заполните обязательные поля: сотрудник, дата начало, дата окончание");
            return;
        }
        if (form.start_date > form.end_date) {
            setErrors("Дата начало не может быть позже даты окончание");
            return;
        }

        setSubmitting(true);
        setErrors(null);
        try {
            const payload = {
                ...form,
                user_id: Number(form.user_id),
            };
            if (isEdit) {
                await api.vacationSchedule.update(vacationId!, payload);
            } else {
                await api.vacationSchedule.create(payload);
            }
            onSaved();
            onClose();
        } catch (e) {
            console.error(e);
            setErrors(isEdit ? "Не удалось сохранить изменения" : "Не удалось создать отпуск");
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
                        <p className="text-xs font-semibold text-mg-text-3 uppercase">Реестр отпусков</p>
                        <h1 className="text-xl font-bold text-mg-text">{isEdit ? "Редактирование отпуска" : "Новый отпуск"}</h1>
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
                <div className="flex flex-col space-y-2">
                    <label htmlFor="vacation_user" className="font-semibold">Сотрудник</label>
                    <select
                        id="vacation_user"
                        className="border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                        value={form.user_id || ""}
                        onChange={(e) => update({ user_id: e.target.value ? Number(e.target.value) : 0 })}
                    >
                        <option value="">Выбрать...</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="vacation_type" className="font-semibold">Тип</label>
                        <select
                            id="vacation_type"
                            className="border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                            value={form.vacation_type}
                            onChange={(e) => update({ vacation_type: e.target.value as VacationScheduleCreate["vacation_type"] })}
                        >
                            {vacationTypeOptions.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="vacation_status" className="font-semibold">Статус</label>
                        <select
                            id="vacation_status"
                            className="border border-mg-purple-soft bg-mg-purple-soft-2 rounded-xl appearance-none py-3 px-4 outline-none"
                            value={form.status}
                            onChange={(e) => update({ status: e.target.value as VacationScheduleCreate["status"] })}
                        >
                            {vacationStatusOptions.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <h5 className="uppercase text-mg-purple text-sm font-bold">Период</h5>
                <div className="flex flex-row space-x-4">
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="start_date" className="font-semibold">Дата начало</label>
                        <input
                            id="start_date"
                            type="date"
                            className="w-full py-3 px-3 text-base font-normal text-mg-text bg-mg-purple-soft-2 border-2 rounded-2xl outline-none border-mg-purple-soft focus:ring-2 focus:ring-mg-purple-soft"
                            value={form.start_date}
                            onChange={(e) => update({ start_date: e.target.value })}
                        />
                    </div>
                    <div className="flex flex-col flex-1 space-y-2">
                        <label htmlFor="end_date" className="font-semibold">Дата окончание</label>
                        <input
                            id="end_date"
                            type="date"
                            className="w-full py-3 px-3 text-base font-normal text-mg-text bg-mg-purple-soft-2 border-2 rounded-2xl outline-none border-mg-purple-soft focus:ring-2 focus:ring-mg-purple-soft"
                            value={form.end_date}
                            onChange={(e) => update({ end_date: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-row justify-end border-t-2 pt-6 border-mg-purple-soft bg-mg-purple-soft-2 p-8">
                <Button
                    icon={<AiOutlinePlus size={16}/>}
                    text={submitting ? "Сохранение..." : (isEdit ? "Сохранить изменения" : "Создать отпуск")}
                    className="w-64"
                    onClick={handleSubmit}
                    disabled={submitting}
                />
            </div>
        </div>
    );
}
