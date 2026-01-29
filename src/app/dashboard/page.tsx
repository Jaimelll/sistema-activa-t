import { createClient } from '@/utils/supabase/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Fetch Stats
    const { data: proyectos } = await supabase.from('proyectos').select('*')
    const { data: metricas } = await supabase.from('metricas').select('*')

    // Calculate totals
    const totalProjects = proyectos?.length || 0
    const totalInvestment = metricas?.reduce((acc, m) => acc + (m.monto_total || 0), 0) || 0
    const totalBeneficiaries = metricas?.reduce((acc, m) => acc + (m.beneficiarios || 0), 0) || 0

    // Funnel Data (Estado)
    const funnel = {
        registrado: proyectos?.filter(p => p.estado === 'Registrado').length || 0,
        evaluacion: proyectos?.filter(p => p.estado === 'En Evaluación').length || 0,
        aprobado: proyectos?.filter(p => p.estado === 'Aprobado').length || 0,
        finalizado: proyectos?.filter(p => p.estado === 'Finalizado').length || 0
    }

    // Format currency
    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="container py-8 flex-grow">
                {/* Header with Logo */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard de Control</h1>
                    <div className="relative h-16 w-48">
                        <Image src="/activate.jpg" alt="ACTIVA-T" fill style={{ objectFit: 'contain', objectPosition: 'right' }} />
                    </div>
                </div>


                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card border-l-4 border-l-blue-600">
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Proyectos Totales</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{totalProjects}</p>
                    </div>
                    <div className="card border-l-4 border-l-green-600">
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Inversión Total</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{formatMoney(totalInvestment)}</p>
                    </div>
                    <div className="card border-l-4 border-l-purple-600">
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Beneficiarios</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{totalBeneficiaries.toLocaleString()}</p>
                    </div>
                </div>

                {/* Visual Modules */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Funnel */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-6">Funnel de Selección</h3>
                        <div className="space-y-4">
                            {/* Simple CSS Funnel */}
                            <div className="relative">
                                <div className="bg-blue-100 h-10 rounded-r flex items-center justify-between px-4" style={{ width: '100%' }}>
                                    <span className="text-blue-800 font-medium">Registrados</span>
                                    <span className="font-bold">{funnel.registrado}</span>
                                </div>
                            </div>
                            <div className="relative pl-4">
                                <div className="bg-blue-200 h-10 rounded-r flex items-center justify-between px-4" style={{ width: '90%' }}>
                                    <span className="text-blue-900 font-medium">En Evaluación</span>
                                    <span className="font-bold">{funnel.evaluacion}</span>
                                </div>
                            </div>
                            <div className="relative pl-8">
                                <div className="bg-blue-300 h-10 rounded-r flex items-center justify-between px-4" style={{ width: '80%' }}>
                                    <span className="text-blue-900 font-medium">Aprobados</span>
                                    <span className="font-bold">{funnel.aprobado}</span>
                                </div>
                            </div>
                            <div className="relative pl-12">
                                <div className="bg-green-500 h-10 rounded-r flex items-center justify-between px-4" style={{ width: '70%' }}>
                                    <span className="text-white font-medium">Finalizados</span>
                                    <span className="text-white font-bold">{funnel.finalizado}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Placeholder */}
                    <div className="card flex flex-col">
                        <h3 className="text-lg font-semibold mb-4">Mapa Regional (Datos)</h3>
                        <div className="flex-grow bg-gray-50 rounded border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8">
                            <div className="text-center">Visualización de Mapa Interactiva</div>
                            <div className="text-xs mt-2 text-gray-300">(Requiere integración de librería de mapas)</div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
