"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Upload, FileText } from "lucide-react";
import { createDocumento, updateDocumento } from "./actions";

interface DocumentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    documento?: any; // If provided, we are in edit mode
}

export default function DocumentoModal({ isOpen, onClose, onSuccess, documento }: DocumentoModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    // Form state
    const [fecha, setFecha] = useState("");
    const [nombre, setNombre] = useState("");
    const [observaciones, setObservaciones] = useState("");

    useEffect(() => {
        if (documento) {
            // If it comes from DB, it's already YYYY-MM-DD
            setFecha(documento.fecha_documento || "");
            setNombre(documento.nombre_archivo || "");
            setObservaciones(documento.observaciones || "");
        } else {
            // For new documents, use local date YYYY-MM-DD
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            setFecha(`${year}-${month}-${day}`);
            setNombre("");
            setObservaciones("");
        }
        setFile(null);
        setError(null);
    }, [documento, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("fecha_documento", fecha);
        formData.append("nombre_archivo", nombre);
        formData.append("observaciones", observaciones);
        if (file) {
            formData.append("archivo", file);
        }

        try {
            let result;
            if (documento) {
                result = await updateDocumento(documento.id, formData);
            } else {
                result = await createDocumento(formData);
            }

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError(result.error || "Ocurrió un error.");
            }
        } catch (err) {
            setError("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary to-primary-dark text-white">
                    <h2 className="text-xl font-bold flex items-center space-x-2">
                        <FileText className="w-6 h-6" />
                        <span>{documento ? "Editar Documento" : "Agregar Nuevo Documento"}</span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha del Documento</label>
                            <input
                                type="date"
                                required
                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre del Archivo</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Acta de Directorio 05"
                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observaciones</label>
                        <textarea
                            rows={3}
                            placeholder="Comentarios adicionales..."
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Archivo PDF {documento && "(Opcional si no desea cambiarlo)"}</label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept=".pdf"
                                required={!documento}
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="pdf-upload"
                            />
                            <label
                                htmlFor="pdf-upload"
                                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-6 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all group-hover:border-accent group-hover:bg-accent/5"
                            >
                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-accent transition-colors mb-2" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-accent">
                                    {file ? file.name : (documento ? "Haga clic para reemplazar el archivo" : "Seleccione un archivo PDF")}
                                </span>
                                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Máximo 15 MB • Formato PDF únicamente</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold shadow-lg shadow-accent/20 transition-all disabled:opacity-50 flex items-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <span>{documento ? "Actualizar" : "Guardar Documento"}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
