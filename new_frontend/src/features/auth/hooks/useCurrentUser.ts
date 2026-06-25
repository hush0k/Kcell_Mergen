// src/features/auth/useCurrentUser.ts
import { useEffect, useState } from "react";
import { api } from "@/api/resources";
import type { CurrentUser } from "@/types/api";

export function useCurrentUser() {
    const [user, setUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        api.auth.me().then(setUser).catch(() => setUser(null));
    }, []);

    return user;
}