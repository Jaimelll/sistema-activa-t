"use client";

import { useMemo } from 'react';
import { clsx } from 'clsx';

interface ServiciosTableProps {
    data: any[];
    loading: boolean;
    groupStartDate?: number | null;   // timestamp del grupo (opcional)
    groupEndDate?: number | null;     // timestamp del grupo (opcional)
}

// Stage colours — kept in sync with ServiciosTimeline
const STAGE_COLORS: Record<number, string> = {
    1: '#60a5fa',
    2: '#34d399',
    3: '#fbbf24',
    4: '#a78bfa',
    5: '#f472b6',
    6: '#f43f5e',
    7: '#94a3b8',
};

export function ServiciosTable({ data, loading, groupStartDate, groupEndDate }: ServiciosTableProps) {
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => a.id - b.id);
    }, [data]);

    const fmtDate = (ts: number | null | undefined) => {
        if (!ts || isNaN(ts)) return '-';
        const d = new Date(ts);
        return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
    };

    const COLS = 9;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-500">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-200 text-gray-700 text-[9px] uppercase font-extrabold tracking-widest">
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2 min-w-[200px]">Nombre de Beca</th>
                            <th className="px-3 py-2">Institución</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2 text-right">Presupuesto</th>
                            <th className="px-3 py-2 text-right">Avance</th>
                            <th className="px-3 py-2 text-center">%</th>
                            <th className="px-3 py-2 text-center">Inicio</th>
                            <th className="px-3 py-2 text-center">Fin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={COLS} className="px-3 py-2 h-9 bg-gray-50/10" />
                                </tr>
                            ))
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={COLS} className="px-3 py-8 text-center text-gray-400 text-sm italic">
                                    No se encontraron becas para mostrar.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item, idx) => {
                                const presupuestado = Number(item.presupuesto) || 0;
                                const avance = Number(item.avance) || 0;
                                const progress = presupuestado > 0 ? (avance / presupuestado) * 100 : 0;
                                const etapaId = item.etapa_id ?? 0;
                                const etapaNombre = item.etapa?.descripcion || `Etapa ${etapaId}`;
                                const etapaColor = STAGE_COLORS[etapaId] ?? '#94a3b8';

                                // Si tenemos fecha de grupo, la usamos; si no, la individual
                                const fechaInicio = groupStartDate ? fmtDate(groupStartDate) :
                                    (item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');
                                const fechaFin = groupEndDate ? fmtDate(groupEndDate) :
                                    (item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

                                return (
                                    <tr
                                        key={item.id}
                                        className={clsx(
                                            "hover:bg-blue-50/30 transition-colors group text-[10px]",
                                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"
                                        )}
                                    >
                                        <td className="px-3 py-1.5 font-extrabold text-blue-600 tabular-nums whitespace-nowrap">
                                            {item.id}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <div
                                                className="font-bold text-gray-800 line-clamp-1 group-hover:text-blue-700 transition-colors"
                                                title={item.nombre}
                                            >
                                                {item.nombre}
                                            </div>
                                            <div className="text-[8px] text-gray-400 mt-0.5 tracking-tighter uppercase font-medium">
                                                {item.documento || 'PENDIENTE'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 font-medium whitespace-nowrap">
                                            {item.institucion?.descripcion || '-'}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span
                                                className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide text-white whitespace-nowrap"
                                                style={{ backgroundColor: etapaColor }}
                                            >
                                                {etapaNombre}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-bold text-blue-900 tabular-nums whitespace-nowrap">
                                            S/ {presupuestado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                                            S/ {avance.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={clsx(
                                                "px-1.5 py-0.5 rounded-full font-bold text-[8px] min-w-[36px] inline-block ring-1 ring-inset",
                                                progress >= 100
                                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                    : progress > 50
                                                        ? "bg-blue-50 text-blue-700 ring-blue-200"
                                                        : "bg-orange-50 text-orange-700 ring-orange-200"
                                            )}>
                                                {progress.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center text-gray-500 font-bold tabular-nums whitespace-nowrap">
                                            {fechaInicio}
                                        </td>
                                        <td className="px-3 py-1.5 text-center text-gray-500 font-bold tabular-nums whitespace-nowrap">
                                            {fechaFin}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && sortedData.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">
                        Total
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold">
                        {sortedData.length} becas listadas
                    </span>
                </div>
            )}
        </div>
    );
}