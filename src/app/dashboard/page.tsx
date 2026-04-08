import DashboardView from './DashboardView';
import { getDashboardData, fetchDynamicYears, getEtapas, getLineas, getEjes, getTimelineData, getModalidades, getInstituciones, getRegiones, getEtapasList, getGruposProyectos, getEspecialistas, getFasesOptions } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    const [data, timelineData, years, stages, headers, ejesList, modalidades, instituciones, regiones, etapasList, grupos, especialistas, fasesUnicas] = await Promise.all([
        getDashboardData({}),
        getTimelineData(),
        fetchDynamicYears(),
        getEtapas(),
        getLineas(),
        getEjes(),
        getModalidades(),
        getInstituciones(),
        getRegiones(),
        getEtapasList(),
        getGruposProyectos(),
        getEspecialistas(),
        getFasesOptions()
    ]);

    // Inyectar opción "Todos"
    const yearOptions: any[] = [{ value: 'all', label: 'Todos los años' }, ...years];

    return (
        <DashboardView 
            initialData={data} 
            timelineData={timelineData} 
            years={yearOptions} 
            stages={stages} 
            lines={headers} 
            ejesList={ejesList} 
            modalidades={modalidades} 
            instituciones={instituciones}
            regiones={regiones}
            etapasList={etapasList}
            grupos={grupos}
            especialistas={especialistas}
            fases={fasesUnicas}
        />
    );
}
