import { Suspense } from 'react';
import { getAportantesData } from '../dashboard/inf-gerencial/actions';
import { getFinanzasAnual } from '../dashboard/actions';
import { getPresupuestoMensual, getPresupuestoComparativo } from '../dashboard/inf-gerencial/actions';
import PresentationView from './PresentationView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PresentationPage() {
    const [{ data, annualTotals }, finanzasData, presupuestoMensual, presupuestoComparativo] = await Promise.all([
        getAportantesData(),
        getFinanzasAnual(),
        getPresupuestoMensual(),
        getPresupuestoComparativo(),
    ]);

    return (
        <Suspense fallback={
            <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                <span style={{ color: '#94a3b8', fontSize: '16px', fontFamily: 'system-ui, sans-serif' }}>Cargando gráfico...</span>
            </div>
        }>
            <PresentationView
                initialData={data}
                annualTotals={annualTotals}
                finanzasData={finanzasData}
                presupuestoMensual={presupuestoMensual as any[]}
                presupuestoComparativo={presupuestoComparativo as any[]}
            />
        </Suspense>
    );
}
