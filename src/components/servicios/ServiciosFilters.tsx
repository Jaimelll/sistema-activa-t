"use client";

interface ServiciosFiltersProps {
    fases: string[];
    selectedFase: string;
    setSelectedFase: (v: string) => void;
    options: {
        etapas: { id: number; descripcion: string }[];
        ejes: { id: number; descripcion: string }[];
        lineas: { id: number; descripcion: string }[];
        condiciones: { id: number; descripcion: string }[];
        modalidades?: { id: number; descripcion: string }[];
        instituciones?: { id: number; descripcion: string }[];
        tiposEstudio?: { id: number; descripcion: string }[];
    };
    selectedEtapa: string;
    setSelectedEtapa: (v: string) => void;
    selectedEje: string;
    setSelectedEje: (v: string) => void;
    selectedLinea: string;
    setSelectedLinea: (v: string) => void;
    selectedCondicion: string;
    setSelectedCondicion: (v: string) => void;
    selectedInstitucion: string;
    setSelectedInstitucion: (v: string) => void;
    selectedTipoEstudio: string;
    setSelectedTipoEstudio: (v: string) => void;
}

export function ServiciosFilters({
    fases,
    selectedFase,
    setSelectedFase,
    options,
    selectedEtapa,
    setSelectedEtapa,
    selectedEje,
    setSelectedEje,
    selectedLinea,
    setSelectedLinea,
    selectedCondicion,
    setSelectedCondicion,
    selectedInstitucion,
    setSelectedInstitucion,
    selectedTipoEstudio,
    setSelectedTipoEstudio,
}: ServiciosFiltersProps) {
    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Badge Fase Activa */}
            <div>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold text-white bg-blue-600 shadow-sm shadow-blue-500/30 tracking-wider uppercase">
                    FASE ACTIVA: {selectedFase === 'all' ? 'TODAS LAS FASES' : selectedFase.toUpperCase()}
                </span>
            </div>

            {/* Filter Grid — identical layout to ProyectosServiciosTable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">

                {/* Fase — blue capsule, priority position */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Fase
                    </label>
                    <select
                        className="w-full h-9 px-3 py-1 text-xs border-2 border-blue-600 font-bold text-white bg-blue-600 rounded-lg shadow-md transition-all hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        value={selectedFase}
                        onChange={(e) => setSelectedFase(e.target.value)}
                    >
                        <option value="all" className="bg-white text-gray-900">Todas las Fases</option>
                        {fases.map((fase) => (
                            <option key={fase} value={fase} className="bg-white text-gray-900">
                                {fase}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Institución */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Institución
                    </label>
                    <select
                        className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 cursor-pointer"
                        value={selectedInstitucion}
                        onChange={(e) => setSelectedInstitucion(e.target.value)}
                    >
                        <option value="all">Todas las Instituciones</option>
                        {(options.instituciones || [])
                            .sort((a, b) => a.descripcion.localeCompare(b.descripcion))
                            .map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                    {item.descripcion}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Tipo de Estudio */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Tipo Estudio
                    </label>
                    <select
                        className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 cursor-pointer"
                        value={selectedTipoEstudio}
                        onChange={(e) => setSelectedTipoEstudio(e.target.value)}
                    >
                        <option value="all">Todos los Tipos</option>
                        {(options.tiposEstudio || [])
                            .sort((a, b) => a.descripcion.localeCompare(b.descripcion))
                            .map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                    {item.descripcion}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Etapa */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Etapa
                    </label>
                    <select
                        className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 cursor-pointer"
                        value={selectedEtapa}
                        onChange={(e) => setSelectedEtapa(e.target.value)}
                    >
                        <option value="all">Todas las Etapas</option>
                        {[...options.etapas]
                            .sort((a, b) => a.id - b.id)
                            .map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                    {item.descripcion}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Eje — prefixed with numeric id */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Eje
                    </label>
                    <select
                        className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 cursor-pointer"
                        value={selectedEje}
                        onChange={(e) => setSelectedEje(e.target.value)}
                    >
                        <option value="all">Todos los Ejes</option>
                        {[...options.ejes]
                            .sort((a, b) => a.id - b.id)
                            .map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                    {item.id} - {item.descripcion}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Línea — prefixed with L{id} matching Proyectos format */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Línea
                    </label>
                    <select
                        className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 cursor-pointer"
                        value={selectedLinea}
                        onChange={(e) => setSelectedLinea(e.target.value)}
                    >
                        <option value="all">Todas las Líneas</option>
                        {[...options.lineas]
                            .sort((a, b) => a.id - b.id)
                            .map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                    L{item.id} - {item.descripcion}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Condición */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Condición
                    </label>
                    <select
                        className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 cursor-pointer"
                        value={selectedCondicion}
                        onChange={(e) => setSelectedCondicion(e.target.value)}
                    >
                        <option value="all">Todas las Condiciones</option>
                        {[...options.condiciones]
                            .sort((a, b) => a.id - b.id)
                            .map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                    {item.descripcion}
                                </option>
                            ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
