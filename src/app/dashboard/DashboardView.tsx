"use client";
// Force Update: 2026-02-05 07:15 - Visual Refresh

import { useState, useMemo } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { FundingChart } from '@/components/dashboard/charts/FundingChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { EjeChart } from '@/components/dashboard/charts/EjeChart';
import { DollarSign, FileText, CheckCircle, TrendingUp, Filter, Users } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { GestoraChart } from '@/components/dashboard/charts/GestoraChart';
import { TimelineChart } from '@/components/dashboard/charts/TimelineChart';

interface DashboardViewProps {
    initialData: any[];
    years?: any[]; // Changed to allow objects {value, label}
    stages?: string[];
    lines?: any[];
    ejesList?: any[];
    timelineData?: any[];
    modalidades?: any[];
}

export default function DashboardView({ initialData, timelineData = [], years = [], stages = [], lines = [], ejesList = [], modalidades = [] }: DashboardViewProps) {
    if (initialData && initialData.length > 0) {
        console.log('PRIMER REGISTRO:', initialData[0]);
    }
    console.log('Verificación de Despliegue - Timestamp:', new Date().toISOString());

    // State for filters
    const [selectedYear, setSelectedYear] = useState<string>(''); // Default empty for 'All'
    const [selectedLinea, setSelectedLinea] = useState<string>('all');
    const [selectedEje, setSelectedEje] = useState<string>('all');
    const [selectedEtapa, setSelectedEtapa] = useState<string>('all');
    const [selectedModalidad, setSelectedModalidad] = useState<string>('all');
    const [selectedExecution, setSelectedExecution] = useState<string>('process'); // Default: En proceso
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

    const handleFundingBarClick = (region: string) => {
        setSelectedRegion(region === selectedRegion ? null : region);
    };

    // Use passed years directly - NO LOGIC HERE
    // years prop comes from server as sorted number array or objects

    // const lineas = useMemo(() => Array.from(new Set(initialData.map(d => d.linea))).sort(), [initialData]); // DEPRECATED: Using props
    // const ejes = useMemo(() => Array.from(new Set(initialData.map(d => d.eje))).sort(), [initialData]); // DEPRECATED: Using props
    // stages passed from props now

    // Filter Logic for Options (Dynamic Lists)
    const availableFilters = useMemo(() => {
        // 1. Filter by Year first (Master Filter) & Execution
        const dataForOptions = initialData.filter(item => {
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);

            // Execution Logic for Options
            const eid = Number(item.etapaId || item.etapa_id || 0);
            let matchExec = true;
            if (selectedExecution === 'process') matchExec = eid !== 6 && eid !== 7;
            if (selectedExecution === 'executed') matchExec = eid === 6 || eid === 7;

            return matchYear && matchExec;
        });

        // 2. Extract uniques present in this year's data
        const uniqueLineas = Array.from(new Set(dataForOptions.map(d => String(d.lineaId))));
        const uniqueEjes = Array.from(new Set(dataForOptions.map(d => String(d.ejeId || d.eje_id || d.eje)))); // Handle variations
        const uniqueEtapas = Array.from(new Set(dataForOptions.map(d => d.etapa))).sort();

        // 3. Map back to full objects with labels using original props
        const dynamicLineas = lines
            .filter((l: any) => uniqueLineas.includes(String(l.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        const dynamicEjes = ejesList
            .filter((e: any) => uniqueEjes.includes(String(e.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        return { dynamicLineas, dynamicEjes, uniqueEtapas };
    }, [initialData, selectedYear, selectedExecution, lines, ejesList, selectedModalidad]); // Added selectedModalidad dependency if it affects others, mostly no but strict dep.

    // Main Filter Logic (Applied to Data)
    const filteredData = useMemo(() => {
        console.log('Filtrando por año:', selectedYear, 'Ejecución:', selectedExecution);
        return initialData.filter(item => {
            // Numeric normalization
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);

            // Strict ID check
            const matchLinea = selectedLinea === 'all' || String(item.lineaId) === String(selectedLinea);
            const matchEje = selectedEje === 'all' || String(item.ejeId || item.eje_id || item.eje) === String(selectedEje);

            // Etapa Filter (Dropdown)
            const matchEtapa = selectedEtapa === 'all' || item.etapa === selectedEtapa;

            // Execution Filter
            const eid = Number(item.etapaId || item.etapa_id || 0);
            const status = (item.estado || '').toLowerCase().trim();
            const isExecuted = eid === 6 || eid === 7 || status === 'ejecutado' || status === 'resuelto';

            let matchExec = true;
            if (selectedExecution === 'process') matchExec = !isExecuted;
            if (selectedExecution === 'executed') matchExec = isExecuted;

            // Modalidad Filter
            const matchModalidad = selectedModalidad === 'all' || String(item.modalidadId) === String(selectedModalidad);

            return matchYear && matchLinea && matchEje && matchEtapa && matchExec && matchModalidad;
        });
    }, [initialData, selectedYear, selectedLinea, selectedEje, selectedEtapa, selectedExecution, selectedModalidad]);

    // Debug logging requested by user - REMOVED


    // Aggregate Metrics - FORCE SUM (Simplified)
    const metrics = useMemo(() => {
        const totalFondo = filteredData.reduce((acc, curr) => acc + (Number(curr.monto_fondoempleo) || 0), 0);
        const totalContra = filteredData.reduce((acc, curr) => acc + (Number(curr.monto_contrapartida) || 0), 0);
        const totalBen = filteredData.reduce((acc, curr) => acc + (Number(curr.beneficiarios) || 0), 0);
        const totalProjects = filteredData.length;

        console.log('SUMA FORZADA:', { totalFondo, totalContra });

        return {
            totalFondo: totalFondo,
            totalContra: totalContra,
            totalProjects: totalProjects,
            totalBeneficiaries: totalBen
        };
    }, [filteredData]);

    // Chart Data
    const fundingByRegion = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const r = d.region;
            if (!map.has(r)) map.set(r, { name: r, fondoempleo: 0, contrapartida: 0, proyectos: 0 });
            const entry = map.get(r);
            entry.fondoempleo += (Number(d.monto_fondoempleo) || 0);
            entry.contrapartida += (Number(d.monto_contrapartida) || 0);
            entry.proyectos += 1;
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    const projectsByStatus = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const s = d.estado;
            const id = d.etapaId || d.etapa_id || 0;
            if (!map.has(s)) map.set(s, { count: 0, financing: 0, id });
            const entry = map.get(s);
            entry.count += 1;
            entry.financing += (Number(d.monto_fondoempleo) || 0);
            if (!entry.id && id) entry.id = id;
        });
        return Array.from(map.entries()).map(([name, data]: any) => ({
            name: `${data.id} - ${name}`,
            value: data.count,
            financing: data.financing,
            tooltipName: `Estado ${data.id}`
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    const projectsByEje = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const eid = d.ejeId || d.eje_id || d.eje;
            if (!map.has(eid)) map.set(eid, { count: 0, financing: 0 });
            const entry = map.get(eid);
            entry.count += 1;
            entry.financing += (Number(d.monto_fondoempleo) || 0);
        });

        // Map ID to Label from ejesList
        return Array.from(map.entries()).map(([id, data]: any) => {
            const ejeObj = ejesList.find((e: any) => e.value === id || e.id === id);
            const name = ejeObj ? `E${ejeObj.label}` : `E${id}`;
            return {
                name,
                value: data.count,
                financing: data.financing,
                tooltipName: `Eje ${id}`
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, ejesList]);

    const projectsByLinea = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const lid = d.lineaId || d.linea_id || d.linea;
            if (!map.has(lid)) map.set(lid, { count: 0, financing: 0 });
            const entry = map.get(lid);
            entry.count += 1;
            entry.financing += (Number(d.monto_fondoempleo) || 0);
        });

        return Array.from(map.entries()).map(([id, data]: any) => {
            const lineaObj = lines.find((l: any) => l.value === id || l.id === id);
            const name = lineaObj ? lineaObj.label : `Línea ${id}`;
            return {
                name,
                value: data.count,
                financing: data.financing,
                tooltipName: `Línea ${id}`
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, lines]);



    const gestoraData = useMemo(() => {
        const map = new Map();
        // Filter by existence of gestora field AND modality ID = 2 (Indirecta)
        const indirectData = filteredData.filter(d =>
            d.gestora &&
            d.gestora.trim() !== '' &&
            Number(d.modalidadId) === 2
        );


        indirectData.forEach(d => {
            const name = d.gestora;
            if (!map.has(name)) map.set(name, { name, value: 0, count: 0 });
            const entry = map.get(name);
            entry.value += (Number(d.monto_fondoempleo) || 0);
            entry.count += 1;
        });

        return Array.from(map.values())
            .map((item: any) => ({
                name: `${item.name} (${item.count})`,
                value: item.value,
                count: item.count
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Linkage Fix: Filter timelineData based on filteredData IDs
    const filteredTimelineData = useMemo(() => {
        const activeIds = new Set(filteredData.map(d => d.id));
        return timelineData.filter(t => activeIds.has(t.id));
    }, [filteredData, timelineData]);

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            {/* Header & Filters */}
            <div className="flex flex-col space-y-4 mb-6">

                {/* Fila Superior: Logo + Filtros (Responsive) */}
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">

                    {/* 1. Logo */}
                    <img
                        src="/fondoempleo.jpg"
                        alt="Fondoempleo"
                        className="h-[85px] object-contain flex-shrink-0"
                        style={{
                            filter: 'contrast(1.1) saturate(1.2) drop-shadow(0 0 0px transparent)',
                            imageRendering: 'crisp-edges'
                        }}
                    />

                    {/* 2. Contenedor de Filtros (Grid Responsive) */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* 1. Estado (Execution) */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full font-medium text-blue-900 bg-blue-50 rounded shadow-sm"
                            value={selectedExecution}
                            onChange={(e) => setSelectedExecution(e.target.value)}
                        >
                            <option value="all">Todas</option>
                            <option value="process">En proceso</option>
                            <option value="executed">Ejecutados</option>
                        </select>

                        {/* 2. Etapa */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedEtapa}
                            onChange={(e) => setSelectedEtapa(e.target.value)}
                        >
                            <option value="all">Todas las Etapas</option>
                            {availableFilters.uniqueEtapas.map(e => <option key={String(e)} value={String(e)}>{String(e)}</option>)}
                        </select>

                        {/* 3. Año */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            value={selectedYear}
                            onChange={(e) => {
                                setSelectedYear(e.target.value);
                                // Reset other filters on year change
                                setSelectedLinea('all');
                                setSelectedEje('all');
                                setSelectedEtapa('all');
                                setSelectedExecution('all');
                                setSelectedModalidad('all');
                            }}
                        >
                            <option value="" disabled>Seleccionar Año</option>
                            {years.map((y: any) => {
                                const val = y.value ?? y;
                                const lab = y.label ?? y;
                                return <option key={val} value={val}>{lab}</option>
                            })}
                        </select>

                        {/* 4. Eje */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedEje}
                            onChange={(e) => setSelectedEje(e.target.value)}
                        >
                            <option value="all">Todos los Ejes</option>
                            {availableFilters.dynamicEjes.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>

                        {/* 5. Línea */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedLinea}
                            onChange={(e) => setSelectedLinea(e.target.value)}
                        >
                            <option value="all">Todas las Líneas</option>
                            {availableFilters.dynamicLineas.map((l: any) => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>

                        {/* 6. Modalidad */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedModalidad}
                            onChange={(e) => setSelectedModalidad(e.target.value)}
                        >
                            <option value="all">Todas las Modalidades</option>
                            {modalidades.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    {/* Reset Button - Hidden but kept structure if needed later, or integrated into logic */}
                    {/* <div className="hidden lg:flex items-center px-2 text-gray-400">
                        <Filter className="w-5 h-5" />
                    </div> */}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Monto Fondoempleo"
                    value={`S/ ${metrics.totalFondo.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={DollarSign}
                    trend="+12% vs año anterior"
                    trendUp={true}
                />
                <KPICard
                    title="Proyectos Activos"
                    value={metrics.totalProjects}
                    icon={FileText}
                />
                <KPICard
                    title="Beneficiarios"
                    value={metrics.totalBeneficiaries.toLocaleString('es-PE')}
                    icon={Users} // Using generic users icon, locally defined in KPICard import but we passed the component
                // We need to fix the icon import if Users is not imported in this file. 
                // Users IS imported from lucide-react above.
                />
                <KPICard
                    title="Ejecutado (Total)"
                    value={`S/ ${(metrics.totalContra).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                    icon={TrendingUp} // Or BarChart3
                />
            </div>

            {/* Charts Section */}

            {/* Timeline Chart (Principal) */}
            <div className="w-full">
                <TimelineChart data={filteredTimelineData} />
            </div>

            {/* Bottom Row: Bar Chart (100% width) */}
            <div className="w-full">
                <div className="w-full">
                    <FundingChart
                        data={fundingByRegion}
                        rotateX={-45}
                        formatY="millions"
                        onBarClick={handleFundingBarClick}
                    />
                </div>

                {/* Tabla de Detalle por Región */}
                {selectedRegion && (
                    <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                                {selectedRegion}
                            </h4>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 italic">
                                    Proyectos: {filteredData.filter(d => d.region === selectedRegion).length}
                                </span>
                                <button
                                    onClick={() => setSelectedRegion(null)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Cerrar detalle"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-y border-gray-100">
                                        <th className="py-2 px-3 text-[10px] uppercase tracking-wider font-bold text-gray-500 w-[120px]">Código</th>
                                        <th className="py-2 px-3 text-[10px] uppercase tracking-wider font-bold text-gray-500 w-[50px] text-center">Eje</th>
                                        <th className="py-2 px-3 text-[10px] uppercase tracking-wider font-bold text-gray-500 w-[50px] text-center">Lín.</th>
                                        <th className="py-2 px-3 text-[10px] uppercase tracking-wider font-bold text-gray-500 min-w-[200px]">Institución Ejecutora</th>
                                        <th className="py-2 px-3 text-[10px] uppercase tracking-wider font-bold text-gray-500 w-[140px] text-right">Monto Fondo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData
                                        .filter(d => d.region === selectedRegion)
                                        .sort((a, b) => {
                                            const ejeA = String(a.ejeId || a.eje_id || '');
                                            const ejeB = String(b.ejeId || b.eje_id || '');
                                            if (ejeA !== ejeB) return ejeA.localeCompare(ejeB);
                                            const linA = String(a.lineaId || a.linea_id || '');
                                            const linB = String(b.lineaId || b.linea_id || '');
                                            return linA.localeCompare(linB);
                                        })
                                        .map((proj, idx) => (
                                            <tr key={proj.id} className={clsx(
                                                "border-b border-gray-50 text-[11px] hover:bg-blue-50/30 transition-colors",
                                                idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                                            )}>
                                                <td className="py-2 px-3 font-medium text-gray-700">
                                                    {proj.codigo || 'Sin código'}
                                                </td>
                                                <td className="py-2 px-3 text-center text-gray-600">
                                                    {proj.ejeId || proj.eje_id || '-'}
                                                </td>
                                                <td className="py-2 px-3 text-center text-gray-600">
                                                    {proj.lineaId || proj.linea_id || '-'}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <div className="truncate max-w-[300px] text-gray-800" title={proj.institucion}>
                                                        {proj.institucion}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold text-blue-600">
                                                    S/ {Number(proj.monto_fondoempleo).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Gestora Chart */}
            {gestoraData.length > 0 && (
                <div className="w-full">
                    <GestoraChart data={gestoraData} />
                </div>
            )}

            {/* Donut Charts Row (Final) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 1. Proyectos por Estado */}
                <div>
                    <StatusChart
                        data={projectsByStatus}
                        title="Proyectos por Estado"
                        legendStyle={{ fontSize: '14px' }}
                        unitLabel="proyectos"
                    />
                </div>
                {/* 2. Proyectos por Eje */}
                <div>
                    <EjeChart
                        data={projectsByEje}
                        title="Proyectos por Eje"
                        legendStyle={{ fontSize: '14px' }}
                        unitLabel="proyectos"
                    />
                </div>
                {/* 3. Proyectos por Línea */}
                <div>
                    <EjeChart
                        data={projectsByLinea}
                        title="Proyectos por Línea"
                        legendStyle={{ fontSize: '14px' }}
                        unitLabel="proyectos"
                    />
                </div>
            </div>
        </div>
    );
}

// Helper to fix icon prop in KPICard usage above if needed.
// Actually KPICard accepts LucideIcon type, and we import { Users } from 'lucide-react', so passing `icon={Users}` is valid.
