"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";

interface AporteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { empresa_ruc: string; anio: number; monto: number }) => Promise<void>;
    empresa: { ruc: string; razon_social: string } | null;
}

export default function AporteModal({ isOpen, onClose, onSave, empresa }: AporteModalProps) {
    const [formData, setFormData] = useState({
        anio: new Date().getFullYear(),
        monto: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !empresa) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await onSave({
                empresa_ruc: empresa.ruc,
                anio: Number(formData.anio),
                monto: Number(formData.monto)
            });
            onClose();
        } catch (error) {
            console.error("Error saving aporte:", error);
            alert("Error al guardar el aporte.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Registrar Aporte</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form id="aporte-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                        <p className="text-sm text-blue-800"><span className="font-bold">Empresa:</span> {empresa.razon_social}</p>
                        <p className="text-sm text-blue-800"><span className="font-bold">RUC:</span> {empresa.ruc}</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Año</label>
                        <input
                            required
                            type="number"
                            name="anio"
                            min={1998}
                            max={2050}
                            value={formData.anio}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monto Depositado (S/)</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            name="monto"
                            value={formData.monto}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                            placeholder="Ej: 50000.50"
                        />
                    </div>
                </form>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" form="aporte-form" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors text-sm font-bold shadow-lg shadow-blue-500/20">
                        {isSubmitting ? 'Guardando...' : <><Save className="w-4 h-4" /> Registrar Aporte</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
