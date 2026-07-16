"use client";

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2, Search, Upload, ExternalLink } from 'lucide-react';
import type { Columna } from '../tablas';
import { actualizarFila, crearFila, eliminarFila, subirArchivoCatalogo } from '../actions';

type Fila = Record<string, any>;

function esNumerico(type: string) {
    return /int|numeric|double|real|decimal|float|serial/i.test(type);
}
function esBooleano(type: string) {
    return /bool/i.test(type);
}
function esFecha(type: string) {
    return /^date$/i.test(type);
}
function esTimestamp(type: string) {
    return /timestamp|time/i.test(type);
}

/** Una columna es solo-lectura en la grilla si es timestamp con default (created_at). */
function soloLectura(col: Columna) {
    return esTimestamp(col.type) && col.hasDefault;
}

export default function CatalogoEditor({
    tabla,
    columnas,
    filas,
    opcionesCombo = {},
}: {
    tabla: string;
    columnas: Columna[];
    filas: Fila[];
    opcionesCombo?: Record<string, { value: any; label: string }[]>;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [busy, setBusy] = useState<string | null>(null); // id de fila en proceso
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');

    const pk = useMemo(
        () => columnas.find((c) => c.isPk)?.name ?? 'id',
        [columnas],
    );

    // Columnas visibles al crear: excluye la PK (la genera la BD) y las que
    // tienen default (uuid/serial/now).
    const columnasAlta = useMemo(
        () => columnas.filter((c) => !c.hasDefault && !c.isPk),
        [columnas],
    );

    const [nuevo, setNuevo] = useState<Fila>({});

    const filasFiltradas = useMemo(() => {
        const term = q.trim().toLowerCase();
        const orden = [...filas].sort((a, b) => {
            const av = a[pk];
            const bv = b[pk];
            if (typeof av === 'number' && typeof bv === 'number') return av - bv;
            return String(av).localeCompare(String(bv));
        });
        if (!term) return orden;
        return orden.filter((f) =>
            Object.values(f).some((v) =>
                String(v ?? '').toLowerCase().includes(term),
            ),
        );
    }, [filas, q, pk]);

    function refrescar() {
        startTransition(() => router.refresh());
    }

    async function handleCrear(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setBusy('nuevo');
        const res = await crearFila(tabla, nuevo);
        setBusy(null);
        if (!res.ok) {
            setError(res.error ?? 'No se pudo crear el elemento.');
            return;
        }
        setNuevo({});
        refrescar();
    }

    async function handleGuardar(fila: Fila, edits: Fila) {
        setError(null);
        const id = String(fila[pk]);
        setBusy(id);
        const res = await actualizarFila(tabla, pk, fila[pk], edits);
        setBusy(null);
        if (!res.ok) {
            setError(res.error ?? 'No se pudo guardar.');
            return;
        }
        refrescar();
    }

    async function handleEliminar(fila: Fila) {
        const id = String(fila[pk]);
        if (!confirm(`¿Eliminar el elemento ${id}? Esta acción no se puede deshacer.`)) {
            return;
        }
        setError(null);
        setBusy(id);
        const res = await eliminarFila(tabla, pk, fila[pk]);
        setBusy(null);
        if (!res.ok) {
            setError(res.error ?? 'No se pudo eliminar.');
            return;
        }
        refrescar();
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Buscador */}
            <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar…"
                    className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
                />
            </div>

            {/* Alta de elemento */}
            <form
                onSubmit={handleCrear}
                className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
                {columnasAlta.map((col) => (
                    <label
                        key={col.name}
                        className="flex min-w-32 flex-1 flex-col gap-1 text-[11px] uppercase tracking-wide text-gray-500"
                    >
                        {col.name}
                        <CampoInput
                            col={col}
                            value={nuevo[col.name]}
                            opciones={opcionesCombo[col.name]}
                            onChange={(v) =>
                                setNuevo((prev) => ({ ...prev, [col.name]: v }))
                            }
                        />
                    </label>
                ))}
                <button
                    type="submit"
                    disabled={busy === 'nuevo'}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" />
                    {busy === 'nuevo' ? 'Agregando…' : 'Agregar'}
                </button>
            </form>

            {/* Grilla editable */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                        <tr>
                            {columnas.map((c) => (
                                <th key={c.name} className="px-3 py-2 font-semibold">
                                    {c.name}
                                    {c.isPk && (
                                        <span className="ml-1 text-primary">★</span>
                                    )}
                                </th>
                            ))}
                            <th className="sticky right-0 bg-gray-50 px-3 py-2 text-right shadow-[inset_1px_0_0_#e5e7eb]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filasFiltradas.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columnas.length + 1}
                                    className="px-3 py-8 text-center text-gray-400"
                                >
                                    Sin elementos.
                                </td>
                            </tr>
                        )}
                        {filasFiltradas.map((fila) => (
                            <FilaEditable
                                key={String(fila[pk])}
                                columnas={columnas}
                                fila={fila}
                                pk={pk}
                                opcionesCombo={opcionesCombo}
                                busy={busy === String(fila[pk]) || isPending}
                                onGuardar={(edits) => handleGuardar(fila, edits)}
                                onEliminar={() => handleEliminar(fila)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Fila editable ─────────────────────────────────────────────────────────────

function FilaEditable({
    columnas,
    fila,
    pk,
    busy,
    opcionesCombo = {},
    onGuardar,
    onEliminar,
}: {
    columnas: Columna[];
    fila: Fila;
    pk: string;
    busy: boolean;
    opcionesCombo?: Record<string, { value: any; label: string }[]>;
    onGuardar: (edits: Fila) => void;
    onEliminar: () => void;
}) {
    const [edits, setEdits] = useState<Fila>(() => ({ ...fila }));
    const sucio = columnas.some(
        (c) => !c.isPk && !soloLectura(c) && edits[c.name] !== fila[c.name],
    );

    return (
        <tr className={busy ? 'opacity-50' : undefined}>
            {columnas.map((col) => (
                <td key={col.name} className="px-3 py-1.5 align-middle">
                    {col.isPk || soloLectura(col) ? (
                        <span className="text-xs tabular-nums text-gray-500">
                            {formatLectura(fila[col.name])}
                        </span>
                    ) : (
                        <CampoInput
                            col={col}
                            value={edits[col.name]}
                            opciones={opcionesCombo[col.name]}
                            onChange={(v) =>
                                setEdits((prev) => ({ ...prev, [col.name]: v }))
                            }
                            compact
                        />
                    )}
                </td>
            ))}
            <td className="sticky right-0 bg-white px-3 py-1.5 shadow-[inset_1px_0_0_#e5e7eb]">
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        disabled={busy || !sucio}
                        onClick={() => onGuardar(edits)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-40"
                        title="Guardar cambios"
                    >
                        <Save className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onEliminar}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                        title="Eliminar"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ─── Input genérico según tipo de columna ──────────────────────────────────────

function CampoInput({
    col,
    value,
    onChange,
    compact,
    opciones,
}: {
    col: Columna;
    value: any;
    onChange: (v: any) => void;
    compact?: boolean;
    opciones?: { value: any; label: string }[];
}) {
    const base = `rounded-md border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none ${
        compact ? 'py-1' : 'py-1.5'
    }`;

    if (col.name === 'archivo_url') {
        return <CampoArchivo value={value} onChange={onChange} base={base} />;
    }

    // Columna de referencia con combo (p. ej. grupo_id): se elige por nombre.
    if (opciones && opciones.length > 0) {
        return (
            <select
                value={value ?? ''}
                onChange={(e) => {
                    const raw = e.target.value;
                    onChange(raw === '' ? null : (esNumerico(col.type) ? Number(raw) : raw));
                }}
                className={`${base} w-full min-w-56`}
            >
                <option value="">— Seleccionar —</option>
                {opciones.map((o) => (
                    <option key={String(o.value)} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        );
    }

    if (esBooleano(col.type)) {
        return (
            <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
            />
        );
    }

    if (esNumerico(col.type)) {
        return (
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) =>
                    onChange(e.target.value === '' ? null : Number(e.target.value))
                }
                className={`${base} w-full min-w-20`}
            />
        );
    }

    if (esFecha(col.type)) {
        // Solo la parte YYYY-MM-DD: evita desfases si el valor llega con hora/zona.
        const fecha = value ? String(value).slice(0, 10) : '';
        return (
            <input
                type="date"
                value={fecha}
                onChange={(e) => onChange(e.target.value || null)}
                className={`${base} w-full`}
            />
        );
    }

    // Campos de texto largos (titulo, descripcion, etc.): más anchos y con
    // tooltip para leer el contenido completo.
    const esTextoLargo = /titulo|descripcion|nombre|observac/i.test(col.name);
    return (
        <input
            type="text"
            value={value ?? ''}
            title={value ? String(value) : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={`${base} w-full ${esTextoLargo ? 'min-w-80' : 'min-w-28'}`}
        />
    );
}

/** Input para columnas `archivo_url`: URL editable + botón que sube un PDF al bucket. */
function CampoArchivo({
    value,
    onChange,
    base,
}: {
    value: any;
    onChange: (v: any) => void;
    base: string;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [errorSubida, setErrorSubida] = useState<string | null>(null);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setErrorSubida(null);
        setSubiendo(true);
        try {
            const fd = new FormData();
            fd.append('archivo', file);
            const res = await subirArchivoCatalogo(fd);
            if (!res.ok || !res.url) {
                setErrorSubida(res.error ?? 'No se pudo subir el archivo.');
            } else {
                onChange(res.url);
            }
        } catch {
            setErrorSubida('Error al subir el archivo.');
        } finally {
            setSubiendo(false);
        }
    }

    return (
        <div className="flex min-w-48 items-center gap-1">
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || null)}
                placeholder="URL del PDF…"
                className={`${base} w-full min-w-28`}
            />
            <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFile}
            />
            <button
                type="button"
                disabled={subiendo}
                onClick={() => fileRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                title={errorSubida ?? 'Subir PDF'}
            >
                <Upload className="h-3.5 w-3.5" />
                {subiendo ? '…' : 'PDF'}
            </button>
            {value && (
                <a
                    href={String(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-primary hover:text-primary-dark"
                    title="Abrir archivo"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            )}
            {errorSubida && (
                <span className="text-[10px] text-red-600">{errorSubida}</span>
            )}
        </div>
    );
}

function formatLectura(v: any): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        return v.slice(0, 16).replace('T', ' ');
    }
    return String(v);
}
