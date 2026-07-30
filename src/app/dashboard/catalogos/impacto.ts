// ─────────────────────────────────────────────────────────────────────────────
// Sincronización  informe_impacto (Catálogos)  →  bitácora de etapas.
//
// PROBLEMA QUE RESUELVE
// La fase "Impacto" se declara en Catálogos a nivel de GRUPO (tabla
// informe_impacto: grupo, línea, fecha de inicio y de cierre de la evaluación),
// pero la etapa de cada proyecto/beca se deriva de su bitácora de eventos
// (avance_* → recalculate* → etapa_id). Eran dos verdades desconectadas: un
// grupo con informe registrado seguía teniendo a los suyos en la etapa anterior,
// el dashboard los contaba en dos fases a la vez y el filtro de fase ni siquiera
// ofrecía "Impacto".
//
// REGLA
// El informe es la fuente de verdad; el evento de etapa Impacto es su proyección
// sobre cada registro alcanzado:
//
//   crear informe        → evento etapa 10 con fecha = informe.fecha_inicio
//   editar fecha_inicio  → se mueve la fecha de esos eventos
//   editar grupo/línea   → se borran los eventos de los que ya no alcanza y se
//                          crean los de los nuevos
//   borrar informe       → ON DELETE CASCADE borra sus eventos y el registro
//                          vuelve solo a su etapa anterior
//
// DOS DESTINOS, SEGÚN EL TIPO DE GRUPO
//   grupo.tipo = 2 (proyectos) → proyectos    / avance_proyecto
//   grupo.tipo = 1 (becas)     → becas_nueva  / avance_beca
//
// Alcance: grupo_id del informe y, si declara linea_id, solo esa línea.
//
// En BECAS la prueba de impacto se hace sobre las que llevan al menos SEIS MESES
// ejecutadas a la fecha de inicio del informe: esa fecha es la que identifica a
// qué becas corresponde cada informe. Un grupo puede tener VARIOS informes, y
// cada beca pertenece a UNO solo — el primero (por fecha de inicio) que ya la
// alcanza. Las que aún no cumplen el plazo entran solas en un informe posterior.
// La antigüedad se mide contra el evento de cierre de la bitácora, nunca contra
// la etapa guardada, que puede estar desfasada.
//
// El vínculo vive en avance_*.informe_impacto_id
// (ver scripts/migration_impacto_avance.sql). Un evento con esa columna en NULL
// es carga manual y NUNCA se borra desde aquí.
//
// Todas las funciones son IDEMPOTENTES: correrlas dos veces no duplica nada.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import { recalcularEtapasProyectos } from '@/app/dashboard/actions';
import { recalcularEtapasBecas } from '@/app/dashboard/gestion-servicios/actions';
import { fetchAllRows } from '@/utils/supabase/fetchAll';

/** Etapa "Impacto" del catálogo `etapas`. */
export const ETAPA_IMPACTO = 10;
/** Etapa "Ejecutado": marca el cierre desde el que se cuenta la antigüedad. */
const ETAPA_EJECUTADO = 6;

type Informe = {
    id: number;
    grupo_id: number;
    linea_id: number | null;
    titulo: string | null;
    fecha_inicio: string;
};

/** A qué mundo proyecta un informe, según el tipo de su grupo. */
type Destino = {
    /** Nombre en singular para los mensajes ("proyecto" / "beca"). */
    etiqueta: string;
    tablaEntidad: string;
    tablaAvance: string;
    /** Columna de avance_* que apunta a la entidad. */
    fk: string;
    /**
     * Antigüedad mínima del cierre para entrar a la evaluación de impacto.
     * `null` = sin requisito.
     *
     * En BECAS la prueba de impacto se hace sobre las que llevan al menos seis
     * meses ejecutadas al momento del informe: el informe evalúa el efecto de
     * la beca pasado ese tiempo, no el cierre administrativo. Se mide contra el
     * evento de cierre de la bitácora, no contra la etapa guardada (que puede
     * estar desfasada).
     *
     * En PROYECTOS no hay requisito: el informe se registra cuando corresponde
     * y el ciclo ya trae sus propias etapas de Cierre y Pre-Impacto.
     */
    mesesDesdeCierre: number | null;
    /** Etapa que marca el cierre (para medir la antigüedad). */
    etapaCierre: number;
    recalcular: (ids: number[]) => Promise<void>;
};

const DESTINO_PROYECTOS: Destino = {
    etiqueta: 'proyecto',
    tablaEntidad: 'proyectos',
    tablaAvance: 'avance_proyecto',
    fk: 'proyecto_id',
    mesesDesdeCierre: null,
    etapaCierre: ETAPA_EJECUTADO,
    recalcular: recalcularEtapasProyectos,
};

