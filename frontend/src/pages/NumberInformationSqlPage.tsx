import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api/resources";

export function NumberInformationSqlPage() {
    const { id } = useParams();
    const [sqlQuery, setSqlQuery] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!id) {
            setLoaded(true);
            return;
        }
        api.numberInformation
            .getLog(Number(id))
            .then((log) => setSqlQuery(log.sql_request))
            .catch(() => setSqlQuery(null))
            .finally(() => setLoaded(true));
    }, [id]);

    return (
        <div className="min-h-screen w-full bg-white p-10">
            <pre className="whitespace-pre-wrap font-mono text-sm text-black">
                {!loaded ? "Загрузка..." : (sqlQuery ?? "Запрос не найден")}
            </pre>
        </div>
    );
}
