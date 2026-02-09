import BecasView from './BecasView';
import { getBecasData, fetchDynamicYearsBecas, getEtapasBecas, getLineas, getEjes } from '../actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BecasPage(props: { searchParams: Promise<any> }) {
    const searchParams = await props.searchParams;
    // Fetch ALL data for client-side filtering
    const data = await getBecasData({});
    const years = await fetchDynamicYearsBecas();
    const stages = await getEtapasBecas();
    const lines = await getLineas();
    const ejes = await getEjes();

    // Inyectar opción "Todos"
    const yearOptions: any[] = [{ value: 'all', label: 'Todos los años' }, ...years.map(y => ({ value: y, label: y }))];

    return (
        <BecasView initialData={data} years={yearOptions} stages={stages} lines={lines} ejesList={ejes} />
    );
}
