
"use client";

import { useMemo } from 'react';

export default function ProjectsTable({ data }: { data: any[] }) {
    // Simple table view
    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institución</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Región</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    No hay proyectos registrados.
                                </td>
                            </tr>
                        ) : (
                            data.map((row) => (
                                <tr key={row.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.codigo || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{row.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{row.institucion}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.region}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.estado === 'Aprobado' ? 'bg-green-100 text-green-800' :
                                                row.estado === 'Rechazado' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {row.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        S/ {row.monto_total?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
