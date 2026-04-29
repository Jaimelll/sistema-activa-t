'use client';

import { useState, useEffect } from 'react';
import { getMisPlanesSupervision } from './actions';
import { ClipboardList, Calendar, CheckCircle2, Clock, ChevronRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function BandejaMonitoresView() {
    const [planes, setPlanes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getMisPlanesSupervision();
                setPlanes(data);
            } catch (err) {
                console.error('Error cargando planes:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto ml-72">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                        <LayoutDashboard className="text-blue-600" size={32} />
                        Mis Supervisiones Pendientes
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Selecciona un plan de la lista para iniciar el registro de campo.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Asignados:</span>
                    <span className="ml-2 text-blue-600 font-black text-xl">{planes.length}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {planes.map((plan) => (
                        <div key={plan.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                            {/* Card Header */}
                            <div className="p-6 border-b border-slate-50 bg-slate-50/50 group-hover:bg-blue-50/50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                        <ClipboardList className="text-blue-600" size={24} />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                        plan.estado === 'completado' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {plan.estado === 'completado' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                        {plan.estado}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 leading-tight line-clamp-2">
                                    {plan.proyecto?.nombre || 'Proyecto sin nombre'}
                                </h3>
                                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                    <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-600">ID: {plan.proyecto?.id}</span>
                                    <span>{plan.proyecto?.codigo_proyecto}</span>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex-1">
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

                                <Link 
                                    href={`/dashboard/campo?id=${plan.id}`}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        plan.estado === 'completado'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 group-hover:scale-[1.02]'
                                    }`}
                                >
                                    {plan.estado === 'completado' ? 'Supervisión Realizada' : 'Iniciar Supervisión'}
                                    <ChevronRight size={18} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
