"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function DemoLoginButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleDemoLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: 'demo@demo.com',
            password: 'demo123',
        });

        if (error) {
            setLoading(false);
            alert('Error en el acceso demo, contacte al administrador');
            return;
        }

        router.push('/dashboard');
    };

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-2 px-4 rounded transition-colors text-sm flex items-center justify-center"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Conectando...
                    </>
                ) : (
                    'Entrar como Demo (Solo Presentación)'
                )}
            </button>
        </div>
    );
}
