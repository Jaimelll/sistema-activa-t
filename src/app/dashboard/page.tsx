import DashboardView from './DashboardView';
import { getDashboardData, fetchDynamicYears, getEtapas, getLineas, getEjes } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage(props: { searchParams: Promise<any> }) {
    const searchParams = await props.searchParams;
    const filters = {
        periodo: searchParams?.periodo,
        eje: searchParams?.eje,
        linea: searchParams?.linea,
        etapa: searchParams?.etapa,
    };

    const data = await getDashboardData(filters);
    const years = await fetchDynamicYears();
    const stages = await getEtapas();
    const headers = await getLineas();
    const ejesList = await getEjes();

    // Inyectar opción "Todos"
    const yearOptions: any[] = [{ value: 'all', label: 'Todos los años' }, ...years];

    return (
        <DashboardView initialData={data} years={yearOptions} stages={stages} lines={headers} ejesList={ejesList} />
    );
}
