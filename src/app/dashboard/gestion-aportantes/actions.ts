"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getEmpresasData() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('empresas')
        .select(`
            ruc,
            razon_social,
            ciiu_id,
            sectores_ciiu (
                id,
                seccion_desc,
                ciiu_codigo
            ),
            aportes (
                id,
                anio,
                monto
            )
        `);

    if (error) {
        console.error('Error fetching empresas:', error);
        return [];
    }

    return data.map((e: any) => ({
        ruc: e.ruc,
        razon_social: e.razon_social,
        ciiu_id: e.ciiu_id,
        sector: e.sectores_ciiu?.seccion_desc || 'Desconocido',
        ciiu_codigo: e.sectores_ciiu?.ciiu_codigo || '',
        total_aportes: e.aportes?.reduce((sum: number, a: any) => sum + a.monto, 0) || 0,
        aportes_count: e.aportes?.length || 0,
        aportes: (e.aportes || []).sort((a: any, b: any) => b.anio - a.anio)
    }));
}

export async function getAllSectores() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('sectores_ciiu')
        .select('id, ciiu_codigo, seccion_desc')
        .order('seccion_desc');

    if (error) return [];
    return data;
}

export async function createEmpresa(payload: { ruc: string; razon_social: string; ciiu_id: number }) {
    const supabase = await createClient();
    const { error } = await supabase.from('empresas').insert(payload);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function updateEmpresa(ruc: string, payload: { razon_social: string; ciiu_id: number }) {
    const supabase = await createClient();
    const { error } = await supabase.from('empresas').update(payload).eq('ruc', ruc);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function createAporte(payload: { empresa_ruc: string; anio: number; monto: number }) {
    const supabase = await createClient();
    const { error } = await supabase.from('aportes').insert(payload);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function updateAporte(id: string, payload: { anio: number; monto: number }) {
    const supabase = await createClient();
    const { error } = await supabase.from('aportes').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function deleteAporte(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('aportes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}
