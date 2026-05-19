import VistaCampoView from '@/modules/gestion-proyectos/campo-test/VistaCampoView';
import BandejaMonitoresView from '@/modules/gestion-proyectos/campo-test/BandejaMonitoresView';

export const metadata = {
  title: 'Monitoreo de Campo | Sistema ACTIVA-T',
  description: 'Gestión y ejecución de planes de monitoreo.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CampoPage({ searchParams }: { searchParams: { id?: string } }) {
  const params = await searchParams;
  const planId = params?.id;

  // Renderizar condicionalmente con keys únicas para evitar el error "Rendered more hooks"
  // Esto fuerza a React a desmontar el componente previo y montar el nuevo correctamente.
  if (!planId) {
    return <BandejaMonitoresView key="bandeja-monitores" />;
  }

  return <VistaCampoView key={`vista-campo-${planId}`} />;
}
