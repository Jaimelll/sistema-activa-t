"use client";

// Botón de la página de Informes de Impacto: vuelve a proyectar todos los
// informes sobre la bitácora de etapas de los proyectos (ver impacto.ts).
// Necesario para los informes que ya existían antes de la sincronización
// automática, y como red de seguridad si la tabla se edita por fuera.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { reconciliarInformesImpacto } from '../actions';

export default function ReconciliarImpacto() {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [corriendo, setCorriendo] = useState(false);
    const [resumen, setResumen] = useState<string | null>(null);
    const [avisos, setAvisos] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setError(null);
        setResumen(null);
        setAvisos([]);
        setCorriendo(true);
        const res = await reconciliarInformesImpacto();
        setCorriendo(false);
        if (!res.ok) {
            setError(res.error ?? 'No se pudo reconciliar.');
            return;
        }
        setResumen(res.resumen ?? 'Sin cambios.');
        setAvisos(res.avisos ?? []);
        startTransition(() => router.refresh());
    }

    return (
        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                    Cada informe mueve a los proyectos de su grupo (y línea, si la
                    declara) a la etapa <strong>Impacto</strong>, con fecha igual a su
                    inicio. Eliminar el informe los devuelve a su etapa anterior.
                </p>
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={corriendo}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${corriendo ? 'animate-spin' : ''}`} />
                    {corriendo ? 'Reconciliando…' : 'Reconciliar informes'}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {resumen && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">
                    {resumen}
                </div>
            )}

            {avisos.length > 0 && (
                <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-8 py-2 text-sm text-amber-800">
                    {avisos.map((a, i) => (
                        <li key={i}>{a}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
