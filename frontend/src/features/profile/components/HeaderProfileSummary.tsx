import { useNavigate } from "react-router-dom";
import { ProfileAvatar } from "@/features/profile/components/ProfileAvatar";
import type { CurrentUser } from "@/types/api";

interface Props {
    user: CurrentUser | null;
}

export function HeaderProfileSummary({ user }: Props) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex flex-row space-x-3 items-center rounded-2xl px-2 py-1 transition-colors duration-200 hover:bg-mg-purple-soft-2 cursor-pointer"
        >
            <ProfileAvatar firstName={user?.first_name} lastName={user?.last_name} />
            <div className="flex flex-col items-start">
                <span className="whitespace-nowrap font-semibold">
                    {user ? `${user.first_name[0]}.${user.last_name}` : "U.Unknown"}
                </span>
                <span className="text-mg-text-3">{user ? user.role : "User"}</span>
            </div>
        </button>
    );
}