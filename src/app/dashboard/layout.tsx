"use client";

import { Sidebar } from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { PERMISOS_POR_USUARIO, getNormalizedEmail } from '@/config/permissions';

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
        // Notificación de acceso restringido
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('error') === 'restriccion') {
                alert('Acceso restringido: No tienes permisos para ver este módulo.');
                router.replace('/dashboard');
            }
        }

        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const email = getNormalizedEmail(user?.email);
            const permisos = PERMISOS_POR_USUARIO[email];

            let isAllowed = true;
            if (permisos) {
                if (permisos.rutasPermitidas && !permisos.rutasPermitidas.includes(pathname)) {
                    isAllowed = false;
                }
                if (permisos.rutasBloqueadas && permisos.rutasBloqueadas.some(r => pathname.startsWith(r))) {
                    isAllowed = false;
                }
            }

            if (!isAllowed) {
                router.push('/dashboard?error=restriccion');
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
            <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen bg-slate-50">
                <div className="w-full mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
