"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export function DemoLoginButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFallback, setShowFallback] = useState(false);

    const handleDemoLogin = async () => {
        console.log('[DemoLogin] Botón presionado');
        setLoading(true);
        setError(null);
        setShowFallback(false);

        const supabase = createClient();

        try {
            // 1. Cerrar sesión previa
            console.log('[DemoLogin] signOut...');
            await supabase.auth.signOut();

            // 2. Login con credenciales demo
            console.log('[DemoLogin] signInWithPassword...');

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
                    setError('Error en el acceso demo: ' + result.error.message);
                }
                setLoading(false);
                return;
            }

            console.log('[DemoLogin] Login exitoso');

            // 3. Forzar refresco de sesión para que las cookies se escriban
            console.log('[DemoLogin] Refrescando sesión (getSession)...');
            await supabase.auth.getSession();

            // 4. Pequeña espera para asegurar que las cookies se persistan
            await new Promise((r) => setTimeout(r, 300));

            console.log('[DemoLogin] Redirigiendo...');

            // 5. Mostrar fallback por si la redirección no funciona
            setShowFallback(true);

            // 6. Redirección forzada con cache-bust
            window.location.replace('/dashboard?t=' + Date.now());

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
            {showFallback && (
                <p className="mt-2 text-center text-xs text-gray-600">
                    Sesión iniciada. Si no redirige,{' '}
                    <a href="/dashboard" className="text-blue-600 underline font-semibold">
                        haga clic aquí
                    </a>
                </p>
            )}
        </div>
    );
}
