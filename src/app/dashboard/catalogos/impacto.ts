// ─────────────────────────────────────────────────────────────────────────────
// Sincronización  informe_impacto (Catálogos)  →  avance_proyecto (Gestión de
// Proyectos).
//
// PROBLEMA QUE RESUELVE
// La fase "Impacto" se declara en Catálogos a nivel de GRUPO (tabla
// informe_impacto: grupo, línea, fecha de inicio y de cierre de la evaluación),
// pero la etapa de cada proyecto se deriva de su bitácora de eventos
// (avance_proyecto → recalculateProyectoAvance → proyectos.etapa_id). Eran dos
// verdades desconectadas: un grupo con informe registrado seguía teniendo todos
// sus proyectos en Pre-Impacto, y el dashboard los contaba en las dos fases.
//
// REGLA
// El informe es la fuente de verdad; el evento de etapa Impacto es su proyección
// sobre cada proyecto alcanzado:
//
//   crear informe        → evento etapa 10 con fecha = informe.fecha_inicio
//   editar fecha_inicio  → se mueve la fecha de esos eventos
//   editar grupo/línea   → se borran los eventos de los proyectos que ya no
//                          alcanza y se crean los de los nuevos
//   borrar informe       → ON DELETE CASCADE borra sus eventos y el proyecto
//                          vuelve solo a su etapa anterior (Pre-Impacto)
//
// Proyectos alcanzados: grupo_id del informe y, si el informe declara linea_id,
// solo esa línea (linea_id NULL = todas las líneas del grupo).
//
// El vínculo vive en avance_proyecto.informe_impacto_id
// (ver scripts/migration_impacto_avance.sql). Un evento con esa columna en NULL
// es carga manual y NUNCA se borra desde aquí.
//
// Todas las funciones son IDEMPOTENTES: correrlas dos veces no duplica nada.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import { recalcularEtapasProyectos } from '@/app/dashboard/actions';

/** Etapa "Impacto" del catálogo `etapas`. */
export const ETAPA_IMPACTO = 10;

type Informe = {
    id: number;
    grupo_id: number;
    linea_id: number | null;
    titulo: string | null;
    fecha_inicio: string;
};

export type ResultadoSync = {
    informeId: number;
    titulo: string;
    /** Eventos nuevos creados. */
    creados: number;
    /** Eventos de etapa Impacto ya existentes que se vincularon al informe. */
    adoptados: number;
    /** Eventos vinculados cuya fecha se corrigió a la del informe. */
    actualizados: number;
    /** Eventos borrados porque su proyecto dejó de estar alcanzado. */
    eliminados: number;
    /** Situaciones que requieren mirada humana (no bloquean la sincronización). */
    avisos: string[];
};

/** Proyectos que un informe alcanza (grupo + línea opcional). */
async function proyectosAlcanzados(
    sb: SupabaseClient,
    informe: Informe,
): Promise<number[]> {
    let q = sb.from('proyectos').select('id').eq('grupo_id', informe.grupo_id);
    if (informe.linea_id !== null && informe.linea_id !== undefined) {
        q = q.eq('linea_id', informe.linea_id);
    }
    const { data, error } = await q;
    if (error) throw new Error(`No se pudieron leer los proyectos del grupo: ${error.message}`);
    return (data ?? []).map((p: any) => Number(p.id));
}

/**
 * Deja los eventos de etapa Impacto de un informe exactamente iguales a lo que
 * el informe declara. Devuelve null si el informe ya no existe (el CASCADE de
 * la BD se encargó de sus eventos).
 */
