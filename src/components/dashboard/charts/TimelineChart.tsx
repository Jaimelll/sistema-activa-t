"use client";

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';

interface TimelineChartProps {
    data: any[]; // Raw project data
}

export function TimelineChart({ data }: TimelineChartProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const groups = new Map();
        const TODAY = new Date().getTime();
        const JAN_2024 = new Date('2024-01-01').getTime();

        data.forEach((project: any) => {
            if (!project.avances || project.avances.length === 0) return;

            // 1. Find Stage 1 (Bases) Date - REQUIRED
            const stage1 = project.avances.find((a: any) => a.etapa_id === 1 && a.fecha);
            if (!stage1) return; // Ignore if no Stage 1

            const t1 = new Date(stage1.fecha).getTime();
            if (isNaN(t1)) return;

            // Format Date for Key: DD/MM/YY
            const dateObj = new Date(t1);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const yearShort = String(dateObj.getFullYear()).slice(-2);
            const dateStr = `${day}/${month}/${yearShort}`;

            const ejeId = project.eje_id || '?';
            const lineaId = project.linea_id || '?';
            // New Key: Date | Eje - Linea
            const key = `${dateStr} | Eje ${ejeId} - Línea ${lineaId}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    name: key,
                    stage1Dates: [],
                    stage2Dates: [],
                    stage3Dates: [],
                    stage4Dates: [],
                    stage5Dates: [],
                    stage6Dates: [],
                    endDates: [],
                    projectCount: 0
                });
            }

            const group = groups.get(key);
            group.projectCount++;

            // Collect dates for all stages
            project.avances.forEach((a: any) => {
                const ts = new Date(a.fecha).getTime();
                if (!isNaN(ts)) { // Removed > 2024 strict filter to allow older projects if user wants, or keep strict if preferred. Sticking to valid dates.
                    if (a.etapa_id === 1) group.stage1Dates.push(ts);
                    if (a.etapa_id === 2) group.stage2Dates.push(ts);
                    if (a.etapa_id === 3) group.stage3Dates.push(ts);
                    if (a.etapa_id === 4) group.stage4Dates.push(ts);
                    if (a.etapa_id === 5) group.stage5Dates.push(ts);
                    if (a.etapa_id === 6) group.stage6Dates.push(ts);
                    // Track max date as potential end
                    group.endDates.push(ts);
                }
            });
        });

        const getAvg = (arr: number[]) => (arr && arr.length > 0) ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        const chartData = Array.from(groups.values()).map((g: any) => {
            const avg1 = getAvg(g.stage1Dates);
            const avg2 = getAvg(g.stage2Dates);
            const avg3 = getAvg(g.stage3Dates);
            const avg4 = getAvg(g.stage4Dates);
            const avg5 = getAvg(g.stage5Dates);
            const avg6 = getAvg(g.stage6Dates);
            const avgEnd = getAvg(g.endDates); // Max observed date average

            // Mandatory Start (should exist because we grouped by it, but safe check)
            if (!avg1) return null;

            let t1 = avg1;
            // Define End: Use avg6 if exists, else avgEnd, else Today
            let tEndProject = avg6 || avgEnd || TODAY;
            // Logic: If Stage 6 exists, that's the end. If not, maybe Stage 5 is active. 
            // To ensure bars draw to "Today" for active projects (missing stage 6), we usually max with TODAY if not finished.
            // But strict logic: if avg6 exists, project is done. If not, it's ongoing -> Today.
            if (!avg6) tEndProject = Math.max(tEndProject, TODAY);

            let d1 = 0, d2 = 0, d3 = 0, d4 = 0, d5 = 0, d6 = 0;
            let date1 = t1;
            let date2 = null, date3 = null, date4 = null, date5 = null, date6 = null;

            // --- CASCADE LOGIC (6 STAGES) ---

            // 1. Stage 1 -> 2
            if (!avg2) {
                d1 = tEndProject - t1;
            } else {
                const t2 = Math.max(avg2, t1);
                d1 = t2 - t1;
                date2 = t2;

                // 2. Stage 2 -> 3
                if (!avg3) {
                    d2 = tEndProject - t2;
                } else {
                    const t3 = Math.max(avg3, t2);
                    d2 = t3 - t2;
                    date3 = t3;

                    // 3. Stage 3 -> 4
                    if (!avg4) {
                        d3 = tEndProject - t3;
                    } else {
                        const t4 = Math.max(avg4, t3);
                        d3 = t4 - t3;
                        date4 = t4;

                        // 4. Stage 4 -> 5
                        if (!avg5) {
                            d4 = tEndProject - t4;
                        } else {
                            const t5 = Math.max(avg5, t4);
                            d4 = t5 - t4;
                            date5 = t5;

                            // 5. Stage 5 -> 6
                            if (!avg6) {
                                d5 = tEndProject - t5;
                            } else {
                                const t6 = Math.max(avg6, t5);
                                d5 = t6 - t5;
                                date6 = t6;
                                // 6. Stage 6 (Finished) -> End (usually 0 if finished at t6, but maybe duration of execution?)
                                // Actually "Ejecutado" is a point in time usually. 
                                // User wants "Ejecutado" bar. Let's say d6 is keeping it visible or if it's a phase.
                                // If "Ejecutado" is a state, maybe it has duration? 
                                // Let's assume d6 is just a small marker or duration if tEndProject > t6.
                                d6 = tEndProject - t6;
                            }
                        }
                    }
                }
            }

            return {
                name: g.name, // Key: "DD/MM/YY | Eje X - Línea Y"
                count: g.projectCount,
                start: t1,
                d1, d2, d3, d4, d5, d6,
                date1, date2, date3, date4, date5, date6, dateEnd: tEndProject,
                d1_safe: Math.max(0, d1),
                d2_safe: Math.max(0, d2),
                d3_safe: Math.max(0, d3),
                d4_safe: Math.max(0, d4),
                d5_safe: Math.max(0, d5),
                d6_safe: Math.max(0, d6),
            };
        })
            .filter(Boolean)
            .sort((a: any, b: any) => a.start - b.start); // Sort by Start Date ascending

        return chartData;

    }, [data]);

    const formatXAxis = (tickItem: number) => {
        return new Date(tickItem).toLocaleDateString('es-PE', { year: '2-digit', month: 'short' });
    };

    const formatDate = (ts: number | null) => ts ? new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';

    // Helper to clean Y Axis Label: "[15/01/24] Eje 1 - Línea 2"
    // The key is already format "DD/MM/YY | Eje X - Línea Y"
    // We just want to replace " | " with " " or keep it as is but maybe brackets for date?
    // User asked: "[15/01/24] Eje 1 - Línea 2"
    const formatYAxis = (key: string) => {
        const parts = key.split('|');
        if (parts.length === 2) {
            return `[${parts[0].trim()}] ${parts[1].trim()}`;
        }
        return key;
    };

    const ONE_DAY = 86400000;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;

            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs z-50">
                    <p className="font-bold text-gray-800 mb-2">{d.name}</p>
                    <p className="text-gray-500 mb-2">Proyectos: <span className="font-semibold">{d.count}</span></p>
                    <div className="space-y-1">
                        {d.d1_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                <span>Aprob. Bases: {formatDate(d.date1)} - {d.date2 ? formatDate(d.date2) : 'Hoy'}</span>
                            </div>
                        )}
                        {d.d2_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                <span>Actos Previos: {formatDate(d.date2)} - {d.date3 ? formatDate(d.date3) : 'Hoy'}</span>
                            </div>
                        )}
                        {d.d3_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <span>Aprob. Consejo: {formatDate(d.date3)} - {d.date4 ? formatDate(d.date4) : 'Hoy'}</span>
                            </div>
                        )}
                        {d.d4_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                                <span>Firma Convenio: {formatDate(d.date4)} - {d.date5 ? formatDate(d.date5) : 'Hoy'}</span>
                            </div>
                        )}
                        {d.d5_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span>En Ejecución: {formatDate(d.date5)} - {d.date6 ? formatDate(d.date6) : 'Hoy'}</span>
                            </div>
                        )}
                        {d.d6_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                <span>Ejecutado: {formatDate(d.date6)} - {formatDate(d.dateEnd)}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const JAN_2024 = new Date('2024-01-01').getTime();
    const END_2026 = new Date('2026-12-31').getTime();

    const minDate = useMemo(() => {
        if (!processedData.length) return JAN_2024;
        const min = Math.min(...processedData.map((d: any) => d.start).filter(Boolean));
        return Math.max(min || JAN_2024, JAN_2024);
    }, [processedData]);

    const COLORS = {
        bases: '#60a5fa',   // Blue
        actos: '#34d399',   // Emerald
        consejo: '#fbbf24', // Amber
        firma: '#a78bfa',    // Violet
        ejecucion: '#6366f1', // Indigo (New)
        ejecutado: '#f43f5e'  // Rose (New)
    };

    return (
        <div className="card w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Línea de Tiempo</h3>
            </div>

            <div className="w-full" style={{ height: Math.max(500, processedData.length * 70) + 'px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={processedData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                        barSize={20}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                            type="number"
                            domain={[minDate, END_2026]}
                            tickFormatter={formatXAxis}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            allowDataOverflow={true}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={isMobile ? 120 : 180}
                            tick={{ fontSize: isMobile ? 9 : 11, fill: '#374151', width: isMobile ? 110 : 170 }}
                            interval={0}
                            tickFormatter={formatYAxis}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                        {/* Invisible Start */}
                        <Bar dataKey="start" stackId="a" fill="transparent" legendType="none" />

                        {/* 1. Bases (Blue) */}
                        <Bar dataKey="d1_safe" stackId="a" name="Aprobación de bases" fill={COLORS.bases} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d1-${index}`} fill={d.d1_safe > 0 ? COLORS.bases : 'transparent'} stroke="none" radius={[4, 0, 0, 4]} />
                            ))}
                        </Bar>

                        {/* 2. Actos (Emerald) */}
                        <Bar dataKey="d2_safe" stackId="a" name="Actos Previos" fill={COLORS.actos} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d2-${index}`} fill={d.d2_safe > 0 ? COLORS.actos : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 3. Consejo (Amber) */}
                        <Bar dataKey="d3_safe" stackId="a" name="Aprobación de consejo" fill={COLORS.consejo} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d3-${index}`} fill={d.d3_safe > 0 ? COLORS.consejo : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 4. Firma (Violet) */}
                        <Bar dataKey="d4_safe" stackId="a" name="Firma convenio" fill={COLORS.firma} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d4-${index}`} fill={d.d4_safe > 0 ? COLORS.firma : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 5. En Ejecución (Indigo) */}
                        <Bar dataKey="d5_safe" stackId="a" name="En Ejecución" fill={COLORS.ejecucion} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d5-${index}`} fill={d.d5_safe > 0 ? COLORS.ejecucion : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 6. Ejecutado (Rose) */}
                        <Bar dataKey="d6_safe" stackId="a" name="Ejecutado" fill={COLORS.ejecutado} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d6-${index}`} fill={d.d6_safe > 0 ? COLORS.ejecutado : 'transparent'} stroke="none" radius={[0, 4, 4, 0]} />
                            ))}
                        </Bar>

                        {/* Reference Line for Today */}
                        <ReferenceLine
                            x={new Date().getTime()}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{ position: 'top', value: 'Hoy', fill: '#ef4444', fontSize: 12 }}
                        />

                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
