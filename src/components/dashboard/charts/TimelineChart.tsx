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

            const validAvances = project.avances.filter((a: any) => {
                if (!a.fecha) return false;
                const ts = new Date(a.fecha).getTime();
                return !isNaN(ts) && ts > 1704067200000;
            });

            if (validAvances.length === 0) return;

            const ejeId = project.eje_id || '?';
            const lineaId = project.linea_id || '?';
            const key = `${ejeId}. ${project.eje} - ${lineaId}. ${project.linea}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    name: key,
                    stage1Dates: [],
                    stage2Dates: [],
                    stage3Dates: [],
                    stage4Dates: [],
                    endDates: [],
                    projectCount: 0
                });
            }

            const group = groups.get(key);
            // Only increment project count if it has SOME valid advance (checked above)
            group.projectCount++;

            const pDates = new Map();
            validAvances.forEach((a: any) => {
                const ts = new Date(a.fecha).getTime();
                if (ts >= JAN_2024) {
                    pDates.set(a.etapa_id, ts);
                }
            });

            if (pDates.has(1)) group.stage1Dates.push(pDates.get(1));
            if (pDates.has(2)) group.stage2Dates.push(pDates.get(2));
            if (pDates.has(3)) group.stage3Dates.push(pDates.get(3));
            if (pDates.has(4)) group.stage4Dates.push(pDates.get(4));

            const status = (project.estado || '').toLowerCase().trim();
            const isFinished = status === 'ejecutado' || status === 'culminado' || status === 'cerrado' || status === 'resuelto';

            if (!isFinished) {
                group.endDates.push(TODAY);
            } else {
                const dates = Array.from(pDates.values()).map(Number);
                if (dates.length > 0) {
                    group.endDates.push(Math.max(...dates));
                }
            }
        });

        // Strict Average Helper: MUST have items > 0
        const getAvg = (arr: number[]) => (arr && arr.length > 0) ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        const chartData = Array.from(groups.values()).map((g: any) => {
            // Strict Existence Check: Logic V2.9
            const avg1 = getAvg(g.stage1Dates);
            const avg2 = getAvg(g.stage2Dates);
            const avg3 = getAvg(g.stage3Dates);
            const avg4 = getAvg(g.stage4Dates);
            const avgEnd = getAvg(g.endDates);

            // Mandatory Start
            if (!avg1) return null;

            let t1 = avg1;
            if (t1 < JAN_2024) t1 = JAN_2024;

            // Define End Point
            let tEndProject = avgEnd || TODAY;
            // Prevent going backwards
            if (tEndProject < t1) tEndProject = t1;

            let d1 = 0, d2 = 0, d3 = 0, d4 = 0;
            // Dates for tooltip
            let date1 = t1;
            let date2: number | null = null;
            let date3: number | null = null;
            let date4: number | null = null;

            // --- STRICT REAL EXISTENCE LOGIC V2.9 (EARLY EXIT + STRICT NULL) ---

            // 1. Check Stage 2 (Actos)
            if (!avg2) {
                // NO Stage 2: Stage 1 absorbs everything. STOP.
                d1 = tEndProject - t1;
                d2 = 0; d3 = 0; d4 = 0;
            } else {
                // Stage 2 exists.
                const t2 = Math.max(avg2, t1);
                d1 = t2 - t1;
                date2 = t2;

                // 2. Check Stage 3 (Consejo)
                if (!avg3) {
                    // NO Stage 3: Stage 2 absorbs everything. STOP.
                    d2 = tEndProject - t2;
                    d3 = 0; d4 = 0;
                } else {
                    // Stage 3 exists.
                    const t3 = Math.max(avg3, t2);
                    d2 = t3 - t2;
                    date3 = t3;

                    // 3. Check Stage 4 (Firma)
                    if (!avg4) {
                        // NO Stage 4: Stage 3 absorbs everything. STOP.
                        d3 = tEndProject - t3;
                        d4 = 0;
                    } else {
                        // Stage 4 exists.
                        const t4 = Math.max(avg4, t3);
                        d3 = t4 - t3;
                        date4 = t4;

                        // Stage 4 absorbs the rest to tEnd
                        d4 = tEndProject - t4;
                    }
                }
            }

            return {
                name: g.name,
                count: g.projectCount,
                start: t1,
                d1, d2, d3, d4,
                date1, date2, date3, date4, dateEnd: tEndProject,
                // Ensure negatives are zeroed out (safety)
                d1_safe: Math.max(0, d1),
                d2_safe: Math.max(0, d2),
                d3_safe: Math.max(0, d3),
                d4_safe: Math.max(0, d4),
            };
        })
            .filter(Boolean)
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        return chartData;

    }, [data]);

    const formatXAxis = (tickItem: number) => {
        return new Date(tickItem).toLocaleDateString('es-PE', { year: '2-digit', month: 'short' });
    };

    const formatDate = (ts: number | null) => ts ? new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';

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
                                <span>Aprob. Bases: {formatDate(d.date1)} - {d.date2 ? formatDate(d.date2) : (d.d2 > 0 ? '' : 'Hoy')}</span>
                            </div>
                        )}
                        {d.d2_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                <span>Actos Previos: {formatDate(d.date2)} - {d.date3 ? formatDate(d.date3) : (d.d3 > 0 ? '' : 'Hoy')}</span>
                            </div>
                        )}
                        {d.d3_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <span>Aprob. Consejo: {formatDate(d.date3)} - {d.date4 ? formatDate(d.date4) : (d.d4 > 0 ? '' : 'Hoy')}</span>
                            </div>
                        )}
                        {d.d4_safe > ONE_DAY && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                                <span>Firma Convenio: {formatDate(d.date4)} - {formatDate(d.dateEnd)}</span>
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
        firma: '#a78bfa'    // Violet
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
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                        {/* Invisible Start */}
                        <Bar dataKey="start" stackId="a" fill="transparent" legendType="none" />

                        {/* 1. Bases (Blue) */}
                        <Bar dataKey="d1_safe" stackId="a" name="Aprobación de bases" fill={COLORS.bases} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell
                                    key={`cell-d1-${index}`}
                                    fill={d.d1_safe > 0 ? COLORS.bases : 'transparent'}
                                    stroke="none"
                                    radius={[4, 0, 0, 4]}
                                />
                            ))}
                        </Bar>

                        {/* 2. Actos (Emerald) */}
                        <Bar dataKey="d2_safe" stackId="a" name="Actos Previos" fill={COLORS.actos} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell
                                    key={`cell-d2-${index}`}
                                    fill={d.d2_safe > 0 ? COLORS.actos : 'transparent'}
                                    stroke="none"
                                />
                            ))}
                        </Bar>

                        {/* 3. Consejo (Amber) */}
                        <Bar dataKey="d3_safe" stackId="a" name="Aprobación de consejo" fill={COLORS.consejo} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell
                                    key={`cell-d3-${index}`}
                                    fill={d.d3_safe > 0 ? COLORS.consejo : 'transparent'}
                                    stroke="none"
                                />
                            ))}
                        </Bar>

                        {/* 4. Firma (Violet) */}
                        <Bar dataKey="d4_safe" stackId="a" name="Firma convenio" fill={COLORS.firma} minPointSize={0}>
                            {processedData.map((d: any, index: number) => (
                                <Cell
                                    key={`cell-d4-${index}`}
                                    fill={d.d4_safe > 0 ? COLORS.firma : 'transparent'}
                                    stroke="none"
                                    radius={[0, 4, 4, 0]}
                                />
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
