"use client";

import { Sidebar } from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                router.push('/auth/login');
            } else {
                setLoading(false);
            }
        };
        checkAccess();
    }, [router, supabase.auth]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 relative">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen bg-slate-50">
                <div className="w-full mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
