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

const COMPANY_COLORS = [
    '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa',
    '#059669', '#10b981', '#34d399', '#f59e0b', '#fbbf24'
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

    // 3. Process Aportantes for Stacked Bar Chart (2021-2025)
    const stackedAportantes = useMemo(() => {
        const years = [2021, 2022, 2023, 2024, 2025];
        const companies = [...new Set(aportantesData.map(d => d.empresa))];

        return {
            data: years.map(year => {
                const yearItems = aportantesData.filter(d => d.año === year);
                const row: any = { year };
                yearItems.forEach(item => {
                    row[item.empresa] = item.monto;
                });
                return row;
            }),
            companies
        };
    }, [aportantesData]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-full overflow-x-hidden pb-16">

            {/* KPI Section - Projections 2026 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-8 rounded-[2rem] shadow-xl flex flex-col justify-center text-white border border-blue-400/20">
                    <span className="text-blue-100 text-xs font-black uppercase tracking-[0.2em] mb-3">Aportes Proyectados 2026</span>
                    <span className="text-4xl font-black tracking-tighter">
                        {formatCurrency(100000000)}
                    </span>
                </div>

                <div className="bg-gradient-to-br from-red-600 to-red-800 p-8 rounded-[2rem] shadow-xl flex flex-col justify-center text-white border border-red-400/20">
                    <span className="text-red-100 text-xs font-black uppercase tracking-[0.2em] mb-3">G. Operativos Proyectados 2026</span>
                    <span className="text-4xl font-black tracking-tighter">
                        {formatCurrency(10000000)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-16">

                {/* 1. Grouped Bar Chart (Finance) */}
                <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-slate-100">
                    <div className="mb-10 text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evolución Financiera (Barras Agrupadas)</h3>
                        <p className="text-slate-400 font-medium">Comparativa de rubros principales • 2021 - 2026</p>
                    </div>
                    <div className="h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={groupedFinanzas} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontWeight: 800, fontSize: 14 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="center"
                                    iconType="circle"
                                    wrapperStyle={{ paddingTop: '0px', paddingBottom: '50px', fontSize: '12px', fontWeight: 700 }}
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
                <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-slate-100">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Histórico de Saldos en Bancos</h3>
                        <p className="text-slate-400 font-medium font-bold">Resumen de liquidez anual</p>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-100">
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

                {/* 3. Stacked Contributor Chart */}
                <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-slate-100">
                    <div className="mb-10 text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Composición de Aportantes</h3>
                        <p className="text-slate-400 font-medium">Distribución por empresa y año • 2021 - 2025</p>
                    </div>
                    <div className="h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stackedAportantes.data} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontWeight: 800 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    wrapperStyle={{ paddingTop: '40px', fontSize: '10px', fontWeight: 600 }}
                                />
                                {stackedAportantes.companies.map((company, index) => (
                                    <Bar
                                        key={company}
                                        dataKey={company}
                                        stackId="a"
                                        fill={COMPANY_COLORS[index % COMPANY_COLORS.length]}
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
