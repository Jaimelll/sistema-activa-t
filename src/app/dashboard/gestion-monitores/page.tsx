import GestionMonitoresView from '@/modules/gestion-proyectos/gestion-monitores/GestionMonitoresView';
import { createClient } from '@/utils/supabase/server';
import { getUserPermissions } from '@/config/permissions';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Gestión de Monitores | Sistema ACTIVA-T',
  description: 'Planificación de supervisiones de campo.',
};

export default async function GestionMonitoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const permisos = getUserPermissions(user?.email);
  const puedeVer = permisos?.modulosPermitidos?.includes('Gestión de Monitores');

  if (!puedeVer) {
    redirect('/dashboard');
  }

  return <GestionMonitoresView />;
}
