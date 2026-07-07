import { useState } from "react";
import { NumberInput } from "@/features/mfs/NumberInput";
import { BlackListButtons } from "@/features/mfs/BlackListButtons";
import { CommentAtlas } from "@/features/mfs/CommentAtlas";
import { OperationsLog } from "@/features/mfs/OperationsLog";

export function MfsPage() {
    const [msisdns, setMsisdns] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => setRefreshKey((k) => k + 1);

    return (
        <div className="flex flex-col min-h-full pl-10 py-10 pr-24 space-y-6">
            <div className="flex flex-col space-y-2">
                <p className={"uppercase text-sm text-mg-text-3 font-bold"}>сервис</p>
                <h1 className={"font-bold text-3xl text-mg-purple"}>МФС - чёрный список и комментарии Atlas</h1>
                <p className={"text-mg-text-2"}>Номера - по одному на строку (последние 10 цифр, префикс 7).</p>
            </div>

            <NumberInput value={msisdns} onChange={setMsisdns} />

            <BlackListButtons msisdns={msisdns} onDone={refresh} />

            <CommentAtlas msisdns={msisdns} onDone={refresh} />

            <OperationsLog refreshKey={refreshKey} />
        </div>
    )
}
