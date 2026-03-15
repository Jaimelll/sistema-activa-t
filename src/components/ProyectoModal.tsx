
"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

interface ProyectoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    proyecto?: any;
    options: {
        lineas: any[];
        ejes: any[];
        regiones: any[];
        etapas: any[];
        modalidades: any[];
        instituciones: any[];
    };
}

export default function ProyectoModal({ isOpen, onClose, onSave, proyecto, options }: ProyectoModalProps) {
    const [formData, setFormData] = useState<any>({
        nombre: "",
        codigo_proyecto: "",
        eje_id: "",
        linea_id: "",
        region_id: "",
        etapa_id: "",
        monto_fondoempleo: 0,
        avance: 0,
        beneficiarios: 0,
        gestora: "",
        institucion_ejecutora_id: "",
        modalidad_id: "",
        año: new Date().getFullYear(),
        estado: 'Activo'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (proyecto) {
            setFormData({
                nombre: proyecto.nombre || "",
                codigo_proyecto: proyecto.codigo || "",
                eje_id: proyecto.ejeId || "",
                linea_id: proyecto.lineaId || "",
                region_id: proyecto.regionId || "",
                etapa_id: proyecto.etapaId || "",
                monto_fondoempleo: proyecto.monto_fondoempleo || 0,
                avance: proyecto.avance || 0,
                beneficiarios: proyecto.beneficiarios || 0,
                gestora: proyecto.gestora || "",
                institucion_ejecutora_id: proyecto.institucionId || "",
                modalidad_id: proyecto.modalidadId || "",
                año: proyecto.año || new Date().getFullYear(),
                estado: proyecto.estado || 'Activo'
            });
        } else {
            setFormData({
                nombre: "",
                codigo_proyecto: "",
                eje_id: "",
                linea_id: "",
                region_id: "",
                etapa_id: "",
                monto_fondoempleo: 0,
                avance: 0,
                beneficiarios: 0,
                gestora: "",
                institucion_ejecutora_id: "",
                modalidad_id: "",
                año: new Date().getFullYear(),
                estado: 'Activo'
            });
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
            // Clean empty strings to null for DB FKs
            const cleanedData = { ...formData };
            const fkFields = ['eje_id', 'linea_id', 'region_id', 'etapa_id', 'institucion_ejecutora_id', 'modalidad_id'];
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                        {proyecto ? 'Editar Proyecto' : 'Añadir Nuevo Proyecto'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form Body */}
                <form id="proyecto-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Proyecto</label>
                            <input
                                required
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                                placeholder="Ej: Fortalecimiento de capacidades..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Código Proyecto</label>
                            <input
                                required
                                name="codigo_proyecto"
                                value={formData.codigo_proyecto}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                                placeholder="P-001"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Año</label>
                            <input
                                type="number"
                                name="año"
                                value={formData.año}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Región</label>
                            <select
                                name="region_id"
                                value={formData.region_id || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-sm"
                            >
                                <option value="">Seleccione Región</option>
                                {options.regiones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Institución Ejecutora</label>
                            <select
                                name="institucion_ejecutora_id"
                                value={formData.institucion_ejecutora_id || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-sm"
                            >
                                <option value="">Seleccione Institución</option>
                                {options.instituciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Eje</label>
                            <select
                                name="eje_id"
                                value={formData.eje_id || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-sm"
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
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-sm"
                            >
                                <option value="">Seleccione Línea</option>
                                {options.lineas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Etapa</label>
                            <select
                                name="etapa_id"
                                value={formData.etapa_id || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-sm"
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
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-sm"
                            >
                                <option value="">Seleccione Modalidad</option>
                                {options.modalidades.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Presupuestado (S/)</label>
                            <input
                                type="number"
                                name="monto_fondoempleo"
                                value={formData.monto_fondoempleo}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-inner"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avance (S/)</label>
                            <input
                                type="number"
                                name="avance"
                                value={formData.avance}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-inner"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Beneficiarios</label>
                            <input
                                type="number"
                                name="beneficiarios"
                                value={formData.beneficiarios}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-inner"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestora</label>
                            <input
                                name="gestora"
                                value={formData.gestora}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-inner"
                                placeholder="..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado Texto</label>
                            <input
                                name="estado"
                                value={formData.estado}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-inner"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
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
                </div>
            </div>
        </div>
    );
}

