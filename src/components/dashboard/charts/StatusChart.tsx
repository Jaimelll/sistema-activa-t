"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusChartProps {
    data: any[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export function StatusChart({ data, title = "Proyectos por Estado", legendStyle = {}, tooltipFormat = 'number', unitLabel = "proyectos" }: StatusChartProps & { title?: string, legendStyle?: any, tooltipFormat?: 'number' | 'currency', unitLabel?: string }) {

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const color = payload[0].color; // Get slice color

            // Currency Mode (Bottom Row)
            if (tooltipFormat === 'currency') {
                return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                        <p className="font-semibold text-gray-800 mb-1">{d.tooltipName || d.name}</p>
                        {d.count !== undefined && (
                            <p className="text-sm text-gray-600 mb-1">
                                {Number(d.count).toLocaleString('es-PE')} {unitLabel}
                            </p>
                        )}
                        <p className="text-sm font-bold" style={{ color: color }}>
                            S/ {Number(d.value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                );
            }

            // Standard/Count Mode (Top Row)
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                    <p className="font-semibold text-gray-800 mb-1">{d.tooltipName || d.name}</p>
                    <p className="text-sm text-gray-600 mb-1">
                        {Number(d.value).toLocaleString('es-PE')} {unitLabel}
                    </p>
                    {d.financing !== undefined && (
                        <p className="text-sm font-bold text-blue-700">
                            S/ {Number(d.financing).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card h-full min-h-[400px] w-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="flex-1 w-full relative" style={{ minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="45%" // Lifted slightly
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ zIndex: 1000 }} />
                        <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '0px', marginTop: '-10px', width: '100%', lineHeight: '14px', ...legendStyle }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
