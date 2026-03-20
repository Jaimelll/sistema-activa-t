"use client";

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine, Legend } from 'recharts';

interface ServiciosTimelineProps {
    data: any[];
    onSelectGroup: (groupKey: string | null) => void;
    selectedGroup: string | null;
}

const STAGE_COLORS: Record<number, string> = {
    1: '#60a5fa',  // Aprobación de bases (Blue)
    2: '#34d399',  // Lanzamiento (Emerald)
    3: '#fbbf24',  // Recepción de propuestas (Amber)
    4: '#a78bfa',  // Evaluación y Selección (Violet)
    5: '#f472b6',  // Aprobación de consejo (Pink)
    6: '#6366f1',  // Firma convenio (Indigo)
    7: '#ec4899',  // Desembolso (Fuchsia)
    8: '#2dd4bf',  // En ejecución (Teal)
    9: '#f59e0b',  // Liquidación (Orange)
    10: '#f43f5e', // Ejecutado (Rose)
    11: '#94a3b8', // Resuelto (Slate)
    12: '#10b981', // Rendición de cuentas (Green)
};

const STAGE_NAMES: Record<number, string> = {
    1: 'Aprobación de bases',
    2: 'Lanzamiento',
    3: 'Recepción de propuestas',
    4: 'Evaluación y Selección',
    5: 'Aprobación de consejo',
    6: 'Firma convenio',
    7: 'Desembolso',
    8: 'En ejecución',
    9: 'Liquidación',
    10: 'Ejecutado',
    11: 'Resuelto',
    12: 'Rendición de cuentas'
};

const MIN_DATE = new Date('2022-01-01').getTime();
const MAX_DATE = new Date('2027-12-31').getTime();

// Define yearly ticks for the axis
const YEARLY_TICKS = [
    new Date('2022-01-01').getTime(),
    new Date('2023-01-01').getTime(),
    new Date('2024-01-01').getTime(),
    new Date('2025-01-01').getTime(),
    new Date('2026-01-01').getTime(),
    new Date('2027-01-01').getTime(),
    new Date('2027-12-31').getTime(),
];

