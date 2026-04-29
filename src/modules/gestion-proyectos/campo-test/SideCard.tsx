// @ts-nocheck
'use client';

import { Calendar, DollarSign, Users, BarChart, ClipboardCheck, ChevronRight } from 'lucide-react';

export default function SideCard({ proyecto, onStart }) {
  if (!proyecto) return <div className="text-red-500 p-4">Cargando datos...</div>;

  // Accedemos al sub-objeto 'proyecto' que creamos en el action
  const datosProyecto = proyecto.proyecto || {};

  const idProyecto = datosProyecto.id || 'N/A';
  const codigo = datosProyecto.codigo_proyecto || 'S/C';
  const nombre = datosProyecto.nombre || 'Nombre no disponible';
  const monto = datosProyecto.monto_fondoempleo;
  const beneficiarios = datosProyecto.beneficiarios;
  const avance = datosProyecto.avance || 0;

  const fecha = proyecto.fecha_programada
    ? new Date(proyecto.fecha_programada).toLocaleDateString('es-ES')
    : 'No definida';

  const montoFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto || 0);
  const avanceFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(avance);

  return (
    <div className="space-y-4">
      {/* Título e Identificadores */}
      <div className="border-b pb-2">
        <div className="text-xs font-bold text-blue-600 mb-1 tracking-wider uppercase">
          ID: {idProyecto} <span className="text-slate-300 mx-1">|</span> COD: {codigo}
        </div>
        <h3 className="text-xl font-bold text-slate-800 leading-tight">
          {nombre}
        </h3>
        <div className="text-slate-500 text-xs font-medium mt-1">
          {datosProyecto.nombre_institucion || `ID: ${datosProyecto.institucion_ejecutora_id || 'N/A'}`}
        </div>
      </div>

      <div className="grid gap-3 pt-2">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <Calendar size={16} className="text-blue-500" />
          <span>Supervisión: <strong>{fecha}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <DollarSign size={16} className="text-green-600" />
          <span>Presupuestado: <strong>{montoFormateado}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <Users size={16} className="text-purple-600" />
          <span>Beneficiarios: <strong>{beneficiarios || 0}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <BarChart size={16} className="text-teal-600" />
          <span>Monto Ejecutado (Avance): <strong>{avanceFormateado}</strong></span>
        </div>
      </div>

      {/* Botón Integrado */}
      <button
        onClick={onStart}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 mt-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <ClipboardCheck size={20} />
        INICIAR SUPERVISIÓN
        <ChevronRight size={20} />
      </button>
    </div>
  );
}