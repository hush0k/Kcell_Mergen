import { useState } from "react";
import { Tele2Input } from "@/features/tele2/Tele2Input";
import { Tele2LogTable } from "@/features/tele2/Tele2LogTable";

export function Tele2Page() {
    const [numbers, setNumbers] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => setRefreshKey((k) => k + 1);

    return (
        <div className="flex flex-col min-h-full pl-10 py-10 pr-24 space-y-6">
            <div className="flex flex-col space-y-2">
                <p className={"uppercase text-sm text-mg-text-3 font-bold"}>сервис</p>
                <h1 className={"font-bold text-3xl text-mg-purple"}>Tele2 - выгрузка номеров</h1>
                <p className={"text-mg-text-2"}>Номера - по одному на строку.</p>
            </div>

            <Tele2Input value={numbers} onChange={setNumbers} onDone={refresh} />

            <Tele2LogTable refreshKey={refreshKey} />
        </div>
    );
}