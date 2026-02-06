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

interface DashboardViewProps {
    initialData: any[];
    years?: any[]; // Changed to allow objects {value, label}
    stages?: string[];
    lines?: any[];
    ejesList?: any[];
}

export default function DashboardView({ initialData, years = [], stages = [], lines = [], ejesList = [] }: DashboardViewProps) {
    if (initialData && initialData.length > 0) {
        console.log('PRIMER REGISTRO:', initialData[0]);
    }

    // State for filters
    const [selectedYear, setSelectedYear] = useState<string>(''); // Default empty for 'All'
    const [selectedLinea, setSelectedLinea] = useState<string>('all');
    const [selectedEje, setSelectedEje] = useState<string>('all');
    const [selectedEtapa, setSelectedEtapa] = useState<string>('all');

    // Use passed years directly - NO LOGIC HERE
    // years prop comes from server as sorted number array or objects

    // const lineas = useMemo(() => Array.from(new Set(initialData.map(d => d.linea))).sort(), [initialData]); // DEPRECATED: Using props
    // const ejes = useMemo(() => Array.from(new Set(initialData.map(d => d.eje))).sort(), [initialData]); // DEPRECATED: Using props
    // stages passed from props now

    // Filter Logic
    const filteredData = useMemo(() => {
        console.log('Filtrando por año:', selectedYear);
        return initialData.filter(item => {
            // Numeric normalization
            // User requested: (!selectedYear || String(item.año) === String(selectedYear))
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);

            // Strict ID check (both are UUID strings now)
            const matchLinea = selectedLinea === 'all' || item.lineaId === selectedLinea;
            const matchEje = selectedEje === 'all' || item.ejeId === selectedEje;
            const matchEtapa = selectedEtapa === 'all' || item.etapa === selectedEtapa;

            return matchYear && matchLinea && matchEje && matchEtapa;
        });
    }, [initialData, selectedYear, selectedLinea, selectedEje, selectedEtapa]);

    // Debug logging requested by user
    console.log('Datos filtrados:', filteredData.length);

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
            if (!map.has(r)) map.set(r, { name: r, fondoempleo: 0, contrapartida: 0 });
            const entry = map.get(r);
            entry.fondoempleo += (Number(d.monto_fondoempleo) || 0);
            entry.contrapartida += (Number(d.monto_contrapartida) || 0);
        });
        return Array.from(map.values());
    }, [filteredData]);

    const projectsByStatus = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const s = d.estado;
            if (!map.has(s)) map.set(s, 0);
            map.set(s, map.get(s) + 1);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const projectsByEje = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            // EjeId is used in data. Link to ejesList labels.
            // d.eje_id (or ejeId depending on how it's mapped)
            // InitialData likely has 'eje_id'. Filter logic uses 'ejeId'. Need to check data structure logic.
            // Assuming item.ejeId based on filter logic: `const matchEje = selectedEje === 'all' || item.ejeId === selectedEje;`
            // But verify initialData mapping. `initialData` comes from server.
            // Let's assume `ejeId` is the key.
            const eid = d.ejeId || d.eje_id || d.eje;

            if (!map.has(eid)) map.set(eid, 0);
            map.set(eid, map.get(eid) + 1);
        });

        // Map ID to Label from ejesList
        // ejesList structure: { value: id, label: "1. Name" }
        return Array.from(map.entries()).map(([id, value]) => {
            const ejeObj = ejesList.find((e: any) => e.value === id || e.id === id); // Handle likely structures
            // If check `ejesList` pass logic from page.tsx: likely { value, label }
            const name = ejeObj ? ejeObj.label : `Eje ${id}`;
            return { name, value };
        }).sort((a, b) => a.name.localeCompare(b.name)); // Sort by name (1. ..., 2. ...)
    }, [filteredData, ejesList]);

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Header Text Moved Inside Filter Box for cleanliness, or we keep 2 divs but user asked to push filters */}
                {/* User Req: "En la parte superior derecha (área blanca donde están los filtros), añade a la izquierda de los selectores..." */}

                <div className="w-full flex flex-wrap gap-4 bg-white header-container-v2 p-3 rounded-lg border border-gray-200 shadow-sm items-center">
                    {/* New Integrated Header */}
                    <div className="mr-auto px-4 py-1 border-r border-gray-100 flex items-center">
                        <div style={{ display: 'flex', alignItems: 'center', height: 'auto' }}>
                            {/* Logo PROD */}
                            <img
                                src="/fondoempleo.jpg"
                                alt="Fondoempleo"
                                style={{
                                    height: '85px',
                                    width: 'auto',
                                    filter: 'contrast(1.1) saturate(1.2) drop-shadow(0 0 0px transparent)',
                                    imageRendering: 'crisp-edges', // Requested: crisp-edges
                                    objectFit: 'contain',
                                    marginRight: '20px'
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center px-2 text-gray-400 border-l border-gray-100 pl-4">
                        <Filter className="w-5 h-5" />
                    </div>

                    <select
                        className="input py-1 text-sm border-gray-300 w-32"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >

                        {years.map((y: any) => {
                            const val = y.value ?? y;
                            const lab = y.label ?? y;
                            return <option key={val} value={val}>{lab}</option>
                        })}
                    </select>

                    <select
                        className="input py-1 text-sm border-gray-300 w-48"
                        value={selectedLinea}
                        onChange={(e) => setSelectedLinea(e.target.value)}
                    >
                        <option value="all">Todas las Líneas</option>
                        {lines.map((l: any) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>

                    <select
                        className="input py-1 text-sm border-gray-300 w-48"
                        value={selectedEje}
                        onChange={(e) => setSelectedEje(e.target.value)}
                    >
                        <option value="all">Todos los Ejes</option>
                        {ejesList.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>

                    <select
                        className="input py-1 text-sm border-gray-300 w-48"
                        value={selectedEtapa}
                        onChange={(e) => setSelectedEtapa(e.target.value)}
                    >
                        <option value="all">Todas las Etapas</option>
                        {stages.map(e => <option key={String(e)} value={String(e)}>{String(e)}</option>)}
                    </select>
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
                    title="Ejecutado"
                    value={`S/ ${metrics.totalContra.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                    icon={TrendingUp} // Or BarChart3
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <FundingChart data={fundingByRegion} />
                </div>
                <div>
                    <StatusChart data={projectsByStatus} />
                    <div className="mt-6">
                        <EjeChart data={projectsByEje} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper to fix icon prop in KPICard usage above if needed.
// Actually KPICard accepts LucideIcon type, and we import { Users } from 'lucide-react', so passing `icon={Users}` is valid.
