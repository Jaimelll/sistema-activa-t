
import { getFinanzasAnual, getAportantesAnual } from "../actions";
import CorporativoView from "./CorporativoView";

export default async function CorporativoPage() {
    const finanzas = await getFinanzasAnual();
    const aportantes = await getAportantesAnual();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Corporativo</h1>
            </div>

            <CorporativoView
                finanzasData={finanzas}
                aportantesData={aportantes}
            />
        </div>
    );
}
