"use client";

import { useState, useMemo, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Building2, Wallet, ChevronDown, ChevronRight, Pencil, Trash2, X, Save } from "lucide-react";
import { createEmpresa, updateEmpresa, createAporte, updateAporte, deleteAporte } from "./actions";
import EmpresaModal from "./EmpresaModal";
import AporteModal from "./AporteModal";

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
                                <Fragment key={empresa.ruc}>
                                    <tr className="hover:bg-blue-50/40 transition-colors">
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

                                    {expandedRuc === empresa.ruc && (
                                        <tr className="bg-slate-50/70">
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
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && <div className="p-12 text-center text-gray-500 text-sm">No se encontraron empresas para "{searchTerm}".</div>}
                    {filteredData.length > 100 && <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 border-t">Mostrando 100 de {filteredData.length}. Use el buscador para encontrar empresas específicas.</div>}
                </div>
            </div>

            {/* Modals for creation and management */}
            <EmpresaModal
                isOpen={showNuevaEmpresa}
                onClose={() => setShowNuevaEmpresa(false)}
                onSave={async (data) => {
                    await handleCreateEmpresa({ preventDefault: () => { }, target: { ruc: { value: data.ruc }, razon_social: { value: data.razon_social }, ciiu_id: { value: data.ciiu_id } } } as any);
                }}
                sectores={sectores}
            />

            <EmpresaModal
                isOpen={!!editingEmpresa}
                onClose={() => setEditingEmpresa(null)}
                onSave={async (data) => {
                    if (!editingEmpresa) return;
                    await updateEmpresa(editingEmpresa.ruc, { razon_social: data.razon_social, ciiu_id: data.ciiu_id });
                    setEditingEmpresa(null);
                    refresh();
                }}
                sectores={sectores}
            />

            <AporteModal
                isOpen={!!managingEmpresa}
                onClose={() => setManagingEmpresa(null)}
                empresa={managingEmpresa ? { ruc: managingEmpresa.ruc, razon_social: managingEmpresa.razon_social } : null}
                onSave={async (data) => {
                    await createAporte(data);
                    refresh();
                }}
            />
        </div>
    );
}