const DESTINO_BECAS: Destino = {
    etiqueta: 'beca',
    tablaEntidad: 'becas_nueva',
    tablaAvance: 'avance_beca',
    fk: 'beca_id',
    mesesDesdeCierre: 6,
    etapaCierre: ETAPA_EJECUTADO,
    recalcular: recalcularEtapasBecas,
};

/** Resta meses a una fecha 'YYYY-MM-DD'. */
function restarMeses(fecha: string, meses: number): string {
    const d = new Date(`${fecha}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - meses);
    return d.toISOString().split('T')[0];
}

export type ResultadoSync = {
    informeId: number;
    titulo: string;
    /** Eventos nuevos creados. */
    creados: number;
    /** Eventos de etapa Impacto ya existentes que se vincularon al informe. */
    adoptados: number;
    /** Eventos vinculados cuya fecha se corrigió. */
    actualizados: number;
    /** Eventos borrados porque su registro dejó de estar alcanzado. */
    eliminados: number;
    /** Situaciones que requieren mirada humana (no bloquean la sincronización). */
    avisos: string[];
};

/** Destino de un informe según el tipo de su grupo. */
async function resolverDestino(
    sb: SupabaseClient,
    grupoId: number,
): Promise<Destino | null> {
    const { data, error } = await sb
        .from('grupo')
        .select('tipo')
        .eq('id', grupoId)
        .maybeSingle();
    if (error) throw new Error(`No se pudo leer el grupo ${grupoId}: ${error.message}`);
    if (!data) return null;
    if (Number(data.tipo) === 1) return DESTINO_BECAS;
    if (Number(data.tipo) === 2) return DESTINO_PROYECTOS;
    return null;
}

/**
 * Deja los eventos de etapa Impacto de un informe exactamente iguales a lo que
 * el informe declara. Devuelve null si el informe ya no existe (el CASCADE de
 * la BD se encargó de sus eventos).
 */
export async function sincronizarInformeImpacto(
    sb: SupabaseClient,
    informeId: number,
): Promise<{ resultado: ResultadoSync; destino: Destino; afectados: number[] } | null> {
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

    const destino = await resolverDestino(sb, inf.grupo_id);
    if (!destino) {
        resultado.avisos.push(
            `El grupo ${inf.grupo_id} no es de proyectos ni de becas: el informe no proyecta ninguna etapa.`,
        );
        return { resultado, destino: DESTINO_PROYECTOS, afectados: [] };
    }

    // Sin fecha de inicio no hay etapa Impacto que proyectar.
    if (!inf.fecha_inicio) {
        resultado.avisos.push('El informe no tiene fecha de inicio: no se generó ningún evento.');
        return { resultado, destino, afectados: [] };
    }

    // ── Alcance ──────────────────────────────────────────────────────────────
    // Todas las lecturas paginan: PostgREST corta en 1000 filas y un grupo de
    // becas puede pasarse (avance_beca ya ronda las 4500 filas). Sin paginar, la
    // reconciliación dejaría fuera lo que quedara más allá del corte.
    const { data: entidades, error: errEnt } = await fetchAllRows((from, to) => {
        let q = sb
            .from(destino.tablaEntidad)
            .select('id, linea_id')
            .eq('grupo_id', inf.grupo_id);
        if (inf.linea_id !== null && inf.linea_id !== undefined) q = q.eq('linea_id', inf.linea_id);
        return q.range(from, to);
    });
    if (errEnt) throw new Error(`No se pudieron leer los ${destino.etiqueta}s del grupo: ${errEnt.message}`);

    const alcanzados = (entidades ?? []).map((e: any) => Number(e.id));
    const lineaDe = new Map<number, number | null>(
        (entidades ?? []).map((e: any) => [Number(e.id), e.linea_id === null ? null : Number(e.linea_id)]),
    );
    const afectados = new Set<number>();

    if (alcanzados.length === 0) {
        resultado.avisos.push(
            inf.linea_id !== null
                ? `Ningún ${destino.etiqueta} en el grupo ${inf.grupo_id} con línea ${inf.linea_id}.`
                : `Ningún ${destino.etiqueta} en el grupo ${inf.grupo_id}: el informe no se ve en ninguna línea de tiempo.`,
        );
        return { resultado, destino, afectados: [] };
    }

    // ── 1. Eventos ya vinculados a este informe ──────────────────────────────
    const { data: vinculadosRaw, error: errVinc } = await fetchAllRows((from, to) =>
        sb
            .from(destino.tablaAvance)
            .select(`id, ${destino.fk}, fecha`)
            .eq('informe_impacto_id', inf.id)
            .range(from, to),
    );
    if (errVinc) throw new Error(`No se pudieron leer los eventos del informe: ${errVinc.message}`);
    // El nombre de la columna FK es dinámico: el select no es tipable, se trata como any.
    const vinculados = (vinculadosRaw ?? []) as any[];

    const idEntidad = (a: any) => Number(a[destino.fk]);
    const yaVinculados = new Set(vinculados.map(idEntidad));

    // ── Candidatos ───────────────────────────────────────────────────────────
    // Un grupo puede tener VARIOS informes, y cada registro pertenece a UNO
    // solo: el primero (por fecha de inicio) que ya lo alcanza. Se decide igual
    // desde cualquier informe que se sincronice, así que el resultado no depende
    // del orden en que se procesen.
    const { data: hermanosRaw, error: errHerm } = await fetchAllRows((from, to) =>
        sb
            .from('informe_impacto')
            .select('id, linea_id, fecha_inicio')
            .eq('grupo_id', inf.grupo_id)
            .range(from, to),
    );
    if (errHerm) throw new Error(`No se pudieron leer los informes del grupo: ${errHerm.message}`);
    const hermanos = ((hermanosRaw ?? []) as any[])
        .filter((h) => h.fecha_inicio)
        .sort((a, b) =>
            a.fecha_inicio === b.fecha_inicio
                ? Number(a.id) - Number(b.id)
                : a.fecha_inicio < b.fecha_inicio ? -1 : 1,
        );

    // Fecha de cierre de cada registro (primer evento de Ejecutado en su
    // bitácora). Es la referencia real: la etapa guardada puede estar desfasada.
    const cierreDe = new Map<number, string>();
    if (destino.mesesDesdeCierre !== null) {
        const { data: cierresRaw, error: errCierre } = await fetchAllRows((from, to) =>
            sb
                .from(destino.tablaAvance)
                .select(`${destino.fk}, fecha`)
                .in(destino.fk, alcanzados)
                .eq('etapa_id', destino.etapaCierre)
                .range(from, to),
        );
        if (errCierre) throw new Error(`No se pudieron leer los cierres: ${errCierre.message}`);
        for (const c of (cierresRaw ?? []) as any[]) {
            const eid = idEntidad(c);
            const actual = cierreDe.get(eid);
            if (!actual || c.fecha < actual) cierreDe.set(eid, c.fecha);
        }
    }

    /**
     * Informe al que pertenece un registro: el primero del grupo que cubre su
     * línea y para el que, a su fecha de inicio, ya cumplía la antigüedad de
     * cierre exigida. `null` = todavía no le toca ningún informe.
     */
    const informeDe = (eid: number) => {
        const linea = lineaDe.get(eid);
        const cierre = cierreDe.get(eid);
        for (const h of hermanos) {
            if (h.linea_id !== null && Number(h.linea_id) !== Number(linea)) continue;
            if (destino.mesesDesdeCierre !== null) {
                if (!cierre) continue;
                if (cierre > restarMeses(h.fecha_inicio, destino.mesesDesdeCierre)) continue;
            }
            return h;
        }
        return null;
    };

    const candidatos: number[] = [];
    let deOtroInforme = 0;
    let sinCumplir = 0;
    for (const id of alcanzados) {
        const duenho = informeDe(id);
        if (!duenho) sinCumplir++;
        else if (Number(duenho.id) === Number(inf.id)) candidatos.push(id);
        else deOtroInforme++;
    }

    if (sinCumplir > 0) {
        resultado.avisos.push(
            destino.mesesDesdeCierre !== null
                ? `${sinCumplir} ${destino.etiqueta}(s) del grupo aún no cumplen ${destino.mesesDesdeCierre} mes(es) desde su cierre (o no lo tienen registrado): entrarán al reconciliar cuando corresponda.`
                : `${sinCumplir} ${destino.etiqueta}(s) del grupo no están cubiertos por ningún informe.`,
        );
    }
    if (deOtroInforme > 0) {
        resultado.avisos.push(
            `${deOtroInforme} ${destino.etiqueta}(s) del grupo pertenecen a otro informe anterior del mismo grupo.`,
        );
    }

    // ── Fecha del evento, por registro ───────────────────────────────────────
    // La etapa se deriva del evento MÁS RECIENTE, así que el evento de Impacto
    // no puede quedar por detrás de un avance posterior del mismo registro: lo
    // dejaría en la etapa vieja. Cuando lo hay, el evento se ancla en esa fecha
    // y se avisa, porque es una contradicción entre el informe y la bitácora.
    const fechaPorEntidad = new Map<number, string>();
    {
        const { data: posterioresRaw, error: errPost } = await fetchAllRows((from, to) =>
            sb
                .from(destino.tablaAvance)
                .select(`${destino.fk}, fecha`)
                .in(destino.fk, candidatos)
                .neq('etapa_id', ETAPA_IMPACTO)
                .gt('fecha', inf.fecha_inicio)
                .range(from, to),
        );
        if (errPost) throw new Error(`No se pudieron leer los avances posteriores: ${errPost.message}`);
        const posteriores = (posterioresRaw ?? []) as any[];

        const ultimoPosterior = new Map<number, string>();
        for (const a of posteriores) {
            const eid = idEntidad(a);
            const actual = ultimoPosterior.get(eid);
            if (!actual || a.fecha > actual) ultimoPosterior.set(eid, a.fecha);
        }
        for (const eid of candidatos) {
            fechaPorEntidad.set(eid, ultimoPosterior.get(eid) ?? inf.fecha_inicio);
        }
    }
    const fechaDe = (eid: number) => fechaPorEntidad.get(eid) ?? inf.fecha_inicio;

    // ── Elegibles: los que ya entraron al impacto DE VERDAD ──────────────────
    // Si el anclaje deja el evento en el futuro es porque la bitácora todavía
    // proyecta el cierre (p. ej. un "Ejecutado" fechado en 2027). Ese registro
    // no ha terminado, por más que su etapa guardada diga lo contrario: crear el
    // evento no lo movería a Impacto (recalculate* ignora fechas futuras) y sí
    // ensuciaría la bitácora. Entra solo cuando llegue esa fecha.
    const hoy = new Date().toISOString().split('T')[0];
    const elegibles = candidatos.filter((id) => fechaDe(id) <= hoy);
    const elegiblesSet = new Set(elegibles);
    elegibles.forEach((id) => afectados.add(id));

    const proyectados = candidatos.length - elegibles.length;
    if (proyectados > 0) {
        resultado.avisos.push(
            `${proyectados} ${destino.etiqueta}(s) tienen su cierre proyectado a futuro en la bitácora: quedan fuera del impacto hasta que llegue esa fecha.`,
        );
    }

    const anclados = elegibles.filter((id) => fechaDe(id) !== inf.fecha_inicio).length;
    if (anclados > 0) {
        resultado.avisos.push(
            `${anclados} ${destino.etiqueta}(s) tienen un avance posterior al inicio del informe (${inf.fecha_inicio}); su evento de Impacto se ancló en esa fecha para que la etapa quede correcta.`,
        );
    }

    // ── 2. Eventos que sobran ────────────────────────────────────────────────
    // Su registro salió del alcance (cambió el grupo o la línea del informe) o
    // dejó de ser elegible (su cierre volvió a estar proyectado a futuro). La
    // regla se autocorrige: lo que no debe estar, se borra.
    const sobrantes = vinculados.filter((a: any) => !elegiblesSet.has(idEntidad(a)));
    if (sobrantes.length > 0) {
        const { error } = await sb
            .from(destino.tablaAvance)
            .delete()
            .in('id', sobrantes.map((a: any) => a.id));
        if (error) throw new Error(`No se pudieron borrar los eventos sobrantes: ${error.message}`);
        resultado.eliminados = sobrantes.length;
        sobrantes.forEach((a: any) => afectados.add(idEntidad(a)));
    }

    // ── 3. Corregir la fecha de los vigentes ─────────────────────────────────
    const vigentes = vinculados.filter((a: any) => elegiblesSet.has(idEntidad(a)));
    const desfasados = vigentes.filter((a: any) => a.fecha !== fechaDe(idEntidad(a)));
    if (desfasados.length > 0) {
        const porFecha = new Map<string, number[]>();
        for (const a of desfasados) {
            const f = fechaDe(idEntidad(a));
            if (!porFecha.has(f)) porFecha.set(f, []);
            porFecha.get(f)!.push(a.id);
        }
        for (const [fecha, ids] of porFecha) {
            const { error } = await sb.from(destino.tablaAvance).update({ fecha }).in('id', ids);
            if (error) throw new Error(`No se pudo corregir la fecha de los eventos: ${error.message}`);
        }
        resultado.actualizados = desfasados.length;
    }

    // ── 4. Elegibles que todavía no tienen su evento ─────────────────────────
    const faltantes = elegibles.filter((id) => !yaVinculados.has(id));
    if (faltantes.length === 0) return { resultado, destino, afectados: [...afectados] };

    // Eventos de etapa Impacto cargados a mano: se adoptan en lugar de crear un
    // duplicado, y se les corrige la fecha.
    const { data: huerfanosRaw, error: errHuerf } = await fetchAllRows((from, to) =>
        sb
            .from(destino.tablaAvance)
            .select(`id, ${destino.fk}, fecha, sustento`)
            .in(destino.fk, faltantes)
            .eq('etapa_id', ETAPA_IMPACTO)
            .is('informe_impacto_id', null)
            .order('fecha', { ascending: true })
            .range(from, to),
    );
    if (errHuerf) throw new Error(`No se pudieron leer los eventos de impacto existentes: ${errHuerf.message}`);
    const huerfanos = (huerfanosRaw ?? []) as any[];

    const adoptables = new Map<number, any>();
    for (const h of huerfanos) {
        const eid = idEntidad(h);
        if (adoptables.has(eid)) {
            // Más de un evento de Impacto para el mismo registro: se adopta el
            // más antiguo y el resto queda como estaba, para revisión manual.
            resultado.avisos.push(
                `El ${destino.etiqueta} ${eid} tiene más de un evento de etapa Impacto; se vinculó el más antiguo (${adoptables.get(eid).fecha}) y quedó suelto el del ${h.fecha}.`,
            );
            continue;
        }
        adoptables.set(eid, h);
    }

    const sustentoAuto = `Informe de impacto: ${resultado.titulo}`;

    for (const [eid, h] of adoptables) {
        const patch: Record<string, any> = {
            informe_impacto_id: inf.id,
            fecha: fechaDe(eid),
        };
        if (!h.sustento || String(h.sustento).trim() === '') patch.sustento = sustentoAuto;
        const { error } = await sb.from(destino.tablaAvance).update(patch).eq('id', h.id);
        if (error) throw new Error(`No se pudo vincular el evento del ${destino.etiqueta} ${eid}: ${error.message}`);
        resultado.adoptados++;
    }

    const porCrear = faltantes.filter((id) => !adoptables.has(id));
    if (porCrear.length > 0) {
        const filas = porCrear.map((eid) => ({
            [destino.fk]: eid,
            etapa_id: ETAPA_IMPACTO,
            fecha: fechaDe(eid),
            sustento: sustentoAuto,
            monto: 0,
            informe_impacto_id: inf.id,
        }));
        const { error } = await sb.from(destino.tablaAvance).insert(filas);
        if (error) throw new Error(`No se pudieron crear los eventos de impacto: ${error.message}`);
        resultado.creados = porCrear.length;
    }

    return { resultado, destino, afectados: [...afectados] };
}

/**
 * Sincroniza un informe y recalcula la etapa de lo que tocó.
 * Es el punto de entrada normal desde el CRUD de Catálogos.
 */
export async function sincronizarYRecalcular(
    sb: SupabaseClient,
    informeId: number,
): Promise<ResultadoSync | null> {
    const salida = await sincronizarInformeImpacto(sb, informeId);
    if (!salida) return null;
    await salida.destino.recalcular(salida.afectados);
    return salida.resultado;
}

/**
 * Registros alcanzados por un informe ANTES de borrarlo, con su destino. Hay que
 * capturarlos antes porque el ON DELETE CASCADE se lleva los eventos y después
 * ya no queda rastro de a quién había que recalcular.
 */
export async function afectadosDeInforme(
    sb: SupabaseClient,
    informeId: number,
): Promise<{ destino: Destino; ids: number[] } | null> {
    const { data: inf } = await sb
        .from('informe_impacto')
        .select('grupo_id')
        .eq('id', informeId)
        .maybeSingle();
    if (!inf) return null;

    const destino = await resolverDestino(sb, Number(inf.grupo_id));
    if (!destino) return null;

    const { data } = await sb
        .from(destino.tablaAvance)
        .select(destino.fk)
        .eq('informe_impacto_id', informeId);
    const ids = Array.from(new Set((data ?? []).map((a: any) => Number(a[destino.fk]))));
    return { destino, ids };
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
    // Un recálculo por destino, al final: así una beca tocada por dos informes
    // se recalcula una sola vez.
    const porDestino = new Map<Destino, Set<number>>();

    for (const inf of informes ?? []) {
        const salida = await sincronizarInformeImpacto(sb, Number(inf.id));
        if (!salida) continue;
        resultados.push(salida.resultado);
        if (salida.afectados.length === 0) continue;
        if (!porDestino.has(salida.destino)) porDestino.set(salida.destino, new Set());
        salida.afectados.forEach((id) => porDestino.get(salida.destino)!.add(id));
    }

    for (const [destino, ids] of porDestino) {
        await destino.recalcular([...ids]);
    }
    return resultados;
}
