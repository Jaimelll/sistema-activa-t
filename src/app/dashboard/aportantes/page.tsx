import { getAportantesData, getSectoresDistintos } from './actions';
import AportantesView from './AportantesView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AportantesPage() {
    const data = await getAportantesData();
    const sectores = await getSectoresDistintos();

    return (
        <AportantesView initialData={data} sectores={sectores} />
    );
}
