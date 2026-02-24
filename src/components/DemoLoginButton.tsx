"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export function DemoLoginButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleDemoLogin = async () => {
        setLoading(true);
        setError(null);

        // Timeout de 5 segundos
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
        );

        try {
            const result = await Promise.race([
                supabase.auth.signInWithPassword({
                    email: 'demo@demo.com',
                    password: 'demo123',
                }),
                timeout,
            ]);

            if (result.error) {
                setError('Error en el acceso demo, contacte al administrador');
                setLoading(false);
                return;
            }

            // Redirección forzada (hard reload para que middleware vea la sesión)
            window.location.href = '/dashboard';
        } catch (e: any) {
            if (e?.message === 'timeout') {
                setError('La conexión tardó demasiado. Intente nuevamente.');
            } else {
                setError('Error en el acceso demo, contacte al administrador');
            }
            setLoading(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            {error && (
                <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-xs text-center">
                    {error}
                </div>
            )}
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
