import { FaTasks, FaClipboardList, FaSimCard } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";
import { LuTriangleAlert } from "react-icons/lu";
import { IoNotifications } from "react-icons/io5";
import { MdOutlineHolidayVillage } from "react-icons/md";
import { MdAdminPanelSettings } from "react-icons/md";
import { TbReportSearch } from "react-icons/tb";
import { LiSidebar } from "@/features/home/components/LiSidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";
import { useNotificationStore } from "@/features/notifications/store";
import { Button } from "@/components/Button";
import { PiNotePencilFill } from "react-icons/pi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { isAdminRole } from "@/features/admin/utils";
import { FaDatabase } from "react-icons/fa6";


export function Sidebar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { collapsed } = useSidebar();
    const unreadCount = useNotificationStore(s => s.unreadCount);
    const me = useCurrentUser();

    const buttons = [
        { name: "Задачи", icon: <FaTasks size={18}/>, isOpen: true, link: 'home' },
        { name: "Контроль", icon: <IoSettingsSharp size={18}/>, isOpen: false, link: 'controllers' },
        { name: "Инциденты", icon: <LuTriangleAlert size={18}/>, isOpen: false, link: 'incidents' },
        { name: "Уведомление", icon: <IoNotifications size={18}/>, isOpen: false, link: 'notifications', statistics: unreadCount },
        { name: "МФС", icon: <FaClipboardList size={18}/>, isOpen: false, link: 'mfs' },
        { name: "Tele2", icon: <FaSimCard size={18}/>, isOpen: false, link: 'tele2' },
        { name: "Отпуски", icon: <MdOutlineHolidayVillage size={18}/>, isOpen: false, link: 'vacation' },
        { name: "Отчеты", icon: <TbReportSearch size={18}/>, isOpen: false, link: 'reports' },
        { name: "Информация о номере", icon: <FaDatabase />, isOpen: false, link: 'numberInformation' },
        ...(isAdminRole(me?.role)
            ? [{ name: "Админ", icon: <MdAdminPanelSettings size={18}/>, isOpen: false, link: 'admin' }]
            : []),
    ]

    return (
        <div className="flex flex-col justify-between pb-6 bg-mg-surface ">
            <div className={`flex flex-col bg-mg-surface h-full transition-all duration-300 ${collapsed ? "w-16" : "w-72"}`}>
                {buttons.map((button) => (
                    <LiSidebar
                        key={button.link}
                        name={button.name}
                        icon={button.icon}
                        isOpen={pathname === `/${button.link}`}
                        onClick = { () => navigate(`/${button.link}`)}
                        collapsed={collapsed}
                        statistics={button.statistics}
                    />
                ))}
            </div>
            <div className={"px-3 bg-mg-surface"}>
                <Button
                    text={"Mergen Note"}
                    icon={<PiNotePencilFill size={14}/>}
                    size={"md"}
                    variant={"outline"}
                    className={"border-mg-purple border rounded-lg text-mg-purple text-lg py-2 whitespace-nowrap"}
                    onClick={ () => navigate("/mergen-note")}
                />
            </div>
        </div>
    )
}
