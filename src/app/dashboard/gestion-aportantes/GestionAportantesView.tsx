"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Building2, Wallet, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { X, Save } from "lucide-react";
import { createEmpresa, updateEmpresa, createAporte, updateAporte, deleteAporte } from "./actions";

interface Aporte { id: string; anio: number; monto: number; }
interface EmpresaRow {
    ruc: string;
    razon_social: string;
    ciiu_id: number;
    sector: string;
    ciiu_codigo: string;
    total_aportes: number;
    aportes_count: number;
    aportes: Aporte[];
}

// ─── Small inline Modal ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function ModalFooter({ onClose, isSubmitting, label = 'Guardar' }: { onClose: () => void; isSubmitting: boolean; label?: string }) {
    return (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20">
                {isSubmitting ? 'Guardando...' : <><Save className="w-4 h-4" />{label}</>}
            </button>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner text-sm";
const fmt = (v: number) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Main Component ────────────────────────────────────────────────────────────
export default function GestionAportantesView({ initialData, sectores }: { initialData: EmpresaRow[]; sectores: any[]; }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Search & Expand
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedRuc, setExpandedRuc] = useState<string | null>(null);

    // New Empresa modal
    const [showNuevaEmpresa, setShowNuevaEmpresa] = useState(false);
    const [nuevaEmpresa, setNuevaEmpresa] = useState({ ruc: "", razon_social: "", ciiu_id: "" });

    // Edit Empresa modal
    const [editingEmpresa, setEditingEmpresa] = useState<EmpresaRow | null>(null);
    const [editEmpresaForm, setEditEmpresaForm] = useState({ razon_social: "", ciiu_id: "" });

    // Manage Aportes modal
    const [managingEmpresa, setManagingEmpresa] = useState<EmpresaRow | null>(null);
    const [newAporteForm, setNewAporteForm] = useState({ anio: new Date().getFullYear().toString(), monto: "" });
    const [editingAporte, setEditingAporte] = useState<Aporte | null>(null);
    const [editAporteForm, setEditAporteForm] = useState({ anio: "", monto: "" });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return initialData;
        const term = searchTerm.toLowerCase();
        return initialData.filter(e => e.ruc.toLowerCase().includes(term) || e.razon_social.toLowerCase().includes(term));
    }, [initialData, searchTerm]);

    const refresh = () => startTransition(() => router.refresh());

    const withSubmit = async (fn: () => Promise<void>) => {
        setSubmitting(true); setError(null);
        try { await fn(); refresh(); }
        catch (e: any) { setError(e.message || 'Error inesperado'); throw e; }
        finally { setSubmitting(false); }
    };

    // CRUD handlers
    const handleCreateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        await withSubmit(async () => {
            await createEmpresa({ ruc: nuevaEmpresa.ruc.trim(), razon_social: nuevaEmpresa.razon_social.trim(), ciiu_id: Number(nuevaEmpresa.ciiu_id) });
            setShowNuevaEmpresa(false); setNuevaEmpresa({ ruc: "", razon_social: "", ciiu_id: "" });
        });
    };

    const handleUpdateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmpresa) return;
        await withSubmit(async () => {
            await updateEmpresa(editingEmpresa.ruc, { razon_social: editEmpresaForm.razon_social, ciiu_id: Number(editEmpresaForm.ciiu_id) });
            setEditingEmpresa(null);
        });
    };

    const handleCreateAporte = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!managingEmpresa) return;
        await withSubmit(async () => {
            await createAporte({ empresa_ruc: managingEmpresa.ruc, anio: Number(newAporteForm.anio), monto: Number(newAporteForm.monto) });
            setNewAporteForm({ anio: new Date().getFullYear().toString(), monto: "" });
        });
    };

    const handleUpdateAporte = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAporte) return;
        await withSubmit(async () => {
            await updateAporte(editingAporte.id, { anio: Number(editAporteForm.anio), monto: Number(editAporteForm.monto) });
            setEditingAporte(null);
        });
    };

    const handleDeleteAporte = async (id: string) => {
        if (!confirm('¿Eliminar este aporte?')) return;
        await withSubmit(async () => { await deleteAporte(id); });
    };

    const openEditEmpresa = (emp: EmpresaRow) => {
        setEditingEmpresa(emp);
        setEditEmpresaForm({ razon_social: emp.razon_social, ciiu_id: String(emp.ciiu_id || '') });
    };

    const openManageAportes = (emp: EmpresaRow) => {
        setManagingEmpresa(emp);
        setEditingAporte(null);
        setNewAporteForm({ anio: new Date().getFullYear().toString(), monto: "" });
    };

    const openEditAporte = (a: Aporte) => {
        setEditingAporte(a);
        setEditAporteForm({ anio: String(a.anio), monto: String(a.monto) });
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex justify-between">
                    {error} <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Buscar por RUC o Razón Social..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setShowNuevaEmpresa(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-md shadow-blue-500/20">
                        <Plus className="w-5 h-5" /> Nueva Empresa
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 w-8"></th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sector (CIIU)</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aportes</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total (S/)</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.slice(0, 100).map(empresa => (
                                <>
                                    <tr key={empresa.ruc} className="hover:bg-blue-50/40 transition-colors">
                                        {/* Expand Toggle */}
                                        <td className="px-4 py-4">
                                            <button onClick={() => setExpandedRuc(expandedRuc === empresa.ruc ? null : empresa.ruc)} className="text-gray-400 hover:text-blue-600 transition-colors">
                                                {expandedRuc === empresa.ruc ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-9 w-9 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-bold text-gray-900">{empresa.razon_social}</div>
                                                    <div className="text-xs text-gray-500">RUC: {empresa.ruc}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-800 max-w-xs truncate" title={empresa.sector}>{empresa.sector}</div>
                                            <div className="text-xs text-gray-400">{empresa.ciiu_codigo}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{empresa.aportes_count} {empresa.aportes_count === 1 ? 'aporte' : 'aportes'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{fmt(empresa.total_aportes)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEditEmpresa(empresa)} title="Editar empresa" className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" /> Editar
                                                </button>
                                                <button onClick={() => openManageAportes(empresa)} title="Gestionar aportes" className="inline-flex items-center gap-1 text-slate-500 hover:text-green-700 bg-slate-50 hover:bg-green-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                                                    <Wallet className="w-3.5 h-3.5" /> Aportes
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expandable Aportes History */}
                                    {expandedRuc === empresa.ruc && (
                                        <tr key={`${empresa.ruc}-expanded`} className="bg-slate-50/70">
                                            <td></td>
                                            <td colSpan={5} className="px-6 py-4">
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Historial de Aportes</p>
                                                {empresa.aportes.length === 0 ? (
                                                    <p className="text-sm text-gray-500 italic">Sin aportes registrados.</p>
                                                ) : (
                                                    <div className="overflow-hidden rounded-xl border border-gray-100">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left">Año</th>
                                                                    <th className="px-4 py-2 text-right">Monto (S/)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                {empresa.aportes.map(a => (
                                                                    <tr key={a.id} className="hover:bg-blue-50/50">
                                                                        <td className="px-4 py-2 font-semibold text-gray-700">{a.anio}</td>
                                                                        <td className="px-4 py-2 text-right font-bold text-gray-900">{fmt(a.monto)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && <div className="p-12 text-center text-gray-500 text-sm">No se encontraron empresas para "{searchTerm}".</div>}
                    {filteredData.length > 100 && <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 border-t">Mostrando 100 de {filteredData.length}. Use el buscador para encontrar empresas específicas.</div>}
                </div>
            </div>

            {/* ─── Modal: Nueva Empresa ─────────────────────────────────────────────── */}
            {showNuevaEmpresa && (
                <Modal title="Añadir Nueva Empresa" onClose={() => setShowNuevaEmpresa(false)}>
                    <form onSubmit={handleCreateEmpresa} className="p-6 space-y-4">
                        <Field label="RUC">
                            <input required name="ruc" maxLength={11} pattern="[0-9]{11}" value={nuevaEmpresa.ruc} onChange={e => setNuevaEmpresa(p => ({ ...p, ruc: e.target.value }))} className={inputCls} placeholder="20123456789" />
                        </Field>
                        <Field label="Razón Social">
                            <input required value={nuevaEmpresa.razon_social} onChange={e => setNuevaEmpresa(p => ({ ...p, razon_social: e.target.value }))} className={inputCls} placeholder="Empresa S.A.C." />
                        </Field>
                        <Field label="Sector Económico (CIIU)">
                            <select required value={nuevaEmpresa.ciiu_id} onChange={e => setNuevaEmpresa(p => ({ ...p, ciiu_id: e.target.value }))} className={inputCls}>
                                <option value="">Seleccione...</option>
                                {sectores.map(s => <option key={s.id} value={s.id}>{s.ciiu_codigo} - {s.seccion_desc}</option>)}
                            </select>
                        </Field>
                        <ModalFooter onClose={() => setShowNuevaEmpresa(false)} isSubmitting={submitting} label="Guardar Empresa" />
                    </form>
                </Modal>
            )}

            {/* ─── Modal: Editar Empresa ────────────────────────────────────────────── */}
            {editingEmpresa && (
                <Modal title={`Editar: ${editingEmpresa.razon_social}`} onClose={() => setEditingEmpresa(null)}>
                    <form onSubmit={handleUpdateEmpresa} className="p-6 space-y-4">
                        <Field label="RUC (no editable)">
                            <input disabled value={editingEmpresa.ruc} className={`${inputCls} opacity-60 cursor-not-allowed`} />
                        </Field>
                        <Field label="Razón Social">
                            <input required value={editEmpresaForm.razon_social} onChange={e => setEditEmpresaForm(p => ({ ...p, razon_social: e.target.value }))} className={inputCls} />
                        </Field>
                        <Field label="Sector Económico (CIIU)">
                            <select required value={editEmpresaForm.ciiu_id} onChange={e => setEditEmpresaForm(p => ({ ...p, ciiu_id: e.target.value }))} className={inputCls}>
                                <option value="">Seleccione...</option>
                                {sectores.map(s => <option key={s.id} value={s.id}>{s.ciiu_codigo} - {s.seccion_desc}</option>)}
                            </select>
                        </Field>
                        <ModalFooter onClose={() => setEditingEmpresa(null)} isSubmitting={submitting} label="Actualizar Empresa" />
                    </form>
                </Modal>
            )}

            {/* ─── Modal: Gestionar Aportes ─────────────────────────────────────────── */}
            {managingEmpresa && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Gestionar Aportes</h3>
                                <p className="text-sm text-gray-500">{managingEmpresa.razon_social}</p>
                            </div>
                            <button onClick={() => { setManagingEmpresa(null); setEditingAporte(null); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Add new aporte form */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-3">Registrar Nuevo Aporte</p>
                                <form onSubmit={handleCreateAporte} className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Año</label>
                                        <input required type="number" min={1998} max={2050} value={newAporteForm.anio} onChange={e => setNewAporteForm(p => ({ ...p, anio: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Monto (S/)</label>
                                        <input required type="number" step="0.01" min="0" value={newAporteForm.monto} onChange={e => setNewAporteForm(p => ({ ...p, monto: e.target.value }))} className={inputCls} placeholder="50000.00" />
                                    </div>
                                    <button type="submit" disabled={submitting} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap">
                                        <Plus className="w-4 h-4" /> Añadir
                                    </button>
                                </form>
                            </div>

                            {/* Existing aportes list */}
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Aportes Registrados ({managingEmpresa.aportes.length})</p>
                                {managingEmpresa.aportes.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Sin aportes registrados.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {managingEmpresa.aportes.map(a => (
                                            <div key={a.id}>
                                                {editingAporte?.id === a.id ? (
                                                    <form onSubmit={handleUpdateAporte} className="flex gap-3 items-center bg-amber-50 border border-amber-200 rounded-xl p-3">
                                                        <input required type="number" min={1998} max={2050} value={editAporteForm.anio} onChange={e => setEditAporteForm(p => ({ ...p, anio: e.target.value }))} className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                                                        <input required type="number" step="0.01" value={editAporteForm.monto} onChange={e => setEditAporteForm(p => ({ ...p, monto: e.target.value }))} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                                                        <button type="submit" disabled={submitting} className="text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-3 py-1.5 rounded-lg transition-colors">Guardar</button>
                                                        <button type="button" onClick={() => setEditingAporte(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">Cancelar</button>
                                                    </form>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
                                                        <div>
                                                            <span className="font-black text-gray-700 text-sm">{a.anio}</span>
                                                            <span className="ml-4 font-bold text-gray-900">{fmt(a.monto)}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => openEditAporte(a)} className="p-1.5 hover:bg-amber-50 text-amber-500 rounded-lg transition-colors">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeleteAporte(a.id)} disabled={submitting} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
