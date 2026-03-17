"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";

interface EmpresaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { ruc: string; razon_social: string; ciiu_id: number }) => Promise<void>;
    sectores: any[];
}

export default function EmpresaModal({ isOpen, onClose, onSave, sectores }: EmpresaModalProps) {
    const [formData, setFormData] = useState({
        ruc: "",
        razon_social: "",
        ciiu_id: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await onSave({
                ruc: formData.ruc.trim(),
                razon_social: formData.razon_social.trim(),
                ciiu_id: Number(formData.ciiu_id)
            });
            onClose();
        } catch (error) {
            console.error("Error saving empresa:", error);
            alert("Error al guardar la empresa. Asegúrate de que el RUC no esté duplicado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Añadir Nueva Empresa</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form id="empresa-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">RUC</label>
                        <input
                            required
                            name="ruc"
                            value={formData.ruc}
                            onChange={handleChange}
                            pattern="[0-9]{11}"
                            maxLength={11}
                            title="El RUC debe tener 11 dígitos numéricos"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                            placeholder="Ej: 20123456789"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Razón Social</label>
                        <input
                            required
                            name="razon_social"
                            value={formData.razon_social}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                            placeholder="Ej: Empresa S.A.C."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sector Económico (CIIU)</label>
                        <select
                            required
                            name="ciiu_id"
                            value={formData.ciiu_id}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none shadow-sm"
                        >
                            <option value="">Seleccione Sector</option>
                            {sectores.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.ciiu_codigo} - {s.seccion_desc}
                                </option>
                            ))}
                        </select>
                    </div>
                </form>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" form="empresa-form" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors text-sm font-bold shadow-lg shadow-blue-500/20">
                        {isSubmitting ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Empresa</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
