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
            const matchLinea = selectedLinea === 'all' || String(item.lineaId) === String(selectedLinea);
            const matchEje = selectedEje === 'all' || String(item.ejeId) === String(selectedEje);
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
            const eid = d.ejeId || d.eje_id || d.eje;
            if (!map.has(eid)) map.set(eid, 0);
            map.set(eid, map.get(eid) + 1);
        });

        // Map ID to Label from ejesList
        return Array.from(map.entries()).map(([id, value]) => {
            const ejeObj = ejesList.find((e: any) => e.value === id || e.id === id);
            const name = ejeObj ? ejeObj.label : `Eje ${id}`;
            return { name, value };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, ejesList]);

    const inversionByEje = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const eid = d.ejeId || d.eje_id || d.eje;
            if (!map.has(eid)) map.set(eid, 0);
            // Sumar montos
            map.set(eid, map.get(eid) + (Number(d.monto_fondoempleo) || 0));
        });

        // Map ID to Label from ejesList
        return Array.from(map.entries()).map(([id, value]) => {
            const ejeObj = ejesList.find((e: any) => e.value === id || e.id === id);
            const name = ejeObj ? ejeObj.label : `Eje ${id}`;
            return { name, value };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, ejesList]);

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            {/* Header & Filters */}
            <div className="flex flex-col space-y-4 mb-6">

                {/* Fila Superior: Logo + Filtros (ALINEADOS A LA IZQUIERDA) */}
                <div className="flex flex-row items-center justify-start gap-6">

                    {/* 1. Logo */}
                    <img
                        src="/fondoempleo.jpg"
                        alt="Fondoempleo"
                        className="h-[85px] object-contain"
                        style={{
                            filter: 'contrast(1.1) saturate(1.2) drop-shadow(0 0 0px transparent)',
                            imageRendering: 'crisp-edges'
                        }}
                    />

                    {/* 2. Contenedor de Filtros (Pegado al logo) */}
                    <div className="flex flex-row items-center gap-4">
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

                        {/* Reset Filter Button (Optional but good UX, keeping consistent with clear filters icon if present) */}
                        <div className="flex items-center px-2 text-gray-400">
                            <Filter className="w-5 h-5" />
                        </div>
                    </div>

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
                    value={`S/ ${(metrics.totalFondo + metrics.totalContra).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                    icon={TrendingUp} // Or BarChart3
                />
            </div>

            {/* Charts Section */}
            {/* Top Row: Donut Charts (50% each) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <StatusChart data={projectsByStatus} title="Proyectos por Estado" />
                </div>
                <div>
                    <EjeChart data={projectsByEje} title="Proyectos por Eje" />
                </div>
                <div>
                    <EjeChart
                        data={inversionByEje}
                        title="Inversión por Eje"
                        tooltipFormat="currency"
                    />
                </div>
            </div>

            {/* Bottom Row: Bar Chart (100% width) */}
            <div className="w-full">
                <div className="w-full">
                    <FundingChart data={fundingByRegion} rotateX={-45} formatY="millions" />
                </div>
            </div>
        </div>
    );
}

// Helper to fix icon prop in KPICard usage above if needed.
// Actually KPICard accepts LucideIcon type, and we import { Users } from 'lucide-react', so passing `icon={Users}` is valid.
