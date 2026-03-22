"use client";

import { Search, Filter, CheckSquare, Square } from 'lucide-react';

interface ServiciosFiltersProps {
    options: {
        etapas: any[];
        ejes: any[];
        lineas: any[];
        condiciones: any[];
    };
    active: {
        etapas: number[];
        ejes: number[];
        lineas: number[];
        condiciones: number[];
    };
    setActive: (active: any) => void;
    search: string;
    setSearch: (s: string) => void;
    processState: 'Todos' | 'En proceso';
    setProcessState: (v: 'Todos' | 'En proceso') => void;
}

export function ServiciosFilters({ 
    options, 
    active, 
    setActive, 
    search, 
    setSearch,
    processState,
    setProcessState
}: ServiciosFiltersProps) {

    const toggleFilter = (category: keyof typeof active, id: number) => {
        const current = active[category];
        const updated = current.includes(id) 
            ? current.filter(i => i !== id)
            : [...current, id];
        setActive({ ...active, [category]: updated });
    };

    const toggleAll = (category: keyof typeof active) => {
        const allIds = options[category as keyof typeof options].map((o: any) => o.id);
        const updated = active[category].length === allIds.length ? [] : allIds;
        setActive({ ...active, [category]: updated });
    };

    const FilterDropdown = ({ title, category, items }: { title: string, category: keyof typeof active, items: any[] }) => {
        const isAllSelected = active[category].length === items.length;
        const selectedCount = active[category].length;
        
        return (
            <div className="relative group">
                <button className="flex items-center justify-between w-full h-10 px-3 py-2 text-[11px] bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                    <span className="truncate pr-2 font-semibold text-gray-700">
                        {isAllSelected || selectedCount === 0 ? `Todos (${title})` : `${selectedCount} ${title}`}
                    </span>
                    <Filter className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </button>
                
                <div className="absolute z-50 left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl hidden group-hover:block transition-all max-h-[400px] overflow-y-auto p-2">
                    <button 
                        onClick={() => toggleAll(category)}
                        className="flex items-center gap-2 w-full p-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg mb-1 border-b border-gray-100"
                    >
                        {isAllSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        {isAllSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                    </button>
                    <div className="space-y-0.5 mt-1">
                        {[...items].sort((a, b) => Number(a.id) - Number(b.id)).map(item => (
                            <button
                                key={item.id}
                                onClick={() => toggleFilter(category, item.id)}
                                className={`flex items-center gap-2 w-full p-1.5 text-[10px] rounded-lg transition-colors ${
                                    active[category].includes(item.id) 
                                        ? 'bg-blue-50 text-blue-700 font-medium' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {active[category].includes(item.id) ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-blue-600 fill-blue-50" />
                                ) : (
                                    <Square className="w-3.5 h-3.5 text-gray-300" />
                                )}
                                <span className="text-left line-clamp-1">{item.descripcion}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o documento..."
                        className="w-full h-10 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Estado de Proceso Dropdown */}
                <div className="relative group">
                    <button className="flex items-center justify-between w-full h-10 px-4 py-2 text-sm font-bold border border-blue-200 bg-blue-50 text-blue-700 rounded-lg shadow-sm hover:bg-blue-100 transition-all">
                        <span>Estado: {processState}</span>
                        <Filter className="w-4 h-4 opacity-50" />
                    </button>
                    <div className="absolute z-50 left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl hidden group-hover:block overflow-hidden transition-all">
                        {['Todos', 'En proceso'].map((option) => (
                            <button
                                key={option}
                                onClick={() => setProcessState(option as any)}
                                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                                    processState === option 
                                        ? 'bg-blue-600 text-white font-bold' 
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 col-span-1 md:col-span-2 lg:col-span-3">
                    <FilterDropdown title="Etapas" category="etapas" items={options.etapas} />
                    <FilterDropdown title="Ejes" category="ejes" items={options.ejes} />
                    <FilterDropdown title="Líneas" category="lineas" items={options.lineas} />
                    <FilterDropdown title="Condición" category="condiciones" items={options.condiciones} />
                </div>
            </div>
        </div>
    );
}
