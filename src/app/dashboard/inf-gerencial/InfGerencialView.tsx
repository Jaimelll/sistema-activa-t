"use client";

import { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Search, X } from 'lucide-react';

interface AporteFlat {
    id: string;
    ruc: string;
    anio: number;
    monto: number;
    razon_social: string;
    seccion_desc: string;
}

interface FinanzasItem {
    año: number;
    rubro: string;
    monto: number;
}

const VIBRANT_PALETTE = [
    '#ff7f50', '#ffdb58', '#8a2be2', '#008080', '#ff4500',
    '#2f4f4f', '#ec4899', '#06b6d4', '#f59e0b', '#10b981',
    '#1d4ed8', '#15803d', '#dc2626', '#7c3aed', '#db2777',
];

const COLORS_FINANZAS = {
    'Aportes': '#dc2626',       // Rojo
    'Intereses': '#94a3b8',     // Plomo/Gris
    'G. Operativos': '#86efac', // Verde claro
    'Proyectos': '#facc15',     // Amarillo
    'Becas': '#0ea5e9',         // Celeste
};

// Datos estáticos del Crecimiento del PBI del Perú (%)
const PBI_DATA: Record<number, number> = {
    1998: -0.5, 1999: -0.4, 2000: 3.0, 2001: 0.2, 2002: 5.0,
    2003: 4.2, 2004: 5.0, 2005: 6.3, 2006: 7.5, 2007: 8.5,
    2008: 9.1, 2009: 1.1, 2010: 8.5, 2011: 6.5, 2012: 6.3,
    2013: 5.9, 2014: 2.4, 2015: 3.3, 2016: 4.0, 2017: 2.5,
    2018: 4.0, 2019: 2.2, 2020: -11.0, 2021: 13.6, 2022: 2.7,
    2023: -0.6, 2024: 2.5, 2025: 3.4
};

