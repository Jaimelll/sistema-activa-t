"use client";

import { useState, useMemo } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { FundingChart } from '@/components/dashboard/charts/FundingChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { DollarSign, FileText, CheckCircle, TrendingUp, Filter, Users } from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardViewProps {
    initialData: any[]; // The raw data from server action
}

export default function DashboardView({ initialData }: DashboardViewProps) {
    // State for filters
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedRegion, setSelectedRegion] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    // Extract unique options for dropdowns
    const years = useMemo(() => Array.from(new Set(initialData.map(d => d.year))).sort(), [initialData]);
    const regions = useMemo(() => Array.from(new Set(initialData.map(d => d.region))).sort(), [initialData]);
    const statuses = useMemo(() => Array.from(new Set(initialData.map(d => d.estado))).sort(), [initialData]);

    // Filter Logic
    const filteredData = useMemo(() => {
        return initialData.filter(item => {
            const matchYear = selectedYear === 'all' || item.year === selectedYear;
            const matchRegion = selectedRegion === 'all' || item.region === selectedRegion;
            const matchStatus = selectedStatus === 'all' || item.estado === selectedStatus;
            return matchYear && matchRegion && matchStatus;
        });
    }, [initialData, selectedYear, selectedRegion, selectedStatus]);

    // Aggregate Metrics
    const metrics = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            totalFunding: acc.totalFunding + (curr.monto_fondoempleo + curr.monto_contrapartida),
            totalProjects: acc.totalProjects + 1,
            totalBeneficiaries: acc.totalBeneficiaries + curr.beneficiarios,
            avgFunding: 0 // calc later
        }), { totalFunding: 0, totalProjects: 0, totalBeneficiaries: 0, avgFunding: 0 });
    }, [filteredData]);

    metrics.avgFunding = metrics.totalProjects > 0 ? metrics.totalFunding / metrics.totalProjects : 0;

    // Chart Data Preparation
    const fundingByRegion = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            if (!map.has(d.region)) {
                map.set(d.region, { name: d.region, fondoempleo: 0, contrapartida: 0 });
            }
            const entry = map.get(d.region);
            entry.fondoempleo += d.monto_fondoempleo;
            entry.contrapartida += d.monto_contrapartida;
        });
        return Array.from(map.values());
    }, [filteredData]);

    const projectsByStatus = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            if (!map.has(d.estado)) map.set(d.estado, 0);
            map.set(d.estado, map.get(d.estado) + 1);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredData]);


    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
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
                        <option value="all">Todos los años</option>
                        {years.map(y => <option key={String(y)} value={String(y)}>{String(y)}</option>)}
                    </select>

                    <select
                        className="input py-1 text-sm border-gray-300 w-32"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                    >
                        <option value="all">Todas Regiones</option>
                        {regions.map(r => <option key={String(r)} value={String(r)}>{String(r)}</option>)}
                    </select>

                    <select
                        className="input py-1 text-sm border-gray-300 w-32"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="all">Todos Estados</option>
                        {statuses.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
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
                    value={metrics.totalBeneficiaries.toLocaleString()}
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
