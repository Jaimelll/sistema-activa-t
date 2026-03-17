"use client";

import { useState, useMemo } from 'react';
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

const VIBRANT_PALETTE = [
    '#ff7f50', '#ffdb58', '#8a2be2', '#008080', '#ff4500',
    '#2f4f4f', '#ec4899', '#06b6d4', '#f59e0b', '#10b981',
    '#1d4ed8', '#15803d', '#dc2626', '#7c3aed', '#db2777',
];

export default function AportantesView({
    initialData,
    sectores
}: {
    initialData: AporteFlat[],
    sectores: string[]
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState<string>('all');
    const [highlightedEmpresa, setHighlightedEmpresa] = useState<string | null>(null);

    // Compute the last 5 years from the data
    const last5Years = useMemo(() => {
        const allYears = Array.from(new Set(initialData.map(d => d.anio))).sort((a, b) => b - a);
        return allYears.slice(0, 5).sort((a, b) => a - b);
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
        return last5Years.map(year => {
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

    // Line chart — historical total (all years, filtered by sector only)
    const lineData = useMemo(() => {
        const sectorFiltered = initialData.filter(d => selectedSector === 'all' || d.seccion_desc === selectedSector);
        const yearGroups = new Map<number, number>();
        sectorFiltered.forEach(d => yearGroups.set(d.anio, (yearGroups.get(d.anio) || 0) + d.monto));
        return Array.from(yearGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([anio, total]) => ({ anio: String(anio), total }));
    }, [initialData, selectedSector]);

    // Sector pie data — from filtered set
    const pieData = useMemo(() => {
        const groups = new Map<string, number>();
        baseData.forEach(d => groups.set(d.seccion_desc, (groups.get(d.seccion_desc) || 0) + d.monto));
        return Array.from(groups.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [baseData]);

    // KPIs
    const totalLast5 = useMemo(() => baseData.reduce((s, d) => s + d.monto, 0), [baseData]);
    const topCompanyName = top10Companies[0] || 'N/A';
    const totalEmpresas = useMemo(() => new Set(baseData.map(d => d.ruc)).size, [baseData]);

    const fmt = (v: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
    const fmtM = (v: number) => `${(v / 1000000).toFixed(0)}M`;

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-full overflow-x-hidden pb-16">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2rem] shadow-md flex flex-col justify-center text-white border border-blue-400/20">
                    <span className="text-blue-100 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Total Aportado ({yearRange})</span>
                    <span className="text-3xl lg:text-4xl font-black tracking-tighter">{fmt(totalLast5)}</span>
                </div>
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-8 rounded-[2rem] shadow-md flex flex-col justify-center text-white border border-teal-400/20">
                    <span className="text-teal-100 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Principal Aportante</span>
                    <span className="text-2xl lg:text-3xl font-black tracking-tight uppercase">{topCompanyName}</span>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-700 p-8 rounded-[2rem] shadow-md flex flex-col justify-center text-white border border-violet-400/20">
                    <span className="text-violet-100 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Empresas Activas</span>
                    <span className="text-3xl lg:text-4xl font-black tracking-tighter">{totalEmpresas}</span>
                </div>
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

            {/* Main Stacked Bar Chart — Corporativo style */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="mb-10 text-center md:text-left">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Composición de Aportantes</h3>
                    <p className="text-slate-400 font-medium">Distribución por empresa y año • {yearRange}</p>
                </div>
                <div className="h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={highlightedEmpresa
                                // If an empresa is highlighted, show only that company's bars (not stacked, single bar per year)
                                ? last5Years.map(year => {
                                    const entry = baseData.find(d => d.anio === year && d.razon_social === highlightedEmpresa);
                                    return { year: year.toString(), [highlightedEmpresa]: entry ? entry.monto : 0 };
                                })
                                : stackedData
                            }
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={fmtM}
                            />
                            <YAxis
                                dataKey="year"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontWeight: 800, fontSize: 14 }}
                            />
                            <Tooltip
                                formatter={(value: number) => fmt(value)}
                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                wrapperStyle={{ paddingTop: '50px', fontSize: '10px', fontWeight: 700 }}
                            />
                            {highlightedEmpresa
                                ? <Bar key={highlightedEmpresa} dataKey={highlightedEmpresa} stackId="a" fill={companyColorMap.get(highlightedEmpresa) || '#2563eb'} barSize={32} radius={[0, 4, 4, 0]} />
                                : top10Companies.map((company, index) => (
                                    <Bar
                                        key={company}
                                        dataKey={company}
                                        stackId="a"
                                        fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]}
                                        barSize={32}
                                    />
                                ))
                            }
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row: Line + Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Historical Line Chart */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evolución Histórica</h3>
                        <p className="text-slate-400 font-medium">Aportes totales por año • 1998 - 2025</p>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={3} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={fmtM} />
                                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                                <Line type="monotone" dataKey="total" name="Total Aportado" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 7 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sector Pie */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribución por Sector</h3>
                        <p className="text-slate-400 font-medium">Porcentaje por sección CIIU</p>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="40%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                    {pieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '16px' }} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, maxWidth: '160px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
