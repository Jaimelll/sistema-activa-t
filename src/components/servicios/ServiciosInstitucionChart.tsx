"use client";

import { useMemo, useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';

interface InstitucionData {
    name: string;
    beneficiaries: number;
    budget: number;
    fullLabel?: string;
}

interface ServiciosInstitucionChartProps {
    data: InstitucionData[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(value);
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-4 rounded-[1.5rem] shadow-2xl border border-slate-100 min-w-[250px] animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Detalle Institución</p>
                <p className="text-sm font-black text-slate-800 mb-2 border-b pb-1 uppercase">{data.name}</p>
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-600 flex justify-between">
                        <span className="text-slate-400">BENEFICIARIOS:</span>
                        <span className="text-slate-800">{data.beneficiaries.toLocaleString('es-PE')}</span>
                    </p>
                    <p className="text-[11px] font-bold text-slate-600 flex justify-between">
                        <span className="text-slate-400">PRESUPUESTO:</span>
                        <span className="text-blue-700">{formatCurrency(data.budget)}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function ServiciosInstitucionChart({ data }: ServiciosInstitucionChartProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 768px)');
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    const chartData = useMemo(() => {
        return data.map(item => {
            const average = item.beneficiaries > 0 ? item.budget / item.beneficiaries : 0;
            const formattedAverage = new Intl.NumberFormat('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(average);

            return {
                ...item,
                fullLabel: `${item.beneficiaries.toLocaleString('es-PE')} - Prom. S/ ${formattedAverage}`,
                shortLabel: `${item.beneficiaries.toLocaleString('es-PE')}`,
            };
        });
    }, [data]);

    const yAxisWidth = isMobile ? 110 : 180;
    const rightMargin = isMobile ? 90 : 250;
    const leftMargin = isMobile ? 8 : 40;
    const tickFontSize = isMobile ? 9 : 11;
    const labelFontSize = isMobile ? 9 : 11;
    const barSize = isMobile ? 16 : 24;
    const tickTruncate = isMobile ? 14 : 25;

    return (
        <div className="bg-white p-4 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
            <div className="mb-6 md:mb-8 text-center relative">
                <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight uppercase italic">
                    Distribución por Instituto
                </h3>
            </div>

            <div className="h-[420px] md:h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: rightMargin, left: leftMargin, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#1e293b', fontWeight: '600', fontSize: tickFontSize }}
                            width={yAxisWidth}
                            tickFormatter={(val) => val.length > tickTruncate ? `${val.substring(0, tickTruncate)}...` : val}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="beneficiaries"
                            name="Beneficiarios"
                            fill="#2563eb"
                            radius={[0, 6, 6, 0]}
                            barSize={barSize}
                            animationDuration={1000}
                        >
                            <LabelList
                                dataKey={isMobile ? "shortLabel" : "fullLabel"}
                                position="right"
                                content={(props: any) => {
                                    const { x, y, width, height, value } = props;
                                    return (
                                        <text
                                            x={x + width}
                                            y={y + height / 2}
                                            dx={6}
                                            dy={4}
                                            fill="#1e293b"
                                            fontSize={labelFontSize}
                                            fontWeight={700}
                                            textAnchor="start"
                                        >
                                            {value}
                                        </text>
                                    );
                                }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
