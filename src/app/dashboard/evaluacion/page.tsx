'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Play, Eye, Loader2, Settings2, ChevronRight, Search, FilterX, AlertTriangle, Paperclip, Upload, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
    getProyectosConEvaluacion,
    triggerEvaluacion,
    getEtapas,
    getEjes,
    getLineas,
    getEvaluacionConfigs,
    vincularEvaluacionConfig,
    uploadArchivoProyecto,
    type EvalFilters,
} from './actions';
import ResultadosEvaluacion from '@/components/dashboard/evaluacion/ResultadosEvaluacion';

export default function EvaluacionPage() {
    // Data
    const [proyectos, setProyectos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggeringId, setTriggeringId] = useState<number | null>(null);
    const [selectedProyecto, setSelectedProyecto] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    // Filter options (loaded once)
    const [etapasOpts, setEtapasOpts] = useState<{ value: any; label: string }[]>([]);
    const [ejesOpts, setEjesOpts] = useState<{ value: any; label: string }[]>([]);
    const [lineasOpts, setLineasOpts] = useState<{ value: any; label: string }[]>([]);
    const [configsOpts, setConfigsOpts] = useState<any[]>([]);
    const [linkingId, setLinkingId] = useState<number | null>(null);
    const [uploadingId, setUploadingId] = useState<number | null>(null);

    // Active filters
    const [filters, setFilters] = useState<EvalFilters>({
        etapa_id: 'all',
        eje_id: 'all',
        linea_id: 'all',
        eval_estado: 'all',
        search: '',
    });

    // Load filter options once
    useEffect(() => {
        const loadOptions = async () => {
            const [etapas, ejes, lineas, configs] = await Promise.all([getEtapas(), getEjes(), getLineas(), getEvaluacionConfigs()]);
            setEtapasOpts(etapas);
            setEjesOpts(ejes);
            setLineasOpts(lineas);
            setConfigsOpts(configs);
        };
        loadOptions();
    }, []);

    // Fetch data whenever filters change
    const fetchData = useCallback(async () => {
        setLoading(true);
        const data = await getProyectosConEvaluacion(filters);
        setProyectos(data);
        setLoading(false);
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateFilter = (key: keyof EvalFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            etapa_id: 'all',
            eje_id: 'all',
            linea_id: 'all',
            eval_estado: 'all',
            search: '',
        });
    };

    const hasActiveFilters =
        filters.etapa_id !== 'all' ||
        filters.eje_id !== 'all' ||
        filters.linea_id !== 'all' ||
        filters.eval_estado !== 'all' ||
        (filters.search && filters.search.trim() !== '');

    const handleTrigger = async (proyecto: any) => {
        setTriggeringId(proyecto.id);
        setMessage('');
        try {
            const result = await triggerEvaluacion(proyecto.id);
            if (result.success) {
                setMessage('Evaluación iniciada. Estado: Procesando.');
                setMessageType('success');
                await fetchData();
            } else {
                setMessage(result.error || 'Error al iniciar evaluación.');
                setMessageType('error');
            }
        } catch (err) {
            setMessage('Error al iniciar evaluación.');
            setMessageType('error');
        }
        setTriggeringId(null);
    };

    const handleLink = async (proyectoId: number, configId: string) => {
        setLinkingId(proyectoId);
        const val = configId === '' ? null : configId;
        const result = await vincularEvaluacionConfig(proyectoId, val);
        if (result.success) {
            // Update local state immediately
            setProyectos(prev => prev.map(p =>
                p.id === proyectoId ? { ...p, evaluacion_config_id: val } : p
            ));
        } else {
            setMessage(result.error || 'Error al vincular configuración.');
            setMessageType('error');
        }
        setLinkingId(null);
    };

    const handleUpload = async (proyectoId: number, file: File) => {
        if (file.type !== 'application/pdf') {
            setMessage('Solo se permiten archivos PDF.');
            setMessageType('error');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            setMessage('El archivo excede el límite de 15 MB.');
            setMessageType('error');
            return;
        }
        setUploadingId(proyectoId);
        setMessage('');
        const fd = new FormData();
        fd.append('archivo', file);
        try {
            const result = await uploadArchivoProyecto(proyectoId, fd);
            if (result.success) {
                setProyectos(prev => prev.map(p =>
                    p.id === proyectoId ? { ...p, url_archivo_proyecto: result.url } : p
                ));
                setMessage('Archivo subido correctamente.');
                setMessageType('success');
            } else {
                setMessage(result.error || 'Error al subir archivo.');
                setMessageType('error');
            }
        } catch {
            setMessage('Error al subir archivo.');
            setMessageType('error');
        }
        setUploadingId(null);
    };

    // Badge helpers
    const getEvalBadge = (estado: string | null) => {
        if (!estado) return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                Sin evaluar
            </span>
        );
        const styles: Record<string, string> = {
            'Pendiente': 'bg-yellow-100 text-yellow-800',
            'Procesando': 'bg-blue-100 text-blue-800',
            'Completado': 'bg-green-100 text-green-800',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100 text-gray-600'}`}>
                {estado === 'Procesando' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {estado}
            </span>
        );
    };

    const getEtapaBadge = (etapa: string) => {
        const lower = etapa.toLowerCase();
        if (lower.includes('lanzamiento')) return 'bg-blue-100 text-blue-800';
        if (lower.includes('ejecut')) return 'bg-emerald-100 text-emerald-800';
        if (lower.includes('cerrado') || lower.includes('finaliz')) return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-700';
    };

    // Select component
    const selectClass = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent focus:border-accent min-w-[140px]";

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <ClipboardCheck className="w-7 h-7 text-accent" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Evaluación de Proyectos</h1>
                        <p className="text-sm text-gray-500">Gestión y ejecución de evaluaciones con IA</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/evaluacion/configuracion"
                    className="btn btn-primary flex items-center space-x-2"
                >
                    <Settings2 className="w-4 h-4" />
                    <span>Configuración</span>
                </Link>
            </div>

            {/* ── FILTER BAR ── */}
            <div className="card !p-3">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Etapa */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Etapa</label>
                        <select
                            className={selectClass}
                            value={filters.etapa_id}
                            onChange={e => updateFilter('etapa_id', e.target.value)}
                        >
                            <option value="all">Todas</option>
                            {etapasOpts.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Eje */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Eje</label>
                        <select
                            className={selectClass}
                            value={filters.eje_id}
                            onChange={e => updateFilter('eje_id', e.target.value)}
                        >
                            <option value="all">Todos</option>
                            {ejesOpts.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Línea */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Línea</label>
                        <select
                            className={selectClass}
                            value={filters.linea_id}
                            onChange={e => updateFilter('linea_id', e.target.value)}
                        >
                            <option value="all">Todas</option>
                            {lineasOpts.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Estado Evaluación */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Estado Eval.</label>
                        <select
                            className={selectClass}
                            value={filters.eval_estado}
                            onChange={e => updateFilter('eval_estado', e.target.value)}
                        >
                            <option value="all">Todos</option>
                            <option value="sin_evaluar">Sin Evaluar</option>
                            <option value="Procesando">Procesando</option>
                            <option value="Completado">Completado</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div className="flex flex-col flex-1 min-w-[180px]">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Código o nombre..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                                value={filters.search || ''}
                                onChange={e => updateFilter('search', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <div className="flex flex-col justify-end">
                            <label className="text-[10px] invisible mb-0.5 px-1">_</label>
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <FilterX className="w-4 h-4 mr-1" />
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${messageType === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {messageType === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                    <span>{message}</span>
                </div>
            )}

            {/* Projects Table */}
            <div className="card !p-0">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs">Proyecto</th>
                                    <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs w-[100px]">Institución</th>
                                    <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs w-[65px]">Archivo</th>
                                    <th className="text-center py-3 px-1 font-semibold text-gray-600 text-xs w-[40px]">Config</th>
                                    <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs w-[85px]">Estado</th>
                                    <th className="text-center py-3 px-1 font-semibold text-gray-600 text-xs w-[50px]">Pts.</th>
                                    <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs w-[120px]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proyectos.map((p, i) => (
                                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                        <td className="py-2 px-2 text-gray-800 text-xs truncate" title={p.nombre}>{p.nombre}</td>
                                        <td className="py-2 px-2 text-gray-600 text-xs truncate" title={p.institucion}>{p.institucion}</td>
                                        <td className="py-2 px-2 text-center">
                                            {uploadingId === p.id ? (
                                                <span className="inline-flex items-center text-xs text-indigo-600">
                                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Subiendo...
                                                </span>
                                            ) : p.url_archivo_proyecto ? (
                                                <a
                                                    href={p.url_archivo_proyecto}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                    title="Ver PDF del proyecto"
                                                >
                                                    <Paperclip className="w-3.5 h-3.5 mr-1" />
                                                    PDF
                                                </a>
                                            ) : (
                                                <label className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">
                                                    <Upload className="w-3.5 h-3.5 mr-1" />
                                                    Subir
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={e => {
                                                            const f = e.target.files?.[0];
                                                            if (f) handleUpload(p.id, f);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                            <div className="relative inline-flex items-center">
                                                {linkingId === p.id && (
                                                    <Loader2 className="absolute -left-5 w-3.5 h-3.5 animate-spin text-indigo-500" />
                                                )}
                                                <select
                                                    className="px-1 py-1 border border-gray-200 rounded text-[10px] bg-white focus:ring-1 focus:ring-accent w-[40px] disabled:opacity-50"
                                                    value={p.evaluacion_config_id || ''}
                                                    onChange={e => handleLink(p.id, e.target.value)}
                                                    disabled={linkingId === p.id}
                                                >
                                                    <option value="">— Sin config —</option>
                                                    {configsOpts.map((c: any) => (
                                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td className="py-2 px-2 text-center">{getEvalBadge(p.eval_estado)}</td>
                                        <td className="py-2 px-1 text-center font-semibold text-gray-800 text-xs">
                                            {p.eval_puntaje != null ? p.eval_puntaje : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                            <div className="flex items-center justify-center space-x-1.5">
                                                {(!p.eval_estado || p.eval_estado === 'Pendiente') && (
                                                    <button
                                                        onClick={() => handleTrigger(p)}
                                                        disabled={triggeringId === p.id}
                                                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                        title={!p.evaluacion_config_id ? 'Sin configuración asignada' : 'Ejecutar evaluación'}
                                                    >
                                                        {triggeringId === p.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                        ) : !p.evaluacion_config_id ? (
                                                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-yellow-300" />
                                                        ) : (
                                                            <Play className="w-3.5 h-3.5 mr-1" />
                                                        )}
                                                        Evaluar con IA
                                                    </button>
                                                )}
                                                {p.eval_estado === 'Procesando' && (
                                                    <span className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700">
                                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                        Procesando...
                                                    </span>
                                                )}
                                                {p.eval_estado === 'Completado' && (
                                                    p.eval_pdf_url ? (
                                                        <a
                                                            href={p.eval_pdf_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            Resultados
                                                            <ExternalLink className="w-3 h-3 ml-1" />
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700">
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            Sin PDF
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {proyectos.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            No se encontraron proyectos con los filtros seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* Row count */}
                {!loading && (
                    <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                        {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Results Panel (Expandable) */}
            {selectedProyecto && (
                <ResultadosEvaluacion proyectoId={selectedProyecto} />
            )}
        </div>
    );
}
