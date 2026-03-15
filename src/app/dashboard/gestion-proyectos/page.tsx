import { getDashboardData, getLineas, getEjes, getEtapas, getModalidades, getInstituciones, getRegiones, getEtapasList } from "../actions";
import ProyectosServiciosTable from "../../../components/ProyectosServiciosTable";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProyectosPage() {
    const [data, lines, ejes, etapas, modalidades, instituciones, regiones, etapasList] = await Promise.all([
        getDashboardData(),
        getLineas(),
        getEjes(),
        getEtapas(),
        getModalidades(),
        getInstituciones(),
        getRegiones(),
        getEtapasList()
    ]);


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Proyectos</h2>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <ProyectosServiciosTable 
                    initialData={data} 
                    lines={lines} 
                    ejes={ejes} 
                    etapas={etapas} 
                    modalidades={modalidades} 
                    instituciones={instituciones}
                    regiones={regiones}
                    etapasList={etapasList}
                />

            </div>
        </div>
    );
}

