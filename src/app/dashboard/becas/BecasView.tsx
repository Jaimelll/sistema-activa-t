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

    // Filter Logic
    const filteredData = useMemo(() => {
        console.log('Filtrando becas por año:', selectedYear);
        return initialData.filter(item => {
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);
            const matchLinea = selectedLinea === 'all' || item.lineaId === selectedLinea;
            const matchEtapa = selectedEtapa === 'all' || item.etapa === selectedEtapa;

            return matchYear && matchLinea && matchEtapa;
        });
    }, [initialData, selectedYear, selectedLinea, selectedEtapa]);

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

    const becasByStatus = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const s = d.estado;
            if (!map.has(s)) map.set(s, 0);
            map.set(s, map.get(s) + 1);
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
                            value={selectedEtapa}
                            onChange={(e) => setSelectedEtapa(e.target.value)}
                        >
                            <option value="all">Todas las Etapas</option>
                            {stages.map(e => <option key={String(e)} value={String(e)}>{String(e)}</option>)}
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
                    title="Ejecutado"
                    value={`S/ ${metrics.totalContra.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                    icon={TrendingUp}
                />
            </div>

            {/* Charts Section */}
            {/* Top Row: Donut Charts (50% each) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <StatusChart data={becasByStatus} title="Becas por Estado" />
                </div>
                <div>
                    <EjeChart data={becasByLinea} title="Becas por Línea" legendStyle={{ height: 'auto' }} />
                </div>
                <div>
                    <EjeChart
                        data={inversionByLinea}
                        title="Inversión por Línea"
                        legendStyle={{ height: 'auto' }}
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
