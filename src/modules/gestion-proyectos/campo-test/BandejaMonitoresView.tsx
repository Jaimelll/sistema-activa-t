'use client';

import { useState, useEffect } from 'react';
import { getMisPlanesSupervision, cambiarEstadoSupervision } from './actions';
import { ClipboardList, Calendar, CheckCircle2, Clock, ChevronRight, LayoutDashboard, User, Play, Pause, Eye } from 'lucide-react';
import Link from 'next/link';

export default function BandejaMonitoresView() {
    const [planes, setPlanes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPlanes = async () => {
        try {
            const data = await getMisPlanesSupervision();
            setPlanes(data);
        } catch (err) {
            console.error('Error cargando planes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlanes();
    }, []);

    const handleStateChange = async (id: number | string, nuevoEstado: string) => {
        try {
            await cambiarEstadoSupervision(id, nuevoEstado);
            // Actualizar estado local de forma reactiva e inmediata
            setPlanes(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
        } catch (err: any) {
            alert('Error al cambiar el estado: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const statePriority: Record<string, number> = {
        'en proceso': 1,
        'pendiente': 2,
        'ejecutado': 3,
        'completado': 3
    };

    const sortedPlanes = [...planes].sort((a, b) => {
        const priorityA = statePriority[a.estado] || 99;
        const priorityB = statePriority[b.estado] || 99;
        
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // Orden secundario: fecha (más reciente a más antiguo)
        return new Date(b.fecha_programada).getTime() - new Date(a.fecha_programada).getTime();
    });

    return (
        <div className="p-8 max-w-7xl mx-auto ml-72">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                        <LayoutDashboard className="text-blue-600" size={32} />
                        Planes de Monitoreo
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Control y ejecución de los planes de monitoreo.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Asignados:</span>
                        <span className="ml-2 text-blue-600 font-black text-xl">{planes.length}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                        Última sincronización: {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </header>

            {planes.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ClipboardList className="text-slate-300" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">No tienes supervisiones asignadas</h3>
                    <p className="text-slate-500 mt-2">Cuando se te asigne un nuevo plan, aparecerá en esta bandeja.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                    <th className="py-3 px-2 whitespace-nowrap">PROYECTO</th>
                                    <th className="py-3 px-2 whitespace-nowrap">REGIÓN</th>
                                    <th className="py-3 px-2 whitespace-nowrap">PROVINCIA</th>
                                    <th className="py-3 px-2 whitespace-nowrap">MONITOR</th>
                                    <th className="py-3 px-2 whitespace-nowrap">FECHA</th>
                                    <th className="py-3 px-2 whitespace-nowrap">ESTADO</th>
                                    <th className="py-3 px-2 text-center whitespace-nowrap">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedPlanes.map(plan => (
                                    <tr key={plan.id} className="hover:bg-slate-50 transition-colors text-xs text-slate-700">
                                        <td className="py-3 px-2 align-top max-w-[350px] whitespace-normal break-words">
                                            <span className="font-bold text-slate-800">[{plan.proyecto?.id || '?'}]</span> {plan.proyecto?.nombre || 'S/N'}
                                        </td>
                                        <td className="py-3 px-2 align-top whitespace-nowrap font-medium text-slate-600 uppercase">
                                            {plan.proyecto?.regiones?.descripcion || 'No definida'}
                                        </td>
                                        <td className="py-3 px-2 align-top whitespace-nowrap font-medium text-slate-600 uppercase">
                                            {plan.proyecto?.provincia || 'No definida'}
                                        </td>
                                        <td className="py-3 px-2 align-top whitespace-nowrap">
                                            {plan.monitor || 'No asignado'}
                                        </td>
                                        <td className="py-3 px-2 align-top whitespace-nowrap">
                                            {new Date(plan.fecha_programada).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                        </td>
                                        <td className="py-3 px-2 align-top whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                plan.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 
                                                plan.estado === 'en proceso' ? 'bg-blue-100 text-blue-700' : 
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {plan.estado}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 align-top whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {plan.estado === 'pendiente' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStateChange(plan.id, 'en proceso')}
                                                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-600 hover:text-white font-bold transition-colors text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1"
                                                        >
                                                            <Play size={10} /> Activar
                                                        </button>
                                                        <Link 
                                                            href={`/dashboard/campo?id=${plan.id}`}
                                                            className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200 hover:bg-slate-200 font-bold transition-colors text-[10px] uppercase tracking-wider flex items-center gap-1"
                                                        >
                                                            Llenar Formulario <ChevronRight size={10} />
                                                        </Link>
                                                    </>
                                                )}
                                                {plan.estado === 'en proceso' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStateChange(plan.id, 'pendiente')}
                                                            className="px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-500 hover:text-white font-bold transition-colors text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1"
                                                        >
                                                            <Pause size={10} /> Pausar
                                                        </button>
                                                        <Link 
                                                            href={`/dashboard/campo?id=${plan.id}`}
                                                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-600 hover:text-white font-bold transition-colors text-[10px] uppercase tracking-wider flex items-center gap-1"
                                                        >
                                                            Continuar Formulario <ChevronRight size={10} />
                                                        </Link>
                                                    </>
                                                )}
                                                {(plan.estado === 'ejecutado' || plan.estado === 'completado') && (
                                                    <Link 
                                                        href={`/dashboard/campo?id=${plan.id}&readOnly=true`}
                                                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 hover:bg-slate-200 font-bold transition-colors text-[10px] uppercase tracking-wider flex items-center gap-1"
                                                    >
                                                        <Eye size={12} /> Ver Detalles
                                                    </Link>
                                                )}
                                                
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
