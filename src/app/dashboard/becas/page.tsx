import BecasView from './BecasView';
import { getBecasData, fetchDynamicYearsBecas, getEtapasBecas, getLineas, getEjes } from '../actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BecasPage(props: { searchParams: Promise<any> }) {
    const searchParams = await props.searchParams;
    const filters = {
        periodo: searchParams?.periodo,
        eje: searchParams?.eje,
        linea: searchParams?.linea,
        etapa: searchParams?.etapa,
    };

    const data = await getBecasData(filters);
    const years = await fetchDynamicYearsBecas();
    const stages = await getEtapasBecas();
    const headers = await getLineas();
    const ejesList = await getEjes();

    // Inyectar opción "Todos"
    const yearOptions: any[] = [{ value: 'all', label: 'Todos los años' }, ...years];

    return (
        <BecasView initialData={data} years={yearOptions} stages={stages} lines={headers} ejesList={ejesList} />
    );
}
