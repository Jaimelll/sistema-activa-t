// @ts-nocheck
'use client';

import { Calendar, DollarSign, Users } from 'lucide-react';

export default function SideCard({ proyecto }) {
  if (!proyecto) return <div className="text-red-500 p-4">Cargando datos...</div>;

  // Accedemos al sub-objeto 'proyecto' que creamos en el action
  const datosProyecto = proyecto.proyecto || {};

  const nombre = datosProyecto.nombre || 'Nombre no disponible';
  const monto = datosProyecto.monto_fondoempleo; // ✅ Campo corregido
  const beneficiarios = datosProyecto.beneficiarios;

  const fecha = proyecto.fecha_programada
    ? new Date(proyecto.fecha_programada).toLocaleDateString('es-ES')
    : 'No definida';

  const montoFormateado = monto
    ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto)
    : 'S/ 0.00';

  return (
    <div className="space-y-4">
      {/* Título del Proyecto - ¡Aquí aparecerá el nombre real! */}
      <h3 className="text-xl font-bold text-slate-800 leading-tight border-b pb-2">
        {nombre}
      </h3>

      <div className="grid gap-3 pt-2">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <Calendar size={16} className="text-blue-500" />
          <span>Programado: <strong>{fecha}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <DollarSign size={16} className="text-green-600" />
          <span>Inversión: <strong>{montoFormateado}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <Users size={16} className="text-purple-600" />
          <span>Beneficiarios: <strong>{beneficiarios || 0}</strong></span>
        </div>
      </div>
    </div>
  );
}