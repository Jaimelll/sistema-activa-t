'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, ChevronDown, ChevronRight, Award, Shield, TrendingUp, DollarSign } from 'lucide-react';
import { getResultadoEvaluacion } from '@/app/dashboard/evaluacion/actions';

// ── Section Mapping ──
// Maps JSONB keys to human-readable labels and sections
const SECTION_MAP: Record<string, { section: string; label: string }> = {
    // Admisibilidad
    req_inscription: { section: 'Admisibilidad', label: 'Inscripción en Registros Públicos' },
    req_legal: { section: 'Admisibilidad', label: 'Representación Legal' },
    req_financial: { section: 'Admisibilidad', label: 'Estados Financieros' },
    req_experience: { section: 'Admisibilidad', label: 'Experiencia Institucional' },
    req_no_impedimento: { section: 'Admisibilidad', label: 'Sin Impedimentos' },
    req_declaracion_jurada: { section: 'Admisibilidad', label: 'Declaración Jurada' },
    admisibilidad_resultado: { section: 'Admisibilidad', label: 'Resultado General' },

    // Viabilidad Técnica
    pts_coherencia: { section: 'Viabilidad Técnica', label: 'Coherencia del Proyecto' },
    sustento_innovacion: { section: 'Viabilidad Técnica', label: 'Sustento de Innovación' },
    indicadores: { section: 'Viabilidad Técnica', label: 'Indicadores de Impacto' },
    riesgos: { section: 'Viabilidad Técnica', label: 'Análisis de Riesgos' },
    metodologia: { section: 'Viabilidad Técnica', label: 'Metodología' },
    sostenibilidad: { section: 'Viabilidad Técnica', label: 'Sostenibilidad' },
    capacidad_tecnica: { section: 'Viabilidad Técnica', label: 'Capacidad Técnica' },

    // Viabilidad Económica
    elegibilidad: { section: 'Viabilidad Económica', label: 'Elegibilidad de Gastos' },
    contrapartida: { section: 'Viabilidad Económica', label: 'Contrapartida Institucional' },
    costo_beneficio: { section: 'Viabilidad Económica', label: 'Relación Costo/Beneficio' },
    presupuesto: { section: 'Viabilidad Económica', label: 'Presupuesto Detallado' },
    cofinanciamiento: { section: 'Viabilidad Económica', label: 'Cofinanciamiento' },
};

const SECTION_ICONS: Record<string, any> = {
    'Admisibilidad': Shield,
    'Viabilidad Técnica': TrendingUp,
    'Viabilidad Económica': DollarSign,
    'Otros': Award,
};

const SECTION_COLORS: Record<string, string> = {
    'Admisibilidad': 'border-blue-200 bg-blue-50/50',
    'Viabilidad Técnica': 'border-indigo-200 bg-indigo-50/50',
    'Viabilidad Económica': 'border-emerald-200 bg-emerald-50/50',
    'Otros': 'border-gray-200 bg-gray-50/50',
};

const SECTION_HEADER_COLORS: Record<string, string> = {
    'Admisibilidad': 'text-blue-800 bg-blue-100',
    'Viabilidad Técnica': 'text-indigo-800 bg-indigo-100',
    'Viabilidad Económica': 'text-emerald-800 bg-emerald-100',
    'Otros': 'text-gray-800 bg-gray-100',
};

interface ResultadosEvaluacionProps {
    proyectoId: number;
}

