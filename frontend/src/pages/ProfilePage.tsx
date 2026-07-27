import { useState } from "react";
import { Button } from "@/components/Button";
import { RiLockPasswordLine } from "react-icons/ri";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileInfoCard } from "@/features/profile/components/ProfileInfoCard";
import { ChangePasswordModal } from "@/features/profile/components/ChangePasswordModal";

export function ProfilePage() {
    const user = useCurrentUser();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    if (!user) return null;

    return (
        <div className="flex flex-col h-full px-6 pt-7 pb-9 space-y-6">
            <div className="flex flex-row justify-between items-start">
                <ProfileHeader user={user} />
                <Button
                    icon={<RiLockPasswordLine size={16} />}
                    text="Изменить пароль"
                    variant="outline"
                    onClick={() => setIsPasswordModalOpen(true)}
                />
            </div>

            <ProfileInfoCard user={user} />

            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                userId={user.id}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}