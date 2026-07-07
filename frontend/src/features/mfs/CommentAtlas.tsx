import { useState } from "react";
import { Button } from "@/components/Button";
import { MdOutlineModeComment } from "react-icons/md";
import { MdOutlineDelete } from "react-icons/md";
import { api } from "@/api/resources";

interface CommentAtlasProps {
    msisdns: string;
    onDone?: () => void;
}

export function CommentAtlas({ msisdns, onDone }: CommentAtlasProps) {
    const [chosen, setChosen] = useState<"1" | "2" | null>(null);
    const [loading, setLoading] = useState<"add" | "delete" | null>(null);
    const disabled = !msisdns.trim() || loading !== null;
    const template = chosen === "2" ? "restriction_short" : "restriction_full";

    const runNote = async (mode: "add" | "delete") => {
        setLoading(mode);
        try {
            await api.atlas.note({ mode, msisdns, template });
            onDone?.();
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-col space-y-4 bg-mg-surface rounded-3xl border border-mg-border p-6">
            <div className={"flex flex-col space-y-2"}>
                <h2 className={"font-semibold text-xl text-mg-text"}>Комментарий в Atlas (CODA)</h2>
                <p className={"text-mg-text-2"}>Добавление — выбранный шаблон заметки. Удаление — текст «.».</p>
            </div>

            <p className={"uppercase text-mg-text-3 font-bold text-sm"}>ШАБЛОН ТЕКСТА</p>

            <div className={"flex flex-col items-center space-y-2"}>
                <div
                    className={`flex flex-row space-x-3 py-5 px-6 border border-mg-border rounded-2xl w-full ${chosen==="1" ? "bg-mg-purple-soft-2 border-mg-purple" : "bg-mg-surface"} cursor-pointer`}
                    onClick={() => setChosen("1")}
                >
                    <div className={`w-5 h-5 rounded-full ${chosen==="1" ? "bg-mg-purple" : "bg-mg-surface border-2 border-mg-text-3"} shrink-0 flex justify-center items-center`}>
                        <div className={"w-2 h-2 bg-mg-surface rounded-full"}/>
                    </div>

                    <div className={"flex flex-col space-y-1"}>
                        <p className={"text-mg-text text-md font-semibold"}>Полное (п. 4.2.3, несанкционированные действия)</p>
                        <p className={"text-mg-text-3 text-md uppercase font-medium"}>ПО НОМЕРУ БЫЛО УСТАНОВЛЕНО ОГРАНИЧЕНИЕ ПО ОКАЗАНИЮ МОБИЛЬНЫХ ФИНАНСОВЫХ УСЛУГ, В СВЯЗИ С НЕСАНКЦИОНИРОВАННЫМИ ДЕЙСТВИЯМИ И НАРУШЕНИЕМ УСЛОВИЙ ПОЛЬЗОВАТЕЛЬСКОГО СОГЛАШЕНИЯ.</p>
                    </div>
                </div>

                <div
                    className={`flex flex-row space-x-2 p-5 border border-mg-border rounded-2xl  w-full ${chosen==="2" ? "bg-mg-purple-soft-2 border-mg-purple" : "bg-mg-surface"} cursor-pointer`}
                    onClick={() => setChosen("2")}
                >
                    <div className={`w-5 h-5 rounded-full ${chosen==="2" ? "bg-mg-purple" : "bg-mg-surface border-2 border-mg-text-3"} flex justify-center items-center transition-all duration-200`}>
                        <div className={"w-2 h-2 bg-mg-surface rounded-full"}/>
                    </div>
                    <div className={"flex flex-col space-y-1"}>
                        <p className={"text-mg-text text-md font-semibold"}>Краткое (ограничение доступа к МФС)</p>
                        <p className={"text-mg-text-3 text-md font-medium"}>На абонентском номере ограничен доступ к сервису МФС - проведение финансовых операций с баланса.</p>
                    </div>
                </div>
            </div>

            <div className={"flex flex-row items-center space-x-4"}>
                <Button
                    icon={<MdOutlineModeComment size={16}/>}
                    text={"Добавить комментарий"}
                    className={"w-auto p-3.5"}
                    disabled={disabled}
                    onClick={() => runNote("add")}
                />

                <Button
                    icon={<MdOutlineDelete size={16}/>}
                    text={"Удалить комментарий"}
                    className={"w-auto"}
                    variant={"danger"}
                    disabled={disabled}
                    onClick={() => runNote("delete")}
                />
            </div>
        </div>
    )
}
