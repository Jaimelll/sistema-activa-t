"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/ ${value / 1000}k`} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`S/ ${value.toLocaleString()}`, 'Monto']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="fondoempleo" name="Fondoempleo" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="contrapartida" name="Contrapartida" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
