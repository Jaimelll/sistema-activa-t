"use client";

import { useState } from "react";
import { X, Save, Pencil, Trash2, CheckSquare } from "lucide-react";

interface Aporte { id: string; anio: number; monto: number; }

interface AporteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { empresa_ruc: string; anio: number; monto: number }) => Promise<void>;
    onUpdate: (id: string, data: { anio: number; monto: number }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    // Recibe el objeto con todos los aportes incrustados
    empresa: { ruc: string; razon_social: string; aportes?: Aporte[] } | null;
}

export default function AporteModal({ isOpen, onClose, onSave, onUpdate, onDelete, empresa }: AporteModalProps) {
    // Formulario para Nuevo Aporte
    const [formData, setFormData] = useState({
        anio: new Date().getFullYear(),
        monto: ""
    });
    
    // Estado para "Edicion" en linea
    const [editingAporteId, setEditingAporteId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ anio: 0, monto: "" });

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !empresa) return null;

    const handleSubNew = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await onSave({
                empresa_ruc: empresa.ruc,
                anio: Number(formData.anio),
                monto: Number(formData.monto)
            });
            setFormData({ anio: new Date().getFullYear(), monto: "" });
        } catch (error) {
            console.error(error);
            alert("Error al guardar nuevo aporte.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (a: Aporte) => {
        setEditingAporteId(a.id);
        setEditForm({ anio: a.anio, monto: a.monto.toString() });
    };

    const handleSaveEdit = async (id: string) => {
        try {
            setIsSubmitting(true);
            await onUpdate(id, {
                anio: Number(editForm.anio),
                monto: Number(editForm.monto)
            });
            setEditingAporteId(null);
        } catch (error) {
             console.error(error);
             alert("Error actualizar reporte.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDel = async (id: string) => {
        if (!window.confirm("¿Seguro que desea eliminar el registro permanentemente?")) return;
        try {
            setIsSubmitting(true);
            await onDelete(id);
        } catch (error) {
             console.error(error);
             alert("Error al eliminar.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const aportesOrdenados = empresa.aportes ? [...empresa.aportes].sort((a,b) => b.anio - a.anio) : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
                    <h3 className="text-xl font-bold text-gray-900">Historial y Registro de Aportes</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                        <p className="text-sm font-black text-blue-900 leading-tight">{empresa.razon_social}</p>
                        <p className="text-xs text-blue-700/80 font-semibold tracking-wider">RUC: {empresa.ruc}</p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Aportes Históricos</h4>
                        <div className="border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50/50">
                            {aportesOrdenados.length === 0 ? (
                                <p className="text-xs italic text-center p-6 text-gray-400">Sin historial de aportes para esta empresa.</p>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 text-gray-500">
                                        <tr>
                                            <th className="py-2.5 px-4 text-left font-bold">Año</th>
                                            <th className="py-2.5 px-4 text-right font-bold">Monto (S/)</th>
                                            <th className="py-2.5 px-4 text-center font-bold w-24">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {aportesOrdenados.map(a => (
                                            <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                                                {editingAporteId === a.id ? (
                                                    <td className="py-2 px-4">
                                                        <input type="number" value={editForm.anio} onChange={e => setEditForm({...editForm, anio: Number(e.target.value)})} className="w-20 px-2 py-1 border border-blue-300 rounded focus:outline-none" />
                                                    </td>
                                                ) : (
                                                    <td className="py-3 px-4 font-bold text-gray-700">{a.anio}</td>
                                                )}

                                                {editingAporteId === a.id ? (
                                                    <td className="py-2 px-4 text-right">
                                                         <input type="number" step="0.01" value={editForm.monto} onChange={e => setEditForm({...editForm, monto: e.target.value})} className="w-28 px-2 py-1 border border-blue-300 rounded focus:outline-none text-right" />
                                                    </td>
                                                ) : (
                                                    <td className="py-3 px-4 text-right font-black text-gray-900">
                                                        {a.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                )}

                                                <td className="py-2 px-4">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {editingAporteId === a.id ? (
                                                            <>
                                                                 <button disabled={isSubmitting} onClick={() => handleSaveEdit(a.id)} className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors" title="Guardar"><CheckSquare className="w-4 h-4" /></button>
                                                                 <button onClick={() => setEditingAporteId(null)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors" title="Cancelar"><X className="w-4 h-4" /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => startEdit(a)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDel(a.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Borrar"><Trash2 className="w-4 h-4" /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-gray-100">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Ingresar Nuevo Registro</h4>
                        <form id="nuevo-aporte-form" onSubmit={handleSubNew} className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end bg-gray-50 p-4 rounded-xl shadow-inner">
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Año</label>
                                <input
                                    required
                                    type="number"
                                    min={1998}
                                    max={2050}
                                    value={formData.anio}
                                    onChange={(e) => setFormData({...formData, anio: Number(e.target.value)})}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Monto Depositado (S/)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.monto}
                                    onChange={(e) => setFormData({...formData, monto: e.target.value})}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                                    placeholder="Ej: 50000.50"
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1 pt-2 lg:pt-0">
                                <button type="submit" disabled={isSubmitting} className="w-full h-[38px] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors text-xs font-bold shadow-md shadow-blue-500/20 uppercase tracking-wide">
                                    <Save className="w-3.5 h-3.5" /> Nuevo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
