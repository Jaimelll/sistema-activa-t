"use client";
// Becas View - Adapted from DashboardView
// Updates: 'Proyecto' -> 'Beca', standard visuals retained.

import { useState, useMemo } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { FundingChart } from '@/components/dashboard/charts/FundingChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { EjeChart } from '@/components/dashboard/charts/EjeChart';
import { DollarSign, FileText, CheckCircle, TrendingUp, Filter, Users } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';

import { GestoraChart } from '@/components/dashboard/charts/GestoraChart';

interface BecasViewProps {
    initialData: any[];
    years?: any[];
    stages?: string[];
    lines?: any[];
    ejesList?: any[];
}

export default function BecasView({ initialData, years = [], stages = [], lines = [], ejesList = [] }: BecasViewProps) {
    if (initialData && initialData.length > 0) {
        console.log('PRIMERA BECA:', initialData[0]);
    }

    // State for filters
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedLinea, setSelectedLinea] = useState<string>('all');
    const [selectedEtapa, setSelectedEtapa] = useState<string>('all');
    const [selectedExecution, setSelectedExecution] = useState<string>('process'); // Default: En proceso

    // Filter Logic for Options
    const availableFilters = useMemo(() => {
        // 1. Filter by Year first (Master Filter) & Execution
        const dataForOptions = initialData.filter(item => {
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);

            // Execution Logic
            const eid = Number(item.etapaId || item.etapa_id || 0);
            let matchExec = true;
            if (selectedExecution === 'process') matchExec = eid !== 6 && eid !== 7;
            if (selectedExecution === 'executed') matchExec = eid === 6 || eid === 7;

            return matchYear && matchExec;
        });

        // 2. Extract uniques present in this year's data
        const uniqueLineas = Array.from(new Set(dataForOptions.map(d => String(d.lineaId || d.linea_id || d.linea))));
        const uniqueEtapas = Array.from(new Set(dataForOptions.map(d => d.etapa))).sort();

        // 3. Map back to full objects with labels using original props
        const dynamicLineas = lines
            .filter((l: any) => uniqueLineas.includes(String(l.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        return { dynamicLineas, uniqueEtapas };
    }, [initialData, selectedYear, selectedExecution, lines]);

    // Main Filters
    const filteredData = useMemo(() => {
        console.log('Filtrando becas por año:', selectedYear, 'Ejecución:', selectedExecution);
        return initialData.filter(item => {
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);
            const matchLinea = selectedLinea === 'all' || String(item.lineaId || item.linea_id || item.linea) === String(selectedLinea);
            const matchEtapa = selectedEtapa === 'all' || item.etapa === selectedEtapa;

            // Execution Filter
            const eid = Number(item.etapaId || item.etapa_id || 0);
            const status = (item.estado || '').toLowerCase().trim();
            const isExecuted = eid === 6 || eid === 7 || status === 'ejecutado' || status === 'resuelto';

            let matchExec = true;
            if (selectedExecution === 'process') matchExec = !isExecuted;
            if (selectedExecution === 'executed') matchExec = isExecuted;

            return matchYear && matchLinea && matchEtapa && matchExec;
        });
    }, [initialData, selectedYear, selectedLinea, selectedEtapa, selectedExecution]);

    console.log('Becas filtradas:', filteredData.length);

    // Aggregate Metrics
    const metrics = useMemo(() => {
        // En Becas, asumimos las mismas columnas de montos si existen en Base4.
        const totalFondo = filteredData.reduce((acc, curr) => acc + (Number(curr.monto_fondoempleo) || 0), 0);
        const totalContra = filteredData.reduce((acc, curr) => acc + (Number(curr.monto_contrapartida) || 0), 0);
        const totalBen = filteredData.reduce((acc, curr) => acc + (Number(curr.beneficiarios) || 0), 0);
        const totalBecas = filteredData.length;

        return {
            totalFondo,
            totalContra,
            totalBecas,
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

    const becasByRegionCount = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const r = d.region;
            if (!map.has(r)) map.set(r, 0);
            map.set(r, map.get(r) + 1);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const becasByStatus = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const s = d.estado;
            if (!map.has(s)) map.set(s, 0);
            map.set(s, map.get(s) + 1);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const inversionByEstado = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const s = d.estado;
            if (!map.has(s)) map.set(s, 0);
            map.set(s, map.get(s) + (Number(d.monto_fondoempleo) || 0));
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const becasByLinea = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const lid = d.lineaId || d.linea_id || d.linea;
            if (!map.has(lid)) map.set(lid, 0);
            map.set(lid, map.get(lid) + 1);
        });

        return Array.from(map.entries()).map(([id, value]) => {
            const lineaObj = lines.find((l: any) => l.value === id || l.id === id);
            const name = lineaObj ? lineaObj.label : `Línea ${id}`;
            return { name, value };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, lines]);

    const inversionByLinea = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const lid = d.lineaId || d.linea_id || d.linea;
            if (!map.has(lid)) map.set(lid, 0);
            const current = map.get(lid);
            // Sumar montos
            map.set(lid, current + (Number(d.monto_fondoempleo) || 0));
        });

        return Array.from(map.entries()).map(([id, value]) => {
            const lineaObj = lines.find((l: any) => l.value === id || l.id === id);
            const name = lineaObj ? lineaObj.label : `Línea ${id}`;
            return { name, value };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, lines]);

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
                        {/* EXECUTION FILTER */}
                        <select
                            className="input py-1 text-sm border-gray-300 w-32 font-medium text-blue-900 bg-blue-50"
                            value={selectedExecution}
                            onChange={(e) => setSelectedExecution(e.target.value)}
                        >
                            <option value="all">Todas</option>
                            <option value="process">En proceso</option>
                            <option value="executed">Ejecutados</option>
                        </select>

                        <select
                            className="input py-1 text-sm border-gray-300 w-32"
                            value={selectedYear}
                            onChange={(e) => {
                                setSelectedYear(e.target.value);
                                setSelectedLinea('all');
                                setSelectedEtapa('all');
                                setSelectedExecution('all'); // Reset execution to show all statuses by default
                            }}
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
                            {availableFilters.dynamicLineas.map((l: any) => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>



                        <select
                            className="input py-1 text-sm border-gray-300 w-48"
                            value={selectedEtapa}
                            onChange={(e) => setSelectedEtapa(e.target.value)}
                        >
                            <option value="all">Todas las Etapas</option>
                            {availableFilters.uniqueEtapas.map(e => <option key={String(e)} value={String(e)}>{String(e)}</option>)}
                        </select>

                        {/* Reset Filter Button */}
                        <div className="flex items-center px-2 text-gray-400">
                            <Filter className="w-5 h-5" />
                        </div>
                    </div>

                </div>
            </div>

            {/* KPI Cards (Becas Specific) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Monto Fondoempleo"
                    value={`S/ ${metrics.totalFondo.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={DollarSign}
                    trend="+12% vs año anterior" // Static placeholder or calculate if needed
                    trendUp={true}
                />
                <KPICard
                    title="Becas Activas"
                    value={metrics.totalBecas}
                    icon={FileText}
                />
                <KPICard
                    title="Beneficiarios"
                    value={metrics.totalBeneficiaries.toLocaleString('es-PE')}
                    icon={Users}
                />
                <KPICard
                    title="Ejecutado (Total)"
                    value={`S/ ${metrics.totalContra.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                    icon={TrendingUp}
                />
            </div>

            {/* Charts Section */}

            {/* Row 1: Quantities (3 Donuts) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 1. Becas por Estado */}
                <div>
                    <StatusChart
                        data={becasByStatus}
                        title="Becas por Estado"
                        legendStyle={{ fontSize: '10px' }}
                    />
                </div>
                {/* 2. Becas por Línea (Using EjeChart generic) */}
                <div>
                    <EjeChart
                        data={becasByLinea}
                        title="Becas por Línea"
                        legendStyle={{ fontSize: '10px', height: 'auto' }}
                    />
                </div>
                {/* 3. Becas por Región */}
                <div>
                    <EjeChart
                        data={becasByRegionCount}
                        title="Becas por Región"
                        legendStyle={{ fontSize: '10px' }}
                    />
                </div>
            </div>

            {/* Row 2: Investments (3 Donuts) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 4. Inversión por Estado */}
                <div>
                    <StatusChart
                        data={inversionByEstado}
                        title="Inversión por Estado"
                        legendStyle={{ fontSize: '10px' }}
                        tooltipFormat="currency"
                    />
                </div>
                {/* 5. Inversión por Línea */}
                <div>
                    <EjeChart
                        data={inversionByLinea}
                        title="Inversión por Línea"
                        legendStyle={{ fontSize: '10px', height: 'auto' }}
                        tooltipFormat="currency"
                    />
                </div>
                {/* 6. Inversión por Región */}
                <div>
                    <EjeChart
                        data={fundingByRegion.map((r: any) => ({ name: r.name, value: r.fondoempleo }))}
                        title="Inversión por Región (FE)"
                        legendStyle={{ fontSize: '10px' }}
                        tooltipFormat="currency"
                    />
                </div>
            </div>

            {/* Bottom Row: Bar Chart (100% width) */}
            <div className="w-full">
                <FundingChart data={fundingByRegion} rotateX={-45} formatY="millions" />
            </div>
        </div>
    );
}
