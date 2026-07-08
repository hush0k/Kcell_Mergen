import { useState, type ReactElement } from "react";
import { Button } from "@/components/Button";
import { FaEye } from "react-icons/fa";
import { ImBlocked } from "react-icons/im";
import { MdOutlineLockOpen } from "react-icons/md";
import { api } from "@/api/resources";
import { BlackListResult, type MfsActionResult } from "./BlackListResult";

interface BlackListButtonsProps {
    msisdns: string;
    onDone?: () => void;
}

type ActionType = "CHECK" | "BLOCK" | "UNBLOCK";

const ACTIONS: Record<ActionType, { text: string; icon: ReactElement; variant: "danger" | "outline" | "primary" }> = {
    CHECK: { text: "Проверить номера(на блок)", icon: <FaEye />, variant: "primary" },
    BLOCK: { text: "Заблокировать номера", icon: <ImBlocked />, variant: "danger" },
    UNBLOCK: { text: "Разблокировать номера", icon: <MdOutlineLockOpen />, variant: "outline" },
};

export function BlackListButtons({ msisdns, onDone }: BlackListButtonsProps) {
    const [loading, setLoading] = useState<ActionType | null>(null);
    const [selected, setSelected] = useState<ActionType | null>(null);
    const [result, setResult] = useState<MfsActionResult | null>(null);
    const disabled = !msisdns.trim() || loading !== null;

    const runAction = async (action: ActionType) => {
        setLoading(action);
        try {
            const res = await api.mfs.action({ action, msisdns });
            // @ts-ignore
            setResult(res);
            onDone?.();
            setSelected(null);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-col space-y-4">
            <div className="flex flex-col bg-mg-surface p-6 border border-mg-border rounded-3xl space-y-4">
                <h2 className="font-semibold text-xl text-mg-text">Чёрный список (blacklist)</h2>

                <div className="flex flex-row items-center space-x-4">
                    {(Object.keys(ACTIONS) as ActionType[]).map((type) => (
                        <Button
                            key={type}
                            text={ACTIONS[type].text}
                            icon={ACTIONS[type].icon}
                            className="w-auto p-3.5"
                            variant={ACTIONS[type].variant}
                            disabled={disabled}
                            onClick={() => setSelected(type)}
                        />
                    ))}
                </div>

                {selected && (
                    <Button
                        text={`Подтвердить: ${ACTIONS[selected].text}`}
                        className="w-auto"
                        variant={ACTIONS[selected].variant}
                        disabled={disabled}
                        onClick={() => runAction(selected)}
                    />
                )}
            </div>

            <BlackListResult result={result} />
        </div>
    );
}