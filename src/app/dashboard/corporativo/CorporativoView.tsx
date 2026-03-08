"use client";

import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface FinanzasItem {
    año: number;
    rubro: string;
    monto: number;
}

interface AportantesItem {
    año: number;
    empresa: string;
    monto: number;
}

interface CorporativoViewProps {
    finanzasData: FinanzasItem[];
    aportantesData: AportantesItem[];
}

const COLORS_FINANZAS = {
    'Aportes': '#1d4ed8',        // Blue
    'Intereses': '#15803d',     // Green
    'G. Operativos': '#dc2626', // Red
    'Proyectos': '#7c3aed',     // Violet
    'Becas': '#f59e0b',          // Amber
};

// Vibrant color palette for the stacked chart
const VIBRANT_PALETTE = [
    '#ff7f50', // Coral
    '#ffdb58', // Mustard
    '#8a2be2', // Violet
    '#008080', // Teal
    '#ff4500', // Orange Red
    '#2f4f4f', // Dark Slate Gray
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#10b981'  // Emerald
];

export default function CorporativoView({ finanzasData, aportantesData }: CorporativoViewProps) {

    // 1. Process Finanzas for Grouped Bar Chart (2021-2026, excluding Saldos)
    const groupedFinanzas = useMemo(() => {
        const years = [2021, 2022, 2023, 2024, 2025, 2026];
        return years.map(year => {
            const yearItems = finanzasData.filter(d => d.año === year && d.rubro !== 'Saldos en Bancos');
            const row: any = { year };
            yearItems.forEach(item => {
                row[item.rubro] = item.monto;
            });
            return row;
        });
    }, [finanzasData]);

    const activeRubros = Object.keys(COLORS_FINANZAS);

    // 2. Process Bank Balances for Data Table
    const historicalSaldos = useMemo(() => {
        return finanzasData
            .filter(d => d.rubro === 'Saldos en Bancos')
            .sort((a, b) => b.año - a.año);
    }, [finanzasData]);

    // 3. Process Aportantes for Horizontal Stacked Bar Chart (2021-2025)
    const stackedAportantes = useMemo(() => {
        const years = [2021, 2022, 2023, 2024, 2025];
        const companies = [...new Set(aportantesData.map(d => d.empresa))];

        const data = years.map(year => {
            const yearItems = aportantesData.filter(d => d.año === year);
            const row: any = { year: year.toString() };
            yearItems.forEach(item => {
                row[item.empresa] = item.monto;
            });
            return row;
        });

        return { data, companies };
    }, [aportantesData]);

    // Calculate Principal Provider 2025
    const principalProvider2025 = useMemo(() => {
        const items2025 = aportantesData.filter(d => d.año === 2025);
        if (items2025.length === 0) return "N/A";
        const totalByEmpresa = items2025.reduce((acc: any, curr) => {
            acc[curr.empresa] = (acc[curr.empresa] || 0) + curr.monto;
            return acc;
        }, {});
        const sorted = Object.entries(totalByEmpresa).sort((a: any, b: any) => b[1] - a[1]);
        return sorted[0][0];
    }, [aportantesData]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatCompactCurrency = (value: number) => {
        return `${(value / 1000000).toFixed(0)}M`;
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-full overflow-x-hidden pb-16">

            {/* Header Title */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Corporativo</h1>
            </div>

            {/* KPI Section - 3 Rounded Cards with Gradients */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* KPI 1: Aportes */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2rem] shadow-md flex flex-col justify-center text-white border border-blue-400/20 aspect-[16/9] md:aspect-auto h-full">
                    <span className="text-blue-100 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Aportes Proyectados 2026</span>
                    <span className="text-3xl lg:text-4xl font-black tracking-tighter">
                        {formatCurrency(100000000)}
                    </span>
                </div>

                {/* KPI 2: G. Operativos */}
                <div className="bg-gradient-to-br from-rose-500 to-rose-700 p-8 rounded-[2rem] shadow-md flex flex-col justify-center text-white border border-rose-400/20 aspect-[16/9] md:aspect-auto h-full">
                    <span className="text-rose-100 text-[11px] font-black uppercase tracking-[0.2em] mb-3">G. Operativos Proyectados 2026</span>
                    <span className="text-3xl lg:text-4xl font-black tracking-tighter">
                        {formatCurrency(10000000)}
                    </span>
                </div>

                {/* KPI 3: Principal Provider 2025 */}
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-8 rounded-[2rem] shadow-md flex flex-col justify-center text-white border border-teal-400/20 aspect-[16/9] md:aspect-auto h-full">
                    <span className="text-teal-500 text-[11px] font-black uppercase tracking-[0.2em] mb-3 brightness-150">Principal Proveedor 2025</span>
                    <span className="text-2xl lg:text-3xl font-black tracking-tight uppercase">
                        {principalProvider2025}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">

                {/* 1. Grouped Bar Chart (Finance) - Kept Same */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-10 text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evolución Financiera</h3>
                        <p className="text-slate-400 font-medium">Comparativa de rubros principales • 2021 - 2026</p>
                    </div>
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={groupedFinanzas} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontWeight: 800, fontSize: 13 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickFormatter={formatCompactCurrency}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="center"
                                    iconType="circle"
                                    wrapperStyle={{ paddingTop: '0px', paddingBottom: '40px', fontSize: '11px', fontWeight: 700 }}
                                />
                                {activeRubros.map((rubro) => (
                                    <Bar
                                        key={rubro}
                                        dataKey={rubro}
                                        fill={COLORS_FINANZAS[rubro as keyof typeof COLORS_FINANZAS]}
                                        radius={[4, 4, 0, 0]}
                                        barSize={12}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Bank Balances Table */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Histórico de Saldos en Bancos</h3>
                        <p className="text-slate-400 font-medium">Resumen de liquidez anual</p>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-50">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Año</th>
                                    <th className="px-6 py-4 text-right">Monto (S/)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {historicalSaldos.map((item) => (
                                    <tr key={item.año} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-black text-slate-700">{item.año}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.monto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Horizontal Stacked Contributor Chart - NEW DESIGN */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-10 text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Composición de Aportantes</h3>
                        <p className="text-slate-400 font-medium font-bold">Distribución por empresa y año • 2021 - 2025</p>
                    </div>
                    <div className="h-[550px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stackedAportantes.data}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickFormatter={formatCompactCurrency}
                                    domain={[0, 120000000]}
                                    ticks={[0, 30000000, 60000000, 90000000, 120000000]}
                                />
                                <YAxis
                                    dataKey="year"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontWeight: 800, fontSize: 14 }}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    wrapperStyle={{ paddingTop: '50px', fontSize: '10px', fontWeight: 700 }}
                                />
                                {stackedAportantes.companies.map((company, index) => (
                                    <Bar
                                        key={company}
                                        dataKey={company}
                                        stackId="a"
                                        fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]}
                                        barSize={32}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
