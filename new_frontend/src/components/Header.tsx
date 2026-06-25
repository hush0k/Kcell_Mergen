import { Button } from '@/components/Button';
import { HiMenu } from "react-icons/hi";
import { FiLogIn } from "react-icons/fi";
import { IoMdMoon } from "react-icons/io";
import { AiFillSun } from "react-icons/ai";
import { useState } from "react"
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser"

function getInitials(firstName?: string, lastName?: string) {
    if (!firstName || !lastName) return "?";
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function Header() {
    const [isDark, setIsDark] = useState(false);
    const user = useCurrentUser();

    return (
        <div className="mg-header flex flex-row items-center justify-between">
            {/* Левая сторона */}
            <div className="pl-6 flex flex row space-x-4 items-center">
                <Button
                    icon={ <HiMenu size={20}/> }
                    variant="outline"
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

                {/* Типо аватарка */}
                <div className="mg-avatar">
                    {user ? getInitials(user.first_name, user.last_name) : "..."}
                </div>

                {/* Личное информация */}
                <div className="flex flex-col">
                    <span className="whitespace-nowrap font-semibold">{user ? user.first_name[0] : "U"}.{user ? user.last_name : "Unknown"}</span>
                    <span className="text-mg-text-3">{user ? user.role : "User"}</span>

                </div>

                {/* Кнопка выхода */}
                <Button
                    icon={<FiLogIn size={16}/>}
                    text="Выйти"
                    variant="outline"
                    size="sm"
                    className={"bg-mg-surface hover:bg-mg-surface-2"}
                />
            </div>
        </div>
    )
}