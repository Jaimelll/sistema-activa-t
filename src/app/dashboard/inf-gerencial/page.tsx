import { getAportantesData, getSectoresDistintos, getUnidadesOperativas } from './actions';
import { getFinanzasAnual, getSaldosBancarios } from '../actions';
import InfGerencialView from './InfGerencialView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InfGerencialPage() {
    const { data, annualTotals } = await getAportantesData();
    const sectores = await getSectoresDistintos();
    const finanzas = await getFinanzasAnual();
    const unidades = await getUnidadesOperativas();
    const saldosBancarios = await getSaldosBancarios();

    return (
        <InfGerencialView
            initialData={data}
            annualTotals={annualTotals}
            sectores={sectores}
            finanzasData={finanzas}
            unidades={unidades}
            saldosBancarios={saldosBancarios}
        />
    );
}
