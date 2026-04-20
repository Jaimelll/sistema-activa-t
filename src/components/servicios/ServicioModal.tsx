"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Plus, History, Edit2, Trash2 } from "lucide-react";
import { 
    addAvanceServicio, 
    updateAvanceServicio, 
    deleteAvanceServicio 
} from "@/app/dashboard/gestion-servicios/actions";

interface ServicioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    servicio?: any;
    options: {
        lineas: any[];
        ejes: any[];
        etapas: any[];
        modalidades: any[];
        instituciones: any[];
        condiciones: any[];
        grupos: any[];
    };
    isReadOnly?: boolean;
}

export default function ServicioModal({ isOpen, onClose, onSave, servicio, options, isReadOnly = false }: ServicioModalProps) {
    const [formData, setFormData] = useState<any>({
        nombre: "",
        documento: "",
        periodo: new Date().getFullYear(),
        modalidad_id: "",
        institucion_id: "",
        eje_id: "",
        linea_id: "",
        etapa_id: "",
        condicion_id: "",
        grupo_id: "",
        presupuesto: 0,
        avance: 0,
        beneficiarios: 0
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAvances, setShowAvances] = useState(false);
    const [editingAvance, setEditingAvance] = useState<any>(null);
    const [newAvance, setNewAvance] = useState({
        etapa_id: "",
        fecha: new Date().toISOString().split('T')[0],
        sustento: ""
    });

    useEffect(() => {
        if (servicio) {
            setFormData({
                nombre: servicio.nombre || "",
                documento: servicio.documento || "",
                periodo: servicio.periodo || new Date().getFullYear(),
                modalidad_id: servicio.modalidad_id || "",
                institucion_id: servicio.institucion_id || "",
                eje_id: servicio.eje_id || "",
                linea_id: servicio.linea_id || "",
                etapa_id: servicio.etapa_id || "",
                condicion_id: servicio.condicion_id || "",
                grupo_id: servicio.grupo_id || "",
                presupuesto: servicio.presupuesto || 0,
                avance: servicio.avance || 0,
                beneficiarios: servicio.beneficiarios || 0
            });
            setShowAvances(false);
            setEditingAvance(null);
        } else {
            setFormData({
                nombre: "",
                documento: "",
                periodo: new Date().getFullYear(),
                modalidad_id: "",
                institucion_id: "",
                eje_id: "",
                linea_id: "",
                etapa_id: "",
                condicion_id: "",
                grupo_id: "",
                presupuesto: 0,
                avance: 0,
                beneficiarios: 0
            });
            setEditingAvance(null);
        }
    }, [servicio, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : (value === "" ? null : value)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const cleanedData = { ...formData };
            const fkFields = ['eje_id', 'linea_id', 'etapa_id', 'institucion_id', 'modalidad_id', 'condicion_id', 'grupo_id'];
            fkFields.forEach(field => {
                if (cleanedData[field] === "") cleanedData[field] = null;
            });

            await onSave(cleanedData);
            onClose();
        } catch (error) {
            console.error("Error saving service:", error);
            alert("Error al guardar el servicio.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddAvance = async () => {
        if (!servicio) return;
        if (!newAvance.etapa_id) {
            alert("Seleccione una etapa para el avance");
            return;
        }
        try {
            setIsSubmitting(true);
            await addAvanceServicio(servicio.id, {
                ...newAvance,
                etapa_id: Number(newAvance.etapa_id)
            });
            alert("Avance registrado correctamente");
            setNewAvance({
                etapa_id: "",
                fecha: new Date().toISOString().split('T')[0],
                sustento: ""
            });
            onClose(); 
        } catch (error) {
            console.error("Error adding avance:", error);
            alert("Error al registrar avance");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateAvance = async () => {
        if (!editingAvance) return;
        try {
            setIsSubmitting(true);
            await updateAvanceServicio(editingAvance.id, {
                etapa_id: Number(editingAvance.etapa_id),
                fecha: editingAvance.fecha,
                sustento: editingAvance.sustento
            });
            alert("Avance actualizado correctamente");
            setEditingAvance(null);
            onClose(); 
        } catch (error) {
            console.error("Error updating avance:", error);
            alert("Error al actualizar avance");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAvance = async (avanceId: any) => {
        if (!window.confirm("¿Está seguro de eliminar este avance? El avance total se recalculará.")) return;
        try {
            setIsSubmitting(true);
            await deleteAvanceServicio(avanceId, servicio.id);
            alert("Avance eliminado correctamente");
            onClose(); 
        } catch (error) {
            console.error("Error deleting avance:", error);
            alert("Error al eliminar avance");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white">
                            <Save className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                            {isReadOnly ? 'Detalles del Servicio' : (servicio ? 'Editar Gestión de Servicio' : 'Añadir Nuevo Servicio')}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                {servicio && (
                    <div className="flex border-b border-gray-100 bg-gray-50/50">
                        <button 
                            onClick={() => setShowAvances(false)}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all ${!showAvances ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Save className="w-4 h-4" />
                            Datos Generales
                        </button>
                        <button 
                            onClick={() => setShowAvances(true)}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all ${showAvances ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Plus className="w-4 h-4" />
                            Gestión de Avances
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!showAvances ? (
                        <form id="servicio-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nombre del Servicio</label>
                                    <input
                                        required
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Nombre completo de la beca o servicio"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Documento / Código</label>
                                    <input
                                        required
                                        name="documento"
                                        value={formData.documento}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Ej: FE-2024-001"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Periodo</label>
                                    <input
                                        type="number"
                                        name="periodo"
                                        value={formData.periodo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Institución</label>
                                    <select
                                        name="institucion_id"
                                        value={formData.institucion_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Institución</option>
                                        {options.instituciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Eje</label>
                                    <select
                                        name="eje_id"
                                        value={formData.eje_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Eje</option>
                                        {options.ejes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Línea</label>
                                    <select
                                        name="linea_id"
                                        value={formData.linea_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Línea</option>
                                        {options.lineas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Modalidad</label>
                                    <select
                                        name="modalidad_id"
                                        value={formData.modalidad_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Modalidad</option>
                                        {options.modalidades.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Condición</label>
                                    <select
                                        name="condicion_id"
                                        value={formData.condicion_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Condición</option>
                                        {options.condiciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Grupo de Interés</label>
                                    <select
                                        name="grupo_id"
                                        value={formData.grupo_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Grupo</option>
                                        {options.grupos.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Etapa Actual</label>
                                    <select
                                        name="etapa_id"
                                        value={formData.etapa_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Etapa</option>
                                        {options.etapas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presupuesto (S/)</label>
                                    <input
                                        type="number"
                                        name="presupuesto"
                                        step="0.01"
                                        value={formData.presupuesto}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avance Total (S/)</label>
                                    <input
                                        type="number"
                                        name="avance"
                                        step="0.01"
                                        value={formData.avance}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly || !!servicio} 
                                    />
                                    {servicio && <p className="text-[9px] text-blue-500 font-bold px-1 uppercase mt-1">Se actualiza vía Gestión de Avances</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Beneficiarios</label>
                                    <input
                                        type="number"
                                        name="beneficiarios"
                                        value={formData.beneficiarios}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {/* Registro de Nuevo Avance */}
                            {!isReadOnly && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <History className="w-4 h-4 text-blue-600" />
                                        Registrar Nuevo Avance / Cambio de Etapa
                                    </h4>
                                    
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nueva Etapa</label>
                                                <select
                                                    value={newAvance.etapa_id}
                                                    onChange={(e) => setNewAvance({...newAvance, etapa_id: e.target.value})}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                                                >
                                                    <option value="">Seleccione Etapa</option>
                                                    {options.etapas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Fecha</label>
                                                <input
                                                    type="date"
                                                    value={newAvance.fecha}
                                                    onChange={(e) => setNewAvance({...newAvance, fecha: e.target.value})}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Descripción / Observación</label>
                                                <input
                                                    value={newAvance.sustento}
                                                    onChange={(e) => setNewAvance({...newAvance, sustento: e.target.value})}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                                                    placeholder="Ej: Informe mensual aprobado"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAddAvance}
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                                        >
                                            {isSubmitting ? 'Procesando...' : (
                                                <>
                                                    <Plus className="w-4 h-4" />
                                                    Registrar Avance
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Historial */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Historial de Avances</label>
                                <div className="space-y-2">
                                    {servicio?.avances && servicio.avances.length > 0 ? (
                                        [...servicio.avances].sort((a, b) => (new Date(b.fecha) as any) - (new Date(a.fecha) as any)).map((av: any, idx: number) => (
                                            <div key={av.id || idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                                                <div className="flex flex-col flex-1">
                                                    <span className="text-[10px] font-black text-blue-600">
                                                        {(() => {
                                                            if (!av.fecha) return '-';
                                                            const parts = av.fecha.split('T')[0].split('-');
                                                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                                        })()}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-800">{options.etapas.find(o => Number(o.value) === Number(av.etapa_id))?.label || `Etapa ${av.etapa_id}`}</span>
                                                    <p className="text-[9px] text-gray-400 italic mt-0.5">{av.sustento || '-'}</p>
                                                </div>
                                                {!isReadOnly && (
                                                    <div className="flex items-center gap-1 border-l pl-3 border-gray-100">
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setEditingAvance(av); }}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar Avance"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); handleDeleteAvance(av.id); }}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar Avance"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">No hay avances registrados aún.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal de Edición de Avance */}
                {editingAvance && (
                   <div className="absolute inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
                       <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                           <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                               <h4 className="text-sm font-black text-gray-900 uppercase italic">Editar Avance</h4>
                               <button onClick={() => setEditingAvance(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
                           </div>
                           <div className="p-5 space-y-4">
                               <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-400 uppercase">Etapa</label>
                                   <select
                                       value={editingAvance.etapa_id}
                                       onChange={(e) => setEditingAvance({...editingAvance, etapa_id: e.target.value})}
                                       className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                                   >
                                       <option value="">Seleccione Etapa</option>
                                       {options.etapas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                   </select>
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-400 uppercase">Fecha</label>
                                   <input
                                       type="date"
                                       value={editingAvance.fecha}
                                       onChange={(e) => setEditingAvance({...editingAvance, fecha: e.target.value})}
                                       className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                                   />
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-gray-400 uppercase">Descripción / Observación</label>
                                   <textarea
                                       value={editingAvance.sustento || ""}
                                       onChange={(e) => setEditingAvance({...editingAvance, sustento: e.target.value})}
                                       className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none h-20 resize-none"
                                       placeholder="Ej: Informe mensual aprobado"
                                   />
                               </div>
                           </div>
                           <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                               <button onClick={() => setEditingAvance(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-xl">Cancelar</button>
                               <button
                                   onClick={handleUpdateAvance}
                                   disabled={isSubmitting}
                                   className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                               >
                                   {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                               </button>
                           </div>
                       </div>
                   </div>
                )}

                {/* Footer General */}
                {!showAvances && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            {isReadOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!isReadOnly && (
                            <button
                                type="submit"
                                form="servicio-form"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors text-sm font-bold shadow-lg shadow-blue-500/20"
                            >
                                {isSubmitting ? 'Guardando...' : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar {servicio ? 'Cambios' : 'Servicio'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
