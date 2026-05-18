"use client";

import { useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';

export interface DemografiaData {
    name: string;
    value: number;
}

interface ServiciosDemografiaChartsProps {
    sexoData: DemografiaData[];
    edadesData: DemografiaData[];
}

const COLORS_SEXO: Record<string, string> = {
    'Masculino': '#3b82f6',
    'Femenino': '#ec4899',
    'No Especificado': '#94a3b8'
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-4 rounded-[1.5rem] shadow-2xl border border-slate-100 min-w-[200px] animate-in fade-in zoom-in duration-200 z-50 relative">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Distribución</p>
                <p className="text-sm font-black text-slate-800 mb-2 border-b pb-1 uppercase">{data.name}</p>
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-600 flex justify-between gap-4">
                        <span className="text-slate-400">BECARIOS:</span>
                        <span className="text-slate-800">{data.value.toLocaleString('es-PE')}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function ServiciosDemografiaCharts({ sexoData, edadesData }: ServiciosDemografiaChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Gráfico de Sexo */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full flex flex-col h-[450px]">
                <div className="mb-4 text-center relative">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">
                        Distribución por Sexo
                    </h3>
                </div>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sexoData}
                                cx="50%"
                                cy="45%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {sexoData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_SEXO[entry.name] || '#cbd5e1'} stroke="none" />
                                ))}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle"
                                formatter={(value) => <span className="text-[11px] font-bold text-slate-700 uppercase">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráfico de Edades */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full flex flex-col h-[450px]">
                <div className="mb-4 text-center relative">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">
                        Distribución por Edades
                    </h3>
                </div>
                <div className="flex-1 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={edadesData}
                            margin={{ top: 30, right: 20, left: 0, bottom: 10 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 11 }}
                                dy={10}
                            />
                            <YAxis 
                                hide 
                            />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar 
                                dataKey="value" 
                                fill="#2563eb" 
                                radius={[6, 6, 0, 0]} 
                                barSize={40}
                                animationDuration={1000}
                            >
                                <LabelList 
                                    dataKey="value" 
                                    position="top" 
                                    content={(props: any) => {
                                        const { x, y, width, value } = props;
                                        if (!value) return null;
                                        return (
                                            <text 
                                                x={x + width / 2} 
                                                y={y - 10} 
                                                fill="#1e293b" 
                                                fontSize={11} 
                                                fontWeight={800}
                                                textAnchor="middle"
                                            >
                                                {value.toLocaleString('es-PE')}
                                            </text>
                                        );
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
