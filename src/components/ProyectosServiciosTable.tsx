
"use client";

import { useState, useMemo } from 'react';
import { 
  Edit, 
  Trash2, 
  Download, 
  Search, 
  Plus,
  Save,
  CheckCircle,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';
import ProyectoModal from './ProyectoModal';
import { createProyecto, updateProyecto, deleteProyecto } from '@/app/dashboard/actions';

interface ProyectosServiciosTableProps {
  initialData: any[];
  lines: any[];
  ejes: any[];
  etapas: any[];
  modalidades: any[];
  instituciones: any[];
  regiones: any[];
  etapasList: any[];
}

export default function ProyectosServiciosTable({ 
  initialData, 
  lines, 
  ejes, 
  etapas, 
  modalidades,
  instituciones,
  regiones,
  etapasList
}: ProyectosServiciosTableProps) {
  // Filters State
  const [selectedExecution, setSelectedExecution] = useState('process'); // Default: En proceso
  const [selectedEtapa, setSelectedEtapa] = useState('all'); // Changed to 'all' to avoid blank initial state if no 'Lanzamiento' exists
  const [selectedEje, setSelectedEje] = useState('all');
  const [selectedLinea, setSelectedLinea] = useState('all');
  const [selectedModalidad, setSelectedModalidad] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<any>(null);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return initialData.filter(item => {
      // 1. Search filter
      const matchesSearch = !searchTerm || 
        item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Execution filter
      const eid = Number(item.etapaId || 0);
      const isExecuted = eid === 6 || eid === 7; 
      let matchesExec = true;
      if (selectedExecution === 'process') matchesExec = !isExecuted;
      if (selectedExecution === 'executed') matchesExec = isExecuted;

      // 3. Etapa filter
      const matchesEtapa = selectedEtapa === 'all' || String(item.etapaId) === String(selectedEtapa);

      // 4. Eje filter
      const matchesEje = selectedEje === 'all' || String(item.ejeId) === String(selectedEje);

      // 5. Linea filter
      const matchesLinea = selectedLinea === 'all' || String(item.lineaId) === String(selectedLinea);

      // 6. Modalidad filter
      const matchesModalidad = selectedModalidad === 'all' || String(item.modalidadId) === String(selectedModalidad);

      return matchesSearch && matchesExec && matchesEtapa && matchesEje && matchesLinea && matchesModalidad;
    });
  }, [initialData, searchTerm, selectedExecution, selectedEtapa, selectedEje, selectedLinea, selectedModalidad]);

  // Excel Export
  const downloadExcel = () => {
    // Safety check: if filteredData is empty, use initialData or alert
    const dataToProcess = filteredData.length > 0 ? filteredData : [];
    
    if (dataToProcess.length === 0) {
      alert("No hay datos para exportar con los filtros actuales.");
      return;
    }

    const dataToExport = dataToProcess.map(item => ({
      'ID': item.id,
      'Código Proyecto': item.codigo || '',
      'Nombre': item.nombre || '',
      'Institución Ejecutora': item.institucion || '',
      'Eje': item.eje || '',
      'Línea': item.linea || '',
      'Región': item.region || '',
      'Etapa': item.etapa || '',
      'Presupuestado': Number(item.monto_fondoempleo) || 0,
      'Avance': Number(item.avance) || 0,
      'Beneficiarios': Number(item.beneficiarios) || 0,
      'Gestora': item.gestora || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gestión de Proyectos");
    
    // Auto-size columns
    const maxWidths = Object.keys(dataToExport[0]).map(key => {
        const lengths = dataToExport.map(row => String((row as any)[key]).length);
        lengths.push(key.length);
        return Math.max(...lengths);
    });
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w + 2 }));


    XLSX.writeFile(workbook, `Reporte_Proyectos_Servicios_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAdd = () => {
    setSelectedProyecto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (proyecto: any) => {
    setSelectedProyecto(proyecto);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar el proyecto "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteProyecto(id);
        // revalidatePath in actions.ts handles the refresh
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el proyecto.');
      }
    }
  };

  const handleSave = async (formData: any) => {
    if (selectedProyecto) {
        await updateProyecto(selectedProyecto.id, formData);
    } else {
        await createProyecto(formData);
    }
    // Modal will close and revalidatePath will refresh data
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                type="text"
                placeholder="Buscar por nombre o código..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-blue-500/20"
            >
                <Plus className="w-4 h-4" />
                Añadir Proyecto
            </button>
            <button
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
                <Download className="w-4 h-4" />
                Descargar Reporte Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* En Proceso Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Estado Filtro</label>
            <select
              className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg bg-blue-50 text-blue-900 font-bold focus:outline-none"
              value={selectedExecution}
              onChange={(e) => setSelectedExecution(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="process">En proceso</option>
              <option value="executed">Ejecutados</option>
            </select>
          </div>

          {/* Etapa Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Etapa</label>
            <select
              className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none"
              value={selectedEtapa}
              onChange={(e) => setSelectedEtapa(e.target.value)}
            >
              <option value="all">Todas las Etapas</option>
              {etapasList.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          {/* Eje Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Eje</label>
            <select
              className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none"
              value={selectedEje}
              onChange={(e) => setSelectedEje(e.target.value)}
            >
              <option value="all">Todos los Ejes</option>
              {ejes.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          {/* Linea Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Línea</label>
            <select
              className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none"
              value={selectedLinea}
              onChange={(e) => setSelectedLinea(e.target.value)}
            >
              <option value="all">Todas las Líneas</option>
              {lines.map((l: any) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {/* Modalidad Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Modalidad</label>
            <select
              className="w-full h-9 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none"
              value={selectedModalidad}
              onChange={(e) => setSelectedModalidad(e.target.value)}
            >
              <option value="all">Todas las Modalidades</option>
              {modalidades.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table with Scroll */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-320px)]">
        <div className="overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left border-collapse table-fixed lg:table-auto">
            <thead className="sticky top-0 z-20 bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 bg-gray-50 px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 z-30 border-r border-gray-100 w-24">ID</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 min-w-[140px]">Código</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 min-w-[300px]">Nombre</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 min-w-[200px]">Institución Ejecutora</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 min-w-[200px]">Región</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 min-w-[150px]">Etapa</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 text-right min-w-[140px]">Presupuestado</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 text-right min-w-[140px]">Avance</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 text-right min-w-[110px]">Benef.</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 min-w-[150px]">Gestora</th>
                <th className="sticky right-0 bg-gray-50 px-6 py-4 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 text-center z-10 border-l border-gray-100">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                    No se encontraron proyectos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="sticky left-0 bg-white/95 backdrop-blur px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400 border-r border-gray-50">{row.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium text-gray-600">{row.codigo || '-'}</td>
                    <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                            {row.nombre}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-xs font-medium text-gray-600 line-clamp-2">
                            {row.institucion}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">{row.region}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "px-2.5 py-1 text-[10px] font-extrabold rounded-full border",
                        row.etapa === 'Lanzamiento' ? "bg-amber-50 text-amber-700 border-amber-100" :
                        row.etapa === 'Ejecución' ? "bg-blue-50 text-blue-700 border-blue-100" :
                        "bg-gray-50 text-gray-600 border-gray-100"
                      )}>
                        {row.etapa}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-right text-gray-700">
                      S/ {row.monto_fondoempleo?.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-right text-emerald-700">
                      S/ {row.avance?.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-right text-gray-500">
                      {row.beneficiarios?.toLocaleString('es-PE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 italic uppercase">{row.gestora || '-'}</td>
                    <td className="sticky right-0 bg-white/95 backdrop-blur px-6 py-4 whitespace-nowrap text-center border-l border-gray-50">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          title="Editar"
                          onClick={() => handleEdit(row)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          title="Eliminar"
                          onClick={() => handleDelete(row.id, row.nombre)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer / Stats */}
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50/50 rounded-lg border border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-tight">
          Mostrando <span className="text-gray-900 font-extrabold">{filteredData.length}</span> de <span className="text-gray-900 font-extrabold">{initialData.length}</span> proyectos registrados
        </span>
        <div className="flex gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Total Presupuestado</span>
                <span className="text-sm font-bold text-blue-900">
                    S/ {filteredData.reduce((acc, curr) => acc + (Number(curr.monto_fondoempleo) || 0), 0).toLocaleString('es-PE')}
                </span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Total Avance</span>
                <span className="text-sm font-bold text-emerald-700">
                    S/ {filteredData.reduce((acc, curr) => acc + (Number(curr.avance) || 0), 0).toLocaleString('es-PE')}
                </span>
            </div>
        </div>
      </div>

      {/* Modal Integration */}
      <ProyectoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        proyecto={selectedProyecto}
        options={{
            lineas: lines,
            ejes: ejes,
            regiones: regiones,
            etapas: etapasList,
            modalidades: modalidades,
            instituciones: instituciones
        }}
      />
    </div>
  );
}

