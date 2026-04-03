"use client";

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ServiciosKPIs } from '@/components/servicios/ServiciosKPIs';
import { ServiciosFilters } from '@/components/servicios/ServiciosFilters';
import { ServiciosTimeline } from '@/components/servicios/ServiciosTimeline';
import { ServiciosTable } from '@/components/servicios/ServiciosTable';

export default function ServiciosPage() {
    const supabase = createClient();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        etapas: [] as any[],
        ejes: [] as any[],
        lineas: [] as any[],
        condiciones: [] as any[],
        search: '',
        enProceso: false
    });

    const [activeFilters, setActiveFilters] = useState({
        etapas: [] as number[],
        ejes: [] as number[],
        lineas: [] as number[],
        condiciones: [] as number[]
    });

    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);

            // Fetch all catalog options for filters
            const [
                { data: etapas },
                { data: ejes },
                { data: lineas },
                { data: condiciones }
            ] = await Promise.all([
                supabase.from('etapas').select('id, descripcion'),
                supabase.from('ejes').select('id, descripcion'),
                supabase.from('lineas').select('id, descripcion'),
                supabase.from('condicion').select('id, descripcion')
            ]);

            setFilters(prev => ({
                ...prev,
                etapas: etapas || [],
                ejes: ejes || [],
                lineas: lineas || [],
                condiciones: condiciones || []
            }));

            // Set all active by default
            setActiveFilters({
                etapas: (etapas || []).map(e => e.id),
                ejes: (ejes || []).map(e => e.id),
                lineas: (lineas || []).map(e => e.id),
                condiciones: (condiciones || []).map(e => e.id)
            });

            // Fetch Servicios with relations
            const { data: servicios, error } = await supabase
                .from('becas_nueva')
                .select(`
                    *,
                    institucion:institucion_id(descripcion),
                    eje:eje_id(descripcion),
                    linea:linea_id(descripcion),
                    etapa:etapa_id(descripcion),
                    condicion:condicion_id(descripcion),
                    avances:avance_beca(fecha, etapa_id),
                    grupo:grupo_id(descripcion, orden) 
                `)
                .order('id', { ascending: true });

            if (error) {
                console.error('Error fetching servicios:', error);
            } else {
                // Pre-process dates (Unpivot logic)
                const processed = (servicios || []).map(b => {
                    const inicio = b.avances?.find((a: any) => a.etapa_id === 1)?.fecha;
                    const fin = b.avances?.find((a: any) => a.etapa_id === 10)?.fecha;
                    return {
                        ...b,
                        fecha_inicio: inicio,
                        fecha_fin: fin
                    };
                });
                setData(processed);
            }
            setLoading(false);
        }

        loadInitialData();
    }, []);

    const [processState, setProcessState] = useState<'Todos' | 'En proceso'>('Todos');

    // Dynamic Filter Options
    const availableFilters = useMemo(() => {
        const etapas = new Map();
        const ejes = new Map();
        const lineas = new Map();
        const condiciones = new Map();

        data.forEach(item => {
            if (item.etapa) etapas.set(item.etapa_id, item.etapa.descripcion);
            if (item.eje) ejes.set(item.eje_id, item.eje.descripcion);
            if (item.linea) lineas.set(item.linea_id, item.linea.descripcion);
            if (item.condicion) condiciones.set(item.condicion_id, item.condicion.descripcion);
        });

        return {
            etapas: Array.from(etapas.entries()).map(([id, desc]) => ({ id, descripcion: desc })),
            ejes: Array.from(ejes.entries()).map(([id, desc]) => ({ id, descripcion: desc })),
            lineas: Array.from(lineas.entries()).map(([id, desc]) => ({ id, descripcion: desc })),
            condiciones: Array.from(condiciones.entries()).map(([id, desc]) => ({ id, descripcion: desc })),
        };
    }, [data]);

    // Initial Filter Setup: Seleccionar todos por defecto
    useEffect(() => {
        if (data.length > 0 && activeFilters.etapas.length === 0) {
            setActiveFilters({
                etapas: availableFilters.etapas.map(o => o.id),
                ejes: availableFilters.ejes.map(o => o.id),
                lineas: availableFilters.lineas.map(o => o.id),
                condiciones: availableFilters.condiciones.map(o => o.id),
            });
        }
    }, [data, availableFilters]);

    // Filter Logic
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchEtapa = activeFilters.etapas.includes(item.etapa_id);
            const matchEje = activeFilters.ejes.includes(item.eje_id);
            const matchLinea = activeFilters.lineas.includes(item.linea_id);
            const matchCondicion = activeFilters.condiciones.includes(item.condicion_id);
            const matchSearch = !filters.search ||
                item.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
                item.documento?.toLowerCase().includes(filters.search.toLowerCase());

            const matchProcess = processState === 'Todos' || [6, 8].includes(item.etapa_id);

            return matchEtapa && matchEje && matchLinea && matchCondicion && matchSearch && matchProcess;
        });
    }, [data, activeFilters, filters.search, processState]);


    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <img
                        src="/fondoempleo.jpg"
                        alt="Fondoempleo"
                        className="h-[85px] object-contain"
                        style={{ filter: 'contrast(1.1) saturate(1.2)' }}
                    />
                </div>

                <div className="flex-1 w-full">
                    <ServiciosFilters
                        options={availableFilters}
                        active={activeFilters}
                        setActive={setActiveFilters}
                        search={filters.search}
                        setSearch={(s: string) => setFilters(f => ({ ...f, search: s }))}
                        processState={processState}
                        setProcessState={setProcessState}
                    />
                </div>
            </div>

            <ServiciosKPIs data={filteredData} />

            <div className="w-full">
                <ServiciosTimeline
                    data={data.filter(item => {
                        const matchEtapa = activeFilters.etapas.includes(item.etapa_id);
                        const matchEje = activeFilters.ejes.includes(item.eje_id);
                        const matchLinea = activeFilters.lineas.includes(item.linea_id);
                        const matchCondicion = activeFilters.condiciones.includes(item.condicion_id);
                        return matchEtapa && matchEje && matchLinea && matchCondicion;
                    })}
                />
            </div>

        </div>
    );
}
