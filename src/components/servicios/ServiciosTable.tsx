"use client";

import { useMemo } from 'react';
import { clsx } from 'clsx';

interface ServiciosTableProps {
    data: any[];
    loading: boolean;
}

export function ServiciosTable({ data, loading }: ServiciosTableProps) {
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => a.id - b.id);
    }, [data]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-500">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-200 text-gray-700 text-[10px] uppercase font-extrabold tracking-widest">
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4 min-w-[250px]">Nombre de Beca</th>
                            <th className="px-6 py-4">Institución</th>
                            <th className="px-6 py-4 text-right">Presupuesto</th>
                            <th className="px-6 py-4 text-right">Avance</th>
                            <th className="px-6 py-4 text-center">%</th>
                            <th className="px-6 py-4 text-center">Inicio</th>
                            <th className="px-6 py-4 text-center">Fin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={8} className="px-6 py-4 h-12 bg-gray-50/10" />
                                </tr>
                            ))
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                    No se encontraron becas para mostrar.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item, idx) => {
                                const presupuestado = Number(item.presupuesto) || 0;
                                const avance = Number(item.avance) || 0;
                                const progress = presupuestado > 0 ? (avance / presupuestado) * 100 : 0;
                                
                                return (
                                    <tr 
                                        key={item.id} 
                                        className={clsx(
                                            "hover:bg-blue-50/40 transition-colors group text-[11px]",
                                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"
                                        )}
                                    >
                                        <td className="px-6 py-3 font-extrabold text-blue-600 tabular-nums">{item.id}</td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-gray-800 line-clamp-1 group-hover:text-blue-700 transition-colors" title={item.nombre}>
                                                {item.nombre}
                                            </div>
                                            <div className="text-[9px] text-gray-400 mt-0.5 tracking-tighter uppercase font-medium">
                                                DOC: {item.documento || 'PENDIENTE'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 font-medium">
                                            {item.institucion?.descripcion || '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-blue-900 tabular-nums">
                                            S/ {presupuestado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-emerald-700 tabular-nums">
                                            S/ {avance.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full font-bold text-[9px] min-w-[40px] inline-block ring-1 ring-inset",
                                                progress >= 100 
                                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200" 
                                                    : progress > 50 
                                                    ? "bg-blue-50 text-blue-700 ring-blue-200" 
                                                    : "bg-orange-50 text-orange-700 ring-orange-200"
                                            )}>
                                                {progress.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center text-gray-500 font-bold tabular-nums">
                                            {item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-center text-gray-500 font-bold tabular-nums">
                                            {item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            {!loading && sortedData.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">
                        Total General
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">
                        {sortedData.length} BECAS LISTADAS
                    </span>
                </div>
            )}
        </div>
    );
}
