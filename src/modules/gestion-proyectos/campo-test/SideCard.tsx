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

  // Vinculación con fallbacks dinámicos
  const region = datosProyecto.nombre_region || (datosProyecto.region_id ? `ID: ${datosProyecto.region_id}` : 'N/A');
  const etapa = datosProyecto.nombre_etapa || (datosProyecto.etapa_id ? `ID: ${datosProyecto.etapa_id}` : 'N/A');
  const contacto = datosProyecto.contacto || 'Sin información registrada';
  const sustento = datosProyecto.sustento || 'Sin información registrada';
  const institucion = datosProyecto.nombre_institucion || (datosProyecto.institucion_ejecutora_id ? `ID: ${datosProyecto.institucion_ejecutora_id}` : 'N/A');

  const fecha = proyecto.fecha_programada
    ? new Date(proyecto.fecha_programada).toLocaleDateString('es-ES')
    : 'No definida';

  const montoFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto || 0);
  const avanceFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(avance);

  return (
    <div className="space-y-6 p-2">
      {/* Título e Identificadores */}
      <div className="border-b border-slate-100 pb-4">
        <div className="text-[10px] font-bold text-blue-600 mb-1 tracking-widest uppercase">
          ID: {idProyecto} <span className="text-slate-300 mx-1">|</span> COD: {codigo}
        </div>
        <h3 className="text-xl font-bold text-slate-800 leading-tight">
          {nombre}
        </h3>
        <div className="text-slate-500 text-xs font-medium mt-1">
          {institucion}
        </div>
      </div>

      {/* Datos Técnicos */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" />
            <span className="text-[11px] uppercase font-semibold text-slate-400">Supervisión</span>
          </div>
          <span className="text-sm font-bold text-slate-700">{fecha}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-green-600" />
            <span className="text-[11px] uppercase font-semibold text-slate-400">Presupuestado</span>
          </div>
          <span className="text-sm font-bold text-slate-700">{montoFormateado}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <BarChart size={14} className="text-teal-600" />
            <span className="text-[11px] uppercase font-semibold text-slate-400">Ejecutado (Avance)</span>
          </div>
          <span className="text-sm font-bold text-slate-700">{avanceFormateado}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-purple-600" />
            <span className="text-[11px] uppercase font-semibold text-slate-400">Beneficiarios</span>
          </div>
          <span className="text-sm font-bold text-slate-700">{beneficiarios || 0}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 mt-2">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Región</div>
            <div className="text-xs font-medium text-slate-600">{region}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Etapa Actual</div>
            <div className="text-xs font-medium text-slate-600">{etapa}</div>
          </div>
        </div>
      </div>

      {/* Secciones de Gestión */}
      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Contacto</div>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            {contacto}
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Sustento</div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {sustento}
          </p>
        </div>
      </div>

      {/* Botón Integrado */}
      <button
        onClick={onStart}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 mt-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 tracking-wide"
      >
        <ClipboardCheck size={18} />
        INICIAR SUPERVISIÓN
        <ChevronRight size={18} />
      </button>
    </div>
  );
}