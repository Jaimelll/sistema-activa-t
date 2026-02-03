import { getDashboardData } from "../actions";
import ProjectsTable from "../../../components/ProjectsTable";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProyectosPage() {
    const data = await getDashboardData();
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Proyectos y Servicios</h2>
            </div>
            <ProjectsTable data={data} />
        </div>
    );
}
