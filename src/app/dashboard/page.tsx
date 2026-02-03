import DashboardView from './DashboardView';
import { getDashboardData, fetchDynamicYears, getEtapas } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    const data = await getDashboardData();
    const years = await fetchDynamicYears();
    const stages = await getEtapas();

    return (
        <DashboardView initialData={data} years={years} stages={stages} />
    );
}
