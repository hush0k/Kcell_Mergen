import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { ChangePasswordForm } from "@/features/profile/components/ChangePasswordForm";
import { IoCloseSharp } from "react-icons/io5";
import type { Id } from "@/types/api";

interface Props {
    isOpen: boolean;
    userId: Id;
    onClose: () => void;
}

export function ChangePasswordModal({ isOpen, userId, onClose }: Props) {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col space-y-4 p-8">
                <div className="flex flex-row justify-between items-start">
                    <h1 className="text-xl font-bold text-mg-text">Изменить пароль</h1>
                    <Button
                        icon={<IoCloseSharp size={20}/>}
                        variant="ghost"
                        className="p-2 hover:rotate-90 w-10 h-10"
                        onClick={onClose}
                    />
                </div>
                <div className="border-b-2 border-mg-purple-soft" />
                <ChangePasswordForm userId={userId} onSuccess={onClose} />
            </div>
        </Modal>
    );
}