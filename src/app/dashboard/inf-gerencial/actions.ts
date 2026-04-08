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

export async function getPresupuestoMensual() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('presupuesto_mensual')
        .select(`
            mes,
            monto,
            unidades_operativas:unidad_operativa_id (siglas)
        `);

    if (error) {
        console.error('Error fetching presupuesto mensual consolidado:', error);
        return [];
    }

    // Initialize 12 months
    const result = Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1,
        total: 0
    } as any));

    data.forEach((row: any) => {
        const idx = (row.mes || 1) - 1;
        const siglas = (row.unidades_operativas as any)?.siglas;
        const monto = Number(row.monto) || 0;
        
        if (siglas) {
            result[idx][siglas] = (result[idx][siglas] || 0) + monto;
        }
        result[idx].total += monto;
    });

    return result;
}

export async function getPresupuestoComparativo() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('presupuesto_anual_comparativo')
        .select(`
            año, 
            poi, 
            ejecutado,
            unidades_operativas:unidad_operativa_id (siglas)
        `);

    if (error) {
        console.error('Error fetching presupuesto comparativo consolidado:', error);
        return [];
    }

    const consolidated = data.reduce((acc: any, curr: any) => {
        const year = curr.año;
        if (!acc[year]) acc[year] = { 
            año: year, 
            poi: 0, 
            ejecutado: 0,
            poiBreakdown: {},
            ejecutadoBreakdown: {}
        };
        
        const siglas = (curr.unidades_operativas as any)?.siglas || 'OTR';
        const poiMonto = Number(curr.poi) || 0;
        const ejecMonto = Number(curr.ejecutado) || 0;

        acc[year].poi += poiMonto;
        acc[year].ejecutado += ejecMonto;

        if (siglas) {
            acc[year].poiBreakdown[siglas] = (acc[year].poiBreakdown[siglas] || 0) + poiMonto;
            acc[year].ejecutadoBreakdown[siglas] = (acc[year].ejecutadoBreakdown[siglas] || 0) + ejecMonto;
        }

        return acc;
    }, {});

    return Object.values(consolidated).sort((a: any, b: any) => (a as any).año - (b as any).año);
}
