import { useNavigate } from "react-router-dom";
import { ChangePasswordForm } from "@/features/profile/components/ChangePasswordForm";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { tokenStorage } from "@/api/token-storage";

export function ForceChangePasswordPage() {
    const user = useCurrentUser();
    const navigate = useNavigate();

    const handleSuccess = () => {
        tokenStorage.clear();
        navigate("/login", { replace: true });
    };

    if (!user) {
        return null;
    }

    return (
        <div className="grid place-items-center min-h-screen">
            <div className="flex flex-col space-y-4 p-8 max-w-md w-full bg-mg-surface rounded-2xl shadow-lg">
                <h1 className="text-xl font-bold text-mg-text">Смена пароля</h1>
                <p className="text-sm text-mg-text-2">
                    Ваш пароль был сброшен администратором. Перед продолжением работы необходимо задать новый пароль.
                </p>
                <div className="border-b-2 border-mg-purple-soft" />
                <ChangePasswordForm userId={user.id} onSuccess={handleSuccess} />
            </div>
        </div>
    );
}