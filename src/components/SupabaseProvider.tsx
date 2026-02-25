"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const Context = createContext<any>(undefined);

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const [supabase] = useState(() => createClient());
    const router = useRouter();

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            router.refresh();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, supabase]);

    return (
        <Context.Provider value={{ supabase }}>
            <>{children}</>
        </Context.Provider>
    );
}

export const useSupabase = () => {
    const context = useContext(Context);
    if (context === undefined) {
        throw new Error("useSupabase must be used inside SupabaseProvider");
    }
    return context;
};
