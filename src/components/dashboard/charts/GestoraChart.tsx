"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

interface GestoraChartProps {
    data: {
        name: string;
        value: number;
        count: number;
    }[];
}

export function GestoraChart({ data }: GestoraChartProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [paymentData, setPaymentData] = useState<Record<string, { total: number; cobrado: number }>>({});
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Fetch payment data from public.pagos_gestoras
        const fetchPayments = async () => {
            const { data: dbData, error } = await supabase
                .from('pagos_gestoras')
                .select('gestora, monto, mes_pago');

            if (error) {
                console.error('Error fetching pagos_gestoras:', error);
                return;
            }

            // Aggregate by gestora
            const aggregated: Record<string, { total: number; cobrado: number }> = {};
            const today = new Date();

            dbData?.forEach((row: any) => {
                const name = row.gestora?.trim() || 'Unknown';
                if (!aggregated[name]) aggregated[name] = { total: 0, cobrado: 0 };

                const monto = Number(row.monto) || 0;
                aggregated[name].total += monto;

                if (row.mes_pago && new Date(row.mes_pago) <= today) {
                    aggregated[name].cobrado += monto;
                }
            });

            setPaymentData(aggregated);
        };

        fetchPayments();

        return () => window.removeEventListener('resize', checkMobile);
    }, [supabase]);

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
                            right: 30,
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
                            width={isMobile ? 120 : 280}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 1000, maxWidth: '280px', whiteSpace: 'normal' }}
                            formatter={(value: number, name: string, props: any) => {
                                const fullLabel = props.payload.name || '';
                                const baseLabel = `S/ ${value.toLocaleString()}`;

                                // Try to match gestora name in paymentData
                                // The label usually has "NAME (count)", so we look for keys that are part of the label
                                const matchedKey = Object.keys(paymentData).find(k =>
                                    fullLabel.toUpperCase().includes(k.toUpperCase())
                                );

                                if (matchedKey) {
                                    const p = paymentData[matchedKey];
                                    return [
                                        <div key="details" className="flex flex-col gap-1">
                                            <div className="font-bold border-b pb-1 mb-1">{baseLabel} (Proyectos)</div>
                                            <div className="text-xs text-blue-600">Costo Total Gestora: S/ {p.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                                            <div className="text-xs text-emerald-600">Cobrado Gestora: S/ {p.cobrado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
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
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
