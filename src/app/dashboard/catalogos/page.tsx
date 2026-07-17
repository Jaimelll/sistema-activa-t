import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Database } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { puedeVerCatalogos, puedeEditarCatalogos } from '@/config/permissions';
import { TABLAS, etiquetaTabla } from './tablas';
import { getConteo } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CatalogosPage() {
    noStore();

    // Guarda de página: super admin (edición) o módulo Catálogos (solo lectura).
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!puedeVerCatalogos(user?.email)) {
        redirect('/dashboard');
    }
    const soloLectura = !puedeEditarCatalogos(user?.email);

    const conteos = await Promise.all(
        TABLAS.map(async (t) => ({ tabla: t, count: await getConteo(t) })),
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Database className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Catálogos
                        {soloLectura && (
                            <span className="ml-3 align-middle rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                                Solo lectura
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {soloLectura
                            ? 'Tablas de referencia del sistema. Haz clic en una para consultar sus elementos.'
                            : 'Tablas de referencia del sistema. Haz clic en una para ver, agregar, editar o eliminar sus elementos.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {conteos.map(({ tabla, count }) => (
                    <Link
                        key={tabla}
                        href={`/dashboard/catalogos/${tabla}`}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
                    >
                        <div className="text-sm font-medium text-gray-700">
                            {etiquetaTabla(tabla)}
                        </div>
                        <div className="mt-1 text-2xl font-bold text-primary">
                            {count.toLocaleString('es-PE')}
                        </div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-400">
                            {tabla}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
