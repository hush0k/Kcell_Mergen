import { useState } from "react";
import { api } from "@/api/resources";
import type { Id } from "@/types/api";

interface ChangePasswordForm {
    old_password: string;
    new_password: string;
    repeat_new_password: string;
}

export function useChangePassword(userId: Id) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function changePassword(form: ChangePasswordForm) {
        setError(null);
        setSuccess(false);

        if (!form.old_password || !form.new_password || !form.repeat_new_password) {
            setError("Заполните все поля");
            return;
        }
        if (form.new_password !== form.repeat_new_password) {
            setError("Пароли не совпадают");
            return;
        }

        setSubmitting(true);
        try {
            await api.users.updatePassword(userId, form);
            setSuccess(true);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Не удалось изменить пароль");
        } finally {
            setSubmitting(false);
        }
    }

    return { changePassword, submitting, error, success, setError, setSuccess };
}