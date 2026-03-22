"use client";

import { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, CartesianGrid, Cell, ReferenceLine
} from 'recharts';

import { ServiciosTable as DetalleServiciosTable } from './ServiciosTable';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────
interface ServiciosTimelineProps {
    data: any[];
    onSelectGroup?: (groupKey: string | null) => void;
    selectedGroup?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE DEFINITIONS  (IDs 1–7 from DB)
// ─────────────────────────────────────────────────────────────────────────────
const STAGES = [
    { id: 1, name: 'Aprobación de bases', color: '#ef4444' },
    { id: 2, name: 'Lanzamiento', color: '#f97316' },
    { id: 3, name: 'Aprobación consejo', color: '#eab308' },
    { id: 4, name: 'Firma convenio', color: '#22c55e' },
    { id: 5, name: 'En ejecución', color: '#3b82f6' },
    { id: 6, name: 'Ejecutado', color: '#dc2626' },
    { id: 7, name: 'Resuelto', color: '#94a3b8' },
];
const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

const ONE_DAY = 24 * 60 * 60 * 1000;
const MARGIN_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function ServiciosTimeline({ data, onSelectGroup, selectedGroup }: ServiciosTimelineProps) {

    const [selectedGroupIds, setSelectedGroupIds] = useState<number[] | null>(null);

    // ── BUILD CHART ROWS & DYNAMIC DOMAIN ───────────────────────────────────
    const { chartData, usedStageIds, minTimestamp, maxTimestamp } = useMemo(() => {
        if (!data || data.length === 0) {
            return { chartData: [], usedStageIds: [], minTimestamp: null, maxTimestamp: null };
        }

        const groupMap = new Map<string, any>();

        data.forEach((servicio: any) => {
            const ejeId = servicio.eje_id || 0;
            const lineaId = servicio.linea_id || 0;
            const ejeDesc = servicio.eje?.descripcion || 'Sin Eje';
            const lineaDesc = servicio.linea?.descripcion || 'Sin Línea';

            const etapa1 = (servicio.avances || []).find((a: any) => Number(a.etapa_id) === 1);
            let fechaE1 = 'sin_fecha';
            if (etapa1 && etapa1.fecha) {
                const parsed = new Date(etapa1.fecha);
                if (!isNaN(parsed.getTime())) {
                    fechaE1 = parsed.toISOString().split('T')[0];
                }
            }

            const groupKey = `${ejeId}-${lineaId}-${fechaE1}`;
            const label = `${ejeId} - ${ejeDesc} | ${lineaId} - ${lineaDesc}`;

            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, {
                    key: groupKey,
                    label,
                    stageDates: {},
                    totalBudget: 0,
                    totalAvance: 0,
                    count: 0,
                    maxStageId: 0,
                    ids: [],
                    ejeId,          // guardamos ejeId para ordenamiento
                    lineaId,        // guardamos lineaId para ordenamiento
                });
            }

            const g = groupMap.get(groupKey)!;
            g.count++;
            g.totalBudget += Number(servicio.presupuesto) || 0;
            g.totalAvance += Number(servicio.avance) || 0;
            g.ids.push(servicio.id);

            if ((servicio.etapa_id || 0) > g.maxStageId) g.maxStageId = servicio.etapa_id;

            (servicio.avances || []).forEach((av: any) => {
                if (!av.fecha) return;
                const t = new Date(av.fecha).getTime();
                if (isNaN(t)) return;
                const sid = Number(av.etapa_id);
                if (!g.stageDates[sid]) g.stageDates[sid] = [];
                g.stageDates[sid].push(t);
            });
        });

        const stageOrder = STAGES.map(s => s.id);
        const foundStageIds = new Set<number>();

        let globalMin = Infinity;
        let globalMax = -Infinity;

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

            const sortedSids = Object.keys(stageStart).map(Number).sort((a, b) => a - b);

            const etapa1Date = stageStart[1];
            const endDate = stageEnd[6] ?? null;

            if (etapa1Date < globalMin) globalMin = etapa1Date;
            if (endDate !== null && endDate > globalMax) globalMax = endDate;
            else if (etapa1Date > globalMax) globalMax = etapa1Date;

            const row: any = {
                key: g.key,
                name: g.label,
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
                ejeId: g.ejeId,
                lineaId: g.lineaId,
            };
            return row;
        }).filter(Boolean);

        if (globalMin === Infinity) {
            const defaultDate = new Date('2022-01-01').getTime();
            globalMin = defaultDate;
            globalMax = defaultDate + ONE_DAY * 365 * 5;
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayTs = today.getTime();
        if (todayTs > globalMax) globalMax = todayTs;

        const marginMs = ONE_DAY * MARGIN_DAYS;
        const domainMin = globalMin - marginMs;
        const domainMax = globalMax + marginMs;

        const rows = rowsRaw.map(row => {
            const { stageStart, stageEnd, sortedSids, firstStart, lastEnd, etapa1Date } = row;

            const originalDurations: Record<number, number> = {};

            for (let i = 0; i < sortedSids.length; i++) {
                const sid = sortedSids[i];
                const nextSid = sortedSids[i + 1];

                let sStart = stageStart[sid];
                let sEnd: number;
                if (sid === 6) {
                    sEnd = stageEnd[6] ?? sStart;
                } else if (nextSid !== undefined) {
                    sEnd = stageStart[nextSid];
                } else {
                    sEnd = Math.max(sStart, Date.now());
                }

                if (sStart < domainMin) sStart = domainMin;
                if (sEnd > domainMax) sEnd = domainMax;

                let dur = sEnd - sStart;
                if (isNaN(dur) || dur < 0) dur = 0;

                originalDurations[sid] = dur;
            }

            const adjustedDurations = { ...originalDurations };

            if (adjustedDurations[6] !== undefined) {
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

            const inicioVacio = firstStart - domainMin;

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
                ejeId: row.ejeId,
                lineaId: row.lineaId,
            };

            return rowData;
        });

        // ORDEN: primero por eje, luego por línea, luego por fecha (firstStart)
        const sortedRows = rows.sort((a, b) => {
            if (a.ejeId !== b.ejeId) return a.ejeId - b.ejeId;
            if (a.lineaId !== b.lineaId) return a.lineaId - b.lineaId;
            return a.firstStart - b.firstStart;
        });

        const finalUsedStageIds = Array.from(foundStageIds).sort((a, b) => a - b);

        return {
            chartData: sortedRows,
            usedStageIds: finalUsedStageIds,
            minTimestamp: domainMin,
            maxTimestamp: domainMax,
        };
    }, [data]);

    // Datos filtrados para la tabla de detalle
    const filteredData = useMemo(() => {
        if (!selectedGroupIds || selectedGroupIds.length === 0) return [];
        return data.filter((servicio: any) => selectedGroupIds.includes(servicio.id));
    }, [selectedGroupIds, data]);

    // Obtener las fechas del grupo seleccionado (para mostrarlas en la tabla)
    const selectedGroupData = useMemo(() => {
        if (!selectedGroupIds || selectedGroupIds.length === 0) return null;
        const group = chartData.find((g: any) =>
            JSON.stringify(g.ids) === JSON.stringify(selectedGroupIds)
        );
        if (group) {
            return {
                startDate: group.firstStart,
                endDate: group.lastEnd,
            };
        }
        return null;
    }, [selectedGroupIds, chartData]);

    const selectedGroupStartDate = selectedGroupData?.startDate;
    const selectedGroupEndDate = selectedGroupData?.endDate;

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

        const stageColor = STAGE_BY_ID[d.maxStageId]?.color || '#64748b';

        return (
            <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-200 text-[11px] min-w-[280px]" style={{ zIndex: 9999 }}>
                <div className="space-y-2">
                    <TooltipRow label="Temporalidad">
                        <span className="font-extrabold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">
                            {fmtDate(d.firstStart)} – {fmtDate(d.lastEnd)}
                        </span>
                    </TooltipRow>
                    <TooltipRow label="Servicios">
                        <span className="font-black text-blue-600 px-2 bg-blue-50 rounded italic">{d.count} u.</span>
                    </TooltipRow>
                    <TooltipRow label="Presupuesto total">
                        <span className="font-black text-gray-900 px-2 bg-slate-50 rounded border border-slate-100">
                            {fmtMoney(d.totalBudget)}
                        </span>
                    </TooltipRow>
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
                        Línea de Tiempo de Servicios
                    </h3>
                </div>
            </div>

            <div style={{ width: '100%', height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
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
                            width={220}
                            interval={0}
                            tick={{ fontSize: 14, fontWeight: 500, fill: '#374151' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                        />

                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} wrapperStyle={{ zIndex: 9999 }} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />

                        <Bar
                            dataKey="inicioVacio"
                            stackId="a"
                            xAxisId="main"
                            fill="transparent"
                            isAnimationActive={false}
                            hide={false}
                        />

                        {usedStageIds.map(sid => {
                            const stage = STAGE_BY_ID[sid];
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
                                    onClick={(eventData) => {
                                        if (eventData?.payload) {
                                            const clickedKey = eventData.payload.key;
                                            const clickedIds = eventData.payload.ids;
                                            
                                            // Prefer onSelectGroup if provided (controlled)
                                            if (onSelectGroup) {
                                                onSelectGroup(selectedGroup === clickedKey ? null : clickedKey);
                                            } else {
                                                setSelectedGroupIds(
                                                    JSON.stringify(selectedGroupIds) === JSON.stringify(clickedIds)
                                                        ? null
                                                        : clickedIds
                                                );
                                            }
                                        }
                                    }}
                                >
                                    {chartData.map((entry: any, idx: number) => (
                                        <Cell
                                            key={`cell-${sid}-${idx}`}
                                            style={{
                                                filter: (selectedGroup && selectedGroup === entry.key) || (selectedGroupIds && JSON.stringify(selectedGroupIds) === JSON.stringify(entry.ids))
                                                    ? 'drop-shadow(0px 0px 8px rgba(59,130,246,0.5))'
                                                    : 'none',
                                                opacity: (selectedGroup && selectedGroup !== entry.key) || (selectedGroupIds && JSON.stringify(selectedGroupIds) !== JSON.stringify(entry.ids)) ? 0.2 : 1,
                                                transition: 'all 0.3s ease',
                                            }}
                                        />
                                    ))}
                                </Bar>
                            );
                        })}

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

            {selectedGroupIds && selectedGroupIds.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-500">
                    <div className="mb-4">
                        <h4 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                            Servicios Vinculados al Grupo
                        </h4>
                    </div>
                    <DetalleServiciosTable
                        data={filteredData}
                        loading={false}
                        groupStartDate={selectedGroupStartDate}
                        groupEndDate={selectedGroupEndDate}
                    />
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