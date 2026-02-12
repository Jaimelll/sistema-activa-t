"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusChartProps {
    data: any[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export function StatusChart({ data, title = "Proyectos por Estado", legendStyle = {}, tooltipFormat = 'number' }: StatusChartProps & { title?: string, legendStyle?: any, tooltipFormat?: 'number' | 'currency' }) {
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
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 1000 }}
                            formatter={(value: number) =>
                                tooltipFormat === 'currency'
                                    ? `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                    : value
                            }
                        />
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
