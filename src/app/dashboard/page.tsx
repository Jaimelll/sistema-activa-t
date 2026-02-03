
import DashboardView from './DashboardView';
import { getDashboardData, getAvailableYears } from './actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const data = await getDashboardData();
    const availableYears = await getAvailableYears();

    return (
        <DashboardView initialData={data} availableYears={availableYears} />
    );
}