export default function ResultadosEvaluacion({ proyectoId }: ResultadosEvaluacionProps) {
    const [resultado, setResultado] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'Admisibilidad': true,
        'Viabilidad Técnica': true,
        'Viabilidad Económica': true,
        'Otros': false,
    });

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const data = await getResultadoEvaluacion(proyectoId);
            setResultado(data);
            setLoading(false);
        };
        fetch();
    }, [proyectoId]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    if (loading) {
        return (
            <div className="card flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!resultado) {
        return (
            <div className="card text-center py-8 text-gray-400">
                No se encontraron resultados para este proyecto.
            </div>
        );
    }

    // Parse mapeo_formato into sections
    const mapeo = resultado.mapeo_formato || {};
    const sections: Record<string, { key: string; label: string; value: any }[]> = {};

    Object.entries(mapeo).forEach(([key, value]) => {
        const mapping = SECTION_MAP[key];
        const sectionName = mapping?.section || 'Otros';
        const label = mapping?.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        if (!sections[sectionName]) sections[sectionName] = [];
        sections[sectionName].push({ key, label, value });
    });

    // Ensure section order
    const orderedSections = ['Admisibilidad', 'Viabilidad Técnica', 'Viabilidad Económica'];
    const allSectionNames = [...orderedSections, ...Object.keys(sections).filter(s => !orderedSections.includes(s))];

    const puntaje = resultado.puntaje_total != null ? Number(resultado.puntaje_total) : null;
    const maxPuntaje = 100;
    const pctPuntaje = puntaje != null ? Math.min((puntaje / maxPuntaje) * 100, 100) : 0;

    const renderValue = (value: any) => {
        if (value === null || value === undefined) return <span className="text-gray-400">-</span>;
        if (typeof value === 'boolean') {
            return value
                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Cumple</span>
                : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ No cumple</span>;
        }
        if (typeof value === 'number') {
            return <span className="font-semibold text-gray-900">{value}</span>;
        }
        if (typeof value === 'object') {
            return (
                <pre className="text-xs bg-gray-100 rounded-lg p-2 overflow-x-auto max-w-md">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }
        return <span className="text-gray-800">{String(value)}</span>;
    };

    return (
        <div className="card space-y-6">
            {/* Header with Score */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Resultados de Evaluación</h2>
                    <p className="text-xs text-gray-500">
                        Evaluado el {new Date(resultado.fecha_evaluacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                {resultado.url_pdf_final && (
                    <a
                        href={resultado.url_pdf_final}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary flex items-center space-x-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>Descargar PDF</span>
                    </a>
                )}
            </div>

            {/* Score Bar */}
            {puntaje != null && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Puntaje Total</span>
                        <span className="text-2xl font-bold text-gray-900">{puntaje} <span className="text-sm text-gray-400">/ {maxPuntaje}</span></span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="h-3 rounded-full transition-all duration-500"
                            style={{
                                width: `${pctPuntaje}%`,
                                backgroundColor: pctPuntaje >= 70 ? '#10b981' : pctPuntaje >= 40 ? '#f59e0b' : '#ef4444'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Sections */}
            {allSectionNames.map(sectionName => {
                const items = sections[sectionName];
                if (!items || items.length === 0) return null;

                const Icon = SECTION_ICONS[sectionName] || Award;
                const isExpanded = expandedSections[sectionName] ?? true;
                const colorClass = SECTION_COLORS[sectionName] || SECTION_COLORS['Otros'];
                const headerColor = SECTION_HEADER_COLORS[sectionName] || SECTION_HEADER_COLORS['Otros'];

                return (
                    <div key={sectionName} className={`rounded-xl border overflow-hidden ${colorClass}`}>
                        {/* Section Header */}
                        <button
                            onClick={() => toggleSection(sectionName)}
                            className={`w-full flex items-center justify-between px-4 py-3 ${headerColor} hover:opacity-90 transition-opacity`}
                        >
                            <div className="flex items-center space-x-2">
                                <Icon className="w-5 h-5" />
                                <span className="font-semibold">{sectionName}</span>
                                <span className="text-xs opacity-70">({items.length} campos)</span>
                            </div>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {/* Section Content */}
                        {isExpanded && (
                            <div className="divide-y divide-gray-200/50">
                                {items.map(item => (
                                    <div key={item.key} className="flex items-start justify-between px-4 py-3">
                                        <span className="text-sm text-gray-600 min-w-[200px]">{item.label}</span>
                                        <div className="text-right">{renderValue(item.value)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Empty State */}
            {Object.keys(mapeo).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                    <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>El mapeo de formato aún no contiene datos.</p>
                    <p className="text-xs mt-1">Los resultados aparecerán cuando n8n complete el procesamiento.</p>
                </div>
            )}
        </div>
    );
}
