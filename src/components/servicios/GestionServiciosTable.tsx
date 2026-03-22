"use client";

import { useState, useMemo } from 'react';
import { 
  Edit, 
  Trash2, 
  Download, 
  Search, 
  Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';
import ServicioModal from './ServicioModal';
import { createServicio, updateServicio, deleteServicio } from '@/app/dashboard/gestion-servicios/actions';

interface GestionServiciosTableProps {
  initialData: any[];
  lines: any[];
  ejes: any[];
  etapas: any[];
  modalidades: any[];
  instituciones: any[];
  condiciones: any[];
}

export default function GestionServiciosTable({ 
  initialData, 
  lines, 
  ejes, 
  etapas, 
  modalidades,
  instituciones,
  condiciones
}: GestionServiciosTableProps) {
  // Filters State
  const [selectedEtapa, setSelectedEtapa] = useState('all');
  const [selectedEje, setSelectedEje] = useState('all');
  const [selectedLinea, setSelectedLinea] = useState('all');
  const [selectedModalidad, setSelectedModalidad] = useState('all');
  const [selectedCondicion, setSelectedCondicion] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<any>(null);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return initialData.filter(item => {
      // 1. Search filter
      const matchesSearch = !searchTerm || 
        item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.documento?.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Etapa filter
      const matchesEtapa = selectedEtapa === 'all' || String(item.etapa_id) === String(selectedEtapa);

      // 3. Eje filter
      const matchesEje = selectedEje === 'all' || String(item.eje_id) === String(selectedEje);

      // 4. Linea filter
      const matchesLinea = selectedLinea === 'all' || String(item.linea_id) === String(selectedLinea);

      // 5. Modalidad filter
      const matchesModalidad = selectedModalidad === 'all' || String(item.modalidad_id) === String(selectedModalidad);

      // 6. Condicion filter
      const matchesCondicion = selectedCondicion === 'all' || String(item.condicion_id) === String(selectedCondicion);

      return matchesSearch && matchesEtapa && matchesEje && matchesLinea && matchesModalidad && matchesCondicion;
    });
  }, [initialData, searchTerm, selectedEtapa, selectedEje, selectedLinea, selectedModalidad, selectedCondicion]);

  // Excel Export
  const downloadExcel = () => {
    const dataToProcess = filteredData;
    if (dataToProcess.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataToExport = dataToProcess.map(item => ({
      'ID': item.id,
      'Documento': item.documento || '',
      'Nombre': item.nombre || '',
      'Institución': item.institucion?.descripcion || '',
      'Eje': item.eje?.descripcion || '',
      'Línea': item.linea?.descripcion || '',
      'Etapa': item.etapa?.descripcion || '',
      'Condición': item.condicion?.descripcion || '',
      'Presupuesto': Number(item.presupuesto) || 0,
      'Avance': Number(item.avance) || 0,
      '% Avance': item.presupuesto > 0 ? (item.avance / item.presupuesto) * 100 : 0,
      'Beneficiarios': Number(item.beneficiarios) || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gestión de Servicios");
    XLSX.writeFile(workbook, `Reporte_Servicios_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAdd = () => {
    setSelectedServicio(null);
    setIsModalOpen(true);
  };

  const handleEdit = (servicio: any) => {
    setSelectedServicio(servicio);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: any, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar el servicio "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteServicio(id);
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el servicio.');
      }
    }
  };

  const handleSave = async (formData: any) => {
    if (selectedServicio) {
        await updateServicio(selectedServicio.id, formData);
    } else {
        await createServicio(formData);
    }
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
                placeholder="Buscar por nombre o documento..."
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
                Añadir Servicio
            </button>
            <button
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
                <Download className="w-4 h-4" />
                Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Eje Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Eje</label>
            <select
              className="w-full h-9 px-3 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none"
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
              className="w-full h-9 px-3 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none"
              value={selectedLinea}
              onChange={(e) => setSelectedLinea(e.target.value)}
            >
              <option value="all">Todas las Líneas</option>
              {lines.map((l: any) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {/* Etapa Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Etapa</label>
            <select
              className="w-full h-9 px-3 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none"
              value={selectedEtapa}
              onChange={(e) => setSelectedEtapa(e.target.value)}
            >
              <option value="all">Todas las Etapas</option>
              {etapas.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          {/* Modalidad Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Modalidad</label>
            <select
              className="w-full h-9 px-3 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none"
              value={selectedModalidad}
              onChange={(e) => setSelectedModalidad(e.target.value)}
            >
              <option value="all">Todas las Modalidades</option>
              {modalidades.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Condicion Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Condición</label>
            <select
              className="w-full h-9 px-3 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none"
              value={selectedCondicion}
              onChange={(e) => setSelectedCondicion(e.target.value)}
            >
              <option value="all">Todas las Condiciones</option>
              {condiciones.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-320px)]">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-gray-200 text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 w-16">ID</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 min-w-[300px]">Nombre del Servicio</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500">Documento</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500">Eje / Línea</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 text-right">Presupuesto</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 text-center">Avance (%)</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                    No se encontraron servicios registrados.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-gray-400">{row.id}</td>
                    <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                            {row.nombre}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">
                            {row.institucion?.descripcion || 'Pendiente'}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 uppercase tabular-nums">
                        {row.documento}
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-[10px] font-bold text-gray-800">
                            {row.eje?.descripcion || '-'}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium">
                            {row.linea?.descripcion || '-'}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-right text-slate-700 tabular-nums">
                        S/ {Number(row.presupuesto || 0).toLocaleString('es-PE')}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                            <span className={clsx(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white",
                                (row.avance / row.presupuesto) >= 1 ? "bg-emerald-500" : "bg-blue-600"
                            )}>
                                {(row.presupuesto > 0 ? (row.avance / row.presupuesto) * 100 : 0).toFixed(1)}%
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold tabular-nums">
                                S/ {Number(row.avance || 0).toLocaleString('es-PE')}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(row)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(row.id, row.nombre)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-50"
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

      <ServicioModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        servicio={selectedServicio}
        options={{
            lineas: lines,
            ejes: ejes,
            etapas: etapas,
            modalidades: modalidades,
            instituciones: instituciones,
            condiciones: condiciones
        }}
      />
    </div>
  );
}
