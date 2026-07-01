import { useState, useEffect } from 'react';

export function useSessionStorage<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
        const saved = sessionStorage.getItem(key);
        return saved ? JSON.parse(saved) : initial;
    });

    useEffect(() => {
        sessionStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, setValue] as const;
}