import { useState } from "react";
import { Button } from "@/components/Button";
import { FaEye } from "react-icons/fa";
import { ImBlocked } from "react-icons/im";
import { MdOutlineLockOpen } from "react-icons/md";
import { api } from "@/api/resources";

interface BlackListButtonsProps {
    msisdns: string;
    onDone?: () => void;
}

export function BlackListButtons({ msisdns, onDone }: BlackListButtonsProps) {
    const [loading, setLoading] = useState<"CHECK" | "BLOCK" | "UNBLOCK" | null>(null);
    const disabled = !msisdns.trim() || loading !== null;

    const runAction = async (action: "CHECK" | "BLOCK" | "UNBLOCK") => {
        setLoading(action);
        try {
            await api.mfs.action({ action, msisdns });
            onDone?.();
        } finally {
            setLoading(null);
        }
    };

    return(
        <div className="flex flex-col bg-mg-surface p-6 border border-mg-border rounded-3xl space-y-4">
            <h2 className={"font-semibold text-xl text-mg-text"}>Чёрный список (blacklist)</h2>
            <div className={"flex flex-row items-center space-x-4"}>
                <Button
                    text={"Проверить номера(на блок)"}
                    icon={<FaEye />}
                    className={"w-auto p-3.5"}
                    disabled={disabled}
                    onClick={() => runAction("CHECK")}
                />

                <Button
                    text={"Заблокировать номера"}
                    icon={<ImBlocked />}
                    className={"w-auto"}
                    variant={"danger"}
                    disabled={disabled}
                    onClick={() => runAction("BLOCK")}
                />

                <Button
                    text={"Разблокировать номера"}
                    icon={<MdOutlineLockOpen />}
                    className={"w-auto bg-mg-surface"}
                    variant={"outline"}
                    disabled={disabled}
                    onClick={() => runAction("UNBLOCK")}
                />
            </div>
        </div>
    )
}
