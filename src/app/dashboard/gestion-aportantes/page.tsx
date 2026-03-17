import { getEmpresasData, getAllSectores } from './actions';
import GestionAportantesView from './GestionAportantesView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GestionAportantesPage() {
    const empresas = await getEmpresasData();
    const sectores = await getAllSectores();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Aportantes</h1>
            </div>

            <GestionAportantesView initialData={empresas} sectores={sectores} />
        </div>
    );
}
