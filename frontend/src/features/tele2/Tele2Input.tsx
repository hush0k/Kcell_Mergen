import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { FaFileExport } from "react-icons/fa";
import { api } from "@/api/resources";
import { Tele2DownloadModal } from "./Tele2DownloadModal";
import type { Tele2Response } from "@/types/api";

interface Tele2InputProps {
    value: string;
    onChange: (value: string) => void;
    onDone?: () => void;
}

export function Tele2Input({ value, onChange, onDone }: Tele2InputProps) {
    const [loading, setLoading] = useState(false);
    const [pendingLog, setPendingLog] = useState<Tele2Response | null>(null);
    const disabled = !value.trim() || loading;

    const handleCreate = async () => {
        setLoading(true);
        try {
            const log = await api.tele2.create({ numbers: value });
            setPendingLog(log);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setPendingLog(null);
        onChange("");
        onDone?.();
    };

    const handleDownload = async () => {
        if (!pendingLog) return;
        await api.tele2.download(pendingLog.id, pendingLog.name ?? undefined);
        closeModal();
    };

    return (
        <>
            <div className="p-6 border border-mg-border rounded-3xl bg-mg-surface flex flex-col space-y-4">
                <div className="flex flex-row items-center justify-between w-full">
                    <h2 className={"font-semibold text-xl text-mg-text"}>Номера (общее поле)</h2>
                    <Button
                        variant={"ghost"}
                        text={"Очистить"}
                        className={"w-auto text-sm hover:bg-mg-surface"}
                        size={"sm"}
                        onClick={() => onChange("")}
                    />
                </div>

                <Input
                    type={"textarea"}
                    placeholder={"77012113212"}
                    className={"placeholder:text-mg-text-2 bg-mg-surface-2 min-h-[200px] overflow-y-scroll overflow-x-hidden"}
                    rows={7}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />

                <Button
                    text={"Сформировать файл"}
                    icon={<FaFileExport />}
                    className="w-auto p-3.5"
                    variant="primary"
                    disabled={disabled}
                    onClick={handleCreate}
                />
            </div>

            <Tele2DownloadModal
                isOpen={!!pendingLog}
                onDownload={handleDownload}
                onSkip={closeModal}
            />
        </>
    );
}