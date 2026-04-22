"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface AporteFlat {
    id: string; ruc: string; anio: number; monto: number;
    razon_social: string; seccion_desc: string;
}
interface FinanzasItem { año: number; rubro: string; monto: number; escenario?: string; }

// ─── Paletas compartidas ──────────────────────────────────────────────────────
const COLORS_FINANZAS: Record<string, string> = {
    'Aportes': '#dc2626', 'Intereses': '#94a3b8',
    'G. Operativos': '#86efac', 'Proyectos': '#facc15', 'Becas': '#0ea5e9',
};
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const PBI_DATA: Record<number, number> = {
    1998: -0.5, 1999: -0.4, 2000: 3.0, 2001: 0.2, 2002: 5.0,
    2003: 4.2, 2004: 5.0, 2005: 6.3, 2006: 7.5, 2007: 8.5,
    2008: 9.1, 2009: 1.1, 2010: 8.5, 2011: 6.5, 2012: 6.3,
    2013: 5.9, 2014: 2.4, 2015: 3.3, 2016: 4.0, 2017: 2.5,
    2018: 4.0, 2019: 2.2, 2020: -11.0, 2021: 13.6, 2022: 2.7,
    2023: -0.6, 2024: 2.5, 2025: 3.4
};

const fmt = (v: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
const fmtM = (v: number) => `${(v / 1_000_000).toFixed(0)}M`;
const fmtM1 = (v: number) => `${(v / 1_000_000).toFixed(1)}M`;

// ─── Tooltips reutilizables ───────────────────────────────────────────────────
const TooltipBase = ({ active, payload, label, formatter }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[160px]">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="text-sm font-black text-slate-800">
                    <span style={{ color: p.color }}>{p.name}: </span>
                    {formatter ? formatter(p.value, p.dataKey) : fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

// ─── CHART MAP ────────────────────────────────────────────────────────────────
// Cada gráfico se registra aquí con su id, título y componente renderizador
const CHART_TITLES: Record<string, string> = {
    'evolucion-aportes':      'Evolución de Aportes vs PBI 1998-2026',
    'distribucion-aportes':   'Distribución de Aportantes 2021–2026',
    'distribucion-sector':    'Distribución por Sector 2021-2026',
    'evolucion-financiera':   'Evolución Financiera 2021-2026',
    'ingresos-egresos':       'Ingresos vs Egresos 2021-2026',
    'poi-comparativo':        'POI 2024-2026 (Presupuesto vs Ejecutado)',
    'presupuesto-mensual':    'Presupuesto Mensual Proyectado 2026',
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PresentationView({
    initialData,
    annualTotals,
    finanzasData,
    presupuestoMensual,
    presupuestoComparativo,
}: {
    initialData: AporteFlat[];
    annualTotals: Record<number, number>;
    finanzasData: FinanzasItem[];
    presupuestoMensual: any[];
    presupuestoComparativo: any[];
}) {
    const searchParams = useSearchParams();
    const chartId = searchParams.get('chartId') || 'evolucion-aportes';
    const title = CHART_TITLES[chartId] || '';

    // ── Datos derivados ────────────────────────────────────────────────────────
    const last5Years = Array.from(new Set(initialData.map(d => d.anio))).sort().filter(y => y >= 2021);

    const lineData = (() => {
        const map = new Map<number, number>();
        initialData.forEach(d => map.set(d.anio, (map.get(d.anio) || 0) + d.monto));
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([anio, total]) => ({
            anio: String(anio), total, pbi: PBI_DATA[anio] ?? null
        }));
    })();

    const annualTotalData = [...last5Years].reverse().map(y => ({ year: String(y), total: annualTotals[y] || 0 }));

    const pieData = (() => {
        const map = new Map<string, number>();
        initialData.filter(d => last5Years.includes(d.anio)).forEach(d => map.set(d.seccion_desc, (map.get(d.seccion_desc) || 0) + d.monto));
        return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    })();

    const activeRubros = Object.keys(COLORS_FINANZAS);
    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    const groupedFinanzas = (() => {
        const rows: any[] = [];
        years.forEach(year => {
            const scenarios = Array.from(new Set(finanzasData.filter(d => d.año === year).map(d => d.escenario || 'Real')));
            scenarios.forEach(escenario => {
                const items = finanzasData.filter(d => d.año === year && d.escenario === escenario && d.rubro !== 'Saldos en Bancos');
                if (items.length > 0) {
                    const row: any = { year: year === 2026 && escenario === 'Proyectado' ? '2026 Proyectado' : year.toString(), escenario };
                    items.forEach(i => { row[i.rubro] = i.monto; });
                    rows.push(row);
                }
            });
        });
        return rows;
    })();

    const ingresosEgresosData = (() => {
        const rows: any[] = [];
        years.forEach(year => {
            const scenarios = Array.from(new Set(finanzasData.filter(d => d.año === year).map(d => d.escenario || 'Real')));
            scenarios.forEach(escenario => {
                const items = finanzasData.filter(d => d.año === year && d.escenario === escenario);
                if (items.length > 0) {
                    let ingresos = 0, egresos = 0;
                    items.forEach(i => {
                        if (['Aportes', 'Intereses'].includes(i.rubro)) ingresos += i.monto;
                        else if (['G. Operativos', 'Proyectos', 'Becas'].includes(i.rubro)) egresos += i.monto;
                    });
                    if (ingresos > 0 || egresos > 0) {
                        rows.push({ year: year === 2026 && escenario === 'Proyectado' ? '2026 Proyectado' : year.toString(), Ingresos: ingresos, Egresos: egresos });
                    }
                }
            });
        });
        return rows;
    })();

    const mappedMensual = presupuestoMensual.map(item => ({
        ...item, mes_nombre: MESES_CORTOS[(item.mes || 1) - 1] || '?'
    }));

    // ── Renderizado del gráfico seleccionado ───────────────────────────────────
    const renderChart = () => {
        switch (chartId) {
            // ① Evolución de Aportes vs PBI
            case 'evolucion-aportes':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData} margin={{ top: 20, right: 40, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#2563eb', fontSize: 12 }} tickFormatter={fmtM1} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#dc2626', fontSize: 12 }} tickFormatter={v => `${v}%`} />
                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                formatter={(value: number, name: string) => name === 'pbi' ? [`${value}%`, 'Crecimiento PBI'] : [fmt(value), 'Aportes Totales']} />
                            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px', fontWeight: 700, fontSize: 13 }} />
                            <Line yAxisId="left" type="monotone" dataKey="total" name="Aportes Totales (S/)" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#fff' }} activeDot={{ r: 8 }} />
                            <Line yAxisId="right" type="monotone" dataKey="pbi" name="Crecimiento PBI Perú (%)" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: '#fff', stroke: '#dc2626' }} activeDot={{ r: 6 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                );

            // ② Distribución de Aportantes por Año
            case 'distribucion-aportes':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={annualTotalData} layout="vertical" margin={{ top: 10, right: 40, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="year" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 800, fontSize: 14 }} />
                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                formatter={(v: number) => [fmt(v), 'Total Aportes']} />
                            <Bar dataKey="total" name="Total Aportes" fill="#2563eb" barSize={32} radius={[0, 8, 8, 0]} animationDuration={1000} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            // ③ Distribución por Sector
            case 'distribucion-sector':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pieData} layout="vertical" margin={{ top: 10, right: 40, left: 160, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                                tick={{ fill: '#64748b', fontWeight: 600, fontSize: 11 }} width={180}
                                tickFormatter={(v) => v.length > 25 ? `${v.substring(0, 25)}...` : v} />
                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }}
                                formatter={(v: number) => [fmt(v), 'Monto']} />
                            <Bar dataKey="value" name="Monto" fill="#2563eb" radius={[0, 8, 8, 0]} barSize={24} animationDuration={1000} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            // ④ Evolución Financiera
            case 'evolucion-financiera':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupedFinanzas} margin={{ top: 20, right: 20, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 800, fontSize: 13 }} dy={15} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={fmtM} />
                            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                            {activeRubros.map(rubro => (
                                <Bar key={rubro} dataKey={rubro} fill={COLORS_FINANZAS[rubro]} radius={[4, 4, 0, 0]} barSize={20} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            // ⑤ Ingresos vs Egresos
            case 'ingresos-egresos':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ingresosEgresosData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 800, fontSize: 13 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13 }} tickFormatter={fmtM} />
                            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                            <Bar dataKey="Ingresos" name="Ingresos (Aportes + Intereses)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                            <Bar dataKey="Egresos" name="Egresos (G. Operativos + Proyectos + Becas)" fill="#f97316" radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            // ⑥ POI Comparativo
            case 'poi-comparativo':
                return presupuestoComparativo.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 font-bold text-lg">Sin datos disponibles</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={presupuestoComparativo} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="año" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 800, fontSize: 13 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13 }} tickFormatter={fmtM} />
                            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                            <Bar dataKey="poi" name="Presupuesto" fill="#dc2626" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="ejecutado" name="Ejecutado" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            // ⑦ Presupuesto Mensual
            case 'presupuesto-mensual':
                return mappedMensual.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 font-bold text-lg">Sin datos disponibles</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mappedMensual} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="mes_nombre" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 800, fontSize: 13 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13 }} tickFormatter={fmtM} />
                            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} iconType="circle" />
                            <Bar dataKey="presupuesto" name="Presupuesto" fill="#dc2626" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="ejecutado" name="Ejecutado" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            default:
                return (
                    <div className="flex items-center justify-center h-full text-slate-400 font-bold text-lg">
                        Gráfico no encontrado: &quot;{chartId}&quot;
                    </div>
                );
        }
    };

    return (
        /* Fondo blanco puro, sin padding, 100vw × 100vh */
        <div
            style={{
                width: '100vw',
                height: '100vh',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                padding: '32px 40px 24px',
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}
        >
            {/* Título del gráfico */}
            {title && (
                <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px', fontFamily: 'system-ui, sans-serif' }}>
                    {title}
                </h2>
            )}

            {/* Área del gráfico — ocupa el resto del viewport */}
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                {renderChart()}
            </div>

            {/* Firma discreta */}
            <p style={{ margin: '10px 0 0', fontSize: '10px', color: '#cbd5e1', textAlign: 'right', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.05em' }}>
                FONDOEMPLEO · {new Date().getFullYear()}
            </p>
        </div>
    );
}
