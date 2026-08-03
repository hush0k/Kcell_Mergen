import type { User, UserBrief } from "@/types/api";

export const PAGE_SIZE = 20;

export const isAdminRole = (role: string | null | undefined) => role === "ADMIN";

export const formatUserName = (user: User | UserBrief) => {
    if (user.is_og) return "ОГ";

    const name = `${user.last_name ?? ""} ${user.first_name ?? ""}`.trim();
    return name || user.username;
};
