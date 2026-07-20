"use server";

import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { fetchAllRows } from '@/utils/supabase/fetchAll';

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
            presupuesto,
            ejecutado,
            unidades_operativas:unidad_operativa_id (siglas)
        `);

    if (error) {
        console.error('Error fetching presupuesto mensual consolidado:', error);
        return [];
    }

    // Initialize 12 months
    const result = Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1,
        presupuesto: 0,
        ejecutado: 0,
        presupuestoBreakdown: {},
        ejecutadoBreakdown: {}
    } as any));

    data.forEach((row: any) => {
        const idx = (row.mes || 1) - 1;
        if (idx < 0 || idx > 11) return;

        const siglas = (row.unidades_operativas as any)?.siglas || 'OTR';
        const presuMonto = Number(row.presupuesto) || 0;
        const ejecMonto = Number(row.ejecutado) || 0;
        
        result[idx].presupuesto += presuMonto;
        result[idx].ejecutado += ejecMonto;

        if (siglas) {
            result[idx].presupuestoBreakdown[siglas] = (result[idx].presupuestoBreakdown[siglas] || 0) + presuMonto;
            result[idx].ejecutadoBreakdown[siglas] = (result[idx].ejecutadoBreakdown[siglas] || 0) + ejecMonto;
        }
    });

    return result;
}


// Fases de "proyectos"/"grupo" que cuentan como financiamiento en curso
// (excluye Resuelto/Pre-Impacto/Impacto/Cierre Administrativo, que son
// grupos ya cerrados históricamente y no aportan a "en ejecución").
const FASES_EN_EJECUCION = ['Etapa Concursal', 'Acciones Preparatorias', 'En Ejecución'];

function grupoBaseProyecto(descripcion: string): string {
    const base = descripcion.replace(/ - Eje.*/i, '').replace(/^Actíva-T/, 'Activa-T').trim();
    // Unir "Sectorial 2026" + "Propuestas Sectorial" en una sola barra "Eje Sectorial 2026"
    // (conserva el "2026" para mantener el asterisco de "en curso" y el orden por año).
    if (/^(Sectorial 2026|Propuestas Sectorial)$/i.test(base)) return 'Eje Sectorial 2026';
    return base;
}

function grupoBaseBeca(descripcion: string): string {
    return descripcion
        .replace(/^\d+\s*-\s*/, '')
        .replace(/\s*-\s*(Hijos de trabajadores|Trabajadores)$/i, '')
        .replace(/\s+(I{1,2})$/, '')
        .replace(/^Beca\s+/i, '')
        .trim();
}

// Beca Trabajadores (grupos 1, 2 y 3 - variantes 2024/2025/2026) se junta
// en una sola barra 2024; MiBeca (grupo 6, con becas de varios períodos)
// se junta en una sola barra 2021. Mismo criterio que ServiciosTimeline.
function labelBeca(grupoId: number, descripcion: string): string {
    if ([1, 2, 3].includes(grupoId)) return 'Beca Trabajadores 2024';
    if (grupoId === 6) return 'MiBeca 2021';
    return grupoBaseBeca(descripcion);
}

function sortYearFromLabel(label: string): number {
    const match = label.match(/\d{4}/);
    return match ? Number(match[0]) : 9999; // sin año detectable: al final
}

export async function getFinanciamientoEjecucion() {
    const supabase = await createClient();

    // Paginado: Supabase corta en 1000 filas por request (becas_nueva ya supera ese tamaño)
    const [{ data: proyectosRaw, error: pErr }, { data: becasRaw, error: bErr }] = await Promise.all([
        fetchAllRows((from, to) => supabase.from('proyectos').select(`
            monto_fondoempleo,
            grupo:grupo_id ( descripcion ),
            etapa:etapa_id ( fase ),
            institucion:institucion_ejecutora_id ( nombre )
        `).not('grupo_id', 'is', null).order('id', { ascending: true }).range(from, to)),
        fetchAllRows((from, to) => supabase.from('becas_nueva').select(`
            presupuesto,
            grupo_id,
            grupo:grupo_id ( descripcion )
        `).not('grupo_id', 'is', null).order('id', { ascending: true }).range(from, to)),
    ]);

    if (pErr) console.error('Error fetching proyectos para financiamiento en ejecución:', pErr);
    if (bErr) console.error('Error fetching becas para financiamiento en ejecución:', bErr);

    const proyectosMap = new Map<string, { monto: number; count: number; breakdown: Record<string, number> }>();
    (proyectosRaw || []).forEach((row: any) => {
        const fase = row.etapa?.fase;
        const descripcion = row.grupo?.descripcion;
        if (!descripcion || !FASES_EN_EJECUCION.includes(fase)) return;

        const label = grupoBaseProyecto(descripcion);
        const monto = Number(row.monto_fondoempleo) || 0;
        const entry = proyectosMap.get(label) || { monto: 0, count: 0, breakdown: {} };
        entry.monto += monto;
        entry.count += 1;
        const sigla = row.institucion?.nombre || 'S/D';
        entry.breakdown[sigla] = (entry.breakdown[sigla] || 0) + monto;
        proyectosMap.set(label, entry);
    });

    const becasMap = new Map<string, { monto: number; count: number }>();
    (becasRaw || []).forEach((row: any) => {
        const descripcion = row.grupo?.descripcion;
        if (!descripcion) return;

        const label = labelBeca(row.grupo_id, descripcion);
        const entry = becasMap.get(label) || { monto: 0, count: 0 };
        entry.monto += Number(row.presupuesto) || 0;
        entry.count += 1;
        becasMap.set(label, entry);
    });

    const toSortedArray = (map: Map<string, { monto: number; count: number; breakdown?: Record<string, number> }>) =>
        Array.from(map.entries())
            .map(([label, v]) => ({ label, monto: v.monto, count: v.count, proyectado: /2026/.test(label), breakdown: v.breakdown }))
            .sort((a, b) => sortYearFromLabel(a.label) - sortYearFromLabel(b.label));

    return {
        proyectos: toSortedArray(proyectosMap),
        becas: toSortedArray(becasMap),
    };
}

// --- SECCIÓN IV: ANÁLISIS - DIAGNÓSTICO (Sustento Retorno Monitoreo Financiero) ---
// Serie histórica de gasto de proyectos/servicios (EEFF) vs. cantidad de
// colaboradores, 1999-2025 + 2026 proyectado. Datos cargados vía SQL en la
// tabla `auditoria_eeff_historico` (ver scripts/create_auditoria_eeff.sql).
export async function getAuditoriaEeff() {
    // Service role: la tabla tiene RLS (como saldo_bancario), el cliente anon
    // devuelve vacío. Mismo patrón que getSaldosBancarios/getFinanzasAnual.
    const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabase
        .from('auditoria_eeff_historico')
        .select('*')
        .order('anio', { ascending: true });

    if (error) {
        // La tabla puede no existir aún (se crea por SQL): degradar sin romper la página.
        console.error('Error fetching auditoria_eeff_historico:', error.message);
        return [];
    }
    return (data || []).map((r: any) => ({
        anio: Number(r.anio),
        gasto: Number(r.gasto_proyectos_servicios) || 0,
        colaboradores: Number(r.colaboradores) || 0,
        categoria: r.categoria || '',
        proyectado: !!r.proyectado,
    }));
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
