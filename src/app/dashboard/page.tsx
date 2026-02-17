import DashboardView from './DashboardView';
import { getDashboardData, fetchDynamicYears, getEtapas, getLineas, getEjes, getTimelineData, getModalidades } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage(props: { searchParams: Promise<any> }) {
    const searchParams = await props.searchParams;
    // Fetch ALL data for client-side filtering
    const data = await getDashboardData({});
    const timelineData = await getTimelineData();
    const years = await fetchDynamicYears();
    const stages = await getEtapas();
    const headers = await getLineas();
    const ejesList = await getEjes();
    const modalidades = await getModalidades();

    // Inyectar opción "Todos"
    const yearOptions: any[] = [{ value: 'all', label: 'Todos los años' }, ...years];

    return (
        <DashboardView initialData={data} timelineData={timelineData} years={yearOptions} stages={stages} lines={headers} ejesList={ejesList} modalidades={modalidades} />
    );
}
