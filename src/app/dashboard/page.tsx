
import DashboardView from './DashboardView';
import { getDashboardData } from './actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const data = await getDashboardData();

    return (
        <DashboardView initialData={data} />
    );
}
