"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Search, Plus, FileText, Download, Edit2, Trash2, Loader2, FilterX, AlertCircle } from "lucide-react";
import { getDocumentos, deleteDocumento } from "./actions";
import DocumentoModal from "./DocumentoModal";

export default function DocumentosPage() {
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDocumento, setSelectedDocumento] = useState<any>(null);

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        const data = await getDocumentos(search);
        setDocumentos(data);
        setLoading(false);
    }, [search]);

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    const handleAdd = () => {
        setSelectedDocumento(null);
        setIsModalOpen(true);
    };

    const handleEdit = (doc: any) => {
        setSelectedDocumento(doc);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Está seguro de que desea eliminar este documento? Esta acción no se puede deshacer y borrará el archivo del Storage.")) {
            const result = await deleteDocumento(id);
            if (result.success) {
                fetchDocs();
            } else {
                alert(result.error || "Error al eliminar el documento.");
            }
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        // Convert YYYY-MM-DD to DD/MM/YYYY using pure string manipulation
        const parts = dateStr.split("-");
        if (parts.length !== 3) return dateStr;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-accent/10 rounded-2xl">
                        <FolderOpen className="w-8 h-8 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Documentos Gerenciales</h1>
                        <p className="text-sm text-gray-500 font-medium">Gestión de actas y archivos del área corporativa</p>
                    </div>
                </div>
                <button
                    onClick={handleAdd}
                    className="btn btn-primary flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl shadow-lg shadow-accent/20 transition-all hover:scale-105"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-bold">Agregar Nuevo Documento</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o observaciones..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="p-3 text-gray-400 hover:text-accent transition-colors"
                        title="Limpiar búsqueda"
                    >
                        <FilterX className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-black tracking-widest text-gray-400">
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Nombre del Archivo</th>
                                <th className="px-6 py-4">Observaciones</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            <Loader2 className="w-10 h-10 animate-spin text-accent" />
                                            <span className="text-gray-400 font-medium">Cargando documentos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : documentos.length > 0 ? (
                                documentos.map((doc) => (
                                    <tr key={doc.id} className="group hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-5 font-bold text-gray-700">{formatDate(doc.fecha_documento)}</td>
                                        <td className="px-6 py-5">
                                            <a
                                                href={doc.url_pdf}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-2 text-primary hover:text-accent font-bold transition-colors group/link"
                                            >
                                                <FileText className="w-4 h-4" />
                                                <span className="group-hover/link:underline">{doc.nombre_archivo}</span>
                                            </a>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm text-gray-500 line-clamp-1 max-w-md font-medium" title={doc.observaciones}>
                                                {doc.observaciones || <span className="text-gray-300 italic">Sin observaciones</span>}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(doc)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                    title="Editar registro"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                    title="Eliminar registro"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center space-y-2 opacity-40">
                                            <FolderOpen className="w-16 h-16 text-gray-300" />
                                            <span className="text-lg font-bold text-gray-400">No se encontraron documentos</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && documentos.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Total: {documentos.length} documento{documentos.length !== 1 ? "s" : ""}
                    </div>
                )}
            </div>

            {/* Modals */}
            <DocumentoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchDocs}
                documento={selectedDocumento}
            />
        </div>
    );
}
