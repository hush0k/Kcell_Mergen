import { ProfileInfoField } from "@/features/profile/components/ProfileInfoField";
import type { CurrentUser } from "@/types/api";

interface Props {
    user: CurrentUser;
}

function formatDate(value?: string) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

export function ProfileInfoCard({ user }: Props) {
    return (
        <div className="grid grid-cols-2 gap-6 bg-mg-surface rounded-2xl p-6">
            <ProfileInfoField label="Имя" value={user.first_name} />
            <ProfileInfoField label="Фамилия" value={user.last_name} />
            <ProfileInfoField label="Логин" value={user.username} />
            <ProfileInfoField label="Роль" value={user.role} />
            <ProfileInfoField label="Email" value={user.email ?? "—"} />
            <ProfileInfoField label="Дата регистрации" value={formatDate(user.created_at)} />
        </div>
    );
}