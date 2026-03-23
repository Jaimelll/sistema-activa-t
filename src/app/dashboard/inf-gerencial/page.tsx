import { getAportantesData, getSectoresDistintos } from './actions';
import { getFinanzasAnual } from '../actions';
import InfGerencialView from './InfGerencialView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InfGerencialPage() {
    const data = await getAportantesData();
    const sectores = await getSectoresDistintos();
    const finanzas = await getFinanzasAnual();

    return (
        <InfGerencialView 
            initialData={data} 
            sectores={sectores} 
            finanzasData={finanzas}
        />
    );
}
