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
        return { data: [], annualTotals: {} };
    }

    const annualTotals: Record<number, number> = {};
    const mappedData = data.map((row: any) => {
        const monto = Number(row.monto) || 0;
        const anio = Number(row.anio);
        annualTotals[anio] = (annualTotals[anio] || 0) + monto;

        return {
            id: row.id,
            ruc: row.empresa_ruc,
            anio,
            monto,
            razon_social: row.empresas?.razon_social || 'Desconocido',
            seccion_desc: row.empresas?.sectores_ciiu?.seccion_desc || 'Desconocido'
        };
    });

    return { 
        data: mappedData, 
        annualTotals 
    };
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

export async function getUnidadesOperativas() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('unidades_operativas')
        .select('id, siglas, nombre_completo, orden')
        .order('orden', { ascending: true });

    if (error) {
        console.error('Error fetching unidades operativas:', error);
        return [];
    }
    return data;
}

export async function getPresupuestoMensual(unidadId: number) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('presupuesto_mensual')
        .select('*')
        .eq('unidad_operativa_id', unidadId)
        .order('mes', { ascending: true });

    if (error) {
        console.error('Error fetching presupuesto mensual:', error);
        return [];
    }
    return data;
}

export async function getPresupuestoComparativo(unidadId: number) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('presupuesto_anual_comparativo')
        .select('*')
        .eq('unidad_operativa_id', unidadId)
        .order('año', { ascending: true });

    if (error) {
        console.error('Error fetching presupuesto comparativo:', error);
        return [];
    }
    return data;
}
