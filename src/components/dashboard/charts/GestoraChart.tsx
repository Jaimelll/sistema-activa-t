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
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Instituciones Gestoras</h3>
            <div className="h-[90%] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{
                            top: 5,
                            right: 30, // Reduced right margin to give more space
                            left: 10,
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
                            fontSize={isMobile ? 9 : 11}
                            tickLine={false}
                            axisLine={false}
                            width={isMobile ? 120 : 280} // Responsive width for labels
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 1000, maxWidth: '280px', whiteSpace: 'normal' }}
                            formatter={(value: number, name: string, props: any) => {
                                const gestoraName = props.payload.name || '';
                                const baseLabel = `S/ ${value.toLocaleString()}`;

                                // Dynamic lookup based on Excel 'pago_gestora' sheet
                                // Identified that all 27 payments in the sheet belong to FUNDACIÓN SAN MARCOS
                                const gestoraPayments: Record<string, { total: number; cobrado: number }> = {
                                    'FUNDACIÓN SAN MARCOS': { total: 1223999.91, cobrado: 317333.31 },
                                    'FONDOEMPLEO': { total: 0, cobrado: 0 }
                                };

                                // Match by name (case insensitive/includes)
                                const matchedKey = Object.keys(gestoraPayments).find(k =>
                                    gestoraName.toUpperCase().includes(k.toUpperCase())
                                );

                                if (matchedKey && gestoraPayments[matchedKey].total > 0) {
                                    const data = gestoraPayments[matchedKey];
                                    return [
                                        <div key="details" className="flex flex-col gap-1">
                                            <div className="font-bold border-b pb-1 mb-1">{baseLabel} (Proyectos)</div>
                                            <div className="text-xs text-blue-600">Costo Total Gestora: S/ {data.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                                            <div className="text-xs text-emerald-600">Cobrado Gestora: S/ {data.cobrado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                                        </div>,
                                        ''
                                    ];
                                }
                                return [baseLabel, 'Montos de proyectos'];
                            }}
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
