import { DollarSign, Users, BarChart3, TrendingUp } from 'lucide-react';

interface ServiciosKPIsProps {
    data: any[];
}

export function ServiciosKPIs({ data }: ServiciosKPIsProps) {
    const totalPresupuesto = data.reduce((sum, item) => sum + (item.presupuesto || 0), 0);
    const totalBeneficiarios = data.reduce((sum, item) => sum + (item.beneficiarios || 0), 0);
    const totalAvance = data.reduce((sum, item) => sum + (item.avance || 0), 0);
    const cumplimiento = totalPresupuesto > 0 ? (totalAvance / totalPresupuesto) * 100 : 0;

    const cards = [
        {
            title: 'Presupuesto Total',
            value: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(totalPresupuesto),
            icon: DollarSign,
            color: 'bg-blue-500',
        },
        {
            title: 'Beneficiarios',
            value: new Intl.NumberFormat('es-PE').format(totalBeneficiarios),
            icon: Users,
            color: 'bg-green-500',
        },
        {
            title: 'Suma de Avance',
            value: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(totalAvance),
            icon: BarChart3,
            color: 'bg-purple-500',
        },
        {
            title: '% de Cumplimiento',
            value: `${cumplimiento.toFixed(2)}%`,
            icon: TrendingUp,
            color: cumplimiento >= 100 ? 'bg-emerald-500' : 'bg-orange-500',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center space-x-4">
                    <div className={`${card.color} p-3 rounded-lg text-white`}>
                        <card.icon size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                        <p className="text-xl font-bold text-gray-800">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
