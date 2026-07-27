import { ProfileAvatar } from "@/features/profile/components/ProfileAvatar";
import type { CurrentUser } from "@/types/api";

interface Props {
    user: CurrentUser;
}

export function ProfileHeader({ user }: Props) {
    return (
        <div className="flex flex-row items-center space-x-5">
            <ProfileAvatar firstName={user.first_name} lastName={user.last_name} size="lg" />
            <div className="flex flex-col space-y-1">
                <h1 className="text-2xl font-bold text-mg-text">
                    {user.first_name} {user.last_name}
                </h1>
                <span className="text-sm text-mg-text-3">{user.role}</span>
            </div>
        </div>
    );
}