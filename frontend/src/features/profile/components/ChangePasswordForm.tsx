import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PasswordInput } from "@/features/profile/components/PasswordInput";
import { useChangePassword } from "@/features/profile/hooks/useChangePassword";
import type { Id } from "@/types/api";

interface Props {
    userId: Id;
    onSuccess?: () => void;
}

export function ChangePasswordForm({ userId, onSuccess }: Props) {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const { changePassword, submitting, error, success } = useChangePassword(userId);

    const handleSubmit = async () => {
        await changePassword({
            old_password: oldPassword,
            new_password: newPassword,
            repeat_new_password: repeatPassword,
        });
    };

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => onSuccess?.(), 1000);
            return () => clearTimeout(t);
        }
    }, [success, onSuccess]);

    return (
        <div className="flex flex-col space-y-4">
            <PasswordInput
                placeholder="Старый пароль"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
            />
            <PasswordInput
                placeholder="Новый пароль"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordInput
                placeholder="Повторите новый пароль"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
            />

            {error && <p className="text-sm text-mg-danger-fg">{error}</p>}
            {success && <p className="text-sm text-mg-success-fg">Пароль успешно изменен</p>}

            <Button
                text={submitting ? "Сохранение..." : "Сохранить"}
                onClick={handleSubmit}
                disabled={submitting}
            />
        </div>
    );
}