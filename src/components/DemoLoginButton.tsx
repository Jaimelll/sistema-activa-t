"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export function DemoLoginButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFallback, setShowFallback] = useState(false);

    const handleDemoLogin = async () => {
        console.log('[DemoLogin] Click detectado');
        setLoading(true);
        setError(null);
        setShowFallback(false);

        const supabase = createClient();

        try {
            // 1. Limpiar sesión previa
            await supabase.auth.signOut();
            console.log('[DemoLogin] signOut OK');

            // 2. Login
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: 'demo@demo.com',
                password: 'demo123',
            });

            if (loginError) {
                console.error('[DemoLogin] Error login:', loginError.message);
                setError('Error en el acceso demo: ' + loginError.message);
                setLoading(false);
                return;
            }

            console.log('[DemoLogin] signIn OK');

            // 3. Forzar escritura de cookies
            const { data: sessionData } = await supabase.auth.getSession();
            console.log('[DemoLogin] getSession OK, session:', !!sessionData?.session);

            // 4. Mostrar fallback inmediato
            setShowFallback(true);

            // 5. Redirigir con setTimeout para salir del contexto React
            setTimeout(() => {
                console.log('[DemoLogin] Ejecutando window.location.assign...');
                window.location.assign('/dashboard');
            }, 500);

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
            {showFallback ? (
                <div className="text-center">
                    <p className="text-sm text-green-700 font-semibold mb-2">✅ Sesión iniciada correctamente</p>
                    <p className="text-xs text-gray-600 mb-2">Redirigiendo...</p>
                    <a
                        href="/dashboard"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors text-sm"
                    >
                        Si no redirige, haga clic aquí →
                    </a>
                </div>
            ) : (
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
            )}
        </div>
    );
}
