"use client";
// Force Update: 2026-02-05 07:15 - Visual Refresh

import { useState, useMemo } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { FundingChart } from '@/components/dashboard/charts/FundingChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { DollarSign, FileText, CheckCircle, TrendingUp, Filter, Users } from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardViewProps {
    initialData: any[];
    years?: any[]; // Changed to allow objects {value, label}
    stages?: string[];
    lines?: any[];
    ejesList?: any[];
}

export default function DashboardView({ initialData, years = [], stages = [], lines = [], ejesList = [] }: DashboardViewProps) {
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
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año || item.year) === String(selectedYear);

            // Strict ID check (both are UUID strings now)
            const matchLinea = selectedLinea === 'all' || item.lineaId === selectedLinea;
            const matchEje = selectedEje === 'all' || item.ejeId === selectedEje;
            const matchEtapa = selectedEtapa === 'all' || item.etapa === selectedEtapa;

            return matchYear && matchLinea && matchEje && matchEtapa;
        });
    }, [initialData, selectedYear, selectedLinea, selectedEje, selectedEtapa]);

    // Debug logging requested by user
    console.log('Datos filtrados:', filteredData.length);

    // Aggregate Metrics
    const metrics = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            totalFunding: acc.totalFunding + (curr.monto_fondoempleo + curr.monto_contrapartida),
            totalProjects: acc.totalProjects + 1,
            totalBeneficiaries: acc.totalBeneficiaries + curr.beneficiarios,
            avgFunding: 0
        }), { totalFunding: 0, totalProjects: 0, totalBeneficiaries: 0, avgFunding: 0 });
    }, [filteredData]);

    metrics.avgFunding = metrics.totalProjects > 0 ? metrics.totalFunding / metrics.totalProjects : 0;

    // Chart Data
    const fundingByRegion = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const r = d.region;
            if (!map.has(r)) map.set(r, { name: r, fondoempleo: 0, contrapartida: 0 });
            const entry = map.get(r);
            entry.fondoempleo += d.monto_fondoempleo;
            entry.contrapartida += d.monto_contrapartida;
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

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">FONDOEMPLEO</h1>
                    <p className="text-gray-500">Vista general de indicadores y proyectos</p>
                </div>

                <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center px-2 text-gray-400">
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
                    title="Total Financiamiento"
                    value={`S/ ${metrics.totalFunding.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
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
                    title="Ticket Promedio"
                    value={`S/ ${metrics.avgFunding.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
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
                </div>
            </div>
        </div>
    );
}

// Helper to fix icon prop in KPICard usage above if needed.
// Actually KPICard accepts LucideIcon type, and we import { Users } from 'lucide-react', so passing `icon={Users}` is valid.
