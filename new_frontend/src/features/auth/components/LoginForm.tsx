import { Input } from "@/components/Input"
import { useState } from "react"
import { EyeClosed } from 'lucide-react';
import { Eye } from 'lucide-react';
import { Button } from  '@/components/Button'


export function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);

    return (
        <div className="inline-flex flex-row shadow-mg-login bg-mg-bg">
            <div className="flex flex-col justify-between px-12 py-14 relative overflow-hidden bg-mg-purple w-[32rem] h-[34rem] rounded-l-login">


                <div className="flex flex-col space-y-4 items-start text-mg-surface text-base">
                    <h1 className="font-logo  text-5xl">Mergen</h1>
                    <div className="w-16 h-1 bg-mg-lime m-0 rounded-lg" />
                    <p>Внутренний инструмент мониторинга и контроля задач — <span className="font-bold ">АО Kcell</span>.</p>
                </div>

                <div className="text-mg-surface text-base">
                    <ul className="list-disc list-inside marker:text-mg-lime">
                        <li>Контроль исполнения в реальном времени</li>
                        <li>Управление инцидентами</li>
                        <li>Единый реестр задач отделов</li>
                    </ul>
                </div>

                <div
                    style={{
                        position: "absolute",
                        width: "340px",
                        height: "340px",
                        borderRadius: "50%",
                        right: "-120px",
                        top: "-110px",
                        background: "radial-gradient(circle at 30% 30%, rgba(168, 216, 95, 0.55), rgba(168, 216, 95, 0) 70%)"
                    }}
                />

                <div
                    style={{
                        position: "absolute",
                        width: "230px",
                        height: "230px",
                        borderRadius: "50%",
                        left: "-90px",
                        bottom: "-70px",
                        background: "radial-gradient(circle, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 70%)"
                    }}
                />

            </div>
            <div className="bg-mg-surface w-[32rem] h-[34rem] rounded-r-login px-12 py-24">
                <div>
                    <h2 className="text-2xl font-semibold">Вход в систему</h2>
                    <p className="text-base text-mg-text-2">Введите учётные данные сотрудника</p>
                </div>
                <div className="flex flex-col space-y-5 text-xs font-semibold text-mg-text-2 mt-7">
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="usermame">Имя пользователя</label>
                        <Input
                            id="usermame"
                            placeholder="azamat.turgan"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="password">Имя пользователя</label>
                        <div className="relative w-full">
                            <Input
                                placeholder="••••••••"
                                type={show ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-6 top-1/2 -translate-y-1/2"
                                onClick={() => setShow(!show)}
                            >
                                {show ? <Eye
                                        size={20}
                                        strokeWidth={2.2}
                                        color="var(--mg-text-3)"
                                    /> : <EyeClosed
                                        size={20}
                                        strokeWidth={2.2}
                                        color="var(--mg-text-3)"
                                    />
                                }
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-row justify-between">
                        <div className="flex flex-row gap-2 font-normal text-sm">
                            <input
                                id="save_password"
                                type="checkbox"
                                className="w-4 h-4 rounded accent-[var(--mg-purple)] cursor-pointer"
                            />
                            <label htmlFor="save_password" className="leading-none cursor-pointer select-none">Запомнить меня</label>
                        </div>

                        <p
                            className="font-bold text text-mg-purple text-sm cursor-pointer"
                            onClick={() => alert("Обратитесь к Адилету. Он вам точно поможет : )")}
                        >Забыли пароль?</p>
                    </div>
                    <div>
                        <Button text="Войти"/>
                    </div>
                </div>
                <p className="text-mg-text-3 text-xs font-light mt-6">© 2026 АО Kcell · Внутренний инструмент Mergen</p>
            </div>

        </div>
    )
}