export async function sincronizarInformeImpacto(
    sb: SupabaseClient,
    informeId: number,
): Promise<{ resultado: ResultadoSync; proyectosAfectados: number[] } | null> {
    const { data: informe, error: errInforme } = await sb
        .from('informe_impacto')
        .select('id, grupo_id, linea_id, titulo, fecha_inicio')
        .eq('id', informeId)
        .maybeSingle();

    if (errInforme) throw new Error(`No se pudo leer el informe ${informeId}: ${errInforme.message}`);
    if (!informe) return null;

    const inf = informe as Informe;
    const resultado: ResultadoSync = {
        informeId: inf.id,
        titulo: inf.titulo || `Informe ${inf.id}`,
        creados: 0,
        adoptados: 0,
        actualizados: 0,
        eliminados: 0,
        avisos: [],
    };

    // Sin fecha de inicio no hay etapa Impacto que proyectar.
    if (!inf.fecha_inicio) {
        resultado.avisos.push('El informe no tiene fecha de inicio: no se generó ningún evento.');
        return { resultado, proyectosAfectados: [] };
    }

    const objetivo = await proyectosAlcanzados(sb, inf);
    const objetivoSet = new Set(objetivo);
    const afectados = new Set<number>(objetivo);

    if (objetivo.length === 0) {
        // Los grupos de becas (tipo 1) no tienen filas en `proyectos`: que no
        // alcancen nada es lo normal, no un problema que reportar.
        const { data: grupo } = await sb
            .from('grupo')
            .select('tipo')
            .eq('id', inf.grupo_id)
            .maybeSingle();
        if (Number(grupo?.tipo) === 2) {
            resultado.avisos.push(
                inf.linea_id !== null
                    ? `Ningún proyecto en el grupo ${inf.grupo_id} con línea ${inf.linea_id}.`
                    : `Ningún proyecto en el grupo ${inf.grupo_id}.`,
            );
        }
    }

    // ── Fecha del evento, por proyecto ───────────────────────────────────────
    // La etapa de un proyecto se deriva de su evento MÁS RECIENTE
    // (recalculateProyectoAvance), así que el evento de Impacto no puede quedar
    // por detrás de un evento posterior del mismo proyecto: lo dejaría en la
    // etapa vieja. Cuando el proyecto tiene un avance con fecha posterior al
    // inicio del informe, el evento se ancla en esa fecha y se avisa, porque es
    // una contradicción entre el informe y la bitácora que alguien debe zanjar.
    const fechaPorProyecto = new Map<number, string>();
    if (objetivo.length > 0) {
        const { data: previos, error: errPrev } = await sb
            .from('avance_proyecto')
            .select('proyecto_id, fecha')
            .in('proyecto_id', objetivo)
            .neq('etapa_id', ETAPA_IMPACTO)
            .gt('fecha', inf.fecha_inicio);
        if (errPrev) throw new Error(`No se pudieron leer los avances posteriores: ${errPrev.message}`);

        const ultimoPosterior = new Map<number, string>();
        for (const a of previos ?? []) {
            const pid = Number(a.proyecto_id);
            const actual = ultimoPosterior.get(pid);
            if (!actual || a.fecha > actual) ultimoPosterior.set(pid, a.fecha);
        }
        for (const pid of objetivo) {
            const posterior = ultimoPosterior.get(pid);
            fechaPorProyecto.set(pid, posterior ?? inf.fecha_inicio);
            if (posterior) {
                resultado.avisos.push(
                    `El proyecto ${pid} tiene un avance del ${posterior}, posterior al inicio del informe (${inf.fecha_inicio}); el evento de Impacto se ancló en esa fecha para que la etapa quede correcta.`,
                );
            }
        }
    }
    const fechaDe = (pid: number) => fechaPorProyecto.get(pid) ?? inf.fecha_inicio;

    // ── 1. Eventos ya vinculados a este informe ──────────────────────────────
    const { data: vinculados, error: errVinc } = await sb
        .from('avance_proyecto')
        .select('id, proyecto_id, fecha')
        .eq('informe_impacto_id', inf.id);
    if (errVinc) throw new Error(`No se pudieron leer los eventos del informe: ${errVinc.message}`);

    const sobrantes = (vinculados ?? []).filter((a: any) => !objetivoSet.has(Number(a.proyecto_id)));
    if (sobrantes.length > 0) {
        const { error } = await sb
            .from('avance_proyecto')
            .delete()
            .in('id', sobrantes.map((a: any) => a.id));
        if (error) throw new Error(`No se pudieron borrar los eventos sobrantes: ${error.message}`);
        resultado.eliminados = sobrantes.length;
        sobrantes.forEach((a: any) => afectados.add(Number(a.proyecto_id)));
    }

    // Corregir la fecha de los que siguen vigentes (agrupando por fecha destino,
    // que puede diferir entre proyectos por el anclaje de arriba).
    const vigentes = (vinculados ?? []).filter((a: any) => objetivoSet.has(Number(a.proyecto_id)));
    const desfasados = vigentes.filter((a: any) => a.fecha !== fechaDe(Number(a.proyecto_id)));
    if (desfasados.length > 0) {
        const porFecha = new Map<string, number[]>();
        for (const a of desfasados) {
            const f = fechaDe(Number(a.proyecto_id));
            if (!porFecha.has(f)) porFecha.set(f, []);
            porFecha.get(f)!.push(a.id);
        }
        for (const [fecha, ids] of porFecha) {
            const { error } = await sb.from('avance_proyecto').update({ fecha }).in('id', ids);
            if (error) throw new Error(`No se pudo corregir la fecha de los eventos: ${error.message}`);
        }
        resultado.actualizados = desfasados.length;
    }

    // ── 2. Proyectos alcanzados que todavía no tienen su evento ──────────────
    const yaVinculados = new Set(vigentes.map((a: any) => Number(a.proyecto_id)));
    const faltantes = objetivo.filter((id) => !yaVinculados.has(id));
    if (faltantes.length === 0) return { resultado, proyectosAfectados: [...afectados] };

    // Eventos de etapa Impacto cargados a mano: se adoptan en lugar de crear un
    // duplicado, y se les corrige la fecha a la que declara el informe.
    const { data: huerfanos, error: errHuerf } = await sb
        .from('avance_proyecto')
        .select('id, proyecto_id, fecha, sustento')
        .in('proyecto_id', faltantes)
        .eq('etapa_id', ETAPA_IMPACTO)
        .is('informe_impacto_id', null)
        .order('fecha', { ascending: true });
    if (errHuerf) throw new Error(`No se pudieron leer los eventos de impacto existentes: ${errHuerf.message}`);

    const adoptables = new Map<number, any>();
    for (const h of huerfanos ?? []) {
        const pid = Number(h.proyecto_id);
        if (adoptables.has(pid)) {
            // Más de un evento de Impacto para el mismo proyecto: se adopta el
            // más antiguo y el resto queda como estaba, para revisión manual.
            resultado.avisos.push(
                `El proyecto ${pid} tiene más de un evento de etapa Impacto; se vinculó el más antiguo (${adoptables.get(pid).fecha}) y quedó suelto el del ${h.fecha}.`,
            );
            continue;
        }
        adoptables.set(pid, h);
    }

    const sustentoAuto = `Informe de impacto: ${resultado.titulo}`;

    for (const [pid, h] of adoptables) {
        const patch: Record<string, any> = {
            informe_impacto_id: inf.id,
            fecha: fechaDe(pid),
        };
        if (!h.sustento || String(h.sustento).trim() === '') patch.sustento = sustentoAuto;
        const { error } = await sb.from('avance_proyecto').update(patch).eq('id', h.id);
        if (error) throw new Error(`No se pudo vincular el evento del proyecto ${pid}: ${error.message}`);
        resultado.adoptados++;
    }

    const porCrear = faltantes.filter((id) => !adoptables.has(id));
    if (porCrear.length > 0) {
        const filas = porCrear.map((proyecto_id) => ({
            proyecto_id,
            etapa_id: ETAPA_IMPACTO,
            fecha: fechaDe(proyecto_id),
            sustento: sustentoAuto,
            monto: 0,
            informe_impacto_id: inf.id,
        }));
        const { error } = await sb.from('avance_proyecto').insert(filas);
        if (error) throw new Error(`No se pudieron crear los eventos de impacto: ${error.message}`);
        resultado.creados = porCrear.length;
    }

    return { resultado, proyectosAfectados: [...afectados] };
}

