"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus, History, Edit2, Trash2 } from "lucide-react";
import {
    addAvanceProyecto,
    updateAvanceProyecto,
    deleteAvanceProyecto
} from "@/app/dashboard/actions";

interface ProyectoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    proyecto?: any;
    isReadOnly?: boolean;
    options: {
        lineas: any[];
        ejes: any[];
        regiones: any[];
        etapas: any[];
        modalidades: any[];
        instituciones: any[];
        grupos: any[];
        especialistas: any[];
    };
}

const formatCurrency = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
};

export default function ProyectoModal({ isOpen, onClose, onSave, proyecto, isReadOnly = false, options }: ProyectoModalProps) {
    const [formData, setFormData] = useState<any>({
        nombre: "",
        codigo_proyecto: "",
        provincia: "",
        especialista_id: "",
        eje_id: "",
        linea_id: "",
        region_id: "",
        etapa_id: "",
        monto_fondoempleo: 0,
        avance: 0,
        contrapartida: 0,
        beneficiarios: 0,
        gestora: "",
        avance_tecnico: 0,
        institucion_ejecutora_id: "",
        modalidad_id: "",
        grupo_id: "",
        sustento: "",
        contacto: "",
        año: new Date().getFullYear()
    });


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAvances, setShowAvances] = useState(false);
    const [editingAvance, setEditingAvance] = useState<any>(null);
    const [newAvance, setNewAvance] = useState({
        etapa_id: "",
        fecha: new Date().toISOString().split('T')[0],
        sustento: "",
        monto: 0
    });
    const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);


    useEffect(() => {
        if (proyecto) {
            setFormData({
                nombre: proyecto.nombre || "",
                codigo_proyecto: proyecto.codigo_proyecto || proyecto.codigo || "",
                provincia: proyecto.provincia || "",
                especialista_id: proyecto.especialista_id || "",
                eje_id: proyecto.ejeId || "",
                linea_id: proyecto.lineaId || "",
                region_id: proyecto.regionId || "",
                etapa_id: proyecto.etapaId || "",
                monto_fondoempleo: proyecto.monto_fondoempleo || 0,
                avance: proyecto.avance || 0,
                contrapartida: proyecto.contrapartida || 0,
                beneficiarios: proyecto.beneficiarios || 0,
                gestora: proyecto.gestora || "",
                avance_tecnico: proyecto.avance_tecnico || 0,
                institucion_ejecutora_id: proyecto.institucionId || "",
                modalidad_id: proyecto.modalidadId || "",
                grupo_id: proyecto.grupo_id || "",
                sustento: proyecto.sustento || "",
                contacto: proyecto.contacto || "",
                año: proyecto.año || new Date().getFullYear()
            });

            setNewAvance({
                etapa_id: proyecto.etapaId || "",
                fecha: new Date().toISOString().split('T')[0],
                sustento: "",
                monto: 0
            });
            setShowAvances(false);
            setEditingAvance(null);
            setActionFeedback(null);
        } else {
            setFormData({
                nombre: "",
                codigo_proyecto: "",
                provincia: "",
                especialista_id: "",
                eje_id: "",
                linea_id: "",
                region_id: "",
                etapa_id: "",
                monto_fondoempleo: 0,
                avance: 0,
                contrapartida: 0,
                beneficiarios: 0,
                gestora: "",
                avance_tecnico: 0,
                institucion_ejecutora_id: "",
                modalidad_id: "",
                grupo_id: "",
                sustento: "",
                contacto: "",
                año: new Date().getFullYear()
            });

            setShowAvances(false);
            setEditingAvance(null);
        }

    }, [proyecto, isOpen]);

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
            const fkFields = ['eje_id', 'linea_id', 'region_id', 'etapa_id', 'institucion_ejecutora_id', 'modalidad_id', 'grupo_id', 'especialista_id'];
            fkFields.forEach(field => {
                if (cleanedData[field] === "") cleanedData[field] = null;
            });

            await onSave(cleanedData);
            onClose();
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Error al guardar el proyecto. Por favor, verifice los datos.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddAvance = async () => {
        if (!proyecto) return;
        if (!newAvance.etapa_id) {
            alert("Seleccione una etapa para el avance");
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const isProjection = newAvance.fecha > today;

        try {
            setIsSubmitting(true);
            if (!isProjection) {
                setActionFeedback({ message: "Actualizando etapa del proyecto...", type: 'info' });
            }

            await addAvanceProyecto(proyecto.id, {
                ...newAvance,
                etapa_id: Number(newAvance.etapa_id),
                monto: Number(newAvance.monto) || 0
            });

            if (isProjection) {
                setActionFeedback({ message: "Proyección registrada con éxito", type: 'success' });
            } else {
                setActionFeedback({ message: "Avance y etapa actualizados correctamente", type: 'success' });
            }

            setNewAvance({
                etapa_id: proyecto.etapaId || "",
                fecha: new Date().toISOString().split('T')[0],
                sustento: "",
                monto: 0
            });

            // Auto-refresh/close after a short delay for feedback
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            console.error("Error adding avance:", error);
            setActionFeedback({ message: "Error al registrar avance", type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateAvance = async () => {
        if (!editingAvance) return;
        try {
            setIsSubmitting(true);
            await updateAvanceProyecto(editingAvance.id, {
                etapa_id: Number(editingAvance.etapa_id),
                fecha: editingAvance.fecha,
                sustento: editingAvance.sustento,
                monto: Number(editingAvance.monto) || 0
            });
            setActionFeedback({ message: "Avance actualizado correctamente", type: 'success' });
            setEditingAvance(null);
            setTimeout(() => onClose(), 1000);
        } catch (error) {
            console.error("Error updating avance:", error);
            setActionFeedback({ message: "Error al actualizar avance", type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleDeleteAvance = async (avanceId: any) => {
        if (!window.confirm("¿Está seguro de eliminar este avance? La etapa del proyecto se recalculará.")) return;
        try {
            setIsSubmitting(true);
            await deleteAvanceProyecto(avanceId, proyecto.id);
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
                            {isReadOnly ? 'Detalles del Proyecto' : (proyecto ? 'Editar Proyecto' : 'Añadir Nuevo Proyecto')}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs for Edit Mode */}
                {proyecto && (
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
                        <form id="proyecto-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Proyecto</label>
                                    {isReadOnly ? (
                                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 whitespace-normal break-words min-h-[42px]">
                                            {formData.nombre || "-"}
                                        </div>
                                    ) : (
                                        <textarea
                                            required
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleChange}
                                            rows={3}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-sm"
                                            placeholder="Nombre completo del proyecto"
                                        />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Provincia</label>
                                    <input
                                        name="provincia"
                                        value={formData.provincia || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Ingrese provincia"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Especialista</label>
                                    <select
                                        name="especialista_id"
                                        value={formData.especialista_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Especialista</option>
                                        {options.especialistas?.map((e: any) => (
                                            <option key={e.value} value={e.value}>{e.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Código Proyecto</label>
                                    <input
                                        required
                                        name="codigo_proyecto"
                                        value={formData.codigo_proyecto}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="P-001"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Año</label>
                                    <input
                                        type="number"
                                        name="año"
                                        value={formData.año}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Región</label>
                                    <select
                                        name="region_id"
                                        value={formData.region_id || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Seleccione Región</option>
                                        {options.regiones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Institución Ejecutora</label>
                                    {isReadOnly ? (
                                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 whitespace-normal break-words min-h-[42px]">
                                            {options.instituciones.find(o => String(o.value) === String(formData.institucion_ejecutora_id))?.label || "-"}
                                        </div>
                                    ) : (
                                        <select
                                            name="institucion_ejecutora_id"
                                            value={formData.institucion_ejecutora_id || ""}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-sm"
                                        >
                                            <option value="">Seleccione Institución</option>
                                            {options.instituciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Eje</label>
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
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Línea</label>
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
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Etapa Actual</label>
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
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Modalidad</label>
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
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sustento Actual (Sincronizado)</label>
                                    <textarea
                                        name="sustento"
                                        value={formData.sustento || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none min-h-[120px] text-sm resize-none leading-relaxed"
                                        placeholder="El sustento se sincroniza automáticamente con el último avance real..."
                                        disabled={isReadOnly}
                                    />
                                    {proyecto && !isReadOnly && (
                                        <p className="text-[9px] text-gray-400 italic">Este valor se sobrescribirá al registrar un nuevo avance real.</p>
                                    )}
                                </div>


                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grupo de Interés</label>
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
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Presupuestado (S/)</label>
                                    <input
                                        type={isReadOnly ? "text" : "number"}
                                        name="monto_fondoempleo"
                                        step="0.01"
                                        value={isReadOnly ? formatCurrency(formData.monto_fondoempleo) : formData.monto_fondoempleo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contrapartida (S/)</label>
                                    <input
                                        type={isReadOnly ? "text" : "number"}
                                        name="contrapartida"
                                        step="0.01"
                                        value={isReadOnly ? formatCurrency(formData.contrapartida) : formData.contrapartida}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avance Total (S/)</label>
                                    <input
                                        type={isReadOnly ? "text" : "number"}
                                        name="avance"
                                        step="0.01"
                                        value={isReadOnly ? formatCurrency(formData.avance) : formData.avance}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Beneficiarios</label>
                                    <input
                                        type="number"
                                        name="beneficiarios"
                                        value={formData.beneficiarios}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestora</label>
                                    <input
                                        name="gestora"
                                        value={formData.gestora || ""}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        placeholder="..."
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avance Tecnico (%)</label>
                                    <input
                                        type="number"
                                        name="avance_tecnico"
                                        min={0}
                                        max={100}
                                        value={formData.avance_tecnico}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos de Contacto y Notas</label>
                                    {isReadOnly ? (
                                        <div className={`w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-base min-h-[100px] leading-relaxed ${!formData.contacto ? 'text-gray-300 italic' : 'text-gray-700 whitespace-pre-wrap'}`}>
                                            {formData.contacto || 'No registrado'}
                                        </div>
                                    ) : (
                                        <textarea
                                            name="contacto"
                                            value={formData.contacto || ""}
                                            onChange={handleChange}
                                            rows={4}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base resize-none leading-relaxed"
                                            placeholder="Información de contacto, teléfonos, correos o notas adicionales..."
                                        />
                                    )}
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {!isReadOnly && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <History className="w-4 h-4 text-blue-600" />
                                        Registrar Nuevo Avance / Cambio de Etapa
                                    </h4>

                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-400 uppercase">Nueva Etapa</label>
                                                <select
                                                    value={newAvance.etapa_id}
                                                    onChange={(e) => setNewAvance({ ...newAvance, etapa_id: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                                                >
                                                    <option value="">Seleccione Etapa</option>
                                                    {options.etapas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-400 uppercase">Fecha</label>
                                                <input
                                                    type="date"
                                                    value={newAvance.fecha}
                                                    onChange={(e) => setNewAvance({ ...newAvance, fecha: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-400 uppercase">Monto de Avance (S/.)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newAvance.monto}
                                                    onChange={(e) => setNewAvance({ ...newAvance, monto: Number(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-xs font-bold text-gray-400 uppercase">Sustento / Observación</label>
                                                <textarea
                                                    value={newAvance.sustento}
                                                    onChange={(e) => setNewAvance({ ...newAvance, sustento: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none h-20 resize-none"
                                                    placeholder="Ej: Informe trimestral entregado"
                                                />
                                            </div>
                                        </div>

                                        {actionFeedback && (
                                            <div className={`p-3 rounded-xl text-[11px] font-bold text-center animate-in fade-in slide-in-from-top-2 duration-300 ${actionFeedback.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                    actionFeedback.type === 'info' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                        'bg-red-100 text-red-700 border border-red-200'
                                                }`}>
                                                {actionFeedback.message}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleAddAvance}
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                                        >
                                            {isSubmitting ? 'Procesando...' : (
                                                <>
                                                    <Plus className="w-4 h-4" />
                                                    Registrar Cambio / Avance
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                            )}

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historial de Avances del Proyecto</label>
                                <div className="space-y-2">
                                    {proyecto.avances && proyecto.avances.length > 0 ? (
                                        [...proyecto.avances].sort((a, b) => (new Date(b.fecha) as any) - (new Date(a.fecha) as any)).map((av: any, idx: number) => (
                                            <div key={av.id || idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                                                <div className="flex flex-col flex-1">
                                                    <span className="text-sm font-black text-blue-600">
                                                        {(() => {
                                                            if (!av.fecha) return '-';
                                                            const parts = av.fecha.split('T')[0].split('-');
                                                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                                        })()}
                                                    </span>

                                                    <span className="text-base font-bold text-gray-800">
                                                        {av.etapa_nombre || options.etapas.find(o => Number(o.value) === Number(av.etapa_id))?.label || `Etapa ${av.etapa_id}`}
                                                        {av.monto > 0 && <span className="ml-2 text-blue-600 font-black">({formatCurrency(av.monto)})</span>}
                                                    </span>
                                                    <p className="text-sm text-gray-500 italic mt-1 leading-relaxed">{av.sustento || '-'}</p>

                                                </div>
                                                {!isReadOnly && (
                                                    <div className="flex items-center gap-2 border-l pl-3 border-gray-100">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setEditingAvance({
                                                                    ...av,
                                                                    fecha: av.fecha ? av.fecha.split('T')[0] : ''
                                                                });
                                                            }}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); handleDeleteAvance(av.id); }}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">No hay historial de avances registrado.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sub-modal Overlay for Editing Advance */}
                {editingAvance && (
                    <div className="absolute inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <h4 className="text-sm font-black text-gray-900 uppercase italic">Editar Avance</h4>
                                <button onClick={() => setEditingAvance(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Etapa</label>
                                    <select
                                        value={editingAvance.etapa_id}
                                        onChange={(e) => setEditingAvance({ ...editingAvance, etapa_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                                    >
                                        <option value="">Seleccione Etapa</option>
                                        {options.etapas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Fecha</label>
                                    <input
                                        type="date"
                                        value={editingAvance.fecha}
                                        onChange={(e) => setEditingAvance({ ...editingAvance, fecha: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Monto de Avance (S/.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingAvance.monto || 0}
                                        onChange={(e) => setEditingAvance({ ...editingAvance, monto: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Sustento / Observación</label>
                                    <textarea
                                        value={editingAvance.sustento || ""}
                                        onChange={(e) => setEditingAvance({ ...editingAvance, sustento: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none h-20 resize-none"
                                        placeholder="Ej: Informe trimestral entregado"
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

                {/* Footer and Save Button */}
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
                                form="proyecto-form"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors text-sm font-bold shadow-lg shadow-blue-500/20"
                            >
                                {isSubmitting ? 'Guardando...' : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar {proyecto ? 'Cambios' : 'Proyecto'}
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