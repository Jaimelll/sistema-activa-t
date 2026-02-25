"use client";

import { Sidebar } from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            // BLOQUEO ROBUSTO: Maneja rcabajal / rcarbajal
            const isRestricted = user?.email?.toLowerCase().includes('bajal@fondoempleo.com.pe');

            if (isRestricted && pathname !== '/dashboard') {
                router.push('/dashboard');
            } else {
                setLoading(false);
            }
        };
        checkAccess();
    }, [pathname, router, supabase.auth]);

    if (loading && pathname !== '/dashboard') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 relative">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
