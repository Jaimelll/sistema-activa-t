'use client';

import { useState, useEffect, useRef } from 'react';
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
    ChevronRight,
    ChevronLeft,
    Eye,
    Pencil,
    X,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { SUPER_ADMIN } from '@/config/permissions';
import { 
    getProyectosList, 
    getMonitoresList, 
    getPlanesSupervision, 
    crearPlanSupervision,
    actualizarPlanSupervision,
    eliminarPlanSupervision
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

const PAGE_SIZE = 5;

export default function GestionMonitoresView() {
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [monitores, setMonitores] = useState<Monitor[]>([]);
    const [planes, setPlanes] = useState<Plan[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMonitores, setErrorMonitores] = useState<string | null>(null);
    const [errorFetch, setErrorFetch] = useState<any>(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [showProjectList, setShowProjectList] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Edit mode state
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    // Delete confirmation modal
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; planId: string | null }>({ open: false, planId: null });
    const [deleting, setDeleting] = useState(false);
    // User email for permissions
    const [userEmail, setUserEmail] = useState('');
    // Toast notifications
    const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

    const formRef = useRef<HTMLFormElement>(null);

    const [formData, setFormData] = useState({
        id_proyecto: '',
        id_supervisor: '',
        fecha_programada: '',
    });
    const [checklist, setChecklist] = useState<ChecklistItem[]>([
        { id: Math.random().toString(36).substr(2, 9), pregunta: '', tipo: 'cumple_no_cumple' }
    ]);

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    // Permission check
    const canManagePlans = userEmail === SUPER_ADMIN || userEmail === 'erizabal@fondoempleo.com.pe';

    useEffect(() => {
        async function loadInitialData() {
            try {
                // Load user email
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.email) setUserEmail(user.email.toLowerCase());

                const [proyData, planData, monData] = await Promise.all([
                    getProyectosList(),
                    getPlanesSupervision(),
                    getMonitoresList()
                ]);

                if (proyData) setProyectos(proyData);
                if (planData) setPlanes(planData || []);
                if (monData) setMonitores(monData);
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    const resetForm = () => {
        setFormData({ id_proyecto: '', id_supervisor: '', fecha_programada: '' });
        setProjectSearch('');
        setChecklist([{ id: Math.random().toString(36).substr(2, 9), pregunta: '', tipo: 'cumple_no_cumple' }]);
        setEditingPlanId(null);
    };

    const addQuestion = () => {
        setChecklist([...checklist, { id: Math.random().toString(36).substr(2, 9), pregunta: '', tipo: 'cumple_no_cumple' }]);
    };

    const removeQuestion = (id: string) => {
        setChecklist(checklist.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, field: string, value: string) => {
        setChecklist(checklist.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleEditPlan = (plan: Plan) => {
        // Populate form with plan data
        setEditingPlanId(plan.id);
        setFormData({
            id_proyecto: plan.proyecto?.id?.toString() || '',
            id_supervisor: (plan as any).id_supervisor || '',
            fecha_programada: plan.fecha_programada?.split('T')[0] || plan.fecha_programada || '',
        });
        const projLabel = plan.proyecto ? `[${plan.proyecto.id}] | [${plan.proyecto.codigo_proyecto}] | ${plan.proyecto.nombre}` : '';
        setProjectSearch(projLabel);
        // Load checklist if available
        const planAny = plan as any;
        if (planAny.checklist_preguntas && Array.isArray(planAny.checklist_preguntas)) {
            setChecklist(planAny.checklist_preguntas.map((q: any) => ({
                id: q.id || Math.random().toString(36).substr(2, 9),
                pregunta: q.pregunta || '',
                tipo: q.tipo || 'cumple_no_cumple'
            })));
        } else {
            setChecklist([{ id: Math.random().toString(36).substr(2, 9), pregunta: '', tipo: 'cumple_no_cumple' }]);
        }
        // Scroll to form
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleDeletePlan = async () => {
        if (!deleteModal.planId) return;
        try {
            setDeleting(true);
            await eliminarPlanSupervision(deleteModal.planId);
            const updatedPlanes = await getPlanesSupervision();
            setPlanes(updatedPlanes || []);
            setDeleteModal({ open: false, planId: null });
            showToast('Plan eliminado exitosamente', 'success');
        } catch (err: any) {
            showToast('Error al eliminar: ' + err.message, 'error');
        } finally {
            setDeleting(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id_proyecto || !formData.id_supervisor || !formData.fecha_programada) {
            showToast('Por favor complete todos los campos básicos', 'error');
            return;
        }
        try {
            setSaving(true);
            const checklistJSON = checklist.map(q => ({ id: q.id, pregunta: q.pregunta, tipo: q.tipo }));
            
            if (editingPlanId) {
                // UPDATE mode
                await actualizarPlanSupervision(editingPlanId, {
                    id_proyecto: Number(formData.id_proyecto),
                    id_supervisor: formData.id_supervisor,
                    fecha_programada: formData.fecha_programada,
                    checklist_preguntas: checklistJSON
                });
                showToast('Plan actualizado exitosamente', 'success');
            } else {
                // CREATE mode
                await crearPlanSupervision({
                    id_proyecto: Number(formData.id_proyecto),
                    id_supervisor: formData.id_supervisor,
                    fecha_programada: formData.fecha_programada,
                    checklist_preguntas: checklistJSON
                });
                showToast('Plan de supervisión creado exitosamente', 'success');
            }
            
            resetForm();
            const updatedPlanes = await getPlanesSupervision();
            setPlanes(updatedPlanes || []);
        } catch (err: any) {
            showToast('Error al guardar: ' + err.message, 'error');
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
                        GESTIÓN DE MONITORES
                    </h1>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl mx-auto">
                {/* Formulario de Creación */}
                <div className="w-full">
                    <form ref={formRef} onSubmit={handleSave} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${editingPlanId ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}>
                        <div className={`p-6 border-b ${editingPlanId ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                {editingPlanId ? <Pencil className="text-amber-600" size={18} /> : <Plus className="text-blue-600" size={18} />}
                                {editingPlanId ? 'Editando Plan de Supervisión' : 'Nuevo Plan de Supervisión'}
                            </h2>
                            {editingPlanId && (
                                <p className="text-[11px] text-amber-600 mt-1 font-medium">Modifique los campos y presione Actualizar para guardar los cambios.</p>
                            )}
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
                                                        setProjectSearch(`[${p.id}] | [${p.codigo_proyecto}] | ${p.nombre}`);
                                                        setShowProjectList(false);
                                                    }}
                                                >
                                                    <div className="text-[11px] font-bold text-slate-700">
                                                        [{p.id}] | [{p.codigo_proyecto}] | {p.nombre}
                                                    </div>
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

                        <div className={`p-6 border-t ${editingPlanId ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                            <button 
                                type="submit"
                                disabled={saving}
                                className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white ${
                                    editingPlanId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {saving ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
                                {saving ? 'GUARDANDO...' : (editingPlanId ? 'ACTUALIZAR PLAN DE SUPERVISIÓN' : 'CREAR PLAN DE SUPERVISIÓN')}
                            </button>
                            {editingPlanId && (
                                <button 
                                    type="button"
                                    onClick={resetForm}
                                    className="w-full mt-2 text-slate-500 hover:text-slate-700 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-sm hover:bg-slate-100"
                                >
                                    <X size={16} /> Cancelar Edición
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Lista de Planes */}
                <div className="w-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardList className="text-blue-600" size={18} />
                                Planes Programados
                            </h2>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {planes.length} registros
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-8 py-5">Proyecto</th>
                                        <th className="px-8 py-5">Monitor</th>
                                        <th className="px-8 py-5">Fecha</th>
                                        <th className="px-8 py-5">Estado</th>
                                        <th className="px-8 py-5 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {planes
                                        .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                                        .map((plan) => (
                                        <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 min-w-[450px]">
                                                <div className="text-sm font-bold text-slate-800 leading-tight">
                                                    [{plan.proyecto?.id || '?'}] | [{plan.proyecto?.codigo_proyecto || 'S/C'}] | {plan.proyecto?.nombre || 'S/N'}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-2 italic leading-relaxed">
                                                    {plan.proyecto?.nombre ? 'Información completa del proyecto disponible en modo auditoría.' : 'Sin descripción adicional'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <User size={14} className="text-slate-400" />
                                                    {plan.monitor?.nombre || 'No asignado'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(plan.fecha_programada).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                    plan.estado === 'pendiente' 
                                                    ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                                    : 'bg-green-50 text-green-600 border-green-100'
                                                }`}>
                                                    {plan.estado === 'pendiente' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                                                    {plan.estado}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link 
                                                        href={`/dashboard/campo?id=${plan.id}&readOnly=true`}
                                                        target="_blank"
                                                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all group"
                                                        title="Visualizar en modo auditoría"
                                                    >
                                                        <Eye size={18} className="group-hover:scale-110 transition-transform" />
                                                    </Link>
                                                    {canManagePlans && plan.estado === 'pendiente' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditPlan(plan)}
                                                                className="inline-flex items-center justify-center p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-all group"
                                                                title="Editar Plan"
                                                            >
                                                                <Pencil size={18} className="group-hover:scale-110 transition-transform" />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteModal({ open: true, planId: plan.id })}
                                                                className="inline-flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-full transition-all group"
                                                                title="Eliminar Plan"
                                                            >
                                                                <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {planes.length > PAGE_SIZE && (
                            <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    Página {currentPage} de {Math.ceil(planes.length / PAGE_SIZE)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Página anterior"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {Array.from({ length: Math.ceil(planes.length / PAGE_SIZE) }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                page === currentPage
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(planes.length / PAGE_SIZE), p + 1))}
                                        disabled={currentPage === Math.ceil(planes.length / PAGE_SIZE)}
                                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Página siguiente"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                @keyframes animateIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-in { animation: animateIn 0.2s ease-out; }
            `}
            </style>

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in">
                        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-full">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">Confirmar Eliminación</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 text-sm leading-relaxed">
                                ¿Está seguro de eliminar este plan de supervisión? <strong className="text-red-600">Esta acción no se puede deshacer.</strong>
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteModal({ open: false, planId: null })}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeletePlan}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting ? <Clock className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="fixed bottom-6 right-6 z-50 space-y-2">
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
        </div>
    );
}
