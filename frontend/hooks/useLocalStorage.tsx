import { useLocalStorage as useSolanaLocalStorage } from "@solana/wallet-adapter-react"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

export default function useLocalStorage<T>(key: string, defaultState: T): [T, Dispatch<SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const value = localStorage.getItem(key);
            if (value) return JSON.parse(value) as T;
        } catch (error: any) {
            if (typeof window !== 'undefined') {
                console.error(error);
            }
        }

        return defaultState;
    });
    const isFirstRenderRef = useRef(true);
    useEffect(() => {
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            return;
        }
        try {
            if (storedValue === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(storedValue));
            }
        } catch (error: any) {
            if (typeof window !== 'undefined') {
                console.error(error);
            }
        }
    }, [storedValue, key]);

    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const item = localStorage.getItem(key);
                setStoredValue(item ? JSON.parse(item) : defaultState);
            } catch (error: any) {
                console.error(error);
            }
        }
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        }
    }, [defaultState, key, setStoredValue])

    return [storedValue, setStoredValue];
}