export function ServiciosTimeline({ data, onSelectGroup, selectedGroup }: ServiciosTimelineProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { chartData, stagesInvolved } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], stagesInvolved: [] };

        const groups = new Map();
        const TODAY = new Date().getTime();

        data.forEach((beca: any) => {
            const ejeId = beca.eje_id || 0;
            const lineaId = beca.linea_id || 0;
            const ejeDesc = beca.eje?.descripcion || 'Sin Eje';
            const lineaDesc = beca.linea?.descripcion || 'Sin Línea';
            
            const groupKey = `${ejeId}-${lineaId}`;
            const groupLabel = `${ejeId} - ${ejeDesc} | ${lineaId} - ${lineaDesc}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    key: groupKey,
                    label: groupLabel,
                    ejeId,
                    lineaId,
                    stageDates: {} as Record<number, number[]>,
                    totalBudget: 0,
                    count: 0,
                    maxStageId: 0
                });
            }

            const g = groups.get(groupKey);
            g.count++;
            g.totalBudget += (Number(beca.presupuesto) || 0);
            if (beca.etapa_id > g.maxStageId) g.maxStageId = beca.etapa_id;

            (beca.avances || []).forEach((av: any) => {
                const time = new Date(av.fecha).getTime();
                if (!time || isNaN(time)) return;

                const sid = Number(av.etapa_id);
                if (!g.stageDates[sid]) g.stageDates[sid] = [];
                g.stageDates[sid].push(time);
            });
        });

        const stageOrder = Object.keys(STAGE_NAMES).map(Number).sort((a,b) => a - b);
        const resolvedStages = new Set<number>();

        const finalData = Array.from(groups.values()).map(g => {
            const stageBoundaries: Record<number, { min: number, max: number }> = {};
            
            stageOrder.forEach(sid => {
                if (!g.stageDates[sid]) return;
                stageBoundaries[sid] = {
                    min: Math.min(...g.stageDates[sid]),
                    max: Math.max(...g.stageDates[sid])
                };
                resolvedStages.add(sid);
            });

            const sortedStages = Object.keys(stageBoundaries).map(Number).sort((a,b) => a - b);
            if (sortedStages.length === 0) return null;

            // REAL BOUNDARIES FOR TOOLTIP
            const realStart = stageBoundaries[sortedStages[0]].min;
            const realEnd = stageBoundaries[sortedStages[sortedStages.length - 1]].max;

            // VISUAL CLIP START (MUST BE >= MIN_DATE)
            const visualStart = Math.max(realStart, MIN_DATE);
            
            // IF THE GROUP STARTS AFTER OUR 2027 LIMIT, IGNORE
            if (visualStart > MAX_DATE) return null; 

            const row: any = {
                key: g.key,
                displayLabel: g.label,
                totalBudget: g.totalBudget,
                count: g.count,
                maxStageId: g.maxStageId,
                
                // BAR OFFSET: Distance from AXIS_START (MIN_DATE) to DATA_START
                // In stacked mode, this is the first transparent bar.
                startOffset: Math.max(0, visualStart - MIN_DATE), 
                
                tooltipStart: realStart,
                tooltipEnd: realEnd,
                sortStart: realStart
            };

            for (let i = 0; i < sortedStages.length; i++) {
                const sid = sortedStages[i];
                const nextSid = sortedStages[i+1];
                
                let sStart = Math.max(stageBoundaries[sid].min, MIN_DATE);
                let sEnd;

                if (nextSid) {
                    sEnd = Math.max(stageBoundaries[nextSid].min, MIN_DATE);
                } else {
                    if (sid === 10) {
                        sEnd = Math.max(stageBoundaries[sid].max, MIN_DATE);
                    } else {
                        sEnd = Math.max(stageBoundaries[sid].min, TODAY, MIN_DATE);
                    }
                }

                // Final relative clipping against 2027
                sStart = Math.min(sStart, MAX_DATE);
                sEnd = Math.min(sEnd, MAX_DATE);
                
                // VALUE IS DURATION (NOT DATE TIMESTAMP)
                row[`duration_${sid}`] = Math.max(0, sEnd - sStart);
            }

            return row;
        }).filter(Boolean).sort((a, b) => a!.sortStart - b!.sortStart);

        return { 
            chartData: finalData, 
            stagesInvolved: Array.from(resolvedStages).sort((a,b) => a - b) 
        };
    }, [data]);

    const formatXAxis = (tick: number) => {
        const date = new Date(tick);
        if (isNaN(date.getTime())) return '';
        const month = date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
        const year = date.getFullYear();
        return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const maxStageId = d.maxStageId;
            const currentStage = STAGE_NAMES[maxStageId] || 'Sin Etapa';
            
            const startDate = new Date(d.tooltipStart).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
            const endDate = new Date(d.tooltipEnd).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });

            return (
                <div className="bg-white p-5 rounded-2xl shadow-2xl border border-gray-300 text-[11px] min-w-[300px] z-50">
                    <p className="font-black text-gray-900 border-b border-gray-100 pb-2 mb-3 leading-tight uppercase tracking-tight text-sm font-mono">{d.displayLabel}</p>
                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Temporalidad Real:</span>
                            <span className="font-extrabold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">{startDate} - {endDate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Cantidad de Becas:</span>
                            <span className="font-black text-blue-600 px-2 bg-blue-50 rounded italic">{d.count} u.</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Inversión del Grupo:</span>
                            <span className="font-black text-gray-900 px-2 bg-slate-50 rounded border border-slate-100">S/ {d.totalBudget.toLocaleString('es-PE')}</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-600/5 p-3 rounded-xl border border-blue-600/10 mt-3">
                            <span className="text-blue-600 font-black uppercase tracking-widest text-[9px]">Avance más avanzado:</span>
                            <span className="px-3 py-1 rounded-full text-[10px] text-white font-black uppercase tracking-wider" style={{ backgroundColor: STAGE_COLORS[maxStageId] }}>
                                {currentStage}
                            </span>
                        </div>
                        <p className="text-[9px] text-blue-500 font-black mt-3 text-center animate-pulse uppercase tracking-[0.2em] bg-blue-50 py-1.5 rounded-lg border border-blue-100 cursor-pointer">
                            {selectedGroup === d.key ? '✕ Mostrar Todo el Universo' : 'Click para filtrar detalle'}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    const handleChartClick = (state: any) => {
        if (state && state.activePayload && state.activePayload.length) {
            const d = state.activePayload[0].payload;
            onSelectGroup(selectedGroup === d.key ? null : d.key);
        }
    };

    return (
        <div className="w-full bg-white p-6 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-100/50 transition-all duration-700 hover:shadow-blue-900/10 mb-12">
            <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 border-b border-gray-50 pb-8">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-2.5 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30" />
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Linea de Tiempo de Becas</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.4em] ml-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Agrupación Estratégica [Eje / Línea de Intervención]
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm hover:border-blue-200 transition-colors duration-300">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <span className="text-xs text-slate-600 font-black uppercase tracking-tighter italic whitespace-nowrap">
                            Estatus al {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="w-full relative" style={{ height: Math.max(550, (chartData.length || 1) * 70 + 220) + 'px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 40, right: 80, left: 10, bottom: 40 }}
                        barSize={40}
                        onClick={handleChartClick}
                    >
                        <CartesianGrid strokeDasharray="6 6" horizontal={true} vertical={true} stroke="#e2e8f0" opacity={0.4} />
                        
                        {/* SUPERIOR AXIS (Starts at MIN_DATE = 2022-01-01) */}
                        <XAxis
                            xAxisId="top"
                            orientation="top"
                            type="number"
                            scale="time"
                            domain={[MIN_DATE, MAX_DATE]}
                            ticks={YEARLY_TICKS}
                            tickFormatter={formatXAxis}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }}
                            stroke="#888888"
                            axisLine={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                            tickLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                        />

                        {/* INFERIOR AXIS (Mirror) */}
                        <XAxis
                            xAxisId="bottom"
                            orientation="bottom"
                            type="number"
                            scale="time"
                            domain={[MIN_DATE, MAX_DATE]}
                            ticks={YEARLY_TICKS}
                            tickFormatter={formatXAxis}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }}
                            stroke="#888888"
                            axisLine={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                            tickLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                        />

                        <YAxis
                            type="category"
                            dataKey="displayLabel"
                            width={isMobile ? 140 : 280}
                            tick={{ fontSize: 9, fill: '#1e293b', fontWeight: 950, width: isMobile ? 130 : 270 }}
                            interval={0}
                            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                            tickLine={false}
                        />
                        <Tooltip 
                            content={<CustomTooltip />} 
                            cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }} 
                            position={{ y: 0 }}
                            wrapperStyle={{ zIndex: 1000 }}
                        />
                        
                        {/* FIRST Transparent Bar: Offset from Axis start (MIN_DATE) to Bar start */}
                        <Bar dataKey="startOffset" stackId="a" fill="transparent" legendType="none" xAxisId="top" />
                        
                        {stagesInvolved.map((sid) => (
                            <Bar 
                                key={sid}
                                dataKey={`duration_${sid}`} 
                                stackId="a" 
                                fill={STAGE_COLORS[sid]}
                                name={STAGE_NAMES[sid]}
                                xAxisId="top"
                            >
                                {chartData.map((entry: any, index: number) => (
                                    <Cell 
                                        key={`cell-${sid}-${index}`}
                                        className={`cursor-pointer transition-all duration-500 ${selectedGroup && selectedGroup !== entry.key ? 'opacity-10 grayscale' : 'opacity-100 hover:brightness-110'}`}
                                        style={{ 
                                            filter: selectedGroup && selectedGroup === entry.key ? 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.6))' : 'none',
                                            transition: 'all 0.8s cubic-bezier(0.19, 1, 0.22, 1)'
                                        }}
                                    />
                                ))}
                            </Bar>
                        ))}

                        <ReferenceLine 
                            xAxisId="top"
                            x={Math.min(Math.max(new Date().getTime(), MIN_DATE), MAX_DATE)} 
                            stroke="#ef4444" 
                            strokeWidth={4}
                            strokeDasharray="8 4" 
                            label={{ 
                                value: 'Hoy', 
                                fill: '#ef4444', 
                                fontSize: 11, 
                                fontWeight: 900, 
                                position: 'top', 
                                offset: 25
                            }} 
                            z={2000}
                        />
                        
                        <Legend 
                            wrapperStyle={{ paddingTop: '80px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}
                            iconType="rect"
                            align="center"
                            verticalAlign="bottom"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600 rounded-full" />
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] font-mono">Panel de Control Operativo</span>
                    </div>
                </div>
                <div className="flex items-center gap-5 bg-slate-50/80 px-8 py-4 rounded-[2rem] border border-slate-100 shadow-inner">
                    <img src="/fondoempleo.jpg" alt="Logo" className="h-10 opacity-90 contrast-125" />
                    <div className="h-10 w-[2px] bg-slate-200" />
                    <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-[0.5em] font-mono">SISTEMA ACTIVA-T V2.5</span>
                </div>
            </div>
        </div>
    );
}
