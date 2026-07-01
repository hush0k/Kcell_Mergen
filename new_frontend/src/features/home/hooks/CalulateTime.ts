export interface TimeDay {
    kind: "day";
    days: number;
    hours: number;
    minutes: number;
}
export interface TimeHours {
    kind: "hours";
    hours: number;
    minutes: number;
}
export interface TimeMinutes {
    kind: "minutes";
    minutes: number;
}

export type Time = TimeDay | TimeHours | TimeMinutes;

export function calculateTime(time: number | null): Time | null {
    if (time === null) return null;
    if (time >= 1440) {
        const totalHours = Math.floor(time / 60);
        const minutes = time % 60;
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        return { kind: "day", days, hours, minutes };
    }
    if (time < 60) {
        return { kind: "minutes", minutes: time };
    }
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    return { kind: "hours", hours, minutes };
}

export function diffMinutes(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export function renderTime(t: Time | null): string {
    if (!t) return "—";
    switch (t.kind) {
        case "day": return `${t.days} дн ${t.hours} ч ${t.minutes} мин`;
        case "hours": return `${t.hours} ч ${t.minutes} мин`;
        case "minutes": return `${t.minutes} мин`;
    }
}