
import { getFinanzasAnual } from "../actions";
import CorporativoView from "./CorporativoView";

export default async function CorporativoPage() {
    const finanzas = await getFinanzasAnual();

    return (
        <div className="space-y-6">
            <CorporativoView
                finanzasData={finanzas}
            />
        </div>
    );
}
