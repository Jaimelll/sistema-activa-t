"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, CartesianGrid, Cell, ReferenceLine, ReferenceDot
} from 'recharts';
import { FileText } from 'lucide-react';

import { ServiciosTable as DetalleBecasTable } from './ServiciosTable';
import { getServicioCompletoById } from '@/app/dashboard/gestion-servicios/actions';
import ServicioModal from './ServicioModal';

interface ServiciosTimelineProps {
    data: any[];
    options: any;
    /** Informes de impacto por grupo (tabla informe_impacto, editada en Catálogos). */
    informesImpacto?: any[];
}

const STAGE_PALETTE = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Amber
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#dc2626', // Red-600
    '#94a3b8', // Slate
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
];

const ONE_DAY = 24 * 60 * 60 * 1000;
const MARGIN_DAYS = 30;

// Etapa "Impacto": igual que en la línea de tiempo de Proyectos, su segmento se
// calcula SOLO desde los informes de impacto del grupo (tabla informe_impacto),
// nunca desde los avances registrados en Gestión de Servicios.
// Inicio = primer informe que inicia; fin = PRIMER informe presentado.
const IMPACTO_STAGE_ID = 10;
const EJECUTADO_STAGE_ID = 6;

// Resuelve la fila (fusionada) y el año usado para ordenar cronológicamente.
// Mismos nombres/agrupaciones que el gráfico de barras de Inf. Gerencial:
// "Beca Trabajadores" (grupos 1 y 2) se junta en una sola fila 2024, y
// MiBeca (grupo 6) se etiqueta como 2021 aunque tenga becas de otros períodos.
function resolverGrupoDisplay(grupoId: number, descripcion: string): { key: string; label: string; sortYear: number } {
    if (grupoId === 1 || grupoId === 2) {
        return { key: 'trabajadores-2024', label: 'Beca Trabajadores 2024', sortYear: 2024 };
    }
    if (grupoId === 6) {
        return { key: 'mibeca-2021', label: 'MiBeca 2021', sortYear: 2021 };
    }
    const label = (descripcion || 'Sin Grupo').replace(/^\d+\s*-\s*/, '');
    const yearMatch = label.match(/\d{4}/);
    return { key: String(grupoId), label, sortYear: yearMatch ? Number(yearMatch[0]) : 9999 };
}

