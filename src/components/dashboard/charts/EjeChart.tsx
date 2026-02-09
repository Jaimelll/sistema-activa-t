"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EjeChartProps {
    data: any[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];


export function EjeChart({ data, title = "Proyectos por Eje", legendStyle = {}, tooltipFormat = 'number' }: EjeChartProps & { title?: string, legendStyle?: any, tooltipFormat?: 'number' | 'currency' }) {
    return (
        <div className="card h-auto min-h-[400px] w-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="flex-1 w-full relative" style={{ minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart margin={{ top: 10, bottom: 50 }}>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="40%" // Lowered slightly to center better
                            innerRadius={60} // Increased from 40
                            outerRadius={90} // Increased from 65
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
                            wrapperStyle={{ position: 'relative', marginTop: '-20px', paddingBottom: '20px', fontSize: '10px', width: '100%', lineHeight: '14px', ...legendStyle }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
