"use server";

// ─── CLIENTE ADMIN (bypassa RLS) ────────────────────────────────────────────
// Igual que en gestion-servicios/actions.ts: usamos el service role key para
// que las operaciones de escritura no sean bloqueadas por Row Level Security.
import { createClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminSupabase() {
    return createClient(supabaseUrl, supabaseServiceKey);
}

// ─── Helper: cliente regular (solo lectura pública / con RLS) ────────────────
import { createClient as createSSRClient } from '@/utils/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────

export async function getAniosAportes() {
    return [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];
}

export async function getEmpresasData(anioFiltro: string | number = 'Todos') {
    noStore();
    const supabase = await createSSRClient();
    let result;

    if (anioFiltro && anioFiltro !== 'Todos') {
        result = await supabase.from('empresas').select('ruc, razon_social, ciiu_id, sectores_ciiu(id, seccion_desc, ciiu_codigo), aportes!inner(id, anio, monto)').eq('aportes.anio', Number(anioFiltro));
    } else {
        result = await supabase.from('empresas').select('ruc, razon_social, ciiu_id, sectores_ciiu(id, seccion_desc, ciiu_codigo), aportes(id, anio, monto)');
    }

    const { data, error } = result;
    if (error) return [];

    return data.map((e: any) => ({
        ruc: e.ruc,
        razon_social: e.razon_social,
        ciiu_id: e.ciiu_id,
        sector: e.sectores_ciiu?.seccion_desc || 'Desconocido',
        total_aportes: e.aportes?.reduce((sum: number, a: any) => sum + Number(a.monto), 0) || 0,
        aportes_count: e.aportes?.length || 0,
        aportes: (e.aportes || []).sort((a: any, b: any) => b.anio - a.anio)
    }));
}

export async function getAllSectores() {
    const supabase = await createSSRClient();
    const { data, error } = await supabase
        .from('sectores_ciiu')
        .select('id, ciiu_codigo, seccion_desc')
        .order('seccion_desc');

    if (error) return [];
    return data;
}

export async function createEmpresa(payload: { ruc: string; razon_social: string; ciiu_id: number }) {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('empresas').insert(payload);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function updateEmpresa(ruc: string, payload: { razon_social: string; ciiu_id: number }) {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('empresas').update(payload).eq('ruc', ruc);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function createAporte(payload: { empresa_ruc: string; anio: number; monto: number }) {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('aportes').insert(payload);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function updateAporte(id: string, payload: { anio: number; monto: number }) {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('aportes').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

export async function deleteAporte(id: string) {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('aportes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/gestion-aportantes');
}

// ─── FINANZAS ANUAL ──────────────────────────────────────────────────────────

export async function getFinancialSummary() {
    noStore();
    // También usamos el admin client para leer sin bloqueos de RLS
    const supabase = getAdminSupabase();
    const rubros = ['Intereses', 'G. Operativos', 'Proyectos', 'Becas', 'Saldos en Bancos'];

    const { data, error } = await supabase
        .from('finanzas_anual')
        .select('id, rubro, monto')
        .eq('año', 2026)
        .eq('escenario', 'Real')
        .in('rubro', rubros);

    if (error) {
        console.error('[SERVER] Error al obtener resumen financiero:', error);
        return {};
    }

    console.log('[SERVER] Datos financieros cargados:', JSON.stringify(data));

    return data.reduce((acc: any, curr: any) => {
        acc[curr.rubro.trim()] = {
            id: curr.id,
            monto: curr.monto
        };
        return acc;
    }, {});
}

export async function updateFinancialSummary(updates: { id: number; monto: number; rubro?: string }[]) {
    // ⚠️ CRÍTICO: Usar el cliente admin (service role) para sortear RLS en esta tabla
    const supabase = getAdminSupabase();

    console.log('[SERVER] updateFinancialSummary — Payload recibido:', JSON.stringify(updates));

    for (const update of updates) {
        const idLimpio = Number(update.id);
        const montoLimpio = parseFloat(String(update.monto));

        if (isNaN(montoLimpio) || isNaN(idLimpio)) {
            throw new Error(`Valor inválido: id=${update.id}, monto=${update.monto}`);
        }

        console.log(`[SERVER] Enviando a Supabase → id=${idLimpio} | rubro=${update.rubro} | monto=${montoLimpio}`);

        const { data, error, status } = await supabase
            .from('finanzas_anual')
            .update({ monto: montoLimpio })
            .eq('id', idLimpio)
            .select();

        if (error) {
            console.error(`[SERVER] Error Supabase en id=${idLimpio}:`, error);
            throw new Error(`Error en rubro "${update.rubro}" (id ${idLimpio}): ${error.message}`);
        }

        const filasAfectadas = data?.length ?? 0;
        console.log(`[SERVER] id=${idLimpio} → status=${status} | filas_afectadas=${filasAfectadas}`);

        if (filasAfectadas === 0) {
            throw new Error(
                `Fallo al guardar "${update.rubro}": 0 filas afectadas. Posible bloqueo RLS o ID inexistente.`
            );
        }
    }

    revalidatePath('/dashboard/gestion-aportantes');
    console.log('[SERVER] Todas las actualizaciones completadas y caché revalidada.');
}
