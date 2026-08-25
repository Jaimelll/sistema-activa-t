"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export interface MultiSelectOption {
    value: string | number;
    label: string;
}

/**
 * Filtro desplegable de selección múltiple con checkboxes.
 *
 * Convención igual a la de los `<select>` del dashboard: la lista vacía
 * significa "todos" (sin filtrar), no "ninguno". Así el filtro arranca
 * neutro y se sincroniza con el resto sin casos especiales.
 */
export default function MultiSelectFilter({
    options,
    selected,
    onChange,
    placeholder = "Todos",
    singularLabel = "seleccionado",
    pluralLabel = "seleccionados",
    className = "",
    size = "md",
}: {
    options: MultiSelectOption[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    singularLabel?: string;
    pluralLabel?: string;
    className?: string;
    /** "md" = barra de Proyectos (h-10/text-sm); "sm" = barra compacta de Servicios (h-9/text-xs). */
    size?: "sm" | "md";
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera o con Escape
    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    const toggle = (value: string) => {
        onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
    };

    // Si un valor seleccionado deja de existir en las opciones (porque otro
    // filtro lo dejó fuera), el resumen igual debe cuadrar con lo que se ve.
    const seleccionVisible = useMemo(
        () => selected.filter(v => options.some(o => String(o.value) === v)),
        [selected, options],
    );

    const resumen = (() => {
        if (seleccionVisible.length === 0) return placeholder;
        if (seleccionVisible.length === 1) {
            const opt = options.find(o => String(o.value) === seleccionVisible[0]);
            return opt ? opt.label : `1 ${singularLabel}`;
        }
        return `${seleccionVisible.length} ${pluralLabel}`;
    })();

    const activo = seleccionVisible.length > 0;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2 text-left border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    size === 'sm'
                        ? 'h-9 px-3 py-1 text-xs rounded-lg font-bold'
                        : 'input h-10 py-2 px-3 text-sm rounded shadow-sm'
                } ${
                    activo
                        ? 'border-blue-500 bg-blue-50/60 text-blue-800 font-semibold'
                        : `${size === 'sm' ? 'border-gray-200' : 'border-gray-300'} bg-white text-gray-700`
                }`}
            >
                <span className="truncate" title={resumen}>{resumen}</span>
                <span className="flex items-center gap-1 flex-shrink-0">
                    {activo && (
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label="Limpiar selección"
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange([]); } }}
                            className="p-0.5 rounded hover:bg-blue-200/60 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </span>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full min-w-[260px] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                        <button
                            type="button"
                            onClick={() => onChange(options.map(o => String(o.value)))}
                            className="text-[11px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800"
                        >
                            Seleccionar todos
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                        >
                            Limpiar
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                        {options.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-gray-400 italic">Sin opciones para los filtros actuales</p>
                        ) : (
                            options.map(opt => {
                                const value = String(opt.value);
                                const checked = selected.includes(value);
                                return (
                                    <label
                                        key={value}
                                        className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50/70"
                                    >
                                        <span
                                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                                checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                                            }`}
                                        >
                                            {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={checked}
                                            onChange={() => toggle(value)}
                                        />
                                        <span className={`truncate ${checked ? 'font-semibold text-gray-900' : 'text-gray-700'}`} title={opt.label}>
                                            {opt.label}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