/**
 * Sincroniza un informe y recalcula la etapa de los proyectos que tocó.
 * Es el punto de entrada normal desde el CRUD de Catálogos.
 */
export async function sincronizarYRecalcular(
    sb: SupabaseClient,
    informeId: number,
): Promise<ResultadoSync | null> {
    const salida = await sincronizarInformeImpacto(sb, informeId);
    if (!salida) return null;
    await recalcularEtapasProyectos(salida.proyectosAfectados);
    return salida.resultado;
}

/**
 * Proyectos alcanzados por un informe ANTES de borrarlo. Hay que capturarlos
 * antes porque el ON DELETE CASCADE se lleva los eventos y después ya no queda
 * rastro de a quién había que recalcular.
 */
export async function proyectosDeInforme(
    sb: SupabaseClient,
    informeId: number,
): Promise<number[]> {
    const { data } = await sb
        .from('avance_proyecto')
        .select('proyecto_id')
        .eq('informe_impacto_id', informeId);
    return Array.from(new Set((data ?? []).map((a: any) => Number(a.proyecto_id))));
}

/**
 * Pasa por todos los informes registrados. Sirve para la carga inicial (los
 * informes que ya existían antes de esta sincronización) y como red de
 * seguridad si alguien edita la tabla por fuera del módulo Catálogos.
 */
export async function reconciliarTodosLosInformes(
    sb: SupabaseClient,
): Promise<ResultadoSync[]> {
    const { data: informes, error } = await sb
        .from('informe_impacto')
        .select('id')
        .order('id', { ascending: true });
    if (error) throw new Error(`No se pudieron listar los informes: ${error.message}`);

    const resultados: ResultadoSync[] = [];
    const afectados = new Set<number>();

    for (const inf of informes ?? []) {
        const salida = await sincronizarInformeImpacto(sb, Number(inf.id));
        if (!salida) continue;
        resultados.push(salida.resultado);
        salida.proyectosAfectados.forEach((id) => afectados.add(id));
    }

    await recalcularEtapasProyectos([...afectados]);
    return resultados;
}
