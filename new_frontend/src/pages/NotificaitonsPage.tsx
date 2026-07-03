import { Button } from "@/components/Button"
import { useState, useEffect } from "react";
import { api } from "@/api/resources";
import { useNotificationStore } from "@/features/notifications/store";
import type { NotificationRecipient, CurrentUser } from "@/types/api";
import { MdNotificationsActive } from "react-icons/md";

const formatDate = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();

    const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const startOfWeek = new Date(now);
    const day = (now.getDay() + 6) % 7; // пн=0
    startOfWeek.setDate(now.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    if (date >= startOfWeek && date < endOfWeek) {
        const weekday = date.toLocaleDateString("ru-RU", { weekday: "long" });
        return `${weekday}, ${time}`;
    }

    const sameYear = date.getFullYear() === now.getFullYear();
    const dayMonth = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });

    return sameYear
        ? `${dayMonth}, ${time}`
        : `${dayMonth} ${date.getFullYear()}, ${time}`;
};

const SELECTED_NOTIFICATION_KEY = "notifications:selectedId";

export function NotificaitonsPage() {
    const [all, setAll] = useState(true);
    const [notifications, setNotifications] = useState<NotificationRecipient[]>([]);
    const [total, setTotal] = useState(0);
    const unreadTotal = useNotificationStore(s => s.unreadCount);
    const lastPush = useNotificationStore(s => s.lastPush);
    const decrementUnread = useNotificationStore(s => s.decrementUnread);
    const [notId, setNotId] = useState(() => sessionStorage.getItem(SELECTED_NOTIFICATION_KEY) ?? "");
    const [notification, setNotification] = useState<NotificationRecipient | null>(null);
    const [me, setMe] = useState<CurrentUser | null>(null);

    useEffect(() => {
        api.auth.me().then(setMe);
    }, []);

    useEffect(() => {
        api.notifications.list({ is_read: all ? undefined : false }).then(res => {
            setNotifications(res.notifications);
            if (all) setTotal(res.total);
        });
    }, [all]);

    useEffect(() => {
        if (!lastPush) return;
        setNotifications(prev => prev.some(n => n.id === lastPush.id) ? prev : [lastPush, ...prev]);
        setTotal(t => t + 1);
    }, [lastPush]);

    useEffect(() => {
        if (!notId) return;
        api.notifications.get(Number(notId)).then((res: NotificationRecipient | null) => {
            setNotification(res);
        });
    }, [notId]);

    const selectNotification = (id: string) => {
        setNotId(id);
        sessionStorage.setItem(SELECTED_NOTIFICATION_KEY, id);
    };

    const handleClick = async (item:NotificationRecipient) => {
        selectNotification(item.notification.id.toString());
        if (!item.is_read) {
            try {
                await api.notifications.read(item.notification.id);
            } catch {
                return;
            }
            setNotifications(prev =>
                prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
            );
            decrementUnread();
        }
    }

    const handleTakeResponsible = async (id: number) => {
        try {
            if (notification?.notification.responsible_user_id !== null){
                return;
            }
            await api.notifications.becomeResponsibleUser(id);
            setNotification(prev =>
                prev ? { ...prev, notification: { ...prev.notification, responsible_user_id: me?.id ?? null } } : prev
            );
        } catch {
            return;
        }
    };

    // В будущем это можно перевести на бэк как один запрос
    const handleAllTaskRead = async () => {
        const unreadItems = notifications.filter(item => !item.is_read);
        const results = await Promise.allSettled(
            unreadItems.map(item => api.notifications.read(item.notification.id))
        );

        const successIds = new Set(
            unreadItems.filter((_, i) => results[i].status === "fulfilled").map(item => item.id)
        );

        setNotifications(prev =>
            prev.map(n => successIds.has(n.id) ? { ...n, is_read: true } : n)
        );

        successIds.forEach(() => decrementUnread());
    };

    return (
        <div className="flex flex-col h-full px-9 pt-5 pb-9 space-y-4">
            {/*Хедер*/}
            <div className="flex flex-row justify-between items-end">
                <div className="flex flex-col space-y-1">
                    <p className="text-xs text-mg-text-3 font-bold uppercase">Входящие</p>
                    <h2 className="text-2xl text-mg-text font-bold">Уведомления</h2>
                </div>
                <p className="text-xs text-mg-text-2">
                    <Button
                        variant="outline"
                        text="Отметить все прочитанным"
                        size={"sm"}
                        className={"bg-mg-surface hover:bg-mg-surface-2 font-semibold border"}
                        onClick={handleAllTaskRead}
                    />
                </p>
            </div>

            {/*Кнопки*/}
            <div className="flex flex-row items-center space-x-3">
                <Button
                    text={"Все"}
                    statistics={total}
                    className={`w-auto py-2.5 text-sm rounded-full outline-none ${!all ? "bg-mg-surface" : ""}`}
                    variant={all ? "primary" : "outline"}
                    onClick={() => setAll(true)}
                />
                <Button
                    text={"Непрочитанные"}
                    statistics={unreadTotal}
                    className={`w-auto py-2.5 text-sm rounded-full outline-none ${!all ? "" : "bg-mg-surface"}`}
                    variant={!all ? "primary" : "outline"}
                    onClick={() => setAll(false)}
                />
            </div>

            {/*Боди*/}
            <div className="flex flex-row items-center bg-mg-surface rounded-3xl w-full h-[82%] border border-mg-border">
                {/*Правая часть*/}
                <div className="flex flex-col border-r border-mg-border w-[28rem] h-full overflow-y-scroll">
                    {notifications.map(item => (
                        <div
                            key={item.id}
                            className={`flex flex-row justify-start items-start space-x-3 pl-7 py-3.5 pr-5 border-b border-mg-border hover:bg-mg-surface-2 cursor-pointer ${notId === String(item.notification.id) ? "bg-mg-surface-2" : ""}`}
                            onClick={() => { void handleClick(item); }}
                        >
                            <div className={`${item.is_read ? "bg-transparent" : "bg-mg-purple"} mt-[0.2rem] w-2.5 h-2.5 rounded-full shrink-0`}/>
                            <div className="flex flex-col flex-1 min-w-0 space-y-1">
                                <div className="flex flex-row justify-between items-center">
                                    <p className="text-xs text-mg-purple font-semibold">{item.notification.sender}</p>
                                    <p className={"text-xs text-mg-text-2"}>{formatDate(item.notification.created_at)}</p>
                                </div>

                                <p className="text-sm text-mg-text font-semibold truncate">{item.notification.title}</p>
                                <p className="text-sm text-mg-text-2 font-medium truncate">{item.notification.preview}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {/*Левая часть*/}
                <div className="flex flex-col flex-1 h-full overflow-y-scroll">
                    {notification ? (
                        <div className="flex flex-col h-full">
                            <div className={"flex flex-col relative space-y-2 p-8 flex-1 overflow-auto"}>
                                <h1 className={"font-semibold text-2xl"}>{notification.notification.title}</h1>
                                <div className=" flex flex-row justify-between">
                                    <div className="flex flex-col space-y-2">
                                        <p >Отправитель: <span className={"text-mg-purple font-semibold"}>{notification.notification.sender}</span></p>
                                        <p>Исполнитель: {notification.notification.responsible_user_id ? `${notification.notification.responsible_user?.first_name} ${notification.notification.responsible_user?.last_name}` : "Еще никто не взял аларм" }</p>
                                    </div>
                                    <p className={"text-mg-text-3"}>{formatDate(notification.notification.created_at)}</p>
                                </div>
                                <Button
                                    text={"Взять в работу"}
                                    size={"sm"}
                                    className={"absolute top-5 right-8 w-auto h-auto"}
                                    onClick={() => { void handleTakeResponsible(notification.notification.id); }}
                                />
                                <div
                                    className="h-[80%] border-t border-mg-border w-full overflow-auto p-4 [&_table]:max-w-full [&_table]:table-auto [&_img]:max-w-full [&_*]:!text-sm"
                                    dangerouslySetInnerHTML={{ __html: notification.notification.html_content }}
                                />

                            </div>
                        </div>
                    ) :(
                        <div className="flex flex-col h-full justify-center items-center space-y-3">
                            <h1 className="font-bold text-3xl">Нет контента</h1>
                            <p className={"text-mg-text-2 flex flex-col items-center"}>Для показа контента выберите уведомление {<MdNotificationsActive size={80}/>}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
