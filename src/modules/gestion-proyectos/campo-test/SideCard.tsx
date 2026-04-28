// @ts-nocheck
'use client';

import { Calendar, DollarSign, Users } from 'lucide-react';

export default function SideCard({ proyecto }) {
  if (!proyecto) return <div className="text-red-500">No hay proyecto</div>;

  // El nombre puede estar en proyecto.proyecto.nombre o proyecto.nombre
  const nombre = proyecto.proyecto?.nombre || proyecto.nombre || 'Nombre no disponible';
  const monto = proyecto.proyecto?.monto_fon || proyecto.monto_fon;
  const beneficiarios = proyecto.proyecto?.beneficiarios || proyecto.beneficiarios;

  const fecha = proyecto.fecha_programada
    ? new Date(proyecto.fecha_programada).toLocaleDateString('es-ES')
    : 'No definida';

  const montoFormateado = monto
    ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto)
    : 'No especificado';

  const totalPreguntas = proyecto.checklist_preguntas
    ? Object.keys(proyecto.checklist_preguntas).length
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-800">{nombre}</h3>
      <div className="flex items-center gap-2 text-gray-600">
        <Calendar size={18} />
        <span>Fecha Programada: <strong>{fecha}</strong></span>
      </div>
      {monto && (
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign size={18} />
          <span>Monto: <strong>{montoFormateado}</strong></span>
        </div>
      )}
      {beneficiarios && (
        <div className="flex items-center gap-2 text-gray-600">
          <Users size={18} />
          <span>Beneficiarios: <strong>{beneficiarios}</strong></span>
        </div>
      )}
      <div>
        <p>Preguntas: <strong>{totalPreguntas}</strong> items</p>
      </div>
    </div>
  );
}