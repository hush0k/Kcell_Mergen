import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { FaDownload } from "react-icons/fa";
import { MdOutlineSave } from "react-icons/md";

interface Tele2DownloadModalProps {
    isOpen: boolean;
    onDownload: () => Promise<void> | void;
    onSkip: () => void;
}

export function Tele2DownloadModal({ isOpen, onDownload, onSkip }: Tele2DownloadModalProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await onDownload();
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onSkip} className="w-[420px] max-w-[90vw]">
            <div className="p-6 flex flex-col space-y-5">
                <div className="flex flex-col space-y-2">
                    <h2 className="font-semibold text-xl text-mg-text">Файл сформирован</h2>
                    <p className="text-sm text-mg-text-2">
                        Скачать созданный файл сейчас? Он в любом случае будет сохранён в логах.
                    </p>
                </div>

                <div className="flex flex-row items-center space-x-3">
                    <Button
                        text="Скачать"
                        icon={<FaDownload />}
                        variant="primary"
                        disabled={downloading}
                        onClick={handleDownload}
                    />
                    <Button
                        text="Не скачивать"
                        icon={<MdOutlineSave />}
                        variant="outline"
                        disabled={downloading}
                        onClick={onSkip}
                    />
                </div>
            </div>
        </Modal>
    );
}