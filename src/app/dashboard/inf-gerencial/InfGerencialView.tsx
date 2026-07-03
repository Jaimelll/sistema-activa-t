"use client";

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, Cell, LabelList
} from 'recharts';
import { Search, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { getPresupuestoMensual, getPresupuestoComparativo, getFinanciamientoEjecucion } from './actions';
import { PresentationButton } from '@/components/PresentationButton';

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
    escenario?: string;
}

interface UnidadOperativa {
    id: number;
    siglas: string;
    nombre_completo: string;
    orden: number;
}

// Nombres cortos para el eje de categorías del gráfico "Distribución por Sector"
// (las descripciones CIIU completas son muy largas para caber como etiqueta).
const SECTOR_SHORT_NAMES: [RegExp, string][] = [
    [/explotaci[oó]n de minas/i, 'Minas'],
    [/electricidad/i, 'Electricidad'],
    [/agua|alcantarillado|desechos/i, 'Agua/Residuos'],
    [/construcci[oó]n/i, 'Construcción'],
    [/comercio/i, 'Comercio'],
    [/transporte|almacenamiento/i, 'Transporte'],
    [/alojamiento|comidas/i, 'Alojamiento'],
    [/informaci[oó]n y comunicaci[oó]n/i, 'Comunicación'],
    [/financiera|seguros/i, 'Finanzas'],
    [/inmobiliaria/i, 'Inmobiliaria'],
    [/profesionales|cient[ií]ficas|t[eé]cnicas/i, 'Profesionales'],
    [/administrativos y de apoyo/i, 'Servicios admin.'],
    [/administraci[oó]n p[uú]blica/i, 'Adm. pública'],
    [/enseñanza/i, 'Educación'],
    [/salud/i, 'Salud'],
    [/art[ií]sticas|entretenimiento|recreativ/i, 'Entretenimiento'],
    [/otras actividades de servicios/i, 'Otros servicios'],
    [/hogares/i, 'Hogares'],
    [/agricultura|ganader[ií]a|silvicultura|pesca/i, 'Agro'],
    [/manufacturer[ao]s?/i, 'Manufactura'],
];

function shortSectorName(fullName: string): string {
    const match = SECTOR_SHORT_NAMES.find(([pattern]) => pattern.test(fullName));
    return match ? match[1] : fullName.split(/[,;]| y /i)[0];
}

const VIBRANT_PALETTE = [
    '#ff7f50', '#ffdb58', '#8a2be2', '#008080', '#ff4500',
    '#2f4f4f', '#ec4899', '#06b6d4', '#f59e0b', '#10b981',
    '#1d4ed8', '#15803d', '#dc2626', '#7c3aed', '#db2777',
];

const COLORS_FINANZAS = {
    'Aportes': '#2563eb',       // Azul
    'Intereses': '#94a3b8',     // Plomo/Gris
    'G. Operativos': '#86efac', // Verde claro
    'Proyectos': '#facc15',     // Amarillo
    'Becas': '#dc2626',         // Rojo
};

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

// Datos estáticos del Crecimiento del PBI del Perú (%) — Restaurados
const PBI_DATA: Record<number, number> = {
    1998: -0.5, 1999: -0.4, 2000: 3.0, 2001: 0.2, 2002: 5.0,
    2003: 4.2, 2004: 5.0, 2005: 6.3, 2006: 7.5, 2007: 8.5,
    2008: 9.1, 2009: 1.1, 2010: 8.5, 2011: 6.5, 2012: 6.3,
    2013: 5.9, 2014: 2.4, 2015: 3.3, 2016: 4.0, 2017: 2.5,
    2018: 4.0, 2019: 2.2, 2020: -11.0, 2021: 13.6, 2022: 2.7,
    2023: -0.6, 2024: 2.5, 2025: 3.4
};

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
    return value === 0 ? '' : `${(value / 1000000).toFixed(1)}M`;
};