export default function InfGerencialView({
    initialData,
    sectores,
    finanzasData
}: {
    initialData: AporteFlat[],
    sectores: string[],
    finanzasData: FinanzasItem[]
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState<string>('all');
    const [highlightedEmpresa, setHighlightedEmpresa] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Finanzas Processing ---
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

    const historicalSaldos = useMemo(() => {
        return finanzasData
            .filter(d => d.rubro === 'Saldos en Bancos')
            .sort((a, b) => a.año - b.año);
    }, [finanzasData]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatCurrencyWithCents = (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatCompactCurrency = (value: number) => {
        return `${(value / 1000000).toFixed(0)}M`;
    };
    // --- End Finanzas Processing ---


    // Compute years from 2021 to latest available in the data
    const last5Years = useMemo(() => {
        const allYears = Array.from(new Set(initialData.map(d => d.anio))).sort((a, b) => a - b);
        return allYears.filter(y => y >= 2021);
    }, [initialData]);

    const yearRange = last5Years.length > 0
        ? `${last5Years[0]} - ${last5Years[last5Years.length - 1]}`
        : '';

    // Filter data to the last 5 years + selected sector
    const baseData = useMemo(() => {
        return initialData.filter(d => {
            const inYear = last5Years.includes(d.anio);
            const inSector = selectedSector === 'all' || d.seccion_desc === selectedSector;
            return inYear && inSector;
        });
    }, [initialData, last5Years, selectedSector]);

    // Empresa search suggestions
    const empresaSuggestions = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        const names = Array.from(new Set(baseData.map(d => d.razon_social)));
        return names.filter(n => n.toLowerCase().includes(term)).slice(0, 8);
    }, [baseData, searchTerm]);

    // Top 10 companies by total during last 5 years
    const top10Companies = useMemo(() => {
        const totals = new Map<string, number>();
        baseData.forEach(d => totals.set(d.razon_social, (totals.get(d.razon_social) || 0) + d.monto));
        return Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(e => e[0]);
    }, [baseData]);

    // Data for horizontal stacked bar chart (year as Y-axis, companies stacked)
    // Each row = one year; bars = one company; stacked
    const stackedData = useMemo(() => {
        return [...last5Years].reverse().map(year => {
            const row: any = { year: year.toString() };
            top10Companies.forEach(company => {
                const entry = baseData.find(d => d.anio === year && d.razon_social === company);
                row[company] = entry ? entry.monto : 0;
            });
            return row;
        });
    }, [baseData, last5Years, top10Companies]);

    // Company index (for colors)
    const companyColorMap = useMemo(() => {
        const map = new Map<string, string>();
        top10Companies.forEach((company, i) => map.set(company, VIBRANT_PALETTE[i % VIBRANT_PALETTE.length]));
        return map;
    }, [top10Companies]);

    // Line chart — historical total + PBI cruzado por año
    const lineData = useMemo(() => {
        const sectorFiltered = initialData.filter(d => selectedSector === 'all' || d.seccion_desc === selectedSector);
        const yearGroups = new Map<number, number>();
        sectorFiltered.forEach(d => yearGroups.set(d.anio, (yearGroups.get(d.anio) || 0) + d.monto));
        return Array.from(yearGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([anio, total]) => ({
                anio: String(anio),
                total,
                // Cruzamos con PBI_DATA usando el año como clave
                pbi: PBI_DATA[anio] ?? null
            }));
    }, [initialData, selectedSector]);

    // Sector pie data — from filtered set
    const pieData = useMemo(() => {
        const groups = new Map<string, number>();
        baseData.forEach(d => groups.set(d.seccion_desc, (groups.get(d.seccion_desc) || 0) + d.monto));
        return Array.from(groups.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [baseData]);

    // KPIs
    const totalLast5 = useMemo(() => baseData.reduce((s, d) => s + d.monto, 0), [baseData]);
    const topCompanyName = top10Companies[0] || 'N/A';
    const totalEmpresas = useMemo(() => new Set(baseData.map(d => d.ruc)).size, [baseData]);

    const fmt = (v: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
    const fmtM = (v: number) => `${(v / 1000000).toFixed(0)}M`;

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-full overflow-x-hidden pb-16">

            {/* Header Title */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Información Gerencial</h1>
            </div>


            {/* Filters Row */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-end">
                {/* Company Search */}
                <div className="flex-1 relative">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Buscar Empresa</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50"
                            placeholder="Nombre de empresa..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); if (!e.target.value) setHighlightedEmpresa(null); }}
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); setHighlightedEmpresa(null); }} className="absolute right-3 top-2.5">
                                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                            </button>
                        )}
                    </div>
                    {empresaSuggestions.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
                            {empresaSuggestions.map(name => (
                                <button
                                    key={name}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 text-slate-700 border-b border-slate-50 last:border-0"
                                    onClick={() => { setHighlightedEmpresa(name); setSearchTerm(name); }}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    )}
                    {highlightedEmpresa && (
                        <p className="mt-1 text-xs text-blue-600 font-semibold">Filtrando por: {highlightedEmpresa}</p>
                    )}
                </div>

                {/* Sector Filter */}
                <div className="w-full md:w-80">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Sector Económico</label>
                    <select
                        className="w-full border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50"
                        value={selectedSector}
                        onChange={e => setSelectedSector(e.target.value)}
                    >
                        <option value="all">Todos los sectores</option>
                        {sectores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Main Historical Line Chart — Dual Axis: Aportes + PBI */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="mb-6 text-center">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evolución Histórica de Aportes 1998-2026</h3>
                </div>
                {/* Leyenda manual entre título y gráfico */}
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-6">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-1 bg-blue-600 inline-block rounded-full" />
                        <span className="text-sm font-bold text-slate-600">Aportes Totales (S/)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-8 inline-block" style={{ borderTop: '2px dashed #f97316', marginTop: '1px' }} />
                        <span className="text-sm font-bold text-slate-600">Crecimiento PBI Perú (%)</span>
                    </div>
                </div>
                <div className="h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData} margin={{ top: 10, right: 50, left: 20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} interval={2} />
                            {/* Eje izquierdo: Aportes en S/ */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={fmtM}
                            />
                            {/* Eje derecho: PBI % */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#f97316', fontSize: 11 }}
                                tickFormatter={(v) => `${v}%`}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                formatter={(value: number, name: string) => {
                                    if (name === 'pbi') return [`${value}%`, 'Crecimiento PBI'];
                                    return [fmt(value), 'Aportes Totales'];
                                }}
                            />
                            {/* Línea principal de Aportes */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="total"
                                name="total"
                                stroke="#2563eb"
                                strokeWidth={4}
                                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 8 }}
                                connectNulls
                            />
                            {/* Línea secundaria del PBI */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="pbi"
                                name="pbi"
                                stroke="#f97316"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 3, strokeWidth: 1.5, fill: '#fff', stroke: '#f97316' }}
                                activeDot={{ r: 6 }}
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row: Stacked Bar + Sector Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Stacked Bar Chart */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-8 text-center">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribución de Aportantes 2021 – 2026</h3>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={highlightedEmpresa
                                    ? [...last5Years].reverse().map(year => {
                                        const entry = baseData.find(d => d.anio === year && d.razon_social === highlightedEmpresa);
                                        return { year: year.toString(), [highlightedEmpresa]: entry ? entry.monto : 0 };
                                    })
                                    : stackedData
                                }
                                layout="vertical"
                                margin={{ top: 5, right: 20, left: 10, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="year" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 800, fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                                {highlightedEmpresa
                                    ? <Bar key={highlightedEmpresa} dataKey={highlightedEmpresa} stackId="a" fill={companyColorMap.get(highlightedEmpresa) || '#2563eb'} barSize={24} radius={[0, 4, 4, 0]} />
                                    : top10Companies.map((company, index) => (
                                        <Bar key={company} dataKey={company} stackId="a" fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]} barSize={24} />
                                    ))
                                }
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sector Bar Chart (Formerly Pie) */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-8 text-center">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribución por Sector</h3>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={pieData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: isMobile ? 10 : 80, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontWeight: 600, fontSize: isMobile ? 9 : 10 }}
                                    width={isMobile ? 110 : 150}
                                    tickFormatter={(val) => val.length > 20 ? `${val.substring(0, 20)}...` : val}
                                />
                                <Tooltip
                                    formatter={(value: number) => fmt(value)}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e293b', fontSize: '13px' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '16px', maxWidth: '300px' }}
                                />
                                <Bar dataKey="value" name="Monto" radius={[0, 4, 4, 0]} barSize={20}>
                                    {pieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* KPI Cards — ubicadas encima del gráfico financiero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl shadow-md flex flex-col justify-center text-white border border-blue-400/20">
                    <span className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Aportado ({yearRange})</span>
                    <span className="text-2xl lg:text-3xl font-black tracking-tighter">{fmt(totalLast5)}</span>
                </div>
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-6 rounded-3xl shadow-md flex flex-col justify-center text-white border border-teal-400/20">
                    <span className="text-teal-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Principal Aportante (2021 - 2026)</span>
                    <span className="text-xl lg:text-2xl font-black tracking-tight uppercase">{topCompanyName}</span>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-700 p-6 rounded-3xl shadow-md flex flex-col justify-center text-white border border-violet-400/20">
                    <span className="text-violet-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Empresas Activas (2021 - 2026)</span>
                    <span className="text-2xl lg:text-3xl font-black tracking-tighter">{totalEmpresas}</span>
                </div>
            </div>

            {/* NEW: Financial Evolution (Full Width) */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
                <div className="mb-6 text-center">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evolución de Aportes, Intereses, G. Operativos, Proyectos y Becas del 2021 al 2026</h3>
                </div>
                {/* Leyenda manual entre título y gráfico */}
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
                    {activeRubros.map(rubro => (
                        <div key={rubro} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS_FINANZAS[rubro as keyof typeof COLORS_FINANZAS] }} />
                            <span className="text-sm font-bold text-slate-600">{rubro}</span>
                        </div>
                    ))}
                </div>
                <div className="h-[350px] w-full">
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
                                iconSize={12}
                                wrapperStyle={{ display: 'none' }}
                            />
                            {activeRubros.map((rubro) => (
                                <Bar
                                    key={rubro}
                                    dataKey={rubro}
                                    fill={COLORS_FINANZAS[rubro as keyof typeof COLORS_FINANZAS]}
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* NEW: Bank Balances (Horizontal Table) */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 w-full overflow-x-auto">
                <div className="mb-6 text-center">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Saldos bancarios al cierre del ejercicio anual / 2026 a la fecha</h3>
                </div>
                <div className="flex flex-nowrap gap-4 min-w-max pb-2">
                    {historicalSaldos.map((item) => (
                        <div key={item.año} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 min-w-[150px] flex flex-col items-center justify-center shadow-sm">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{item.año}</span>
                            <span className="text-lg font-bold text-slate-800 tabular-nums">{formatCurrencyWithCents(item.monto)}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
