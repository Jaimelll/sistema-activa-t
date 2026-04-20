"use client";

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';
import ProyectoModal from '@/components/ProyectoModal';
import { getProyectoCompletoById } from '@/app/dashboard/actions';

interface TimelineChartProps {
    data: any[]; // Raw project data
    options?: any;
}

// ── CONFIGURACIÓN DINÁMICA ──────────────────────────────────────────────────
const STAGE_PALETTE = [
    '#60a5fa', // Blue (Bases)
    '#34d399', // Emerald (Actos)
    '#fbbf24', // Amber (Aprobado)
    '#a78bfa', // Violet (Firma)
    '#6366f1', // Indigo (Ejecución)
    '#f43f5e', // Rose (Cierre)
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#84cc16', // Lime
    '#d946ef', // Fuchsia
];

// Punto de quiebre: IDs menores usan el valor Mínimo (inicio), 
// IDs mayores o iguales usan el valor Máximo (último avance).
const EXECUTION_START_ID = 5;

export function TimelineChart({ data, options = {} }: TimelineChartProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedModalProyecto, setSelectedModalProyecto] = useState<any>(null);
    const [isLoadingModal, setIsLoadingModal] = useState<string | null>(null);

    // Obtener etapas del catálogo o usar por defecto si no hay
    const allStages = useMemo(() => {
        if (options.etapas && Array.from(options.etapas).length > 0) {
            return [...options.etapas].sort((a: any, b: any) => Number(a.value) - Number(b.value));
        }
        // Fallback histórico para evitar roturas
        return [
            { value: 1, label: 'Bases' },
            { value: 2, label: 'Lanzamiento' },
            { value: 3, label: 'Aprobado' },
            { value: 4, label: 'Firma' },
            { value: 5, label: 'Ejecución' },
            { value: 6, label: 'Ejecutado' },
        ];
    }, [options.etapas]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { processedData, minDate, maxDate, ticks, activeStages } = useMemo(() => {
        if (!data || data.length === 0) {
            return { 
                processedData: [], 
                minDate: new Date('2024-01-01').getTime(), 
                maxDate: new Date('2026-12-31').getTime(),
                activeStages: []
            };
        }

        const groups = new Map();
        const TODAY = new Date().getTime();
        
        let absoluteMin = Infinity;
        let absoluteMax = -Infinity;

        // 1. Identificar etapas que realmente tienen datos para no pintar barras vacías legendariamente
        const stagePresence = new Set<number>();

        data.forEach((project: any) => {
            (project.avances || []).forEach((a: any) => {
                const ts = new Date(a.fecha).getTime();
                if (!isNaN(ts)) {
                    if (ts < absoluteMin) absoluteMin = ts;
                    if (ts > absoluteMax) absoluteMax = ts;
                    stagePresence.add(Number(a.etapa_id));
                }
            });
        });

        // Etapas a renderizar (que existan en el catálogo y tengan datos o sean básicas)
        const activeStages = allStages.filter((s: any) => stagePresence.has(Number(s.value)));

        // 2. Agrupar datos
        data.forEach((project: any) => {
            if (!project.avances || project.avances.length === 0) return;

            const key = project.grupo_id || 'Sin Grupo';

            if (!groups.has(key)) {
                groups.set(key, {
                    name: project.grupo_descripcion || project.grupo?.descripcion || 'Sin Grupo',
                    orden: project.grupo_orden || project.grupo?.orden || 999,
                    ejeId: Number(project.eje_id) || 999,
                    lineaId: Number(project.linea_id) || 999,
                    datesByStage: {} as Record<number, number[]>,
                    endDates: [] as number[],
                    projectCount: 0,
                    projects: [],
                    ejeDesc: project.eje || '',
                    lineaDesc: project.linea || '',
                });
            }

            const group = groups.get(key);
            group.projectCount++;
            group.projects.push({
                id: project.id,
                codigo: project.codigo || '-',
                institucion: project.institucion || '-',
                region: project.region || '-',
                gestora: project.gestora || '-',
                monto: project.monto_fondoempleo || 0,
                avance: project.avance || 0,
                avance_tecnico: project.avance_tecnico || 0,
                fecha_inicio: project.fecha_inicio || null,
                fecha_fin: project.fecha_fin || null,
                etapa: project.etapa || project.estado || '-'
            });

            project.avances.forEach((a: any) => {
                const ts = new Date(a.fecha).getTime();
                if (!isNaN(ts)) {
                    const eid = Number(a.etapa_id);
                    if (!group.datesByStage[eid]) group.datesByStage[eid] = [];
                    group.datesByStage[eid].push(ts);
                    group.endDates.push(ts);
                }
            });
        });

        const chartData = Array.from(groups.values()).map((g: any) => {
            // Resolver fechas pivote para cada etapa disponible en el catálogo
            const pivotDates: Record<number, number | null> = {};
            
            allStages.forEach((s: any) => {
                const eid = Number(s.value);
                const dates = g.datesByStage[eid];
                if (dates && dates.length > 0) {
                    pivotDates[eid] = (eid < EXECUTION_START_ID) 
                        ? Math.min(...dates) 
                        : Math.max(...dates);
                } else {
                    pivotDates[eid] = null;
                }
            });

            // La fecha de inicio absoluta del grupo es la mínima de cualquier avance
            const tStart = Math.min(...g.endDates);
            const tEndRaw = Math.max(...g.endDates);
            
            // Si el proyecto no está terminado (ID 6 suele ser terminado, pero lo hacemos dinámico)
            // Si la última etapa del catálogo no tiene fecha, extendemos hasta hoy
            const lastStageId = allStages[allStages.length - 1].value;
            let tEndMax = pivotDates[lastStageId] || tEndRaw || TODAY;
            if (!pivotDates[lastStageId]) tEndMax = Math.max(tEndMax, TODAY);

            const result: any = {
                ...g,
                start: tStart,
                dateEnd: tEndMax,
                etapa: g.projects.every((p: any) => p.etapa === g.projects[0].etapa)
                    ? (g.projects[0].etapa || 'No definida')
                    : 'Múltiples etapas',
            };

            // Calcular DURACIONES (deltas) en cascada
            // d_n = t(n+1) - t(n)
            
            // Filtrar solo las fechas que existen en este grupo específico para la cascada
            const groupExistingStages = allStages
                .map((s: any) => ({ id: Number(s.value), date: pivotDates[Number(s.value)] }))
                .filter(s => s.date !== null);

            for (let i = 0; i < groupExistingStages.length; i++) {
                const current = groupExistingStages[i];
                const next = groupExistingStages[i+1];
                
                const tCurr = current.date!;
                const tNext = next ? next.date! : tEndMax;
                
                const delta = Math.max(0, tNext - tCurr);
                result[`d${current.id}_safe`] = delta;
                
                // Guardar la fecha real para el tooltip
                result[`date${current.id}`] = tCurr;
            }

            return result;
        })
            .filter(Boolean)
            .sort((a: any, b: any) => a.orden - b.orden);

        if (absoluteMin === Infinity) {
            absoluteMin = new Date('2024-01-01').getTime();
            absoluteMax = new Date('2026-12-31').getTime();
        }
        
        const finalMax = Math.max(absoluteMax, TODAY);
        const PAD = 30 * 24 * 60 * 60 * 1000;
        const dynamicMin = absoluteMin - PAD;
        const dynamicMax = finalMax + PAD;

        const ticks = [];
        let currTick = new Date(dynamicMin);
        currTick.setMonth(currTick.getMonth() < 6 ? 0 : 6, 1);
        currTick.setHours(0, 0, 0, 0);
        
        while (currTick.getTime() <= dynamicMax) {
            if (currTick.getTime() >= dynamicMin) {
                ticks.push(currTick.getTime());
            }
            currTick.setMonth(currTick.getMonth() + 6);
        }

        return { processedData: chartData, minDate: dynamicMin, maxDate: dynamicMax, ticks, activeStages };
    }, [data, allStages]);

    const formatXAxis = (tickItem: number) => {
        const date = new Date(tickItem);
        const month = date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
        const year = date.toLocaleDateString('es-PE', { year: '2-digit' });
        return `${month} ${year}`;
    };

    const formatDate = (ts: number | null) => {
        if (!ts || isNaN(ts)) return '-';
        return new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' });
    };

    const formatYAxis = (name: string) => name;

    const SimpleTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const totalMonto = d.projects ? d.projects.reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0) : 0;
            
            // Intentar encontrar la primera fecha de etapa disponible
            const firstStage = activeStages[0];
            const startDate = firstStage ? d[`date${firstStage.value}`] : d.start;

            return (
                <div className="bg-white p-4 rounded-xl shadow-2xl border border-gray-100 text-xs min-w-[240px]">
                    <div className="mb-2 pb-2 border-b border-gray-100">
                        <p className="font-bold text-gray-800 text-sm">
                            {d.name}
                        </p>
                        <p className="text-gray-500 font-medium">
                            {d.etapa === 'Múltiples etapas' ? 'Múltiples etapas' : `Etapa: ${d.etapa}`}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Temporalidad:</span>
                            <span className="font-bold text-gray-700">{formatDate(startDate)} - {formatDate(d.dateEnd)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Proyectos:</span>
                            <span className="font-bold text-gray-800">{d.projectCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Monto Total:</span>
                            <span className="font-bold text-blue-700">S/. {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const handleChartClick = (state: any, e: any) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (state && state.activePayload && state.activePayload.length) {
            const d = state.activePayload[0].payload;
            setSelectedGroup(d);
        }
    };

    return (
        <div className="card w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6" onClick={() => setSelectedGroup(null)}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Línea de Tiempo de Proyectos</h3>
                <div className="flex items-center gap-4">
                </div>
            </div>

            <div className="w-full" style={{ minHeight: '450px', height: Math.max(450, processedData.length * 45) + 'px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={processedData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                        barSize={20}
                        onClick={handleChartClick}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                            xAxisId="bottom"
                            type="number"
                            orientation="bottom"
                            domain={[minDate, maxDate]}
                            ticks={ticks}
                            tickFormatter={formatXAxis}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            allowDataOverflow={true}
                            minTickGap={10}
                        />
                        <XAxis
                            xAxisId="top"
                            type="number"
                            orientation="top"
                            domain={[minDate, maxDate]}
                            ticks={ticks}
                            tickFormatter={formatXAxis}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            allowDataOverflow={true}
                            minTickGap={10}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={isMobile ? 120 : 200}
                            tick={{ fontSize: isMobile ? 9 : 11, fill: '#374151', width: isMobile ? 110 : 190 }}
                            interval={0}
                            tickFormatter={formatYAxis}
                        />
                        <Tooltip content={<SimpleTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        <Legend
                            verticalAlign="top"
                            align="left"
                            layout="horizontal"
                            wrapperStyle={{
                                fontSize: '11px',
                                paddingBottom: '30px',
                                paddingLeft: isMobile ? '135px' : '215px',
                                width: 'auto'
                            }}
                        />

                        {/* Invisible Start */}
                        <Bar dataKey="start" stackId="a" fill="transparent" legendType="none" xAxisId="bottom" />

                        {/* Generación Dinámica de Barras */}
                        {activeStages.map((s: any, idx: number) => {
                            const stageId = Number(s.value);
                            const color = STAGE_PALETTE[stageId - 1] || STAGE_PALETTE[idx % STAGE_PALETTE.length];
                            const dataKey = `d${stageId}_safe`;
                            
                            return (
                                <Bar 
                                    key={stageId}
                                    dataKey={dataKey} 
                                    stackId="a" 
                                    name={s.label} 
                                    fill={color} 
                                    minPointSize={0} 
                                    xAxisId="bottom"
                                >
                                    {processedData.map((d: any, index: number) => (
                                        <Cell 
                                            key={`cell-${stageId}-${index}`} 
                                            fill={d[dataKey] > 0 ? color : 'transparent'} 
                                            stroke="none" 
                                        />
                                    ))}
                                </Bar>
                            );
                        })}

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
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm"
                    style={{ scrollbarGutter: 'stable' }}
                >
                    <div className="mb-4 pb-2 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-2 text-gray-800">
                        <div className="flex-1 text-left">
                            <span className="text-xs font-semibold uppercase text-gray-500 block">Etapa</span>
                            <span className="text-sm font-bold">{selectedGroup.etapa}</span>
                        </div>
                        <div className="flex-1 text-center border-l border-r border-gray-200 px-4">
                            <span className="text-xs font-semibold uppercase text-gray-500 block">Eje - Línea</span>
                            <span className="text-sm font-bold">Eje {selectedGroup.ejeId} - {selectedGroup.ejeDesc} | Línea {selectedGroup.lineaId} - {selectedGroup.lineaDesc}</span>
                        </div>
                        <div className="flex-1 text-right">
                            <span className="text-xs font-semibold uppercase text-gray-500 block">Resumen</span>
                            <span className="text-sm font-bold text-blue-700">{selectedGroup.count} proyectos encontrados</span>
                        </div>
                    </div>
                    <div className="pr-1">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-gray-300 text-sm uppercase tracking-wider">
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">ID</th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">Código</th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">Institución Ejecutora</th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">Región</th>
                                    <th className="text-right py-3 px-4 font-bold text-gray-700">Presupuesto</th>
                                    <th className="text-right py-3 px-4 font-bold text-gray-700">Avance</th>
                                    <th className="text-right py-3 px-4 font-bold text-gray-700">%</th>
                                    <th className="text-right py-3 px-4 font-bold text-gray-700">% Ejec.</th>
                                    <th className="text-center py-3 px-4 font-bold text-gray-700">Inicio</th>
                                    <th className="text-center py-3 px-4 font-bold text-gray-700">Fin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedGroup.projects
                                    .slice()
                                    .sort((a: any, b: any) => a.id - b.id)
                                    .map((p: any, i: number) => {
                                        const presupuestado = Number(p.monto) || 0;
                                        const avance = Number(p.avance) || 0;
                                        const porcentaje = presupuestado > 0 ? (avance / presupuestado) * 100 : 0;
                                        const fechaInicio = p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '-';
                                        const fechaFin = p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '-';

                                        return (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                                                <td 
                                                    className="py-3 px-4 text-blue-600 font-bold whitespace-nowrap cursor-pointer hover:underline"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setIsLoadingModal(p.id);
                                                        try {
                                                            const dataCompleta = await getProyectoCompletoById(p.id);
                                                            if (dataCompleta) {
                                                                setSelectedModalProyecto(dataCompleta);
                                                                setIsModalOpen(true);
                                                            } else {
                                                                alert("No se pudo cargar la información completa del proyecto.");
                                                            }
                                                        } catch (err) {
                                                            console.error("Error al cargar data del proyecto", err);
                                                            alert("Ocurrió un error al cargar la información.");
                                                        } finally {
                                                            setIsLoadingModal(null);
                                                        }
                                                    }}
                                                >
                                                    {isLoadingModal === p.id ? (
                                                        <span className="flex items-center gap-1 text-orange-500">
                                                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Cargando
                                                        </span>
                                                    ) : p.id}
                                                </td>
                                                <td className="py-3 px-4 text-gray-800 whitespace-nowrap">{p.codigo}</td>
                                                <td className="py-3 px-4 text-gray-600" style={{ minWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.institucion}</td>
                                                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                                                    {p.region || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-right text-blue-700 font-semibold whitespace-nowrap">S/ {presupuestado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                                <td className="py-3 px-4 text-right text-emerald-700 font-semibold whitespace-nowrap">S/ {avance.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                                <td className="py-3 px-4 text-right text-gray-700 font-bold whitespace-nowrap">{porcentaje.toFixed(1)}%</td>
                                                <td className="py-3 px-4 text-right text-blue-600 font-bold whitespace-nowrap">{p.avance_tecnico ?? 0}%</td>
                                                <td className="py-3 px-4 text-center text-gray-600 whitespace-nowrap">{fechaInicio}</td>
                                                <td className="py-3 px-4 text-center text-gray-600 whitespace-nowrap">{fechaFin}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Integration */}
            {isModalOpen && (
                <ProyectoModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    proyecto={selectedModalProyecto}
                    isReadOnly={true}
                    onSave={async () => {}} // No necesita hacer nada en modo lectura
                    options={{
                        lineas: options.lineas || [],
                        ejes: options.ejes || [],
                        regiones: options.regiones || [],
                        etapas: options.etapas || [],
                        modalidades: options.modalidades || [],
                        instituciones: options.instituciones || [],
                        grupos: options.grupos || [],
                        especialistas: options.especialistas || []
                    }}
                />
            )}
        </div>
    );
}
