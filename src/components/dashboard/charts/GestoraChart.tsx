"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

interface GestoraChartProps {
    data: {
        name: string;
        value: number;
        count: number;
    }[];
}

export function GestoraChart({ data }: GestoraChartProps) {

    // Basic responsiveness check
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="card h-[600px] w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Instituciones Gestoras (Actualizado)</h3>
            <div className="h-[90%] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{
                            top: 5,
                            right: 50,
                            left: isMobile ? 120 : 10,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis
                            type="number"
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#6b7280"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            width={280} // Increased width for long names
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`S/ ${value.toLocaleString()}`, 'Montos de proyectos']}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar
                            dataKey="value"
                            name="Montos de proyectos"
                            fill="#2563eb"
                            radius={[0, 4, 4, 0]} // Rounded right corners
                            barSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
