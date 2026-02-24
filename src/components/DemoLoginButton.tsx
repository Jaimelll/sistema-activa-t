"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export function DemoLoginButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleDemoLogin = async () => {
        console.log('[DemoLogin] Click');
        setLoading(true);
        setError(null);

        const supabase = createClient();

        try {
            await supabase.auth.signOut();
            console.log('[DemoLogin] signOut OK');

            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: 'demo@demo.com',
                password: 'demo123',
            });

            if (loginError) {
                console.error('[DemoLogin] Error:', loginError.message);
                setError('Error en el acceso demo: ' + loginError.message);
                setLoading(false);
                return;
            }

            console.log('[DemoLogin] signIn OK');
            await supabase.auth.getSession();
            console.log('[DemoLogin] getSession OK');

            // Mostrar estado de éxito con enlace manual
            setSuccess(true);
            setLoading(false);

            // Redirigir con 800ms de retraso usando URL absoluta
            setTimeout(() => {
                console.log('[DemoLogin] Redirigiendo con location.href...');
                document.location.href = window.location.origin + '/dashboard';
            }, 800);

        } catch (e: any) {
            console.error('[DemoLogin] Excepción:', e);
            setError('Error inesperado: ' + (e?.message || 'desconocido'));
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <p className="text-sm text-green-700 font-semibold mb-2">✅ Sesión iniciada correctamente</p>
                <p className="text-xs text-gray-500 mb-3">Redirigiendo automáticamente...</p>
                <a
                    href="/dashboard"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors text-sm no-underline"
                >
                    Si no redirige, haga clic aquí →
                </a>
            </div>
        );
    }

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
