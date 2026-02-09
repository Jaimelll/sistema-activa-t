'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { Filter, Building2, TrendingUp, Users } from 'lucide-react'

// Types
// Types
type Proyecto = {
    id: string
    codigo?: string
    nombre: string
    region: string
    estado: string // Text from join or raw
    created_at: string
    // Assuming metricas is joined
    metricas?: {
        monto_total: number
        beneficiarios: number
    }[]
}

type DashboardClientProps = {
    proyectos: Proyecto[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function DashboardClient({ proyectos }: DashboardClientProps) {
    // Filters
    const [selectedRegion, setSelectedRegion] = useState<string>('Todos')
    const [selectedYear, setSelectedYear] = useState<string>('Todos')
    const [selectedStatus, setSelectedStatus] = useState<string>('Todos')

    // Extract Unique Options
    const regions = useMemo(() => ['Todos', ...Array.from(new Set(proyectos.map(p => p.region || 'Sin Región'))).sort()], [proyectos])
    const years = useMemo(() => ['Todos', ...Array.from(new Set(proyectos.map(p => new Date(p.created_at).getFullYear().toString()))).sort()], [proyectos])
    const statuses = useMemo(() => ['Todos', ...Array.from(new Set(proyectos.map(p => p.estado || 'Sin Estado'))).sort()], [proyectos])

    // Filter Logic
    const filteredProjects = useMemo(() => {
        return proyectos.filter(p => {
            const year = new Date(p.created_at).getFullYear().toString()
            const matchRegion = selectedRegion === 'Todos' || p.region === selectedRegion
            const matchYear = selectedYear === 'Todos' || year === selectedYear
            const matchStatus = selectedStatus === 'Todos' || p.estado === selectedStatus
            return matchRegion && matchYear && matchStatus
        })
    }, [proyectos, selectedRegion, selectedYear, selectedStatus])

    // KPI Calculations
    const totalInvestment = filteredProjects.reduce((acc, p) => acc + (p.metricas?.[0]?.monto_total || 0), 0)
    const totalBeneficiaries = filteredProjects.reduce((acc, p) => acc + (p.metricas?.[0]?.beneficiarios || 0), 0)
    const totalProjects = filteredProjects.length

    // Chart Data
    // 1. Projects by Status (Pie)
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredProjects.forEach(p => {
            const s = p.estado || 'Desconocido'
            counts[s] = (counts[s] || 0) + 1
        })
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [filteredProjects])

    // 2. Investment by Region (Bar) - Top 5
    const regionData = useMemo(() => {
        const regionInvest: Record<string, number> = {}
        filteredProjects.forEach(p => {
            const r = p.region || 'Sin Región'
            regionInvest[r] = (regionInvest[r] || 0) + (p.metricas?.[0]?.monto_total || 0)
        })
        return Object.entries(regionInvest)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10) // Top 10
    }, [filteredProjects])

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(amount)

    const formatMillions = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toString();
    }

    return (
        <div className="space-y-8">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="flex items-center text-gray-500 mr-2">
                    <Filter size={20} />
                    <span className="ml-2 font-medium">Filtros:</span>
                </div>

                <select
                    className="input w-40 text-sm"
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                >
                    <option value="Todos">Año: Todos</option>
                    {years.filter(y => y !== 'Todos').map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <select
                    className="input w-40 text-sm"
                    value={selectedRegion}
                    onChange={e => setSelectedRegion(e.target.value)}
                >
                    <option value="Todos">Región: Todas</option>
                    {regions.filter(r => r !== 'Todos').map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <select
                    className="input w-40 text-sm"
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                >
                    <option value="Todos">Estado: Todos</option>
                    {statuses.filter(s => s !== 'Todos').map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="ml-auto text-sm text-gray-500">
                    Mostrando <strong className="text-gray-900">{filteredProjects.length}</strong> proyectos
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card border-l-4 border-blue-500 flex items-center p-6">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600 mr-4">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Proyectos Totales</p>
                        <h3 className="text-3xl font-bold text-gray-900">{totalProjects}</h3>
                    </div>
                </div>
                <div className="card border-l-4 border-green-500 flex items-center p-6">
                    <div className="p-3 bg-green-50 rounded-full text-green-600 mr-4">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Ejecutado</p>
                        <h3 className="text-3xl font-bold text-gray-900">{formatMoney(totalInvestment)}</h3>
                    </div>
                </div>
                <div className="card border-l-4 border-purple-500 flex items-center p-6">
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600 mr-4">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Beneficiarios</p>
                        <h3 className="text-3xl font-bold text-gray-900">{totalBeneficiaries.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Investment Bar Chart */}
                <div className="card min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Inversión por Región (Top 10)</h3>
                    <div className="flex-grow">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={regionData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={formatMillions} />
                                <YAxis type="category" dataKey="name" width={100} style={{ fontSize: '12px' }} />
                                <RechartsTooltip formatter={(value) => formatMoney(Number(value))} />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Inversión (S/)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Pie Chart */}
                <div className="card min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Proyectos por Estado</h3>
                    <div className="flex-grow flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" align="center" layout="horizontal" height={36} wrapperStyle={{ width: '100%' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
