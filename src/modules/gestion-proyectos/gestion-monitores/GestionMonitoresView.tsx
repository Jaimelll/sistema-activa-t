'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Save, 
    ClipboardList, 
    User, 
    Calendar, 
    CheckCircle2, 
    Clock,
    LayoutDashboard,
    ChevronRight
} from 'lucide-react';
import { 
    getProyectosList, 
    getMonitoresList, 
    getPlanesSupervision, 
    crearPlanSupervision 
} from './actions';

interface Proyecto {
    id: number;
    codigo_proyecto: string;
    nombre: string;
}

interface Monitor {
    id: string;
    nombre: string;
}

interface Plan {
    id: string;
    proyecto: any;
    monitor: any;
    fecha_programada: string;
    estado: string;
}

interface ChecklistItem {
    id: string;
    pregunta: string;
    tipo: string;
}

export default function GestionMonitoresView() {
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    // INYECCIÓN FORZADA DE DATOS (HARDCODED) - TEST V2
    const [monitores, setMonitores] = useState<Monitor[]>([
        { id: 'hc-1', nombre: 'Juan Carlos Leclere' },
        { id: 'hc-2', nombre: 'José Bozzo' }
    ]);
    const [planes, setPlanes] = useState<Plan[]>([
        {
            id: 'test-1',
            proyecto: { id: 294, codigo_proyecto: 'PRY-294', nombre: 'PROYECTO DE PRUEBA V2' },
            monitor: { nombre: 'Juan Carlos Leclere' },
            fecha_programada: new Date().toISOString(),
            estado: 'pendiente'
        }
    ]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [showProjectList, setShowProjectList] = useState(false);

    const [formData, setFormData] = useState({
        id_proyecto: '',
        id_supervisor: '',
        fecha_programada: '',
    });
    const [checklist, setChecklist] = useState<ChecklistItem[]>([
        { id: Math.random().toString(36).substr(2, 9), pregunta: '', tipo: 'cumple_no_cumple' }
    ]);

    useEffect(() => {
        async function loadData() {
            try {
                const [proyData, monData, planData] = await Promise.all([
                    getProyectosList(),
                    getMonitoresList(),
                    getPlanesSupervision()
                ]);
                
                if (proyData) setProyectos(proyData);
                
                // Si llegan datos reales, los añadimos a los hardcoded o los reemplazamos
                if (monData && monData.length > 0) {
                    setMonitores(monData);
                }
                if (planData && planData.length > 0) {
                    setPlanes(planData);
                }
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const addQuestion = () => {
        setChecklist([...checklist, { id: Math.random().toString(36).substr(2, 9), pregunta: '', tipo: 'cumple_no_cumple' }]);
    };

    const removeQuestion = (id: string) => {
        setChecklist(checklist.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, field: string, value: string) => {
        setChecklist(checklist.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id_proyecto || !formData.id_supervisor || !formData.fecha_programada) {
            alert('Por favor complete todos los campos básicos');
            return;
        }
        try {
            setSaving(true);
            const checklistJSON = checklist.map(q => ({ id: q.id, pregunta: q.pregunta, tipo: q.tipo }));
            await crearPlanSupervision({
                id_proyecto: Number(formData.id_proyecto),
                id_supervisor: formData.id_supervisor,
                fecha_programada: formData.fecha_programada,
                checklist_preguntas: checklistJSON
            });
            setFormData({ id_proyecto: '', id_supervisor: '', fecha_programada: '' });
            setProjectSearch('');
            setChecklist([{ id: Math.random().toString(36).substr(2, 9), pregunta: '', tipo: 'cumple_no_cumple' }]);
            
            const updatedPlanes = await getPlanesSupervision();
            if (updatedPlanes?.length > 0) setPlanes(updatedPlanes);
            
            alert('Plan de supervisión creado exitosamente');
        } catch (err: any) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-500">Cargando módulo de gestión...</div>;

    return (
        <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
                        <LayoutDashboard className="text-blue-600" />
                        GESTIÓN DE MONITORES (V2 - TEST)
                    </h1>
                    <p className="text-slate-500 text-sm italic font-bold">Modo: Inyección Forzada Activa</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario de Creación */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Plus className="text-blue-600" size={18} />
                                Nuevo Plan de Supervisión
                            </h2>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="relative">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Proyecto</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Buscar por ID..."
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-10"
                                        value={projectSearch}
                                        onChange={(e) => {
                                            setProjectSearch(e.target.value);
                                            setShowProjectList(true);
                                        }}
                                        onFocus={() => setShowProjectList(true)}
                                    />
                                    {formData.id_proyecto && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    )}
                                </div>
                                
                                {showProjectList && projectSearch && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {proyectos
                                            .filter(p => 
                                                p.id.toString().includes(projectSearch) || 
                                                p.nombre.toLowerCase().includes(projectSearch.toLowerCase())
                                            )
                                            .map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                                    onClick={() => {
                                                        setFormData({...formData, id_proyecto: p.id.toString()});
                                                        setProjectSearch(`[${p.id}] | ${p.nombre}`);
                                                        setShowProjectList(false);
                                                    }}
                                                >
                                                    <div className="text-xs font-bold text-slate-700">[{p.id}] | {p.codigo_proyecto}</div>
                                                    <div className="text-[11px] text-slate-500 truncate">{p.nombre}</div>
                                                </button>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monitor Responsable</label>
                                <select 
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.id_supervisor}
                                    onChange={(e) => setFormData({...formData, id_supervisor: e.target.value})}
                                >
                                    <option value="">Seleccione Monitor</option>
                                    {monitores.map(m => (
                                        <option key={m.id} value={m.id}>{m.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha Programada</label>
                                <input 
                                    type="date"
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.fecha_programada}
                                    onChange={(e) => setFormData({...formData, fecha_programada: e.target.value})}
                                />
                            </div>

                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configurar Checklist</label>
                                    <button 
                                        type="button" 
                                        onClick={addQuestion}
                                        className="text-blue-600 hover:text-blue-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Añadir Pregunta
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {checklist.map((q, idx) => (
                                        <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 relative group">
                                            <button 
                                                type="button"
                                                onClick={() => removeQuestion(q.id)}
                                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <input 
                                                type="text" 
                                                placeholder={`Pregunta #${idx + 1}`}
                                                className="w-full bg-transparent border-b border-slate-200 text-sm py-1 outline-none focus:border-blue-500 transition-all"
                                                value={q.pregunta}
                                                onChange={(e) => updateQuestion(q.id, 'pregunta', e.target.value)}
                                            />
                                            <select 
                                                className="w-full bg-transparent text-[10px] text-slate-500 font-bold uppercase outline-none"
                                                value={q.tipo}
                                                onChange={(e) => updateQuestion(q.id, 'tipo', e.target.value)}
                                            >
                                                <option value="cumple_no_cumple">Cumple / No Cumple</option>
                                                <option value="texto">Texto Libre</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <button 
                                type="submit"
                                disabled={saving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
                                {saving ? 'GUARDANDO...' : 'CREAR PLAN DE SUPERVISIÓN'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lista de Planes */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardList className="text-blue-600" size={18} />
                                Planes Programados
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-4">Proyecto</th>
                                        <th className="px-6 py-4">Monitor</th>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {planes.map((plan) => (
                                        <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-slate-800">
                                                    [{plan.proyecto?.id || '?'}] | [{plan.proyecto?.codigo_proyecto || 'S/C'}]
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate max-w-[250px]">
                                                    {plan.proyecto?.nombre || 'S/N'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <User size={14} className="text-slate-400" />
                                                    {plan.monitor?.nombre || 'No asignado'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(plan.fecha_programada).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                                    <Clock size={12} /> {plan.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
}
