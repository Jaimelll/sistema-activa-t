'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ClipboardCheck, Play, Eye, Loader2, Settings2, Search, FilterX,
    AlertTriangle, Upload, ExternalLink,
} from 'lucide-react';
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
    uploadSupervision,
    triggerSupervision,
    type EvalFilters,
} from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

type Proyecto = {
    id: number;
    nombre: string;
    codigo: string;
    institucion: string;
    evaluacion_config_id: string | null;
    url_archivo_proyecto: string | null;
    eval_pdf_url: string | null;               // url_pdf_final  → resultado Evaluación
    evaluaciones_resultados: { puntaje_total?: number }[];
    url_subsanacion: string | null;            // documento entrada Subsanación
    url_resultado_subsanacion: string | null;  // resultado Subsanación
    url_supervision: string | null;            // documento entrada Supervisión
    url_resultado_supervision: string | null;  // resultado Supervisión
    estado_supervision: string | null;         // 'Pendiente' | 'Procesando' | 'Completado' | 'Error'
};

// ─── Reusable PhaseCell ───────────────────────────────────────────────────────
/**
 * Renders the three-step action column for any phase:
 *   Step A – no input doc  → SUBIR button
 *   Step B – has input, no result → VER/CAMBIAR + EVALUAR
 *   Step C – has result   → VER/CAMBIAR + EVALUAR (re-eval) + VER RES.
 */
interface PhaseCellProps {
    phaseLabel: string;              // e.g. "EVAL.", "SUB.", "SUPERV."
    inputUrl: string | null;         // doc de entrada
    resultUrl: string | null;        // doc resultado generado por IA
    isGenerating: boolean;           // this row is being processed RIGHT NOW (local click)
    uploadingThisRow: boolean;       // uploading input doc for this row
    /** Extra persistent badge (e.g. 'Procesando' from DB) shown alongside the button */
    dbProcessing?: boolean;
    onUploadInput: (file: File) => void;
    onEvaluar: () => void;
    onUploadResult?: (file: File) => void; // only for Evaluación (manual PDF result)
    accentColor: 'indigo' | 'amber' | 'teal';
    resultLabel?: string;            // override "VER RES." label
    showResultUpload?: boolean;      // show manual result upload (Evaluación phase)
}

const ACCENT_MAP = {
    indigo: {
        evalBg: 'bg-indigo-600 hover:bg-indigo-700',
        resBg: 'bg-indigo-500 hover:bg-indigo-600',
        uploadBorder: 'border-indigo-300 text-indigo-700 hover:bg-indigo-50',
        viewBg: 'bg-emerald-600 hover:bg-emerald-700',
        resBadge: 'bg-indigo-100 text-indigo-700',
    },
    amber: {
        evalBg: 'bg-amber-600 hover:bg-amber-700',
        resBg: 'bg-purple-600 hover:bg-purple-700',
        uploadBorder: 'border-amber-300 text-amber-700 hover:bg-amber-50',
        viewBg: 'bg-emerald-600 hover:bg-emerald-700',
        resBadge: 'bg-purple-100 text-purple-700',
    },
    teal: {
        evalBg: 'bg-teal-600 hover:bg-teal-700',
        resBg: 'bg-teal-500 hover:bg-teal-600',
        uploadBorder: 'border-teal-300 text-teal-700 hover:bg-teal-50',
        viewBg: 'bg-emerald-600 hover:bg-emerald-700',
        resBadge: 'bg-teal-100 text-teal-700',
    },
};

