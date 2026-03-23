"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getAportantesData() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('aportes')
        .select(`
            id,
            empresa_ruc,
            anio,
            monto,
            empresas!inner (
                ruc,
                razon_social,
                ciiu_id,
                sectores_ciiu!inner (
                    id,
                    seccion_desc
                )
            )
        `);

    if (error) {
        console.error('Error fetching aportes:', error);
        return [];
    }

    return data.map((row: any) => ({
        id: row.id,
        ruc: row.empresa_ruc,
        anio: row.anio,
        monto: row.monto,
        razon_social: row.empresas?.razon_social || 'Desconocido',
        seccion_desc: row.empresas?.sectores_ciiu?.seccion_desc || 'Desconocido'
    }));
}

export async function getSectoresDistintos() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('sectores_ciiu')
        .select('seccion_desc');

    if (error) return [];
    const unique = Array.from(new Set(data.map((s: any) => s.seccion_desc).filter(Boolean)));
    return (unique as string[]).sort();
}
