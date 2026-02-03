import DashboardView from './DashboardView';
import { getDashboardData, fetchDynamicYears } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    const data = await getDashboardData();
    const years = await fetchDynamicYears();

    return (
        <DashboardView initialData={data} years={years} />
    );
}
