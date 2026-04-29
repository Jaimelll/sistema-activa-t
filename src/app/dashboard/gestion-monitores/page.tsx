import GestionMonitoresView from '@/modules/gestion-proyectos/gestion-monitores/GestionMonitoresView';
import { createClient } from '@/utils/supabase/server';
import { tieneAccesoModulo } from '@/config/permissions';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Gestión de Monitores | Sistema ACTIVA-T',
  description: 'Planificación de supervisiones de campo.',
};

export default async function GestionMonitoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!tieneAccesoModulo(user?.email, 'Gestión de Monitores')) {
    redirect('/dashboard');
  }

  return <GestionMonitoresView />;
}
