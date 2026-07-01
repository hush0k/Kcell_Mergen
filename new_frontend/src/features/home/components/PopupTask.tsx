import { useEffect, useState } from "react";
import type { TaskWithControl } from "@/types/api";
import { api } from "@/api/resources";
import { StatusIcon } from "@/features/home/components/StatusIcon";
import { PriorityIcon } from "@/features/home/components/PriorityIcon";
import { Button } from "@/components/Button";
import { IoCloseSharp } from "react-icons/io5";
import { MdOutlineCalendarToday } from "react-icons/md";
import { LuTimer } from "react-icons/lu";
import { FaLink } from "react-icons/fa6";
import { Avatar } from "@/components/Avatar";
import { MdModeEditOutline } from "react-icons/md";
import { CommentPopup } from "@/features/home/components/CommentPopup";
import { renderTime, calculateTime } from "@/features/home/hooks/CalulateTime";

interface Props {
    id: string;
    onClose: (changed?: boolean) => void;
}

export function PopupTask({ id, onClose }: Props) {
    const [data, setData] = useState<TaskWithControl | null>(null);
    const [showComment, setShowComment] = useState(false);
    const [hasChanged, setHasChanged] = useState(false);
    const [draftComment, setDraftComment] = useState("");

    function handlePopupClose() {
        onClose(hasChanged);
    }

    function formatDateTime(iso: string): string {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    async function handleSaveComment(text: string) {
        if (!data) return;
        await api.tasks.update(data.id, { comments: text });
        const refreshed = await api.tasks.getWithControls(Number(id));
        setData(refreshed);
        setShowComment(false);
        setHasChanged(true);
    }

    useEffect(() => {
        api.tasks.getWithControls(Number(id)).then(res => setData(res))
    }, [id])

    useEffect(() => {
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape" && !showComment) onClose(hasChanged);
        }
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose, hasChanged, showComment]);


    const correctTime = data ? calculateTime(data.control.time_estimate) : null;

    return (
        <div className="bg-mg-surface rounded-3xl min-w-[40rem] h-[47rem] flex flex-col">
            {data ? (
                <div className="flex flex-col h-full">
                    <div className="bg-mg-surface-2 rounded-t-3xl p-8 border-b flex flex-row justify-between items-start">
                        <div className="flex flex-col space-y-4">
                            <div className="flex flex-row space-x-3">
                                <div className="w-20">
                                    <StatusIcon status={data.status} deadline={data.deadline_time}/>
                                </div>
                                <div className="w-20">
                                    <PriorityIcon priority={data.control.priority}/>
                                </div>
                            </div>
                            <h1 className="text-xl  font-bold">{data.control.name}</h1>
                            <div className="flex flex-row space-x-3">
                                {/* Дата создание задачи */}
                                <div className="text-mg-text-3 font-medium flex flex-row space-x-1 items-center">
                                    < MdOutlineCalendarToday size={16}/>
                                    <p>{new Date(data.created_at).toLocaleDateString("ru-RU", {
                                        day: "2-digit", month: "2-digit", year: "numeric"
                                    }).replace(/\./g, "-")}</p>
                                </div>

                                {/* Время выполнение задачи */}
                                <div className="text-mg-text-3 font-medium flex flex-row space-x-1 items-center">
                                    <LuTimer size={16}/>
                                    <p>{renderTime(correctTime)}</p>
                                </div>

                                {/* Ссылка на dashboard задачи */}
                                <div className="text-mg-text-3 font-medium flex flex-row space-x-1 items-center">
                                    <FaLink />
                                    <a
                                        href={data.control.dashboard_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >Dashboard</a>
                                </div>

                            </div>
                        </div>

                        <Button
                            icon={<IoCloseSharp size={20}/>}
                            variant="ghost"
                            className="p-1.5 hover:rotate-90"
                            onClick={() => onClose(hasChanged)}
                        />
                    </div>

                    <div className="flex flex-col bg-mg-surface px-8 py-5 flex-1 rounded-b-3xl space-y-4 relative">
                        <div className="grid grid-cols-2 gap-6 font-semibold text-mg-text-3 pb-5 border-b text-sm">
                            {/*Ответственный*/}
                            <div className="space-y-3">
                                <h3>ОТВЕТСТВЕННЫЙ</h3>
                                <div className="flex flex-row space-x-2 items-center">
                                    <Avatar
                                        firstName={data.control.responsible?.first_name}
                                        lastName={data.control.responsible?.last_name}
                                    />
                                    <p className="text-mg-text font-medium text-[14px]">{data.control.responsible?.first_name} {data.control.responsible?.last_name}</p>
                                </div>
                            </div>
                            {/*Исполнитель*/}
                            <div className="space-y-3">
                                <h3>ИСПОЛНИТЕЛЬ</h3>
                                <div className="flex flex-row space-x-2 items-center">
                                    <Avatar
                                        firstName={data.user?.first_name}
                                        lastName={data.user?.last_name}
                                    />
                                    <p className="text-mg-text font-medium text-[14px]">{data.user ? `${data.control.responsible?.first_name} ${data.control.responsible?.last_name}` : "Не выбран"}</p>
                                </div>
                            </div>
                            {/*Тип контроля*/}
                            <div className="space-y-3">
                                <h3>ТИП КОНТРОЛЯ</h3>
                                <div className="flex flex-row space-x-2 items-center">
                                    <p className="font-normal text-mg-text text-[14px] capitalize">{data.control.frequency}</p>
                                </div>
                            </div>
                            {/*Облась*/}
                            <div className="space-y-3">
                                <h3>ОБЛАСТЬ</h3>
                                <div className="flex flex-row space-x-2 items-center">
                                    <p className="font-normal text-mg-text text-[14px] capitalize">{data.control.area}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col text-mg-text-3 font-semibold">
                            <h3>ОПИСАНИЕ КОНТРОЛЯ И КОММЕНТАРИЯ</h3>
                            <ul className="list-disc list-inside space-y-3 pt-2">
                                <li>
                                    <h4 className="inline font-semibold">Описание</h4>
                                    <p className="text-mg-text ml-5 font-normal">{data.control.description}</p>
                                </li>
                                <li>
                                    <h4 className="inline font-semibold">Комментария</h4>
                                    <p className="text-mg-text ml-5 font-normal">{data.comments}</p>
                                </li>
                            </ul>
                        </div>
                        <div className="flex flex-row justify-between items-end">
                            {/*Хронлогия*/}
                            <div className="flex flex-col text-mg-text-3 font-semibold">
                                <h3>ХРОНОЛОГИЯ</h3>
                                <div className="flex flex-row space-x-4 mt-3">
                                    <div className="flex flex-col justify-center items-center h-14">
                                        <div className={`h-3 w-3 rounded-full ${data.start_time ? "bg-mg-lime" : "bg-mg-purple outline outline-4 outline-mg-purple-soft"}`} />
                                        <div className={data.start_time ? `w-0 border-r-2 flex-1 border-gray-300`: ""}/>
                                    </div>
                                    <div className="flex flex-col justify-center items-start">
                                        <h5 className="text-mg-text">Задача создана</h5>
                                        <p>{formatDateTime(data.created_at)}</p>
                                    </div>
                                </div>

                                {data.start_time ? (
                                    <div className="flex flex-row space-x-4 mt-1">
                                        <div className="flex flex-col justify-center items-center h-14">
                                            <div className={`h-3 w-3 rounded-full ${data.end_time ? "bg-mg-lime" : "bg-mg-purple outline outline-4 outline-mg-purple-soft"}`} />
                                            <div className={data.end_time ? `w-0 border-r-2 flex-1 border-gray-300`: ""}/>
                                        </div>
                                        <div className="flex flex-col justify-center items-start">
                                            <h5 className="text-mg-text">Задача начата</h5>
                                            <p>{formatDateTime(data.start_time)}</p>
                                        </div>
                                    </div>
                                ) : null}
                                {data.end_time ? (
                                    <div className="flex flex-row space-x-4 mt-1">
                                        <div className="flex flex-col justify-center items-center h-14">
                                            <div className={`h-3 w-3 rounded-full bg-mg-purple outline outline-4 outline-mg-purple-soft`} />
                                        </div>
                                        <div className="flex flex-col justify-center items-start">
                                            <h5 className="text-mg-text">Задача закончен</h5>
                                            <p>{formatDateTime(data.end_time)}</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <Button
                                size="sm"
                                icon={<MdModeEditOutline />}
                                text="Написать комментарий"
                                className="text-sm w-56 absolute bottom-8 right-8"
                                onClick={() => setShowComment(true)}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-row justify-center items-center">
                    <h1 className="text-5xl font-bold">Загрузка...</h1>
                </div>

            )}
            {showComment && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <CommentPopup
                        text={draftComment}
                        onTextChange={setDraftComment}
                        onClose={() => setShowComment(false)}
                        onSave={handleSaveComment}
                    />
                </div>
            )}
        </div>
    )
}