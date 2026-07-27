import { Button } from '@/components/Button';
import { HiMenu } from "react-icons/hi";
import { FiLogIn } from "react-icons/fi";
import { IoMdMoon } from "react-icons/io";
import { AiFillSun } from "react-icons/ai";
import { useState } from "react"
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser"
import { useSidebar } from "@/contexts/SidebarContext"
import { useNavigate } from 'react-router-dom'
import { HeaderProfileSummary } from "@/features/profile/components/HeaderProfileSummary"

export function Header() {
    const [isDark, setIsDark] = useState(false);
    const user = useCurrentUser();
    const { toggle } = useSidebar();
    const navigate = useNavigate();

    function handleLogout() {
        localStorage.clear();
        navigate("/login")
    }

    return (
        <div className="mg-header flex flex-row items-center justify-between">
            {/* Левая сторона */}
            <div className="pl-6 flex flex row space-x-4 items-center">
                <Button
                    icon={ <HiMenu size={20}/> }
                    variant="outline"
                    onClick={toggle}
                />
                <h1 className="font-logo  text-3xl text-mg-purple">Mergen</h1>
            </div>

            {/* Правая сторона */}
            <div className="pr-6 flex flex row space-x-4 items-center">

                {/* Кнопка темы */}
                <Button
                    icon={isDark ? <AiFillSun size={18}/> : <IoMdMoon size={18}/>}
                    variant="outline"
                    onClick={() => {
                        setIsDark(!isDark);
                        document.documentElement.dataset.theme = isDark ? "" : "dark";
                    }}
                />
                {/* Аватарка + личная информация, кликабельно -> профиль */}
                <HeaderProfileSummary user={user} />

                {/* Кнопка выхода */}
                <Button
                    icon={<FiLogIn size={16}/>}
                    text="Выйти"
                    variant="outline"
                    size="sm"
                    className={"bg-mg-surface hover:bg-mg-surface-2"}
                    onClick={handleLogout}
                />
            </div>
        </div>
    )
}