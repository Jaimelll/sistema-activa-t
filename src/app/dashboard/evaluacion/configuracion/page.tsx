'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Trash2, Loader2, FileText, Plus, Edit } from 'lucide-react';
import Link from 'next/link';
import { getEvaluacionConfigs, createEvaluacionConfig, deleteEvaluacionConfig, updateEvaluacionConfig } from '../actions';

export default function ConfiguracionPage() {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingConfig, setEditingConfig] = useState<any>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const fetchConfigs = async () => {
        setLoading(true);
        const data = await getEvaluacionConfigs();
        setConfigs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const resetForm = () => {
        setShowForm(false);
        setEditingConfig(null);
        formRef.current?.reset();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        let result;

        if (editingConfig) {
            result = await updateEvaluacionConfig(editingConfig.id, formData);
        } else {
            result = await createEvaluacionConfig(formData);
        }

        if (result.success) {
            setMessage(editingConfig ? 'Configuración actualizada exitosamente.' : 'Configuración creada exitosamente.');
            resetForm();
            await fetchConfigs();
        } else {
            setMessage(result.error || 'Error procesando la solicitud.');
        }
        setSaving(false);
    };

    const handleEdit = (config: any) => {
        setEditingConfig(config);
        setShowForm(true);
        // Scroll to form if needed
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta configuración?')) return;
        const result = await deleteEvaluacionConfig(id);
        if (result.success) {
            setMessage('Configuración eliminada.');
            await fetchConfigs();
        } else {
            setMessage(result.error || 'Error al eliminar.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/evaluacion" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Configuración de Evaluación</h1>
                        <p className="text-sm text-gray-500">Gestión de formatos PDF y plantillas de evaluación</p>
                    </div>
                </div>
                {!showForm && (
                    <button
                        onClick={() => {
                            setEditingConfig(null);
                            setShowForm(true);
                        }}
                        className="btn btn-primary flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Configuración</span>
                    </button>
                )}
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="card border-2 border-accent/20">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        {editingConfig ? `Editando: ${editingConfig.nombre}` : 'Nueva Configuración'}
                    </h2>
                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Configuración</label>
                            <input
                                name="nombre"
                                type="text"
                                required
                                defaultValue={editingConfig?.nombre || ''}
                                placeholder="Ej: Evaluación Concurso 2026"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    PDF de Bases {editingConfig && <span className="text-[10px] text-gray-400 font-normal ml-1">(Opcional: solo para reemplazar)</span>}
                                </label>
                                <input
                                    name="pdf_bases"
                                    type="file"
                                    accept="application/pdf"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {editingConfig?.url_pdf_bases && (
                                    <p className="mt-1 text-[10px] text-gray-500">Archivo actual: <a href={editingConfig.url_pdf_bases} target="_blank" className="text-accent underline">Ver actual</a></p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    PDF Formato {editingConfig && <span className="text-[10px] text-gray-400 font-normal ml-1">(Opcional: solo para reemplazar)</span>}
                                </label>
                                <input
                                    name="pdf_formato"
                                    type="file"
                                    accept="application/pdf"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {editingConfig?.url_pdf_formato && (
                                    <p className="mt-1 text-[10px] text-gray-500">Archivo actual: <a href={editingConfig.url_pdf_formato} target="_blank" className="text-accent underline">Ver actual</a></p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 pt-2">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                                ) : (
                                    <><Upload className="w-4 h-4 mr-2" />{editingConfig ? 'Actualizar Configuración' : 'Guardar Configuración'}</>
                                )}
                            </button>
                            <button type="button" onClick={resetForm} className="btn bg-gray-100 text-gray-600 hover:bg-gray-200">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Configs Table */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Configuraciones Existentes</h2>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{configs.length} items</span>
                </div>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                ) : configs.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No hay configuraciones creadas aún.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Nombre</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-600">PDF Bases</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-600">PDF Formato</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Fecha</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {configs.map((c, i) => (
                                    <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                        <td className="py-3 px-4 font-medium text-gray-800">{c.nombre}</td>
                                        <td className="py-3 px-4 text-center">
                                            {c.url_pdf_bases ? (
                                                <a href={c.url_pdf_bases} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[10px] font-medium transition-colors">
                                                    <FileText className="w-3 h-3 mr-1" />
                                                    VER BASES
                                                </a>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {c.url_pdf_formato ? (
                                                <a href={c.url_pdf_formato} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-medium transition-colors">
                                                    <FileText className="w-3 h-3 mr-1" />
                                                    VER FORMATO
                                                </a>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 text-xs">
                                            {new Date(c.created_at).toLocaleDateString('es-PE')}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(c)}
                                                    className="inline-flex items-center px-2 py-1.5 text-xs font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                                    title="Editar configuración"
                                                >
                                                    <Edit className="w-3.5 h-3.5 mr-1" />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="inline-flex items-center px-2 py-1.5 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                                    title="Eliminar configuración"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
