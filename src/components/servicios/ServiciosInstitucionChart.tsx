"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';

interface InstitucionData {
    name: string;
    beneficiaries: number;
    budget: number;
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
    return (
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
            <div className="mb-8 text-center relative">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
                    Distribución por Instituto
                </h3>
            </div>
            
            <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#1e293b', fontWeight: '600', fontSize: 11 }} 
                            width={180} 
                            tickFormatter={(val) => val.length > 25 ? `${val.substring(0, 25)}...` : val}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                            dataKey="beneficiaries" 
                            name="Beneficiarios" 
                            fill="#2563eb" 
                            radius={[0, 6, 6, 0]} 
                            barSize={24} 
                            animationDuration={1000}
                        >
                            <LabelList 
                                dataKey="beneficiaries" 
                                position="right" 
                                fill="#1e293b" 
                                fontSize={11} 
                                fontWeight={700}
                                formatter={(val: number) => val.toLocaleString('es-PE')}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
