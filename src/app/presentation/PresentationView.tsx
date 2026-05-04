"use client";

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, LabelList
} from 'recharts';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface AporteFlat {
    id: string;
    ruc: string;
    anio: number;
    monto: number;
    razon_social: string;
    seccion_desc: string;
}

// ─── Paletas y Formateadores ──────────────────────────────────────────────────
const COLORS_FINANZAS: Record<string, string> = {
    'Aportes': '#dc2626',
    'Intereses': '#94a3b8',
    'G. Operativos': '#86efac',
    'Proyectos': '#facc15',
    'Becas': '#0ea5e9',
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

const fmt = (v: any) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
const fmtM = (v: any) => {
    const val = Number(v) || 0;
    return val === 0 ? '' : `S/ ${(val / 1000000).toFixed(0)}M`;
};
const fmtM1 = (v: any) => {
    const val = Number(v) || 0;
    return val === 0 ? '' : `S/ ${(val / 1000000).toFixed(1)}M`;
};
const fmtPBI = (v: any) => {
    const val = Number(v);
    if (v == null || isNaN(val) || val === 0) return '';
    return `${val.toFixed(1)}%`;
};

// ─── Títulos ──────────────────────────────────────────────────────────────────
const CHART_TITLES: Record<string, string> = {
    'evolucion-aportes':    'Evolución de Aportes (1998-2026) vs PBI (1998-2025)',
    'distribucion-aportes': 'Distribución de Aportantes 2024–2026',
    'distribucion-sector':  'Distribución por Sector 2024-2026',
    'evolucion-financiera': 'Evolución Financiera 2024-2026',
    'ingresos-egresos':     'Ingresos vs Egresos 2024-2026',
    'poi-comparativo':      'POI 2024-2026 (Presupuesto vs Ejecutado)',
    'presupuesto-mensual':  'Presupuesto Mensual Proyectado 2026',
};

const CHART_NOTES: Record<string, string> = {
    'evolucion-aportes':    'Aportes 2026: Información actualizada a la fecha',
    'distribucion-aportes': 'Datos 2026: Cifras preliminares al cierre de abril',
    'distribucion-sector':  'Datos 2026: Cifras preliminares al cierre de abril',
    'evolucion-financiera': 'Datos 2026: Cifras preliminares al cierre de abril',
    'ingresos-egresos':     'Datos 2026: Cifras preliminares al cierre de abril',
};

export default function PresentationView({
    initialData = [],
    annualTotals = {},
    finanzasData = [],
    presupuestoMensual = [],
    presupuestoComparativo = [],
}: {
    initialData?: AporteFlat[];
    annualTotals?: Record<number, number>;
    finanzasData?: any[];
    presupuestoMensual?: any[];
    presupuestoComparativo?: any[];
}) {
    const searchParams = useSearchParams();
    const chartId = searchParams?.get('chartId') || 'evolucion-aportes';
    const title = CHART_TITLES[chartId] || '';

    // ── Preparación de Datos ───────────────────────────────────────────────────
    const last3Years = useMemo(() =>
        Array.from(new Set(initialData.map(d => d.anio))).sort().filter(y => y >= 2024),
        [initialData]);

    const last5Years = useMemo(() =>
        Array.from(new Set(initialData.map(d => d.anio))).sort().filter(y => y >= 2021),
        [initialData]);

    const lineData = useMemo(() => {
        const map = new Map<number, number>();
        initialData.forEach(d => map.set(d.anio, (map.get(d.anio) || 0) + d.monto));
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([anio, total]) => {
            const item: Record<string, any> = { anio: String(anio), total };
            const pbiVal = PBI_DATA[anio];
            if (pbiVal !== undefined) {
                item.pbi = pbiVal;
            }
            return item;
        });
    }, [initialData]);

    const annualTotalData = useMemo(() =>
        [...last3Years].reverse().map(y => ({ year: String(y), total: annualTotals[y] || 0 })),
        [last3Years, annualTotals]);

    const sectorData = useMemo(() => {
        const map = new Map<string, number>();
        initialData.filter(d => last3Years.includes(d.anio)).forEach(d => map.set(d.seccion_desc, (map.get(d.seccion_desc) || 0) + d.monto));
        return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [initialData, last3Years]);

    const yearsFinanzas = [2024, 2025, 2026];

    const groupedFinanzas = useMemo(() => {
        const rows: any[] = [];
        yearsFinanzas.forEach(year => {
            const itemsInYear = finanzasData.filter(d => (d.año || d.anio) === year);
            const scenarios = Array.from(new Set(itemsInYear.map(d => d.escenario || 'Real')));
            scenarios.forEach(escenario => {
                if (year === 2026 && escenario === 'Proyectado') return;
                const items = itemsInYear.filter(d => d.escenario === escenario && d.rubro !== 'Saldos en Bancos');
                if (items.length > 0) {
                    const row: any = { year: year.toString(), escenario };
                    items.forEach(i => { row[i.rubro] = i.monto; });
                    rows.push(row);
                }
            });
        });
        return rows;
    }, [finanzasData]);

    const ingresosEgresosData = useMemo(() => {
        const rows: any[] = [];
        yearsFinanzas.forEach(year => {
            const itemsInYear = finanzasData.filter(d => (d.año || d.anio) === year);
            const scenarios = Array.from(new Set(itemsInYear.map(d => d.escenario || 'Real')));
            scenarios.forEach(escenario => {
                if (year === 2026 && escenario === 'Proyectado') return;
                const items = itemsInYear.filter(d => d.escenario === escenario);
                if (items.length > 0) {
                    let ingresos = 0, egresos = 0;
                    items.forEach(i => {
                        if (['Aportes', 'Intereses'].includes(i.rubro)) ingresos += i.monto;
                        else if (['G. Operativos', 'Proyectos', 'Becas'].includes(i.rubro)) egresos += i.monto;
                    });
                    if (ingresos > 0 || egresos > 0) {
                        rows.push({ year: year.toString(), Ingresos: ingresos, Egresos: egresos });
                    }
                }
            });
        });
        return rows;
    }, [finanzasData]);

    const mappedMensual = useMemo(() =>
        presupuestoMensual.map(item => ({
            ...item, mes_nombre: MESES_CORTOS[(item.mes || 1) - 1] || '?'
        })),
        [presupuestoMensual]);

    const poiFiltered = useMemo(() =>
        presupuestoComparativo.filter((d: any) => (d.año || d.anio) >= 2024),
        [presupuestoComparativo]);

    // ── Renderizado ────────────────────────────────────────────────────────────
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', padding: '60px 80px 40px', boxSizing: 'border-box', overflow: 'hidden' }}>
            {title && (
                <div style={{ margin: '0 0 8px', textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 6px', fontSize: '32px', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px', fontFamily: 'sans-serif' }}>
                        {title}
                    </h2>
                    {CHART_NOTES[chartId] && (
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#d97706', fontFamily: 'sans-serif', letterSpacing: '0.01em' }}>
                            {CHART_NOTES[chartId]}
                        </p>
                    )}
                </div>
            )}

            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                        switch (chartId) {
                            case 'evolucion-aportes':
                                return (
                                    <LineChart data={lineData} margin={{ top: 50, right: 60, left: 40, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} tickFormatter={fmtM1} width={120} domain={[0, (dataMax: number) => dataMax * 1.25]} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} tickFormatter={v => v === 0 ? '' : `${v}%`} width={100} domain={[0, (dataMax: number) => Math.max(15, dataMax * 1.25)]} />
                                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }} formatter={(value: any, name: string) => name === 'pbi' ? (value != null ? [`${value}%`, 'Crecimiento PBI'] : null) : [fmt(value), 'Aportes Totales']} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={40} wrapperStyle={{ paddingTop: '50px', fontWeight: '900', fontSize: '20px' }} />
                                        <Line yAxisId="left" type="monotone" dataKey="total" name="Aportes Totales (S/)" stroke="#2563eb" strokeWidth={6} dot={{ r: 6, fill: '#fff' }} activeDot={{ r: 12 }}>
                                            <LabelList dataKey="total" position="top" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={15} />
                                        </Line>
                                        <Line yAxisId="right" type="monotone" dataKey="pbi" name="Crecimiento PBI Perú (%)" stroke="#dc2626" strokeWidth={4} dot={{ r: 5, fill: '#fff', stroke: '#dc2626' }} activeDot={{ r: 10 }} connectNulls>
                                            <LabelList dataKey="pbi" position="top" formatter={fmtPBI} fill="#000000" fontSize={18} fontWeight="800" offset={15} />
                                        </Line>
                                    </LineChart>
                                );
                            case 'distribucion-aportes':
                                return (
                                    <BarChart data={annualTotalData} layout="vertical" margin={{ top: 20, right: 120, left: 40, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide domain={[0, (dataMax: number) => dataMax * 1.25]} />
                                        <YAxis dataKey="year" type="category" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} />
                                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }} formatter={(v: any) => [fmt(v), 'Total Aportes']} />
                                        <Bar dataKey="total" name="Total Aportes" fill="#2563eb" barSize={60} radius={[0, 8, 8, 0]}>
                                            <LabelList dataKey="total" position="right" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={20} />
                                        </Bar>
                                    </BarChart>
                                );
                            case 'distribucion-sector':
                                return (
                                    <BarChart data={sectorData} layout="vertical" margin={{ top: 20, right: 150, left: 350, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide domain={[0, (dataMax: number) => dataMax * 1.25]} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 18 }} width={340} />
                                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '24px' }} formatter={(v: any) => [fmt(v), 'Monto']} />
                                        <Bar dataKey="value" name="Monto" fill="#2563eb" radius={[0, 8, 8, 0]} barSize={40}>
                                            <LabelList dataKey="value" position="right" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={20} />
                                        </Bar>
                                    </BarChart>
                                );
                            case 'evolucion-financiera':
                                return (
                                    <BarChart data={groupedFinanzas} margin={{ top: 50, right: 50, left: 20, bottom: 60 }} categoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} dy={25} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} tickFormatter={fmtM} width={120} domain={[0, (dataMax: number) => dataMax * 1.25]} />
                                        <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={40} wrapperStyle={{ paddingTop: '60px', fontSize: '20px', fontWeight: '900' }} iconType="circle" />
                                        {Object.keys(COLORS_FINANZAS).map(rubro => (
                                            <Bar key={rubro} dataKey={rubro} fill={COLORS_FINANZAS[rubro]} radius={[4, 4, 0, 0]}>
                                                <LabelList dataKey={rubro} position="top" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={15} />
                                            </Bar>
                                        ))}
                                    </BarChart>
                                );
                            case 'ingresos-egresos':
                                return (
                                    <BarChart data={ingresosEgresosData} margin={{ top: 50, right: 80, left: 50, bottom: 60 }} categoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} tickFormatter={fmtM} width={120} domain={[0, (dataMax: number) => dataMax * 1.25]} />
                                        <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={40} wrapperStyle={{ paddingTop: '60px', fontSize: '20px', fontWeight: '900' }} iconType="circle" />
                                        <Bar dataKey="Ingresos" name="Ingresos (Aportes + Intereses)" fill="#dc2626" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Ingresos" position="top" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={15} />
                                        </Bar>
                                        <Bar dataKey="Egresos" name="Egresos (G. Operativos + Proyectos + Becas)" fill="#2563eb" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Egresos" position="top" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={15} />
                                        </Bar>
                                    </BarChart>
                                );
                            case 'poi-comparativo':
                                return (
                                    <BarChart data={poiFiltered} margin={{ top: 50, right: 80, left: 50, bottom: 60 }} categoryGap="25%">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 20 }} tickFormatter={fmtM} width={120} domain={[0, (dataMax: number) => dataMax * 1.25]} />
                                        <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={40} wrapperStyle={{ paddingTop: '60px', fontSize: '20px', fontWeight: '900' }} iconType="circle" />
                                        <Bar dataKey="poi" name="Presupuesto" fill="#dc2626" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="poi" position="top" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={15} />
                                        </Bar>
                                        <Bar dataKey="ejecutado" name="Ejecutado" fill="#2563eb" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="ejecutado" position="top" formatter={fmtM1} fill="#000000" fontSize={18} fontWeight="800" offset={15} />
                                        </Bar>
                                    </BarChart>
                                );
                            case 'presupuesto-mensual':
                                return (
                                    <BarChart data={mappedMensual} margin={{ top: 50, right: 40, left: 20, bottom: 60 }} categoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="mes_nombre" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 16 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#000000', fontWeight: '900', fontSize: 18 }} tickFormatter={fmtM} width={110} domain={[0, (dataMax: number) => dataMax * 1.25]} />
                                        <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '20px' }} />
                                        <Legend verticalAlign="bottom" align="center" iconSize={30} wrapperStyle={{ paddingTop: '50px', fontSize: '18px', fontWeight: '800' }} iconType="circle" />
                                        <Bar dataKey="presupuesto" name="Presupuesto" fill="#dc2626" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="presupuesto" position="top" formatter={fmtM1} fill="#000000" fontSize={14} fontWeight="800" offset={12} />
                                        </Bar>
                                        <Bar dataKey="ejecutado" name="Ejecutado" fill="#2563eb" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="ejecutado" position="top" formatter={fmtM1} fill="#000000" fontSize={14} fontWeight="800" offset={12} />
                                        </Bar>
                                    </BarChart>
                                );
                            default:
                                return (
                                    <div className="flex items-center justify-center h-full text-slate-400 font-bold text-lg">
                                        Gráfico no encontrado: "{chartId}"
                                    </div>
                                );
                        }
                    })()}
                </ResponsiveContainer>
            </div>

            <p style={{ margin: '10px 0 0', fontSize: '10px', color: '#cbd5e1', textAlign: 'right', fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>
                FONDOEMPLEO - {new Date().getFullYear()}
            </p>
        </div>
    );
}
