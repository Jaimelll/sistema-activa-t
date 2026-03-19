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

interface CorporativoViewProps {
    finanzasData: FinanzasItem[];
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

export default function CorporativoView({ finanzasData }: CorporativoViewProps) {

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

            {/* KPI Section - 2 Rounded Cards with Gradients */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* 1. Grouped Bar Chart (Finance) - Main Display (2/3 width) */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 lg:col-span-2">
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

                {/* 2. Bank Balances Table - Side Display (1/3 width) */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 lg:col-span-1 h-full">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Saldos Bancarios</h3>
                        <p className="text-slate-400 font-medium line-clamp-1">Liquidez anual históricas</p>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-50">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-3 py-4">Año</th>
                                    <th className="px-3 py-4 text-right">Monto (S/)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {historicalSaldos.map((item) => (
                                    <tr key={item.año} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-3 py-4 font-black text-slate-700">{item.año}</td>
                                        <td className="px-3 py-4 text-right font-bold text-slate-900 text-xs">{formatCurrency(item.monto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
