import { createClient } from '@/utils/supabase/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default async function MaestroPage() {
    const supabase = await createClient()
    // const { data: proyectos } = await supabase.from('proyectos').select('*, metricas(*)')
    const proyectos: any[] = []; // Placeholder to prevent build errors

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="container py-8 flex-grow">
                <h1 className="text-2xl font-bold mb-6">Maestro de Proyectos</h1>
                <div className="card overflow-hidden">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Región</th>
                                    <th>Estado</th>
                                    <th>Inv. Total</th>
                                    <th>Beneficiarios</th>
                                    <th>Fecha Registro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proyectos?.map((p) => (
                                    <tr key={p.id}>
                                        <td className="font-medium">{p.nombre}</td>
                                        <td>{p.region || '-'}</td>
                                        <td>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${p.estado === 'Aprobado' ? 'bg-green-100 text-green-800' :
                                                    p.estado === 'Rechazado' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {p.estado || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            {p.metricas?.[0]?.monto_total
                                                ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.metricas[0].monto_total)
                                                : '-'}
                                        </td>
                                        <td>{p.metricas?.[0]?.beneficiarios || '-'}</td>
                                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {(!proyectos || proyectos.length === 0) && (
                                    <tr><td colSpan={6} className="text-center text-gray-500 py-4">No hay proyectos registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
