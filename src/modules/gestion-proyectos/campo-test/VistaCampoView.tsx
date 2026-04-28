// @ts-nocheck
/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapSection = dynamic(() => import('./MapSection'), { ssr: false, loading: () => <div className="h-[350px] bg-slate-100 animate-pulse flex items-center justify-center">Cargando mapa...</div> });

import SideCard from './SideCard';
import DynamicForm from './DynamicForm';
import EvidenceCapture from './EvidenceCapture';
import { getPlanesSupervisionPendientes, guardarSupervision } from './actions';
import { ArrowLeft, CheckCircle2, Loader2, ChevronRight, ClipboardCheck, Info } from 'lucide-react';

export default function VistaCampoView() {
    const [step, setStep] = useState('info');
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [answers, setAnswers] = useState({});
    const [evidence, setEvidence] = useState({ photos: [], signature: '' });
    const [saving, setSaving] = useState(false);

    const containerStyle = {
        position: 'fixed', top: 0, right: 0, bottom: 0, left: '288px',
        overflowY: 'auto', backgroundColor: '#f8fafc', zIndex: 10,
        padding: '20px',
    };

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const data = await getPlanesSupervisionPendientes();
                console.log('VistaCampoView: datos recibidos =', data);
                if (data?.length) {
                    let proyecto = data[0];
                    // Transformar checklist_preguntas de objeto a array
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

                    // Inicializar coordenadas (ahora sabemos que proyectos no tiene latitud/longitud)
                    const latOriginal = -12.046374;
                    const lngOriginal = -77.042793;
                    proyecto.latitud_modificada = latOriginal;
                    proyecto.longitud_modificada = lngOriginal;

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
    }, []);

    const goToStep = (newStep) => setStep(newStep);

    const handleFinish = async () => {
        if (!selectedProject) return;
        try {
            setSaving(true);
            const lat = selectedProject.latitud_modificada ?? -12.046374;
            const lng = selectedProject.longitud_modificada ?? -77.042793;
            await guardarSupervision({
                id_plan: selectedProject.id,
                id_proyecto: selectedProject.id_proyecto,
                respuestas: answers,
                fotos: evidence.photos,
                firma: evidence.signature,
                latitud: lat,
                longitud: lng,
            });
            setStep('success');
        } catch (e) {
            alert('Error al guardar: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={containerStyle}>Cargando...</div>;
    if (error) return <div style={containerStyle} className="text-red-600 p-4">{error}</div>;
    if (!selectedProject) return <div style={containerStyle}>Sin proyecto</div>;
    if (step === 'success') return (
        <div style={containerStyle} className="flex flex-col items-center justify-center">
            <CheckCircle2 className="text-green-600 mb-4" size={80} />
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded">Finalizar</button>
        </div>
    );

    return (
        <div style={containerStyle}>
            <div className="fixed top-2 right-2 bg-black text-white px-2 py-1 rounded text-xs z-50">Paso: {step}</div>

            <header className="sticky top-0 bg-white border-b p-4 mb-6">Control de Campo</header>

            {step === 'info' && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-2xl shadow">
                        <h2 className="text-2xl font-bold mb-4">Información General</h2>
                        <SideCard 
                            proyecto={selectedProject} 
                            onStart={() => goToStep('form')}
                        />
                    </div>
                </div>
            )}

            {step === 'form' && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow">
                    <h2 className="text-2xl font-bold">Checklist</h2>
                    <DynamicForm questions={selectedProject?.checklist_preguntas || []} onUpdate={setAnswers} />
                    <button onClick={() => goToStep('evidence')} className="mt-4 w-full bg-blue-600 text-white py-2 rounded">Continuar</button>
                </div>
            )}

            {step === 'evidence' && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow">
                    <h2 className="text-2xl font-bold">Evidencias y Firma</h2>
                    <EvidenceCapture onCapture={setEvidence} />
                    <button onClick={() => goToStep('map')} className="mt-4 w-full bg-blue-600 text-white py-2 rounded">Siguiente</button>
                </div>
            )}

            {step === 'map' && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow">
                    <h2 className="text-2xl font-bold">Ubicación final</h2>
                    <div className="h-[350px] w-full rounded-xl overflow-hidden border-2 border-gray-200 mb-4">
                        <MapSection
                            selectedProject={selectedProject}
                            onLocationChange={(lat, lng) => setSelectedProject(prev => ({ ...prev, latitud_modificada: lat, longitud_modificada: lng }))}
                        />
                    </div>
                    <button
                        onClick={handleFinish}
                        disabled={saving}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-lg shadow-lg transition-colors"
                    >
                        {saving ? <Loader2 className="animate-spin inline mr-2" size={20} /> : <CheckCircle2 className="inline mr-2" size={20} />}
                        {saving ? 'GUARDANDO...' : 'FINALIZAR SUPERVISIÓN'}
                    </button>
                </div>
            )}
        </div>
    );
}