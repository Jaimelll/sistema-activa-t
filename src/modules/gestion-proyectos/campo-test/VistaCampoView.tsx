// @ts-nocheck
/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const MapSection = dynamic(() => import('./MapSection'), { ssr: false, loading: () => <div className="h-[350px] bg-slate-100 animate-pulse flex items-center justify-center">Cargando mapa...</div> });

import SideCard from './SideCard';
import DynamicForm from './DynamicForm';
import EvidenceCapture from './EvidenceCapture';
import { 
    getPlanesSupervisionPendientes, 
    guardarAvanceSupervision, 
    getPlanById, 
    getSupervisionByPlanId,
    finalizarPlanSupervision
} from './actions';
import { ArrowLeft, CheckCircle2, Loader2, ChevronRight, ClipboardCheck, Info, X, AlertTriangle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VistaCampoView() {
    const [step, setStep] = useState('info');
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [answers, setAnswers] = useState({});
    const [evidence, setEvidence] = useState({ photos: [] });
    const [saving, setSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [toasts, setToasts] = useState([]);
    const router = useRouter();

    const searchParams = useSearchParams();
    const [userEmail, setUserEmail] = useState('');
    
    // Forzamos readOnly si el parámetro está en la URL o si el usuario es erizabal (Gerencia)
    const isReadOnly = (searchParams.get('readOnly') === 'true') || (userEmail === 'erizabal@fondoempleo.com.pe');
    const planId = searchParams.get('id');

    const containerClass = "w-full max-w-4xl mx-auto ml-0 lg:ml-72 p-4 pb-12";

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);

                // Obtener correo del usuario actual para validaciones de rol
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.email) setUserEmail(user.email.toLowerCase());

                let proyecto = null;
                const isAuditUser = ['jduran@fondoempleo.com.pe', 'rcarbajal@fondoempleo.com.pe', 'erizabal@fondoempleo.com.pe'].includes(user?.email?.toLowerCase() || '');

                if (planId) {
                    proyecto = await getPlanById(planId);
                } else {
                    // Si es usuario de auditoría o modo lectura, saltamos el filtro de monitor
                    const data = await getPlanesSupervisionPendientes(isReadOnly || isAuditUser);
                    if (data?.length) proyecto = data[0];
                }

                if (proyecto) {
                    console.log('--- DIAGNÓSTICO DE CARGA ---');
                    console.log('Plan ID:', proyecto.id);
                    
                    setIsLoadingData(true);
                    const registro = await getSupervisionByPlanId(proyecto.id);
                    setIsLoadingData(false);
                    
                    console.log('Registro encontrado en supervisiones_registro:', registro);

                    if (registro) {
                        setAnswers(registro.respuestas_json || {});
                        setEvidence({ photos: registro.fotos_urls || [] });
                        proyecto.latitud_modificada = registro.latitud;
                        proyecto.longitud_modificada = registro.longitud;
                        console.log('Datos inyectados en el estado local.');
                    }

                    if (isReadOnly) {
                        proyecto.isReadOnly = true;
                    }

                    // Transformar checklist_preguntas
                    let preguntasArray = [];
                    if (proyecto.checklist_preguntas) {
                        if (Array.isArray(proyecto.checklist_preguntas)) {
                            preguntasArray = proyecto.checklist_preguntas;
                        } else if (typeof proyecto.checklist_preguntas === 'object') {
                            preguntasArray = Object.entries(proyecto.checklist_preguntas).map(([id, pregunta]) => ({
                                id, pregunta, tipo: 'text'
                            }));
                        }
                    }
                    proyecto.checklist_preguntas = preguntasArray;

                    if (!proyecto.latitud_modificada) {
                        proyecto.latitud_modificada = -12.046374;
                        proyecto.longitud_modificada = -77.042793;
                    }

                    setSelectedProject(proyecto);
                } else {
                    setError('Sin proyectos pendientes');
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [planId, isReadOnly]);

    const goToStep = (newStep) => setStep(newStep);

    const showToast = (message, type) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const handleSaveProgress = async () => {
        if (!selectedProject) return;
        try {
            setSaving(true);
            const lat = selectedProject.latitud_modificada ?? -12.046374;
            const lng = selectedProject.longitud_modificada ?? -77.042793;
            await guardarAvanceSupervision({
                id_plan: selectedProject.id,
                id_proyecto: selectedProject.id_proyecto,
                respuestas: answers,
                fotos: evidence.photos,
                latitud: lat,
                longitud: lng,
            });
            showToast('Progreso guardado correctamente', 'success');
        } catch (e) {
            showToast('Error al guardar: ' + e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={containerClass}>Cargando...</div>;
    if (error) return <div className={`${containerClass} text-red-600 p-4`}>{error}</div>;
    if (!selectedProject) return <div className={containerClass}>Sin proyecto</div>;
    if (step === 'success') return (
        <div className={`${containerClass} flex flex-col items-center justify-center`}>
            <CheckCircle2 className="text-green-600 mb-4" size={80} />
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded">Finalizar</button>
        </div>
    );

    return (
        <div className={containerClass}>
            <header className="bg-white/80 backdrop-blur-md border border-slate-100 p-4 rounded-2xl mb-8 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/dashboard/campo"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 flex items-center gap-2 font-bold text-xs uppercase"
                    >
                        <ArrowLeft size={20} /> <span className="hidden md:inline">Mis Tareas</span>
                    </Link>
                    <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Módulo de Supervisión</h1>
                </div>
                <div className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">
                    Paso: {step}
                </div>
                {isReadOnly && (
                    <button 
                        onClick={() => window.location.href = '/dashboard/gestion-monitores'}
                        className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={16} /> VOLVER A GESTIÓN
                    </button>
                )}
            </header>

            {step === 'info' && (
                <div className="w-full">
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b border-slate-100 pb-4">Información General</h2>
                        <SideCard 
                            proyecto={selectedProject} 
                            onStart={() => goToStep('form')}
                        />
                        {isReadOnly && (
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                <button onClick={() => goToStep('form')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 uppercase text-sm tracking-widest">
                                    Siguiente <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 'form' && (
                <div className="w-full bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                        <button onClick={() => goToStep('info')} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <ArrowLeft size={24} />
                        </button>
                    <h2 className="text-2xl font-bold text-slate-800">Checklist de Supervisión {isReadOnly && '(MODO LECTURA)'}</h2>
                    </div>
                    {isLoadingData ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 size={40} className="animate-spin text-blue-600" />
                            <p className="font-bold animate-pulse uppercase text-xs tracking-widest">Sincronizando datos de campo...</p>
                        </div>
                    ) : (
                        <DynamicForm 
                            questions={selectedProject?.checklist_preguntas || []} 
                            onUpdate={setAnswers} 
                            disabled={isReadOnly}
                            initialAnswers={answers}
                        />
                    )}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between gap-4 relative z-20">
                        <button onClick={() => goToStep('info')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest">
                            <ArrowLeft size={20} /> Atrás
                        </button>
                        <button onClick={() => goToStep('evidence')} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest">
                            {isReadOnly ? 'Ver Evidencias' : 'Siguiente'}
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {step === 'evidence' && (
                <div className="w-full bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                        <button onClick={() => goToStep('form')} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-2xl font-bold text-slate-800">Registro de Evidencias {isReadOnly && '(MODO LECTURA)'}</h2>
                    </div>
                    <EvidenceCapture 
                        onCapture={setEvidence} 
                        disabled={isReadOnly} 
                        planId={selectedProject?.id}
                        initialPhotos={evidence.photos}
                    />
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between gap-4 relative z-20">
                        <button onClick={() => goToStep('form')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest">
                            <ArrowLeft size={20} /> Atrás
                        </button>
                        <button onClick={() => goToStep('map')} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest">
                            {isReadOnly ? 'Ver Ubicación' : 'Siguiente'}
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {step === 'map' && (
                <div className="w-full bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                        <button onClick={() => goToStep('evidence')} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-2xl font-bold text-slate-800">Validación de Ubicación {isReadOnly && '(MODO LECTURA)'}</h2>
                    </div>
                    <div className="h-[450px] w-full rounded-2xl overflow-hidden border-2 border-slate-100 mb-6 shadow-inner">
                        <MapSection
                            selectedProject={selectedProject}
                            onLocationChange={(lat, lng) => {
                                if (!isReadOnly) {
                                    setSelectedProject(prev => ({ ...prev, latitud_modificada: lat, longitud_modificada: lng }));
                                }
                            }}
                        />
                    </div>
                    {!isReadOnly && (
                        <div className="mt-8 pt-6 border-t border-slate-100 relative z-20 space-y-4">
                            <button onClick={() => goToStep('evidence')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest">
                                <ArrowLeft size={20} /> Atrás
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={handleSaveProgress}
                                    disabled={saving}
                                    className="w-full bg-white hover:bg-slate-50 text-blue-600 border-2 border-blue-600 font-bold py-4 rounded-xl text-lg shadow-sm transition-all flex items-center justify-center gap-3 uppercase"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={24} /> : <ClipboardCheck size={24} />}
                                    {saving ? 'GUARDANDO...' : 'GUARDAR AVANCE'}
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!selectedProject) return;
                                        try {
                                            setSaving(true);
                                            const lat = selectedProject.latitud_modificada ?? -12.046374;
                                            const lng = selectedProject.longitud_modificada ?? -77.042793;

                                            // Finalización integral: guarda datos y cambia estado en un solo paso
                                            await finalizarPlanSupervision({
                                                id_plan: selectedProject.id,
                                                id_proyecto: selectedProject.id_proyecto,
                                                respuestas: answers,
                                                fotos: evidence.photos,
                                                latitud: lat,
                                                longitud: lng,
                                                firma: null
                                            });
                                            
                                            showToast('Supervisión finalizada correctamente', 'success');
                                            
                                            // Redirigir después de un breve delay para ver el toast
                                            setTimeout(() => {
                                                window.location.href = '/dashboard/campo';
                                            }, 1500);
                                        } catch (err) {
                                            showToast('Error al finalizar: ' + err.message, 'error');
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    disabled={saving}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-tight"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                                    {saving ? 'FINALIZANDO...' : 'FINALIZAR SUPERVISIÓN'}
                                </button>
                            </div>
                        </div>
                    )}
                    {isReadOnly && (
                        <div className="space-y-6 mt-8 pt-6 border-t border-slate-100 relative z-20">
                            <div className="p-4 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-3 border border-blue-100 shadow-sm">
                                <Info size={24} />
                                <p className="font-bold uppercase tracking-tight text-sm">Estás en modo de visualización de auditoría.</p>
                            </div>
                            <div className="flex justify-between gap-4">
                                <button onClick={() => goToStep('evidence')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest">
                                    <ArrowLeft size={20} /> Atrás
                                </button>
                                <button 
                                    onClick={() => window.location.href = '/dashboard/gestion-monitores'}
                                    className="flex-[2] bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-black shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-lg tracking-wider"
                                >
                                    <CheckCircle2 size={24} className="text-green-400" /> FINALIZAR AUDITORÍA
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Toast Notifications */}
            <div className="fixed bottom-6 right-6 z-[9999] space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-bold animate-in ${
                            toast.type === 'success'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        {toast.message}
                        <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 opacity-50 hover:opacity-100">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes animateIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-in { animation: animateIn 0.2s ease-out; }
            `}
            </style>
        </div>
    );
}