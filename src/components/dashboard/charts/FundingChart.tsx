"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';

interface FundingChartProps {
    data: any[];
}

const CustomFundingTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-200 text-xs">
                <p className="font-bold text-gray-800 mb-1">{d.name}</p>
                <p className="text-gray-500 mb-2">Proyectos: <span className="font-semibold">{d.proyectos}</span></p>
                <p className="text-blue-700 font-semibold">S/ {Number(d.fondoempleo).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-gray-500">Ejecutado: S/ {Number(d.contrapartida).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
        );
    }
    return null;
};

export function FundingChart({ data, rotateX = -45, formatY = 'millions', onBarClick }: FundingChartProps & { rotateX?: number, formatY?: 'millions' | 'currency', onBarClick?: (region: string) => void }) {
    return (
        <div className="card h-[400px] w-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Financiamiento por Región</h3>
                <span className="text-[10px] text-gray-400 font-normal italic">Haz clic en una barra para ver detalles</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    onClick={(state) => {
                        if (state && state.activeLabel) {
                            onBarClick?.(state.activeLabel);
                        }
                    }}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 100,
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        angle={rotateX}
                        textAnchor="end"
                        interval={0}
                        height={80}
                        dy={5}
                    >
                        <Label value="Región" offset={-10} position="insideBottom" />
                    </XAxis>
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatY === 'millions' ? `${(value / 1000000).toFixed(1)} mill` : `S/ ${value.toLocaleString()}`} />
                    <Tooltip content={<CustomFundingTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="fondoempleo" name="Fondoempleo" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="contrapartida" name="Ejecutado" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
