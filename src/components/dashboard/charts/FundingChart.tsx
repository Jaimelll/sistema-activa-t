"use client";
// Force Update: 2026-02-05 07:15 - Visual Refresh

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';

interface FundingChartProps {
    data: any[];
}

export function FundingChart({ data }: FundingChartProps) {
    return (
        <div className="card h-[400px] w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Financiamiento por Región</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 100, // Increased bottom margin for rotated labels
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={80}
                        dy={5} // Push labels down slightly
                    >
                        <Label value="Región" offset={-10} position="insideBottom" />
                    </XAxis>
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000000).toFixed(1)} mill`} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => [`S/ ${value.toLocaleString()}`, name === 'contrapartida' ? 'Ejecutado' : name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="fondoempleo" name="Fondoempleo" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="contrapartida" name="Ejecutado" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
