"use client";

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';

interface TimelineChartProps {
    data: any[]; // Raw project data
}

export function TimelineChart({ data }: TimelineChartProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

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
            // Use names from data if available, else fallbacks
            const ejeName = project.eje || `Eje ${ejeId}`;
            // Use literal "Línea" + ID as requested, separate from description

            // New Key Format: [Date] | Eje [Número Eje] - [Nombre Eje] / Línea [Número Línea] - [Nombre Línea]
            const key = `${dateStr} | Eje ${ejeId} - ${project.eje || 'Sin Eje'} / Línea ${lineaId} - ${project.linea || 'Sin Línea'}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    name: key,
                    ejeId: Number(ejeId) || 999,
                    lineaId: Number(lineaId) || 999,
                    stage1Dates: [],
                    stage2Dates: [],
                    stage3Dates: [],
                    stage4Dates: [],
                    stage5Dates: [],
                    stage6Dates: [],
                    endDates: [],
                    projectCount: 0,
                    start: null,
                    projects: [],
                    etapa: project.etapa || project.estado || 'Sin Etapa'
                });
            }

            const group = groups.get(key);
            group.projectCount++;
            group.projects.push({
                codigo: project.codigo || '-',
                institucion: project.institucion || '-',
                region: project.region || '-',
                gestora: project.gestora || '-',
                monto: project.monto_fondoempleo || 0,
                avance: project.monto_contrapartida || 0,
                fecha_inicio: project.fecha_inicio || null,
                fecha_fin: project.fecha_fin || null,
                etapa: project.etapa || project.estado || '-'
            });

            // Collect dates for all stages
            project.avances.forEach((a: any) => {
                const ts = new Date(a.fecha).getTime();
                if (!isNaN(ts)) {
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
            const avgEnd = getAvg(g.endDates);

            // Mandatory Start
            if (!avg1) return null;

            let t1 = avg1;
            let tEndProject = avg6 || avgEnd || TODAY;
            // Strict logic: if avg6 exists, project is done. If not, it's ongoing -> Today.
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
                                d6 = tEndProject - t6;
                            }
                        }
                    }
                }
            }

            return {
                name: g.name,
                ejeId: g.ejeId,
                lineaId: g.lineaId,
                count: g.projectCount,
                totalFondo: g.totalFondo,
                projects: g.projects,
                etapa: g.projects.every((p: any) => p.etapa === g.projects[0].etapa)
                    ? (g.projects[0].etapa || 'No definida')
                    : 'Múltiples etapas',
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
            .sort((a: any, b: any) => {
                // Priority 1: Eje ID (Asc)
                if (a.ejeId !== b.ejeId) return a.ejeId - b.ejeId;
                // Priority 2: Linea ID (Asc)
                if (a.lineaId !== b.lineaId) return a.lineaId - b.lineaId;
                // Priority 3: Start Date (Oldest to Newest)
                return a.start - b.start;
            });

        return chartData;

    }, [data]);

    const formatXAxis = (tickItem: number) => {
        return new Date(tickItem).toLocaleDateString('es-PE', { year: '2-digit', month: 'short' });
    };

    const formatDate = (ts: number | null) => ts ? new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';

    // Helper to clean Y Axis Label - Revert to short IDs as requested
    const formatYAxis = (key: string) => {
        // key format: "[Date] | Eje [ID] - [Nombre] / Línea [ID] - [Nombre]"
        // we want: "Eje [ID] - Línea [ID]"
        const parts = key.split(' | ')[1]?.split(' / ') || [];
        const ejeShort = parts[0]?.split(' - ')[0] || '';
        const lineaShort = parts[1]?.split(' - ')[0] || '';
        return `${ejeShort} - ${lineaShort}`;
    };

    const ONE_DAY = 86400000;

    const SimpleTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const totalMonto = d.projects ? d.projects.reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0) : 0;
            return (
                <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200 text-xs shadow-blue-900/10">
                    <div className="mb-2 pb-2 border-b border-gray-100">
                        <p className="font-bold text-gray-800">
                            {d.name.split(' | ')[1] || d.name} | {d.etapa === 'Múltiples etapas' ? 'Múltiples etapas' : `Etapa: ${d.etapa}`}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-gray-600">Proyectos: <span className="font-bold text-gray-800">{d.count}</span></p>
                        <p className="text-gray-600">Monto Total: <span className="font-bold text-blue-700">S/. {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    const handleChartClick = (state: any) => {
        if (state && state.activePayload && state.activePayload.length) {
            const d = state.activePayload[0].payload;
            setSelectedGroup(d);
        }
    };

    const handleChartMouseLeave = () => {
        // Removed clearing to keep detail table visible as requested
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
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Línea de Tiempo de Proyectos</h3>
                <div className="flex items-center gap-4">
                </div>
            </div>

            <div className="w-full" style={{ height: Math.max(400, processedData.length * 40) + 'px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={processedData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                        barSize={18}
                        onMouseMove={handleChartClick}
                        onClick={handleChartClick}
                        onMouseLeave={handleChartMouseLeave}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                            xAxisId="bottom"
                            type="number"
                            orientation="bottom"
                            domain={[minDate, END_2026]}
                            tickFormatter={formatXAxis}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            allowDataOverflow={true}
                        />
                        <XAxis
                            xAxisId="top"
                            type="number"
                            orientation="top"
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
                        <Tooltip content={<SimpleTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        <Legend
                            verticalAlign="top"
                            align="left"
                            wrapperStyle={{
                                fontSize: '12px',
                                paddingBottom: '20px',
                                paddingLeft: isMobile ? '135px' : '195px'
                            }}
                        />

                        {/* Invisible Start */}
                        <Bar dataKey="start" stackId="a" fill="transparent" legendType="none" xAxisId="bottom" />

                        {/* 1. Bases (Blue) */}
                        <Bar dataKey="d1_safe" stackId="a" name="Aprobación de bases" fill={COLORS.bases} minPointSize={0} xAxisId="bottom">
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d1-${index}`} fill={d.d1_safe > 0 ? COLORS.bases : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 2. Actos (Emerald) */}
                        <Bar dataKey="d2_safe" stackId="a" name="Lanzamiento" fill={COLORS.actos} minPointSize={0} xAxisId="bottom">
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d2-${index}`} fill={d.d2_safe > 0 ? COLORS.actos : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 3. Consejo (Amber) */}
                        <Bar dataKey="d3_safe" stackId="a" name="Aprobación de consejo" fill={COLORS.consejo} minPointSize={0} xAxisId="bottom">
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d3-${index}`} fill={d.d3_safe > 0 ? COLORS.consejo : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 4. Firma (Violet) */}
                        <Bar dataKey="d4_safe" stackId="a" name="Firma convenio" fill={COLORS.firma} minPointSize={0} xAxisId="bottom">
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d4-${index}`} fill={d.d4_safe > 0 ? COLORS.firma : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 5. En Ejecución (Indigo) */}
                        <Bar dataKey="d5_safe" stackId="a" name="En Ejecución" fill={COLORS.ejecucion} minPointSize={0} xAxisId="bottom">
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d5-${index}`} fill={d.d5_safe > 0 ? COLORS.ejecucion : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* 6. Ejecutado (Rose) */}
                        <Bar dataKey="d6_safe" stackId="a" name="Ejecutado" fill={COLORS.ejecutado} minPointSize={0} xAxisId="bottom">
                            {processedData.map((d: any, index: number) => (
                                <Cell key={`cell-d6-${index}`} fill={d.d6_safe > 0 ? COLORS.ejecutado : 'transparent'} stroke="none" />
                            ))}
                        </Bar>

                        {/* Reference Line for Today */}
                        <ReferenceLine
                            xAxisId="bottom"
                            x={new Date().getTime()}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{ position: 'top', value: 'Hoy', fill: '#ef4444', fontSize: 12 }}
                        />

                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detail Panel - Rendered BELOW chart */}
            {selectedGroup && selectedGroup.projects && selectedGroup.projects.length > 0 && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs"
                    style={{ scrollbarGutter: 'stable' }}
                >
                    <div className="mb-4 pb-2 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-2 text-gray-800">
                        <div className="flex-1 text-left">
                            <span className="text-xs font-semibold uppercase text-gray-500 block">Eje</span>
                            <span className="text-sm font-bold">{(selectedGroup.name.split(' | ')[1] || '').split(' / ')[0]}</span>
                        </div>
                        <div className="flex-1 text-center border-l border-r border-gray-200 px-4">
                            <span className="text-xs font-semibold uppercase text-gray-500 block">Línea</span>
                            <span className="text-sm font-bold">{(selectedGroup.name.split(' | ')[1] || '').split(' / ')[1]}</span>
                        </div>
                        <div className="flex-1 text-right">
                            <span className="text-xs font-semibold uppercase text-gray-500 block">Resumen</span>
                            <span className="text-sm font-bold text-blue-700">{selectedGroup.count} proyectos encontrados</span>
                        </div>
                    </div>
                    <div className="pr-1">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-gray-300">
                                    <th className="text-left py-1 px-2 font-bold text-gray-700">Código</th>
                                    <th className="text-left py-1 px-2 font-bold text-gray-700">Institución Ejecutora</th>
                                    <th className="text-left py-1 px-2 font-bold text-gray-700">Región</th>
                                    <th className="text-right py-1 px-2 font-bold text-gray-700">Presupuesto</th>
                                    <th className="text-right py-1 px-2 font-bold text-gray-700">Avance</th>
                                    <th className="text-right py-1 px-2 font-bold text-gray-700">%</th>
                                    <th className="text-center py-1 px-2 font-bold text-gray-700">Inicio</th>
                                    <th className="text-center py-1 px-2 font-bold text-gray-700">Fin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedGroup.projects.map((p: any, i: number) => {
                                    const presupuestado = Number(p.monto) || 0;
                                    const avance = Number(p.avance) || 0;
                                    const porcentaje = presupuestado > 0 ? (avance / presupuestado) * 100 : 0;
                                    const fechaInicio = p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                                    const fechaFin = p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

                                    return (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                                            <td className="py-1 px-2 text-gray-800 whitespace-nowrap">{p.codigo}</td>
                                            <td className="py-1 px-2 text-gray-600" style={{ minWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.institucion}</td>
                                            <td className="py-1 px-2 text-gray-600 whitespace-nowrap">
                                                {p.region || '-'}
                                            </td>
                                            <td className="py-1 px-2 text-right text-blue-700 font-semibold whitespace-nowrap">S/ {presupuestado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                            <td className="py-1 px-2 text-right text-emerald-700 font-semibold whitespace-nowrap">S/ {avance.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                            <td className="py-1 px-2 text-right text-gray-700 font-bold whitespace-nowrap">{porcentaje.toFixed(1)}%</td>
                                            <td className="py-1 px-2 text-center text-gray-600 whitespace-nowrap">{fechaInicio}</td>
                                            <td className="py-1 px-2 text-center text-gray-600 whitespace-nowrap">{fechaFin}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