export function ServiciosTimeline({ data, options, informesImpacto = [] }: ServiciosTimelineProps) {
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedServicio, setSelectedServicio] = useState<any>(null);
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const handleViewDetails = async (id: number) => {
        try {
            setLoadingId(id);
            const detail = await getServicioCompletoById(id);
            if (detail) {
                setSelectedServicio(detail);
                setIsModalOpen(true);
            } else {
                alert("No se pudo cargar la información del servicio.");
            }
        } catch (error) {
            console.error("Error loading service detail:", error);
            alert("Error al cargar los detalles.");
        } finally {
            setLoadingId(null);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Clear state after animation ideally, but this is safe
        setTimeout(() => setSelectedServicio(null), 200);
    };

    const [selectedGroupIds, setSelectedGroupIds] = useState<number[] | null>(null);

    // Fuerza un re‑render después del montaje para que el gráfico se dibuje correctamente
    const [forceRender, setForceRender] = useState(0);
    useEffect(() => {
        const timer = setTimeout(() => setForceRender(prev => prev + 1), 200);
        return () => clearTimeout(timer);
    }, []);

    // ── BUILD CHART ROWS & DYNAMIC DOMAIN ───────────────────────────────────
    const { chartData, usedStageIds, minTimestamp, maxTimestamp, stageById } = useMemo(() => {
        const stagesFromProps = options?.etapas || [];
        const stageById = Object.fromEntries(
            stagesFromProps.map((s: any, idx: number) => [
                Number(s.value), 
                { name: s.label, color: STAGE_PALETTE[idx % STAGE_PALETTE.length] }
            ])
        );

        if (!data || data.length === 0) {
            return { chartData: [], usedStageIds: [], minTimestamp: null, maxTimestamp: null, stageById };
        }

        // Agrupar por grupo "fusionado" (ver resolverGrupoDisplay)
        const groupMap = new Map<string, any>();
        // grupo_id real → clave de la fila fusionada, para colgar ahí sus informes
        // (los grupos 1 y 2 comparten una sola fila).
        const grupoIdToKey = new Map<number, string>();

        data.forEach((beca: any) => {
            const grupoId = beca.grupo_id;

            if (!grupoId) {
                console.warn(`Beca ID ${beca.id} no tiene grupo asignado, se omitirá del gráfico`);
                return;
            }

            const grupoDescripcion = beca.grupo?.descripcion || '';
            const { key: displayKey, label: displayLabel, sortYear } = resolverGrupoDisplay(grupoId, grupoDescripcion);
            grupoIdToKey.set(Number(grupoId), displayKey);

            if (!groupMap.has(displayKey)) {
                groupMap.set(displayKey, {
                    key: displayKey,
                    name: displayLabel,
                    sortYear,
                    stageDates: {},
                    totalBudget: 0,
                    totalAvance: 0,
                    totalBeneficiarios: 0,
                    count: 0,
                    maxStageId: 0,
                    ids: [],
                });
            }

            const g = groupMap.get(displayKey)!;
            g.count++;
            g.totalBudget += Number(beca.presupuesto) || 0;
            g.totalAvance += Number(beca.avance) || 0;
            g.totalBeneficiarios += Number(beca.beneficiarios) || 0;
            g.ids.push(beca.id);

            if ((beca.etapa_id || 0) > g.maxStageId) g.maxStageId = beca.etapa_id;

            (beca.avances || []).forEach((av: any) => {
                if (!av.fecha) return;
                const t = new Date(av.fecha).getTime();
                if (isNaN(t)) return;
                const sid = Number(av.etapa_id);
                // La etapa Impacto se alimenta SOLO de informe_impacto.
                if (sid === IMPACTO_STAGE_ID) return;
                if (!g.stageDates[sid]) g.stageDates[sid] = [];
                g.stageDates[sid].push(t);
            });
        });

        // Informes de impacto colgados de la fila que les corresponde.
        const informesByKey = new Map<string, any[]>();
        (informesImpacto || []).forEach((inf: any) => {
            const key = grupoIdToKey.get(Number(inf.grupo_id));
            if (!key) return; // informe de un grupo que esta vista no dibuja (p. ej. de Proyectos)
            const tsInicio = inf.fecha_inicio ? new Date(inf.fecha_inicio).getTime() : NaN;
            if (isNaN(tsInicio)) return;
            const tsFin = inf.fecha_fin ? new Date(inf.fecha_fin).getTime() : null;
            if (!informesByKey.has(key)) informesByKey.set(key, []);
            informesByKey.get(key)!.push({ ...inf, tsInicio, tsFin });
        });

        const stageOrder = Object.keys(stageById).map(Number).sort((a, b) => a - b);
        const foundStageIds = new Set<number>();

        let globalMin = Infinity;
        let globalMax = -Infinity;

        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);
        const TODAY_TS = hoy.getTime();

        const rowsRaw = Array.from(groupMap.values()).map(g => {
            const stageStart: Record<number, number> = {};
            const stageEnd: Record<number, number> = {};

            stageOrder.forEach(sid => {
                const dates = g.stageDates[sid];
                if (!dates || dates.length === 0) return;
                stageStart[sid] = Math.min(...dates);
                if (sid === 6) {
                    stageEnd[6] = Math.max(...dates);
                }
                foundStageIds.add(sid);
            });

            if (stageStart[1] === undefined) return null;

            // Las fechas deben ser monótonas en el orden de las etapas: la cascada
            // asume que cada etapa empieza después de la anterior. Un avance mal
            // capturado (p. ej. una etapa 3 fechada en 1994 cuando la etapa 1 es de
            // 2024) hacía que esa etapa se comiera décadas y desplazaba a la derecha
            // TODO lo que viniera después. Se recorta hacia adelante: una etapa no
            // puede empezar antes que la anterior.
            let corrida = -Infinity;
            Object.keys(stageStart).map(Number).sort((a, b) => a - b).forEach(sid => {
                if (stageStart[sid] < corrida) stageStart[sid] = corrida;
                else corrida = stageStart[sid];
            });

            // ── ETAPA IMPACTO: se calcula SOLO desde los informes del grupo ──
            const informes = (informesByKey.get(g.key) || [])
                .slice()
                .sort((a: any, b: any) => a.tsInicio - b.tsInicio);
            let impactoInicio: number | null = null;
            let impactoFin: number | null = null;

            if (informes.length > 0) {
                impactoInicio = Math.min(...informes.map((i: any) => i.tsInicio));
                const fines = informes.map((i: any) => i.tsFin).filter((f: any) => f !== null) as number[];
                // Misma regla que en Proyectos: el segmento cierra con el PRIMER
                // informe presentado; sin ninguno presentado sigue en curso.
                impactoFin = fines.length > 0 ? Math.min(...fines) : null;

                // El informe es la autoridad: ninguna etapa previa puede empezar
                // después del inicio del Impacto. Se recorta para que la cascada
                // no quede con duraciones negativas.
                Object.keys(stageStart).forEach(k => {
                    const sid = Number(k);
                    if (stageStart[sid] > impactoInicio!) stageStart[sid] = impactoInicio!;
                });
                if (stageEnd[EJECUTADO_STAGE_ID] !== undefined && stageEnd[EJECUTADO_STAGE_ID] > impactoInicio) {
                    stageEnd[EJECUTADO_STAGE_ID] = impactoInicio;
                }

                stageStart[IMPACTO_STAGE_ID] = impactoInicio;
                foundStageIds.add(IMPACTO_STAGE_ID);
            }

            const sortedSids = Object.keys(stageStart).map(Number).sort((a, b) => a - b);

            const etapa1Date = stageStart[1];
            const endDate = informes.length > 0
                ? (impactoFin ?? TODAY_TS)
                : (stageEnd[6] ?? null);

            if (etapa1Date < globalMin) globalMin = etapa1Date;
            if (endDate !== null && endDate > globalMax) globalMax = endDate;
            else if (etapa1Date > globalMax) globalMax = etapa1Date;

            const row: any = {
                key: g.key,
                name: g.name,
                totalBudget: g.totalBudget,
                totalAvance: g.totalAvance,
                count: g.count,
                maxStageId: g.maxStageId,
                ids: g.ids,
                stageStart,
                stageEnd,
                sortedSids,
                firstStart: etapa1Date,
                lastEnd: endDate,
                etapa1Date: etapa1Date,
                totalBeneficiarios: g.totalBeneficiarios,
                sortYear: g.sortYear,
                informes,
                impactoInicio,
                impactoFin,
            };
            return row;
        }).filter(Boolean);

        if (globalMin === Infinity) {
            const defaultDate = new Date('2022-01-01').getTime();
            globalMin = defaultDate;
            globalMax = defaultDate + ONE_DAY * 365 * 5;
        }

        if (TODAY_TS > globalMax) globalMax = TODAY_TS;

        const marginMs = ONE_DAY * MARGIN_DAYS;
        const domainMin = globalMin - marginMs;
        const domainMax = globalMax + marginMs;

        const rows = rowsRaw.map(row => {
            const { stageStart, stageEnd, sortedSids, firstStart, lastEnd, etapa1Date, impactoFin } = row;

            const originalDurations: Record<number, number> = {};

            for (let i = 0; i < sortedSids.length; i++) {
                const sid = sortedSids[i];
                const nextSid = sortedSids[i + 1];

                let sStart = stageStart[sid];
                let sEnd: number;
                if (nextSid !== undefined) {
                    // Cascada pura: cada etapa termina donde empieza la siguiente.
                    // Ahora incluye a "Ejecutado" (6) cuando hay etapas posteriores
                    // (Pre-Impacto / Impacto); antes medía su duración interna y
                    // dejaba un hueco que descuadraba todo lo que viniera después.
                    sEnd = stageStart[nextSid];
                } else if (sid === IMPACTO_STAGE_ID) {
                    // Impacto cierra con el primer informe presentado; si aún no
                    // hay ninguno presentado, sigue en curso hasta hoy.
                    sEnd = impactoFin ?? Math.max(sStart, TODAY_TS);
                } else if (sid === EJECUTADO_STAGE_ID) {
                    sEnd = stageEnd[EJECUTADO_STAGE_ID] ?? sStart;
                } else {
                    sEnd = Math.max(sStart, TODAY_TS);
                }

                if (sStart < domainMin) sStart = domainMin;
                if (sEnd > domainMax) sEnd = domainMax;

                let dur = sEnd - sStart;
                if (isNaN(dur) || dur < 0) dur = 0;

                originalDurations[sid] = dur;
            }

            const adjustedDurations = { ...originalDurations };

            // "Ejecutado" se dibuja como marcador de 1 día (el resto del tiempo se
            // le atribuye a "Ejecución") SOLO cuando es la última etapa de la fila.
            // Si hay etapas posteriores ya entró en la cascada y no se toca.
            const seisEsUltima = sortedSids[sortedSids.length - 1] === EJECUTADO_STAGE_ID;

            if (seisEsUltima && adjustedDurations[6] !== undefined) {
                const originalDur6 = adjustedDurations[6];
                const newDur6 = Math.min(originalDur6, ONE_DAY);
                const extra = originalDur6 - newDur6;

                adjustedDurations[6] = newDur6;

                if (extra > 0) {
                    if (adjustedDurations[5] !== undefined) {
                        adjustedDurations[5] = (adjustedDurations[5] || 0) + extra;
                    } else {
                        adjustedDurations[5] = extra;
                        if (!foundStageIds.has(5)) {
                            foundStageIds.add(5);
                        }
                    }
                }
            }

            let inicioVacio = firstStart - domainMin;
            if (inicioVacio <= 0) inicioVacio = 1;

            const rowData: any = {
                key: row.key,
                name: row.name,
                totalBudget: row.totalBudget,
                totalAvance: row.totalAvance,
                count: row.count,
                maxStageId: row.maxStageId,
                ids: row.ids,
                firstStart: row.firstStart,
                lastEnd: row.lastEnd,
                etapa1Date: row.etapa1Date,
                inicioVacio,
                ...adjustedDurations,
                totalBeneficiarios: row.totalBeneficiarios,
                sortYear: row.sortYear,
                informes: row.informes,
                impactoInicio: row.impactoInicio,
                impactoFin: row.impactoFin,
            };

            return rowData;
        });

        // Orden cronológico: año más antiguo primero; sin año determinado, al final
        const sortedRows = rows.sort((a, b) => a.sortYear - b.sortYear);

        const finalUsedStageIds = Array.from(foundStageIds).sort((a, b) => a - b);

        return {
            chartData: sortedRows,
            usedStageIds: finalUsedStageIds,
            minTimestamp: domainMin,
            maxTimestamp: domainMax,
            stageById
        };
    }, [data, options.etapas, informesImpacto]);

    // Datos filtrados para la tabla de detalle
    const filteredData = useMemo(() => {
        if (!selectedGroupIds || selectedGroupIds.length === 0) return [];
        return data.filter((beca: any) => selectedGroupIds.includes(beca.id));
    }, [selectedGroupIds, data]);

    // ── TOOLTIP ─────────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;

        const fmtDate = (ts: number | null) => {
            if (!ts || isNaN(ts)) return '-';
            const d = new Date(ts);
            return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
        };

        const fmtMoney = (n: number) => {
            if (isNaN(n)) return 'S/ 0.00';
            return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const stageColor = stageById[d.maxStageId]?.color || '#64748b';

        return (
            <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-200 text-[11px] min-w-[280px]" style={{ zIndex: 9999 }}>
                <div className="space-y-2">
                    <TooltipRow label="Temporalidad">
                        <span className="font-extrabold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">
                            {fmtDate(d.firstStart)} – {fmtDate(d.lastEnd)}
                        </span>
                    </TooltipRow>
                    <TooltipRow label="BENEFICIARIOS">
                        <span className="font-black text-blue-600 px-2 bg-blue-50 rounded italic">{d.totalBeneficiarios} pers.</span>
                    </TooltipRow>
                    <TooltipRow label="Presupuesto total">
                        <span className="font-black text-gray-900 px-2 bg-slate-50 rounded border border-slate-100">
                            {fmtMoney(d.totalBudget)}
                        </span>
                    </TooltipRow>
                    <TooltipRow label="Promedio por Beneficiario">
                        <span className="font-bold text-emerald-600 px-2 bg-emerald-50 rounded border border-emerald-100 italic">
                            {fmtMoney(d.totalBeneficiarios > 0 ? (d.totalBudget / d.totalBeneficiarios) : 0)}
                        </span>
                    </TooltipRow>
                    {d.informes && d.informes.length > 0 && (
                        <TooltipRow label="Informes de impacto">
                            <span className="font-black text-teal-600 px-2 bg-teal-50 rounded border border-teal-100">
                                {d.informes.length} 📄
                            </span>
                        </TooltipRow>
                    )}
                    <TooltipRow label="Avance total">
                        <span className="font-black tabular-nums px-2 bg-slate-50 rounded border border-slate-100" style={{ color: stageColor }}>
                            {fmtMoney(d.totalAvance)}
                        </span>
                    </TooltipRow>
                </div>
            </div>
        );
    };

    // ── RENDER ───────────────────────────────────────────────────────────────
    if (!minTimestamp || !maxTimestamp || chartData.length === 0) {
        return <div className="text-center p-8 text-gray-500">No hay datos para mostrar</div>;
    }

    const startYear = new Date(minTimestamp).getUTCFullYear();
    const endYear = new Date(maxTimestamp).getUTCFullYear();
    const yearTicks: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
        const ts = Date.UTC(y, 0, 1);
        yearTicks.push(ts - minTimestamp);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    let todayOffset: number | null = null;
    if (todayTs >= minTimestamp && todayTs <= maxTimestamp) {
        todayOffset = todayTs - minTimestamp;
    }

    return (
        <div className="w-full bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100/50 mb-12">
            <div className="mb-6 flex items-center gap-4 pb-2">
                <div className="w-2.5 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex-shrink-0" />
                <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        Línea de Tiempo de Becas
                    </h3>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-4 custom-scrollbar-timeline">
                <div style={{ width: '100%', minWidth: '800px', height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            key={forceRender}
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                            barSize={30}
                            barCategoryGap="10%"
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" opacity={0.6} />
                            <XAxis
                                xAxisId="main"
                                orientation="top"
                                type="number"
                                domain={[0, maxTimestamp - minTimestamp]}
                                ticks={yearTicks}
                                tickFormatter={(val: number) => new Date(minTimestamp + val).getUTCFullYear().toString()}
                                tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }}
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={{ stroke: '#cbd5e1' }}
                            />
                            <XAxis
                                xAxisId="main"
                                orientation="bottom"
                                type="number"
                                domain={[0, maxTimestamp - minTimestamp]}
                                ticks={yearTicks}
                                tickFormatter={(val: number) => new Date(minTimestamp + val).getUTCFullYear().toString()}
                                tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }}
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={{ stroke: '#cbd5e1' }}
                            />
                            <YAxis
                                orientation="left"
                                type="category"
                                dataKey="name"
                                width={280}
                                interval={0}
                                tick={{ fontSize: 11, fontWeight: 500, fill: '#374151' }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} wrapperStyle={{ zIndex: 9999 }} />
                            <Legend
                                verticalAlign="top"
                                wrapperStyle={{ paddingBottom: '20px' }}
                            />
                            <Bar
                                dataKey="inicioVacio"
                                stackId="a"
                                xAxisId="main"
                                fill="transparent"
                                isAnimationActive={false}
                                hide={false}
                                minPointSize={1}
                            />
                            {usedStageIds.map(sid => {
                                const stage = stageById[sid];
                                return (
                                    <Bar
                                        key={sid}
                                        dataKey={sid}
                                        stackId="a"
                                        xAxisId="main"
                                        name={stage?.name ?? `Etapa ${sid}`}
                                        fill={stage?.color ?? '#94a3b8'}
                                        fillOpacity={1}
                                        isAnimationActive={false}
                                        cursor="pointer"
                                        // El segmento Impacto siempre se nota, aunque el
                                        // informe dure pocos días en un eje de años.
                                        minPointSize={sid === IMPACTO_STAGE_ID ? 4 : 1}
                                        onClick={(eventData) => {
                                            if (eventData?.payload?.ids) {
                                                const clickedIds = eventData.payload.ids;
                                                setSelectedGroupIds(
                                                    JSON.stringify(selectedGroupIds) === JSON.stringify(clickedIds)
                                                        ? null
                                                        : clickedIds
                                                );
                                                setSelectedGroup({
                                                    items: filteredData,
                                                    start: eventData.payload.firstStart,
                                                    end: eventData.payload.lastEnd,
                                                    informes: eventData.payload.informes || []
                                                });
                                            }
                                        }}
                                    >
                                        {chartData.map((entry: any, idx: number) => (
                                            <Cell
                                                key={`cell-${sid}-${idx}`}
                                                style={{
                                                    filter: selectedGroupIds && JSON.stringify(selectedGroupIds) === JSON.stringify(entry.ids)
                                                        ? 'drop-shadow(0px 0px 8px rgba(59,130,246,0.5))'
                                                        : 'none',
                                                    opacity: selectedGroupIds && JSON.stringify(selectedGroupIds) !== JSON.stringify(entry.ids) ? 0.2 : 1,
                                                    transition: 'all 0.3s ease',
                                                }}
                                            />
                                        ))}
                                    </Bar>
                                );
                            })}
                            {/* Marcadores de informes de impacto (clic = abrir el PDF).
                                Se ubican en la fecha de presentación; si el informe
                                aún no se presenta, en el inicio de la evaluación. */}
                            {chartData.flatMap((g: any) =>
                                (g.informes || []).map((inf: any) => {
                                    const tienePdf = Boolean(inf.archivo_url);
                                    return (
                                        <ReferenceDot
                                            key={`informe-${g.key}-${inf.id}`}
                                            xAxisId="main"
                                            x={(inf.tsFin ?? inf.tsInicio) - minTimestamp}
                                            y={g.name}
                                            isFront
                                            shape={(props: any) => (
                                                <g
                                                    transform={`translate(${props.cx}, ${props.cy})`}
                                                    style={{ cursor: tienePdf ? 'pointer' : 'default', pointerEvents: 'all' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (tienePdf) window.open(inf.archivo_url, '_blank', 'noopener');
                                                    }}
                                                >
                                                    <title>{`${inf.titulo}${tienePdf ? ' — clic para abrir el PDF' : ' (sin PDF)'}`}</title>
                                                    <circle r={8} fill="#ffffff" stroke="#0d9488" strokeWidth={2} />
                                                    <text
                                                        textAnchor="middle"
                                                        dominantBaseline="central"
                                                        fontSize={9}
                                                        fontWeight="bold"
                                                        fill="#0d9488"
                                                    >
                                                        I
                                                    </text>
                                                </g>
                                            )}
                                        />
                                    );
                                })
                            )}

                            {todayOffset !== null && (
                                <ReferenceLine
                                    xAxisId="main"
                                    x={todayOffset}
                                    stroke="red"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    label={{
                                        value: "Hoy",
                                        position: "top",
                                        fill: "red",
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {selectedGroupIds && selectedGroupIds.length > 0 && selectedGroup && (
                <div className="mt-8 pt-6 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-500">
                    <div className="mb-4">
                        <h4 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                            Becas Vinculadas al Grupo
                        </h4>
                    </div>
                    {selectedGroup.informes && selectedGroup.informes.length > 0 && (
                        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50/60 p-3">
                            <div className="mb-2 flex items-center gap-2 text-teal-800">
                                <FileText className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wide">Informes de Impacto</span>
                            </div>
                            <div className="space-y-1">
                                {selectedGroup.informes.map((inf: any) => {
                                    const lineaLabel = inf.linea_id
                                        ? (options.lineas || []).find((l: any) => Number(l.value) === Number(inf.linea_id))?.label || `Línea ${inf.linea_id}`
                                        : 'Todas las líneas';
                                    const fmt = (ts: number | null) => {
                                        if (!ts || isNaN(ts)) return '-';
                                        const f = new Date(ts);
                                        return `${f.getUTCDate().toString().padStart(2, '0')}/${(f.getUTCMonth() + 1).toString().padStart(2, '0')}/${f.getUTCFullYear()}`;
                                    };
                                    return (
                                        <div key={inf.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs border border-teal-100">
                                            <div>
                                                <span className="font-bold text-gray-800">{inf.titulo}</span>
                                                <span className="ml-2 text-gray-500">({lineaLabel})</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-600">
                                                    {fmt(inf.tsInicio)} – {inf.tsFin ? fmt(inf.tsFin) : 'en curso'}
                                                </span>
                                                {inf.archivo_url ? (
                                                    <a
                                                        href={inf.archivo_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold text-teal-700 hover:underline"
                                                    >
                                                        Ver PDF
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">Sin PDF</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <DetalleBecasTable
                            data={filteredData} 
                            loading={false} 
                            groupStartDate={selectedGroup.start}
                            groupEndDate={selectedGroup.end}
                            onViewDetails={handleViewDetails}
                            loadingId={loadingId}
                        />
                    </div>
                </div>
            )}

            <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] font-mono">
                        Panel de Control Operativo
                    </span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50/80 px-6 py-2.5 rounded-[2rem] border border-slate-100 shadow-inner">
                    <img src="/fondoempleo.jpg" alt="Logo" className="h-8 opacity-90 contrast-125" />
                    <div className="h-7 w-[2px] bg-slate-200" />
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.5em] font-mono">
                        SISTEMA ACTIVA-T V2.5
                    </span>
                </div>
            </div>

            {/* Servicio Detail Modal */}
            <ServicioModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={async () => {}} // Read-only
                servicio={selectedServicio}
                options={options}
                isReadOnly={true}
            />
        </div>
    );
}

function TooltipRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center gap-3">
            <span className="text-gray-400 font-bold uppercase tracking-tighter">{label}</span>
            {children}
        </div>
    );
}