import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { getNormalizedEmail, SUPER_ADMIN } from '@/config/permissions';
import { esTablaValida, etiquetaTabla, COLUMNAS_OCULTAS } from '../tablas';
import { getColumnas, getFilas, getOpcionesCombo } from '../actions';
import CatalogoEditor from './CatalogoEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CatalogoDetallePage({
    params,
}: {
    params: Promise<{ tabla: string }>;
}) {
    noStore();
    const { tabla } = await params;
    if (!esTablaValida(tabla)) notFound();

    // Guarda de página: solo el super admin.
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (getNormalizedEmail(user?.email) !== SUPER_ADMIN) {
        redirect('/dashboard');
    }

    const [columnasTodas, filas, opcionesCombo] = await Promise.all([
        getColumnas(tabla),
        getFilas(tabla),
        getOpcionesCombo(tabla),
    ]);

    const ocultas = COLUMNAS_OCULTAS[tabla] ?? [];
    const columnas = columnasTodas.filter((c) => !ocultas.includes(c.name));

    return (
        <div className="max-w-7xl space-y-4">
            <Link
                href="/dashboard/catalogos"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
                <ChevronLeft className="h-4 w-4" /> Catálogos
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    {etiquetaTabla(tabla)}
                </h1>
                <p className="text-sm text-gray-500">
                    {filas.length.toLocaleString('es-PE')} elementos ·{' '}
                    <span className="font-mono text-xs">{tabla}</span>
                </p>
            </div>

            {columnas.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    No se pudieron detectar las columnas de esta tabla (¿está vacía
                    y sin el RPC <code>catalogo_columnas</code>?). Ejecuta{' '}
                    <code>scripts/catalogo_introspection.sql</code> en Supabase para
                    habilitar la introspección incluso de tablas vacías.
                </div>
            ) : (
                <CatalogoEditor tabla={tabla} columnas={columnas} filas={filas} opcionesCombo={opcionesCombo} />
            )}
        </div>
    );
}