const fmtM = (v: number) => v === 0 ? '' : `${(v / 1000000).toFixed(0)}M`;

const CustomBudgetTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const entry = payload[0];
        const data = entry.payload;
        // Se comporta igual que el comparativo anual
        const isPresu = entry.dataKey === 'presupuesto';
        const title = isPresu ? `Presupuesto` : `Ejecutado`;
        const total = isPresu ? (data.presupuesto || 0) : (data.ejecutado || 0);
        const breakdown = isPresu ? (data.presupuestoBreakdown || {}) : (data.ejecutadoBreakdown || {});

        return (
            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[220px]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{title} {data.mes_nombre}</p>
                <p className="text-sm font-black text-slate-800 mb-2 border-b pb-1">Total: {formatCurrency(total)}</p>
                <div className="space-y-1 pt-1">
                    {Object.entries(breakdown).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).map(([key, value]) => (
                        <p key={key} className="text-[11px] font-bold text-slate-600 flex justify-between gap-4">
                            <span className="uppercase text-slate-400">{key}:</span>
                            <span className="text-slate-700">{formatCurrency(value as number)}</span>
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};


const CustomComparativeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const entry = payload[0];
        const data = entry.payload;
        const isPoi = entry.dataKey === 'poi';
        const title = isPoi ? `Presupuesto` : `Ejecutado`;
        const total = isPoi ? (data.poi || 0) : (data.ejecutado || 0);
        const breakdown = isPoi ? (data.poiBreakdown || {}) : (data.ejecutadoBreakdown || {});

        return (
            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[220px]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{title} {data.año}</p>
                <p className="text-sm font-black text-slate-800 mb-2 border-b pb-1">Total: {formatCurrency(total)}</p>
                <div className="space-y-1 pt-1">
                    {Object.entries(breakdown).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).map(([key, value]) => (
                        <p key={key} className="text-[11px] font-bold text-slate-600 flex justify-between gap-4">
                            <span className="uppercase text-slate-400">{key}:</span>
                            <span className="text-slate-700">{formatCurrency(value as number)}</span>
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function InfGerencialView({
    initialData,
    annualTotals,
    sectores,
    finanzasData,
    unidades
}: {
    initialData: AporteFlat[],
    annualTotals: Record<number, number>,
    sectores: string[],
    finanzasData: FinanzasItem[],
    unidades: UnidadOperativa[]
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState<string>('all');
    
    // Budgets are now global
    const [presupuestoMensual, setPresupuestoMensual] = useState<any[]>([]);
    const [presupuestoComparativo, setPresupuestoComparativo] = useState<any[]>([]);
    const [financiamientoEjecucion, setFinanciamientoEjecucion] = useState<{ proyectos: any[]; becas: any[] }>({ proyectos: [], becas: [] });
    const [isLoadingBudget, setIsLoadingBudget] = useState(false);
    const [highlightedEmpresa, setHighlightedEmpresa] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchBudgetData = async () => {
            setIsLoadingBudget(true);
            try {
                const [mensual, comparativo] = await Promise.all([
                    getPresupuestoMensual(),
                    getPresupuestoComparativo()
                ]);
                
                // Map month number to short name
                const mappedMensual = (mensual || []).map((item: any) => ({
                    ...item,
                    mes_nombre: MESES_CORTOS[(item.mes || 1) - 1] || '?'
                }));

                setPresupuestoMensual(mappedMensual);
                setPresupuestoComparativo(comparativo || []);
            } catch (error) {
                console.error("Error fetching budget data:", error);
                setPresupuestoMensual([]);
                setPresupuestoComparativo([]);
            } finally {
                setIsLoadingBudget(false);
            }
        };
        fetchBudgetData();
    }, []); // Only fetch on mount since no more unit selector

    useEffect(() => {
        getFinanciamientoEjecucion()
            .then(setFinanciamientoEjecucion)
            .catch((error) => {
                console.error('Error fetching financiamiento en ejecución:', error);
                setFinanciamientoEjecucion({ proyectos: [], becas: [] });
            });
    }, []);

    // --- Finanzas Processing ---
    const groupedFinanzas = useMemo(() => {
        const years = [2024, 2025, 2026];
        const rows: any[] = [];
        
        years.forEach(year => {
            const scenarios = Array.from(new Set(finanzasData.filter(d => d.año === year).map(d => d.escenario || 'Real')));
            
            scenarios.forEach(escenario => {
                // Filtro: Eliminar '2026 Proyectado'
                if (year === 2026 && escenario === 'Proyectado') return;

                const yearItems = finanzasData.filter(d => d.año === year && d.escenario === escenario && d.rubro !== 'Saldos en Bancos');
                if (yearItems.length > 0) {
                    const row: any = { 
                        year: year.toString(),
                        displayYear: year,
                        escenario 
                    };
                    yearItems.forEach(item => {
                        row[item.rubro] = item.monto;
                    });
                    rows.push(row);
                }
            });
        });
        return rows;
    }, [finanzasData]);

    const activeRubros = Object.keys(COLORS_FINANZAS);

    const historicalSaldos = useMemo(() => {
        return finanzasData
            .filter(d => d.rubro === 'Saldos en Bancos' && d.año >= 2024 && !(d.año === 2026 && d.escenario === 'Proyectado'))
            .sort((a, b) => {
                if (a.año !== b.año) return a.año - b.año;
                return (a.escenario === 'Proyectado' ? 1 : -1);
            });
    }, [finanzasData]);

    const last5Years = useMemo(() => {
        const allYears = Array.from(new Set(initialData.map(d => d.anio))).sort((a, b) => a - b);
        return allYears.filter(y => y >= 2021);
    }, [initialData]);

    const last3Years = useMemo(() => {
        const allYears = Array.from(new Set(initialData.map(d => d.anio))).sort((a, b) => a - b);
        return allYears.filter(y => y >= 2024);
    }, [initialData]);

    const yearRange3Y = last3Years.length > 0
        ? `${last3Years[0]} - ${last3Years[last3Years.length - 1]}`
        : '';
    const latestYear = last3Years.length > 0 ? last3Years[last3Years.length - 1] : null;

    const baseData = useMemo(() => {
        return initialData.filter(d => {
            const inYear = last5Years.includes(d.anio);
            const inSector = selectedSector === 'all' || d.seccion_desc === selectedSector;
            return inYear && inSector;
        });
    }, [initialData, last5Years, selectedSector]);

    const baseData3Y = useMemo(() => {
        return initialData.filter(d => {
            const inYear = last3Years.includes(d.anio);
            const inSector = selectedSector === 'all' || d.seccion_desc === selectedSector;
            return inYear && inSector;
        });
    }, [initialData, last3Years, selectedSector]);

    const empresaSuggestions = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        const names = Array.from(new Set(baseData.map(d => d.razon_social)));
        return names.filter(n => n.toLowerCase().includes(term)).slice(0, 8);
    }, [baseData, searchTerm]);

    const top20CompaniesPerYear = useMemo(() => {
        const result: Record<number, { name: string, monto: number }[]> = {};
        last3Years.forEach(year => {
            const yearData = baseData3Y.filter(d => d.anio === year);
            const totals = new Map<string, number>();
            yearData.forEach(d => totals.set(d.razon_social, (totals.get(d.razon_social) || 0) + d.monto));
            result[year] = Array.from(totals.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(e => ({ name: e[0], monto: e[1] }));
        });
        return result;
    }, [baseData3Y, last3Years]);

    const annualTotalData = useMemo(() => {
        return last3Years.map(year => ({
            year: year.toString(),
            total: annualTotals[year] || 0
        }));
    }, [last3Years, annualTotals]);

    const lineData = useMemo(() => {
        const sectorFiltered = initialData.filter(d => selectedSector === 'all' || d.seccion_desc === selectedSector);
        const yearGroups = new Map<number, number>();
        sectorFiltered.forEach(d => yearGroups.set(d.anio, (yearGroups.get(d.anio) || 0) + d.monto));
        return Array.from(yearGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([anio, total]) => {
                const item: Record<string, any> = { anio: String(anio), total };
                const pbiVal = PBI_DATA[anio];
                if (pbiVal !== undefined) {
                    item.pbi = pbiVal;
                }
                return item;
            });
    }, [initialData, selectedSector]);

    const pieData = useMemo(() => {
        const groups = new Map<string, number>();
        let total = 0;
        baseData3Y.forEach(d => {
            groups.set(d.seccion_desc, (groups.get(d.seccion_desc) || 0) + d.monto);
            total += d.monto;
        });
        return Array.from(groups.entries())
            .map(([name, value]) => ({ name: shortSectorName(name), value, percent: total > 0 ? (value / total * 100).toFixed(1) + '%' : '0.0%' }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [baseData3Y]);

    const total3Y = useMemo(() => baseData3Y.reduce((s, d) => s + d.monto, 0), [baseData3Y]);
    const totalEmpresas3Y = useMemo(() => new Set(baseData3Y.map(d => d.ruc)).size, [baseData3Y]);
    const topCompany2026 = latestYear ? (top20CompaniesPerYear[latestYear]?.[0]?.name || 'N/A') : 'N/A';

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
                <div className="flex-1 relative w-full">
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
                <div className="w-full md:w-64">
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

            {/* Evolución de Aportes vs PBI Line Chart */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="mb-6 text-center relative">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evolución de Aportes (1998-2026)</h3>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Aportes 2026: Información actualizada a la fecha</p>
                    <div className="absolute top-0 right-0">
                        <PresentationButton chartId="evolucion-aportes" />
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-6">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-1 bg-blue-600 inline-block rounded-full" />
                        <span className="text-sm font-bold text-slate-600">Aportes Totales (S/)</span>
                    </div>
                </div>
                <div className="w-full overflow-x-auto pb-4">
                    <div className="min-w-[800px] h-[400px]">
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={lineData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 11 }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 11 }} tickFormatter={fmtM} width={85} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Aportes Totales']}
                                />
                                <Line yAxisId="left" type="monotone" dataKey="total" name="total" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* KPI Cards (Moved here, below Aportes vs PBI chart) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-md flex flex-col justify-center text-white border border-blue-400/20">
                    <span className="text-blue-100 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Total Aportado ({yearRange3Y})</span>
                    <span className="text-lg lg:text-xl font-black tracking-tighter">{fmt(total3Y)}</span>
                </div>
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-4 rounded-2xl shadow-md flex flex-col justify-center text-white border border-teal-400/20">
                    <span className="text-teal-100 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Principal Aportante ({latestYear})</span>
                    <span className="text-md lg:text-lg font-black tracking-tight uppercase truncate">{topCompany2026}</span>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-700 p-4 rounded-2xl shadow-md flex flex-col justify-center text-white border border-violet-400/20">
                    <span className="text-violet-100 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Empresas Activas ({yearRange3Y})</span>
                    <span className="text-lg lg:text-xl font-black tracking-tighter">{totalEmpresas3Y}</span>
                </div>
            </div>

            {/* Bottom Row: Stacked Bar + Sector Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-4 text-center relative">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribución de Aportantes 2024 – 2026</h3>
                        <p className="text-sm font-semibold text-amber-600 mt-1">Datos 2026: Cifras preliminares al cierre de abril</p>
                        <div className="absolute top-0 right-0">
                            <PresentationButton chartId="distribucion-aportes" />
                        </div>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart
                                data={annualTotalData}
                                margin={{ top: 5, right: 30, left: 10, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" type="category" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 12 }} />
                                <YAxis type="number" hide />
                                <Tooltip 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const year = Number(label);
                                            const yearTotal = annualTotals[year] || 0;
                                            const top20 = top20CompaniesPerYear[year] || [];
                                            
                                            const tooltipUI = (
                                                <div className={`bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-200 pointer-events-auto ${isMobile ? 'w-[90vw] max-w-[90vw] p-4 max-h-[60vh]' : 'w-[650px] p-6 max-h-[80vh]'}`}>
                                                    <div className="mb-4 border-b border-slate-100 pb-3 shrink-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div>
                                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Resumen Anual</p>
                                                                <p className="text-lg md:text-2xl font-black text-slate-900">Año {label}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Aportes</p>
                                                                <p className="text-lg md:text-2xl font-black text-blue-700">{formatCurrency(yearTotal)}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 shrink-0">Top 20 Aportantes</p>
                                                    
                                                    {/* Lista de Aportantes con scroll interno activo */}
                                                    <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                                                        <div className={`grid gap-x-10 gap-y-1 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                            {/* Columna 1 o Lista completa en móvil */}
                                                            <div className="space-y-1">
                                                                {top20.slice(0, isMobile ? 20 : 10).map((item: any, index: number) => (
                                                                    <div key={index} className={`flex justify-between items-center gap-4 py-1.5 px-3 rounded-lg transition-all ${highlightedEmpresa === item.name ? 'bg-blue-50 ring-1 ring-blue-100 translate-x-1' : 'hover:bg-slate-50'}`}>
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="text-[10px] md:text-xs font-bold text-slate-400 w-5 shrink-0">{index + 1}.</span>
                                                                            <span className={`text-[10px] md:text-xs font-black uppercase tracking-tight truncate ${highlightedEmpresa === item.name ? 'text-blue-700' : 'text-slate-600'}`}>
                                                                                {item.name}
                                                                            </span>
                                                                        </div>
                                                                        <span className={`text-[10px] md:text-xs font-bold tabular-nums shrink-0 ${highlightedEmpresa === item.name ? 'text-blue-800' : 'text-slate-800'}`}>
                                                                            {formatCurrency(item.monto)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Columna 2 (Solo escritorio) */}
                                                            {!isMobile && (
                                                                <div className="space-y-1">
                                                                    {top20.slice(10, 20).map((item: any, index: number) => (
                                                                        <div key={index + 10} className={`flex justify-between items-center gap-4 py-1.5 px-3 rounded-lg transition-all ${highlightedEmpresa === item.name ? 'bg-blue-50 ring-1 ring-blue-100 translate-x-1' : 'hover:bg-slate-50'}`}>
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <span className="text-[10px] md:text-xs font-bold text-slate-400 w-5 shrink-0">{index + 11}.</span>
                                                                                <span className={`text-[10px] md:text-xs font-black uppercase tracking-tight truncate ${highlightedEmpresa === item.name ? 'text-blue-700' : 'text-slate-600'}`}>
                                                                                    {item.name}
                                                                                </span>
                                                                            </div>
                                                                            <span className={`text-[10px] md:text-xs font-bold tabular-nums shrink-0 ${highlightedEmpresa === item.name ? 'text-blue-800' : 'text-slate-800'}`}>
                                                                                {formatCurrency(item.monto)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {top20.length === 0 && (
                                                        <p className="text-sm font-bold text-slate-400 italic text-center py-8">No hay datos de aportantes para este periodo</p>
                                                    )}

                                                    {isMobile && top20.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-slate-100 text-center shrink-0">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                                Desliza para ver más
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );

                                            // On mobile, render centered using a portal to escape any Recharts transformations
                                            if (isMobile && typeof document !== 'undefined') {
                                                return createPortal(
                                                    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none px-4">
                                                        {tooltipUI}
                                                    </div>,
                                                    document.body
                                                );
                                            }

                                            return tooltipUI;
                                        }
                                        return null;
                                    }}
                                    wrapperStyle={{ zIndex: 1000, outline: 'none', visibility: isMobile ? 'hidden' : 'visible' }}
                                    trigger={isMobile ? "click" : "hover"}
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                />
                                <Bar
                                    dataKey="total"
                                    fill="#2563eb"
                                    barSize={24}
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1000}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sector Bar Chart */}
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="mb-4 text-center relative">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribución por Sector 2024-2026</h3>
                        <p className="text-sm font-semibold text-amber-600 mt-1">Datos 2026: Cifras preliminares al cierre de abril</p>
                        <div className="absolute top-0 right-0">
                            <PresentationButton chartId="distribucion-sector" />
                        </div>
                    </div>
                    <div className="h-[360px] w-full">
                        <ResponsiveContainer width="100%" height={360}>
                            <BarChart
                                data={pieData}
                                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: isMobile ? 9 : 11 }} interval={0} />
                                <YAxis type="number" hide />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }} />
                                <Bar dataKey="value" name="Monto" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={20} animationDuration={1000}>
                                    <LabelList dataKey="percent" position="top" fill="#1e293b" fontSize={11} fontWeight={600} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Financiamiento de Proyectos y Becas en ejecución */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
                <div className="mb-6 text-center relative">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Financiamiento de Proyectos y Becas en ejecución</h3>
                    <p className="text-xs text-amber-600 font-semibold mt-1">*Grupos 2026: cifras en curso, aún no reflejan el total proyectado</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {[
                        { key: 'proyectos', titulo: 'PROYECTOS', color: '#0d9488', dotClass: 'bg-teal-600', data: financiamientoEjecucion.proyectos, unidad: 'proy.' },
                        { key: 'becas', titulo: 'BECAS', color: '#2563eb', dotClass: 'bg-blue-600', data: financiamientoEjecucion.becas, unidad: 'becas' },
                    ].map((panel) => (
                        <div key={panel.key} className="bg-slate-50/60 p-6 rounded-[2rem] border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`w-2.5 h-2.5 rounded-full inline-block ${panel.dotClass}`} />
                                <span className="text-sm font-black text-slate-800 tracking-[0.15em]">{panel.titulo}</span>
                                <span className="text-sm font-semibold text-slate-400 tracking-[0.15em]">2024 — 2026</span>
                            </div>
                            {panel.data.length === 0 ? (
                                <div className="h-[340px] flex items-center justify-center text-sm text-slate-400 font-semibold italic">
                                    Sin datos disponibles
                                </div>
                            ) : (
                                <div className="h-[340px] w-full">
                                    <ResponsiveContainer width="100%" height={340}>
                                        <BarChart data={panel.data} margin={{ top: 30, right: 10, left: 10, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="label"
                                                tickFormatter={(label: string, index: number) => (panel.data[index]?.proyectado ? `*${label}` : label)}
                                                axisLine={false}
                                                tickLine={false}
                                                interval={0}
                                                angle={-20}
                                                textAnchor="end"
                                                height={50}
                                                tick={{ fill: '#1e293b', fontWeight: '700', fontSize: 10 }}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 11 }} tickFormatter={(v) => `S/ ${(v / 1000000).toFixed(0)} MM`} width={70} />
                                            <Tooltip
                                                formatter={(value: number, name: string, props: any) => [formatCurrency(value), `${props.payload.count} ${panel.unidad}`]}
                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }}
                                            />
                                            <Bar dataKey="monto" fill={panel.color} radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={1000}>
                                                <LabelList
                                                    dataKey="monto"
                                                    position="top"
                                                    fill="#1e293b"
                                                    fontSize={11}
                                                    fontWeight={700}
                                                    formatter={(v: number) => `S/ ${(v / 1000000).toFixed(1)} MM`}
                                                />
                                                <LabelList
                                                    dataKey="count"
                                                    position="insideTop"
                                                    fill="#fff"
                                                    fontSize={11}
                                                    fontWeight={700}
                                                    formatter={(v: number) => panel.key === 'becas' ? `${v} becas` : `${v}`}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Financial Evolution Chart */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
                <div className="mb-4 text-center relative">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evolución Financiera 2024-2026</h3>
                    <p className="text-xs text-amber-600 font-semibold mt-1">Datos 2026: Cifras preliminares al cierre de abril</p>
                    <div className="absolute top-0 right-0">
                        <PresentationButton chartId="evolucion-financiera" />
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
                    {activeRubros.map(rubro => (
                        <div key={rubro} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS_FINANZAS[rubro as keyof typeof COLORS_FINANZAS] }} />
                            <span className="text-sm font-bold text-slate-600">{rubro}</span>
                        </div>
                    ))}
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={groupedFinanzas} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 13 }} dy={15} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 11 }} tickFormatter={formatCompactCurrency} width={85} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                            {activeRubros.map((rubro) => (
                                <Bar key={rubro} dataKey={rubro} fill={COLORS_FINANZAS[rubro as keyof typeof COLORS_FINANZAS]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bank Balances Cards */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 w-full overflow-x-auto">
                <div className="mb-6 text-center">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight text-blue-600">Saldos Bancarios al cierre del Ejercicio</h3>
                </div>
                <div className="flex flex-nowrap gap-4 min-w-full pb-2">
                    {historicalSaldos.map((item) => (
                        <div key={`${item.año}-${item.escenario}`} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 min-w-[150px] flex flex-col items-center justify-center shadow-sm">
                            <span className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-1">
                                {item.año}
                            </span>
                            <span className="text-lg font-bold text-[#1e293b] tabular-nums">{formatCurrencyWithCents(item.monto)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comparative Budget Chart (Moved to bottom) */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full text-center">
                <div className="mb-8 relative">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">POI 2024-2026</h3>
                    <p className="text-sm font-medium text-slate-400">(Presupuesto vs Ejecutado)</p>
                    <div className="absolute top-0 right-0">
                        <PresentationButton chartId="poi-comparativo" />
                    </div>
                </div>
                <div className="h-[350px] w-full flex flex-col items-center justify-center">
                    {isLoadingBudget ? (
                        <p className="text-center text-slate-400 py-20 font-bold animate-pulse">Cargando datos del presupuesto...</p>
                    ) : presupuestoComparativo.length === 0 ? (
                        <p className="text-center text-slate-400 py-20">No hay datos comparativos disponibles.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={presupuestoComparativo} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="año" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 13 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 13 }} tickFormatter={formatCompactCurrency} width={85} />
                                <Tooltip shared={false} content={<CustomComparativeTooltip />} />
                                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Bar dataKey="poi" name="Presupuesto" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ejecutado" name="Ejecutado" fill="#dc2626" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Monthly Budget Chart (Moved to bottom) */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
                <div className="mb-6 text-center relative">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Presupuesto Mensual Proyectado 2026</h3>
                    <div className="absolute top-0 right-0">
                        <PresentationButton chartId="presupuesto-mensual" />
                    </div>
                </div>
                <div className="h-[350px] w-full flex flex-col items-center justify-center">
                    {isLoadingBudget ? (
                        <p className="text-center text-slate-400 py-20 font-bold animate-pulse">Cargando datos del presupuesto...</p>
                    ) : presupuestoMensual.length === 0 ? (
                        <p className="text-center text-slate-400 py-20">No hay datos disponibles para el periodo seleccionado.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={presupuestoMensual} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="mes_nombre" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 13 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 13 }} tickFormatter={formatCompactCurrency} width={85} />
                                <Tooltip shared={false} content={<CustomBudgetTooltip />} />
                                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Bar dataKey="presupuesto" name="Presupuesto" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ejecutado" name="Ejecutado" fill="#dc2626" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>

                    )}
                </div>
            </div>

        </div>
    );
}
