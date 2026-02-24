"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export function DemoLoginButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDemoLogin = async () => {
        console.log('[DemoLogin] Botón presionado, iniciando login...');
        setLoading(true);
        setError(null);

        const supabase = createClient();

        try {
            // 1. Cerrar sesión previa para evitar conflictos
            console.log('[DemoLogin] Cerrando sesión previa...');
            await supabase.auth.signOut();

            // 2. Login con credenciales demo
            console.log('[DemoLogin] Intentando signInWithPassword...');

            const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 5000)
            );

            const loginPromise = supabase.auth.signInWithPassword({
                email: 'demo@demo.com',
                password: 'demo123',
            });

            const result = await Promise.race([loginPromise, timeoutPromise]);

            if (result.error) {
                console.error('[DemoLogin] Error:', result.error.message);
                if (result.error.message === 'timeout') {
                    setError('La conexión tardó demasiado. Intente nuevamente.');
                } else {
                    setError('Error en el acceso demo, contacte al administrador: ' + result.error.message);
                }
                setLoading(false);
                return;
            }

            console.log('[DemoLogin] Login exitoso, session:', result.data);
            console.log('[DemoLogin] Redirigiendo a /dashboard...');

            // 3. Redirección forzada con replace (limpia historial)
            window.location.replace('/dashboard');

        } catch (e: any) {
            console.error('[DemoLogin] Excepción:', e);
            setError('Error inesperado: ' + (e?.message || 'desconocido'));
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
