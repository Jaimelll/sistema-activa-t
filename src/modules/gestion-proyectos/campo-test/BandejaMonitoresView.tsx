'use client';

import { useState, useEffect } from 'react';
import { getMisPlanesSupervision, eliminarPlanSupervision, cambiarEstadoSupervision } from './actions';
import { ClipboardList, Calendar, CheckCircle2, Clock, ChevronRight, LayoutDashboard, Trash2, User, Play, Pause, Eye } from 'lucide-react';
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

    // Dividir los planes dinámicamente en los tres arreglos de estado
    const enProceso = planes.filter(p => p.estado === 'en proceso');
    const pendientes = planes.filter(p => p.estado === 'pendiente');
    const ejecutadas = planes.filter(p => p.estado === 'ejecutado' || p.estado === 'completado');

    const renderCard = (plan: any) => {
        return (
            <div key={plan.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                {/* Card Header */}
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 group-hover:bg-blue-50/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                            <ClipboardList className="text-blue-600" size={24} />
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={async (e) => {
                                    e.preventDefault();
                                    if(confirm('¿Estás seguro de eliminar este registro de prueba?')) {
                                        const res = await eliminarPlanSupervision(plan.id);
                                        if(res.success) {
                                            alert('Registro eliminado correctamente');
                                            loadPlanes();
                                        } else {
                                            alert('Error al eliminar: ' + res.error);
                                        }
                                    }
                                }}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar registro"
                            >
                                <Trash2 size={18} />
                            </button>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                (plan.estado === 'completado' || plan.estado === 'ejecutado')
                                ? 'bg-green-100 text-green-700' 
                                : plan.estado === 'en proceso'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                                {(plan.estado === 'completado' || plan.estado === 'ejecutado') ? <CheckCircle2 size={12} /> : plan.estado === 'en proceso' ? <Play size={12} /> : <Clock size={12} />}
                                {plan.estado}
                            </span>
                        </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 leading-tight line-clamp-2">
                        {plan.proyecto?.nombre || 'Proyecto sin nombre'}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                        <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-600">ID: {plan.proyecto?.id}</span>
                        <span>{plan.proyecto?.codigo_proyecto}</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <User size={14} className="text-slate-400" />
                        <span>Monitor: <span className="font-bold text-slate-600">{plan.monitor}</span></span>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="flex items-center gap-3 text-slate-600 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha Programada</p>
                            <p className="font-bold text-slate-700">{new Date(plan.fecha_programada).toLocaleDateString('es-ES', { 
                                day: '2-digit', month: 'long', year: 'numeric' 
                            })}</p>
                        </div>
                    </div>

                    {/* Lógica de botones Play / Pausa / Ver detalles según el estado */}
                    {plan.estado === 'pendiente' && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button 
                                onClick={() => handleStateChange(plan.id, 'en proceso')}
                                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02]"
                            >
                                <Play size={14} />
                                Activar (En Proceso)
                            </button>
                            <Link 
                                href={`/dashboard/campo?id=${plan.id}`}
                                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-center hover:scale-[1.02]"
                            >
                                Llenar Formulario
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    )}

                    {plan.estado === 'en proceso' && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button 
                                onClick={() => handleStateChange(plan.id, 'pendiente')}
                                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-100 hover:scale-[1.02]"
                            >
                                <Pause size={14} />
                                Pausar
                            </button>
                            <Link 
                                href={`/dashboard/campo?id=${plan.id}`}
                                className="flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 text-center hover:scale-[1.02]"
                            >
                                Continuar Formulario
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    )}

                    {(plan.estado === 'ejecutado' || plan.estado === 'completado') && (
                        <Link 
                            href={`/dashboard/campo?id=${plan.id}&readOnly=true`}
                            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-center hover:scale-[1.02]"
                        >
                            <Eye size={16} />
                            Ver Detalles
                        </Link>
                    )}
                </div>
            </div>
        );
    };

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
                <div className="space-y-12">
                    {/* SECTION 1: EN PROCESO */}
                    {enProceso.length > 0 && (
                        <div>
                            <h2 className="text-xl font-black text-blue-600 mb-6 flex items-center gap-2 uppercase tracking-wide">
                                <span className="w-2.5 h-6 bg-blue-600 rounded-full"></span>
                                En Proceso ({enProceso.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {enProceso.map((plan) => renderCard(plan))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: PENDIENTES */}
                    {pendientes.length > 0 && (
                        <div>
                            <h2 className="text-xl font-black text-amber-600 mb-6 flex items-center gap-2 uppercase tracking-wide">
                                <span className="w-2.5 h-6 bg-amber-500 rounded-full"></span>
                                Pendientes ({pendientes.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {pendientes.map((plan) => renderCard(plan))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: EJECUTADAS */}
                    {ejecutadas.length > 0 && (
                        <div>
                            <h2 className="text-xl font-black text-green-600 mb-6 flex items-center gap-2 uppercase tracking-wide">
                                <span className="w-2.5 h-6 bg-green-600 rounded-full"></span>
                                Ejecutadas ({ejecutadas.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {ejecutadas.map((plan) => renderCard(plan))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