function PhaseCell({
    phaseLabel,
    inputUrl,
    resultUrl,
    isGenerating,
    uploadingThisRow,
    dbProcessing = false,
    onUploadInput,
    onEvaluar,
    onUploadResult,
    accentColor,
    resultLabel,
    showResultUpload = false,
}: PhaseCellProps) {
    const c = ACCENT_MAP[accentColor];

    // ── Step A: no input doc ─────────────────────────────────────────────
    if (!inputUrl) {
        return (
            <div className="flex flex-col items-stretch gap-1 min-w-[150px]">
                {uploadingThisRow ? (
                    <span className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-indigo-600">
                        <Loader2 className="w-3 h-3 animate-spin" /> Subiendo...
                    </span>
                ) : (
                    <label
                        className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded border cursor-pointer transition-colors ${c.uploadBorder}`}
                    >
                        <Upload className="w-3 h-3" />
                        SUBIR {phaseLabel}
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) onUploadInput(f);
                                e.target.value = '';
                            }}
                        />
                    </label>
                )}
            </div>
        );
    }

    // ── Step B/C: has input doc ──────────────────────────────────────────
    return (
        <div className="flex flex-col items-stretch gap-1 min-w-[150px]">
            {/* VER / CAMBIAR row */}
            <div className="flex items-center gap-1">
                <a
                    href={inputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${c.viewBg} text-white transition-colors`}
                >
                    <Eye className="w-3 h-3" />
                    VER
                </a>
                {uploadingThisRow ? (
                    <span className="text-[10px] text-gray-400">Subiendo...</span>
                ) : (
                    <label className="text-[9px] text-blue-600 font-semibold hover:underline cursor-pointer uppercase">
                        CAMBIAR
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) onUploadInput(f);
                                e.target.value = '';
                            }}
                        />
                    </label>
                )}
            </div>

            {/* EVALUAR button */}
            <button
                onClick={onEvaluar}
                disabled={isGenerating || dbProcessing}
                className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${c.evalBg}`}
                title={`Evaluar ${phaseLabel}`}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generando...
                    </>
                ) : (
                    <>
                        <Play className="w-3 h-3" />
                        EVALUAR {phaseLabel}
                    </>
                )}
            </button>

            {/* DB-level processing badge (webhook running in background) */}
            {dbProcessing && !isGenerating && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Procesando...
                </span>
            )}

            {/* VER RES. — Step C */}
            {resultUrl && (
                <a
                    href={resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded ${c.resBg} text-white transition-colors`}
                >
                    <ExternalLink className="w-3 h-3" />
                    {resultLabel ?? `VER RES. ${phaseLabel}`}
                </a>
            )}

            {/* Manual result upload for Evaluación phase (Step C: no resultUrl yet) */}
            {showResultUpload && !resultUrl && (
                <label className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded border cursor-pointer transition-colors ${c.uploadBorder}`}>
                    <Upload className="w-3 h-3" />
                    SUBIR RES.
                    <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (f && onUploadResult) onUploadResult(f);
                            e.target.value = '';
                        }}
                    />
                </label>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EvaluacionPage() {
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    // Per-row loading sets (allow parallel execution across rows)
    const [generatingEval, setGeneratingEval] = useState<Set<number>>(new Set());
    const [generatingSub, setGeneratingSub] = useState<Set<number>>(new Set());
    const [generatingSuperv, setGeneratingSuperv] = useState<Set<number>>(new Set());
    const [uploadingInput, setUploadingInput] = useState<Set<number>>(new Set());
    const [uploadingSub, setUploadingSub] = useState<Set<number>>(new Set());
    const [uploadingSuperv, setUploadingSuperv] = useState<Set<number>>(new Set());
    const [uploadingRes, setUploadingRes] = useState<Set<number>>(new Set());
    const [linkingId, setLinkingId] = useState<number | null>(null);

    // Filter options
    const [etapasOpts, setEtapasOpts] = useState<{ value: any; label: string }[]>([]);
    const [ejesOpts, setEjesOpts] = useState<{ value: any; label: string }[]>([]);
    const [lineasOpts, setLineasOpts] = useState<{ value: any; label: string }[]>([]);
    const [configsOpts, setConfigsOpts] = useState<any[]>([]);

    const [filters, setFilters] = useState<EvalFilters>({
        etapa_id: '2',
        eje_id: 'all',
        linea_id: 'all',
        eval_estado: 'all',
        search: '',
    });

    useEffect(() => {
        const loadOptions = async () => {
            const [etapas, ejes, lineas, configs] = await Promise.all([
                getEtapas(), getEjes(), getLineas(), getEvaluacionConfigs(),
            ]);
            setEtapasOpts(etapas);
            setEjesOpts(ejes);
            setLineasOpts(lineas);
            setConfigsOpts(configs);
        };
        loadOptions();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const data = await getProyectosConEvaluacion(filters);
        setProyectos(data as Proyecto[]);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Helpers for per-row Set state
    const addToSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) =>
        setter(prev => new Set(prev).add(id));
    const removeFromSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) =>
        setter(prev => { const s = new Set(prev); s.delete(id); return s; });

    const showMsg = (msg: string, type: 'success' | 'error') => {
        setMessage(msg);
        setMessageType(type);
    };

    // ── Upload helpers ─────────────────────────────────────────────────────

    const handleUploadInput = async (proyectoId: number, file: File) => {
        if (file.type !== 'application/pdf') return showMsg('Solo se permiten archivos PDF.', 'error');
        if (file.size > 15 * 1024 * 1024) return showMsg('El archivo excede el límite de 15 MB.', 'error');
        addToSet(setUploadingInput, proyectoId);
        const fd = new FormData(); fd.append('archivo', file);
        try {
            const result = await uploadArchivoProyecto(proyectoId, fd);
            if (result.success) {
                setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, url_archivo_proyecto: result.url ?? null } : p));
                showMsg('Archivo subido correctamente.', 'success');
            } else { showMsg(result.error || 'Error al subir archivo.', 'error'); }
        } catch { showMsg('Error al subir archivo.', 'error'); }
        removeFromSet(setUploadingInput, proyectoId);
    };

    const handleUploadSub = async (proyectoId: number, file: File) => {
        if (file.type !== 'application/pdf') return showMsg('Solo se permiten archivos PDF.', 'error');
        addToSet(setUploadingSub, proyectoId);
        const fd = new FormData(); fd.append('archivo', file);
        try {
            const result = await uploadSubsanacion(proyectoId, fd);
            if (result.success) {
                setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, url_subsanacion: result.url ?? null } : p));
                showMsg('Documento de subsanación cargado.', 'success');
            } else { showMsg(result.error || 'Error al subir subsanación.', 'error'); }
        } catch { showMsg('Error al subir subsanación.', 'error'); }
        removeFromSet(setUploadingSub, proyectoId);
    };

    const handleUploadSuperv = async (proyectoId: number, file: File) => {
        if (file.type !== 'application/pdf') return showMsg('Solo se permiten archivos PDF.', 'error');
        addToSet(setUploadingSuperv, proyectoId);
        const fd = new FormData(); fd.append('archivo', file);
        try {
            const result = await uploadSupervision(proyectoId, fd);
            if (result.success) {
                setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, url_supervision: result.url ?? null } : p));
                showMsg('Documento de supervisión cargado.', 'success');
            } else { showMsg(result.error || 'Error al subir supervisión.', 'error'); }
        } catch { showMsg('Error al subir supervisión.', 'error'); }
        removeFromSet(setUploadingSuperv, proyectoId);
    };

    // ── Trigger helpers ────────────────────────────────────────────────────

    const handleEvaluarEval = async (proyecto: Proyecto) => {
        addToSet(setGeneratingEval, proyecto.id);
        try {
            const result = await triggerEvaluacion(proyecto.id, proyecto.url_archivo_proyecto);
            if (result.success) { showMsg('Evaluación iniciada con IA.', 'success'); }
            else { showMsg(result.error || 'Error al iniciar evaluación.', 'error'); }
        } catch { showMsg('Error al iniciar evaluación.', 'error'); }
        removeFromSet(setGeneratingEval, proyecto.id);
    };

    const handleEvaluarSub = async (proyecto: Proyecto) => {
        if (!proyecto.url_subsanacion) return;
        addToSet(setGeneratingSub, proyecto.id);
        try {
            const result = await triggerSubsanacion(
                proyecto.id,
                proyecto.eval_pdf_url,
                proyecto.url_subsanacion,
            );
            if (result.success) { showMsg('Subsanación enviada a IA.', 'success'); }
            else { showMsg(result.error || 'Error al enviar subsanación.', 'error'); }
        } catch { showMsg('Error al contactar el servicio de IA.', 'error'); }
        removeFromSet(setGeneratingSub, proyecto.id);
    };

    const handleEvaluarSuperv = async (proyecto: Proyecto) => {
        if (!proyecto.url_supervision) return;
        addToSet(setGeneratingSuperv, proyecto.id);
        try {
            const result = await triggerSupervision(
                proyecto.id,
                proyecto.url_resultado_subsanacion,
                proyecto.url_supervision,
            );
            if (result.success) { showMsg('Supervisión enviada a IA.', 'success'); }
            else { showMsg(result.error || 'Error al enviar supervisión.', 'error'); }
        } catch { showMsg('Error al contactar el servicio de IA.', 'error'); }
        removeFromSet(setGeneratingSuperv, proyecto.id);
    };

    const handleLink = async (proyectoId: number, configId: string) => {
        setLinkingId(proyectoId);
        const val = configId === '' ? null : configId;
        const result = await vincularEvaluacionConfig(proyectoId, val);
        if (result.success) {
            setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, evaluacion_config_id: val } : p));
        } else { showMsg(result.error || 'Error al vincular configuración.', 'error'); }
        setLinkingId(null);
    };

    // ── Filters ────────────────────────────────────────────────────────────

    const updateFilter = (key: keyof EvalFilters, value: string) =>
        setFilters(prev => ({ ...prev, [key]: value }));

    const clearFilters = () =>
        setFilters({ etapa_id: 'all', eje_id: 'all', linea_id: 'all', eval_estado: 'all', search: '' });

    const hasActiveFilters =
        filters.etapa_id !== 'all' || filters.eje_id !== 'all' ||
        filters.linea_id !== 'all' || filters.eval_estado !== 'all' ||
        (filters.search && filters.search.trim() !== '');

    const selectClass = 'px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent focus:border-accent min-w-[140px]';

    // ── Render ─────────────────────────────────────────────────────────────

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

            {/* Filter Bar */}
            <div className="card !p-3">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Etapa */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Etapa</label>
                        <select className={selectClass} value={filters.etapa_id} onChange={e => updateFilter('etapa_id', e.target.value)}>
                            <option value="all">Todas</option>
                            {etapasOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {/* Eje */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Eje</label>
                        <select className={selectClass} value={filters.eje_id} onChange={e => updateFilter('eje_id', e.target.value)}>
                            <option value="all">Todos</option>
                            {ejesOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {/* Línea */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Línea</label>
                        <select className={selectClass} value={filters.linea_id} onChange={e => updateFilter('linea_id', e.target.value)}>
                            <option value="all">Todas</option>
                            {lineasOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {/* Estado Eval. */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 px-1">Estado Eval.</label>
                        <select className={selectClass} value={filters.eval_estado} onChange={e => updateFilter('eval_estado', e.target.value)}>
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

            {/* Table */}
            <div className="card !p-0">
                <div className="w-full overflow-x-auto border-b border-gray-200 shadow sm:rounded-lg">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : (
                        <table id="eval-table-v3" className="w-full text-xs" style={{ tableLayout: 'auto' }}>
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600 w-10">ID</th>
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600 w-20">Código</th>
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600 w-52">Proyecto</th>
                                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600 w-40">Institución</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-28">Vincular Eval.</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-10">Pts.</th>
                                    {/* Three phase columns — same min width so stacked buttons are comfortable */}
                                    <th className="text-center py-1.5 px-1 font-semibold text-indigo-700 bg-indigo-50/40 min-w-[155px]">Evaluación</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-amber-700 bg-amber-50/40 min-w-[155px]">Subsanación</th>
                                    <th className="text-center py-1.5 px-1 font-semibold text-teal-700 bg-teal-50/40 min-w-[155px]">Supervisión</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proyectos.map((p, i) => (
                                    <tr
                                        key={p.id}
                                        className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}`}
                                    >
                                        {/* ID */}
                                        <td className="py-1.5 px-2 text-gray-500 font-mono">{p.id}</td>

                                        {/* Código */}
                                        <td className="py-1.5 px-2 text-gray-800 font-semibold">{p.codigo}</td>

                                        {/* Proyecto */}
                                        <td className="py-1.5 px-2" title={p.nombre}>
                                            <div className="whitespace-normal line-clamp-2 text-gray-800">{p.nombre}</div>
                                        </td>

                                        {/* Institución */}
                                        <td className="py-1.5 px-2" title={p.institucion}>
                                            <div className="whitespace-normal line-clamp-2 text-gray-600 text-[11px]">{p.institucion}</div>
                                        </td>

                                        {/* Vincular Eval. */}
                                        <td className="py-1.5 px-1 text-center">
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

                                        {/* Pts. */}
                                        <td className="py-1.5 px-1 text-center font-bold text-gray-800">
                                            {p.evaluaciones_resultados?.[0]?.puntaje_total ?? '-'}
                                        </td>

                                        {/* ── EVALUACIÓN ── */}
                                        <td className="py-1.5 px-2 bg-indigo-50/10 align-top">
                                            <PhaseCell
                                                phaseLabel="EVAL."
                                                inputUrl={p.url_archivo_proyecto}
                                                resultUrl={p.eval_pdf_url}
                                                isGenerating={generatingEval.has(p.id)}
                                                uploadingThisRow={uploadingInput.has(p.id)}
                                                onUploadInput={f => handleUploadInput(p.id, f)}
                                                onEvaluar={() => handleEvaluarEval(p)}
                                                accentColor="indigo"
                                                resultLabel="VER RES. EVAL."
                                                showResultUpload={false}
                                            />
                                        </td>

                                        {/* ── SUBSANACIÓN ── */}
                                        <td className="py-1.5 px-2 bg-amber-50/10 align-top">
                                            <PhaseCell
                                                phaseLabel="SUB."
                                                inputUrl={p.url_subsanacion}
                                                resultUrl={p.url_resultado_subsanacion}
                                                isGenerating={generatingSub.has(p.id)}
                                                uploadingThisRow={uploadingSub.has(p.id)}
                                                onUploadInput={f => handleUploadSub(p.id, f)}
                                                onEvaluar={() => handleEvaluarSub(p)}
                                                accentColor="amber"
                                                resultLabel="VER RES. SUB."
                                            />
                                        </td>

                                        {/* ── SUPERVISIÓN ── */}
                                        <td className="py-1.5 px-2 bg-teal-50/10 align-top">
                                            <PhaseCell
                                                phaseLabel="SUPERV."
                                                inputUrl={p.url_supervision}
                                                resultUrl={p.url_resultado_supervision}
                                                isGenerating={generatingSuperv.has(p.id)}
                                                dbProcessing={p.estado_supervision === 'Procesando'}
                                                uploadingThisRow={uploadingSuperv.has(p.id)}
                                                onUploadInput={f => handleUploadSuperv(p.id, f)}
                                                onEvaluar={() => handleEvaluarSuperv(p)}
                                                accentColor="teal"
                                                resultLabel="VER INF. SUPERV."
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {proyectos.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-gray-400">
                                            No se encontraron proyectos con los filtros seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && (
                    <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                        {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
