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
    uploadSubsanacion,
    triggerSubsanacion,
    uploadResultadoEvaluacion,
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
    const [uploadingSubId, setUploadingSubId] = useState<number | null>(null);
    const [triggeringSubId, setTriggeringSubId] = useState<number | null>(null);
    const [uploadingResId, setUploadingResId] = useState<number | null>(null);

    // Active filters
    const [filters, setFilters] = useState<EvalFilters>({
        etapa_id: '2',
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

    // Polling while any project is "Procesando"
    useEffect(() => {
        const needsPolling = proyectos.some(p => p.eval_estado === 'Procesando');
        if (!needsPolling) return;

        console.log('[AI Evaluation] Polling active...');
        const interval = setInterval(() => {
            fetchData();
        }, 5000);

        return () => clearInterval(interval);
    }, [proyectos, fetchData]);

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
        console.log(`[Frontend] Triggering evaluation for project ${proyecto.id}`, proyecto);
        setTriggeringId(proyecto.id);
        setMessage('');
        try {
            const result = await triggerEvaluacion(proyecto.id, proyecto.url_archivo_proyecto);
            if (result.success) {
                console.log(`[Frontend] Evaluation triggered successfully for ${proyecto.id}`);
                setMessage('Evaluación iniciada. Estado: Procesando.');
                setMessageType('success');
                await fetchData();
            } else {
                console.error(`[Frontend] Evaluation trigger failed for ${proyecto.id}:`, result.error);
                setMessage(result.error || 'Error al iniciar evaluación.');
                setMessageType('error');
            }
        } catch (err) {
            console.error(`[Frontend] Exception in handleTrigger for ${proyecto.id}:`, err);
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

    // ── Subsanación handlers (independent from standard eval flow) ────
    const handleUploadSubsanacion = async (proyectoId: number, file: File) => {
        if (file.type !== 'application/pdf') {
            setMessage('Solo se permiten archivos PDF.');
            setMessageType('error');
            return;
        }
        setUploadingSubId(proyectoId);
        setMessage('');
        const fd = new FormData();
        fd.append('archivo', file);
        try {
            const result = await uploadSubsanacion(proyectoId, fd);
            if (result.success) {
                setProyectos(prev => prev.map(p =>
                    p.id === proyectoId ? { ...p, url_subsanacion: result.url } : p
                ));
                setMessage('Documento de subsanación cargado.');
                setMessageType('success');
            } else {
                setMessage(result.error || 'Error al subir subsanación.');
                setMessageType('error');
            }
        } catch {
            setMessage('Error al subir subsanación.');
            setMessageType('error');
        }
        setUploadingSubId(null);
    };

    const handleEvaluarSubsanacion = async (proyecto: any) => {
        if (!proyecto.url_subsanacion) return;
        setTriggeringSubId(proyecto.id);
        setMessage('');
        try {
            const result = await triggerSubsanacion(
                proyecto.id,
                proyecto.eval_pdf_url || null,
                proyecto.url_subsanacion
            );
            if (result.success) {
                setMessage('Evaluación de subsanación enviada a IA.');
                setMessageType('success');
            } else {
                setMessage(result.error || 'Error al enviar subsanación.');
                setMessageType('error');
            }
        } catch {
            setMessage('Error al contactar el servicio de IA.');
            setMessageType('error');
        }
        setTriggeringSubId(null);
    };

    const handleUploadResultado = async (proyectoId: number, file: File) => {
        if (file.type !== 'application/pdf') {
            setMessage('Solo se permiten archivos PDF.');
            setMessageType('error');
            return;
        }
        setUploadingResId(proyectoId);
        setMessage('');
        const fd = new FormData();
        fd.append('archivo', file);
        try {
            const result = await uploadResultadoEvaluacion(proyectoId, fd);
            if (result.success) {
                // Fetch data para reflejar el estado Completado y refrescar BD
                setMessage('Resultado de evaluación cargado y estado actualizado a Completado.');
                setMessageType('success');
                fetchData();
            } else {
                setMessage(result.error || 'Error al subir resultado.');
                setMessageType('error');
            }
        } catch {
            setMessage('Error al subir resultado.');
            setMessageType('error');
        }
        setUploadingResId(null);
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
                <div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : (
                        <table id="eval-table-v2" className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '40px' }}>ID</th>
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '80px' }}>Código</th>
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '220px' }}>Proyecto</th>
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '160px' }}>Institución</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600" style={{ width: '60px' }}>Archivo</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600" style={{ width: '120px' }}>Vincular Eval.</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600">Estado</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600" style={{ width: '40px' }}>Pts.</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600">Acciones</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-amber-700 bg-amber-50/60" style={{ width: '160px' }}>Subsanación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proyectos.map((p, i) => (
                                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                                        <td className="py-1 px-2 text-gray-500 font-mono">{p.id}</td>
                                        <td className="py-1 px-2 text-gray-800 font-semibold">{p.codigo}</td>
                                        <td className="py-1 px-2" title={p.nombre}>
                                            <div className="whitespace-normal line-clamp-2 text-gray-800">{p.nombre}</div>
                                        </td>
                                        <td className="py-1 px-2" title={p.institucion}>
                                            <div className="whitespace-normal line-clamp-2 text-gray-600 text-[11px]">{p.institucion}</div>
                                        </td>
                                        <td className="py-1 px-1 text-center">
                                            {uploadingId === p.id ? (
                                                <span className="inline-flex items-center text-xs text-indigo-600">
                                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> ...
                                                </span>
                                            ) : p.url_archivo_proyecto ? (
                                                <div className="flex flex-col items-center space-y-1">
                                                    <a
                                                        href={p.url_archivo_proyecto}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        VER
                                                    </a>
                                                    <label className="text-[9px] text-accent hover:underline cursor-pointer">
                                                        Cambiar
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
                                                </div>
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
                                        <td className="py-1 px-1 text-center">
                                            <select
                                                className="px-1 py-1 border border-gray-200 rounded text-[10px] bg-white focus:ring-1 focus:ring-accent w-full disabled:opacity-50"
                                                value={p.evaluacion_config_id || ''}
                                                onChange={e => handleLink(p.id, e.target.value)}
                                                disabled={linkingId === p.id}
                                            >
                                                <option value="">— Elegir —</option>
                                                {configsOpts.map((c: any) => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-1 px-1 text-center">{getEvalBadge(p.eval_estado)}</td>
                                        <td className="py-1 px-1 text-center font-semibold text-gray-800">
                                            {p.evaluaciones_resultados?.[0]?.puntaje_total ?? '-'}
                                        </td>
                                        <td className="py-1 px-1 text-center">
                                            <div className="flex items-center justify-center space-x-1.5">
                                                <button
                                                    onClick={() => handleTrigger(p)}
                                                    disabled={triggeringId === p.id}
                                                    className="inline-flex items-center px-2 py-1 text-[10px] font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase tracking-tight"
                                                    title="Ejecutar evaluación (sobrescribe resultados)"
                                                >
                                                    {triggeringId === p.id ? (
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    ) : (
                                                        <Play className="w-3 h-3 mr-1" />
                                                    )}
                                                    Evaluar proy.
                                                </button>
                                                {p.eval_estado === 'Procesando' && (
                                                    <span className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700">
                                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                        Procesando...
                                                    </span>
                                                )}
                                                {p.eval_estado === 'Completado' && (
                                                    p.eval_pdf_url ? (
                                                        <div className="flex flex-col items-center space-y-1 ml-1">
                                                            <a
                                                                href={p.eval_pdf_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors uppercase"
                                                            >
                                                                <Eye className="w-3 h-3 mr-1" />
                                                                VER
                                                            </a>
                                                            <label className="text-[9px] text-blue-500 hover:underline cursor-pointer">
                                                                {uploadingResId === p.id ? 'Subiendo...' : 'Cambiar'}
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf"
                                                                    className="hidden"
                                                                    onChange={e => {
                                                                        const f = e.target.files?.[0];
                                                                        if (f) handleUploadResultado(p.id, f);
                                                                        e.target.value = '';
                                                                    }}
                                                                    disabled={uploadingResId === p.id}
                                                                />
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <label className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 cursor-pointer hover:bg-green-200 transition-colors">
                                                            <Upload className="w-3.5 h-3.5 mr-1" />
                                                            {uploadingResId === p.id ? '...' : 'Subir Res.'}
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                className="hidden"
                                                                onChange={e => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) handleUploadResultado(p.id, f);
                                                                    e.target.value = '';
                                                                }}
                                                                disabled={uploadingResId === p.id}
                                                            />
                                                        </label>
                                                    )
                                                )}
                                            </div>
                                        </td>

                                        {/* ── SUBSANACIÓN (nueva columna) ── */}
                                        <td className="py-1 px-1 bg-amber-50/20">
                                            <div className="flex flex-col gap-1.5">
                                                {/* Diseño Dual Subsanación / Subir */}
                                                {p.url_subsanacion ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <a
                                                            href={p.url_subsanacion}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-bold uppercase rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                        >
                                                            <Eye className="w-3 h-3 mr-1" />
                                                            VER
                                                        </a>
                                                        <label className="text-[9px] text-blue-600 font-bold hover:underline cursor-pointer uppercase">
                                                            {uploadingSubId === p.id ? 'Subiendo...' : 'Cambiar'}
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                className="hidden"
                                                                onChange={e => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) handleUploadSubsanacion(p.id, f);
                                                                    e.target.value = '';
                                                                }}
                                                                disabled={uploadingSubId === p.id}
                                                            />
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <label className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-bold uppercase rounded border border-amber-300 text-amber-700 bg-white hover:bg-amber-50 cursor-pointer transition-colors">
                                                        {uploadingSubId === p.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Upload className="w-3 h-3" />
                                                        }
                                                        Subir Sub.
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            className="hidden"
                                                            onChange={e => {
                                                                const f = e.target.files?.[0];
                                                                if (f) handleUploadSubsanacion(p.id, f);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                )}

                                                {/* EVALUAR SUB. - always enabled if file exists, except when processing this specific action */}
                                                <button
                                                    onClick={() => handleEvaluarSubsanacion(p)}
                                                    disabled={!p.url_subsanacion || triggeringSubId === p.id}
                                                    className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-bold uppercase rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    title={!p.url_subsanacion ? 'Primero suba el documento de subsanación' : 'Enviar subsanación a IA'}
                                                >
                                                    {triggeringSubId === p.id
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <Play className="w-3 h-3" />
                                                    }
                                                    Evaluar Sub.
                                                </button>

                                                {/* VER RESULT. SUB. - only visible if result exists */}
                                                {p.url_resultado_subsanacion && (
                                                    <a
                                                        href={p.url_resultado_subsanacion}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-bold uppercase rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        Ver Res. Sub.
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {proyectos.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-gray-400">
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
