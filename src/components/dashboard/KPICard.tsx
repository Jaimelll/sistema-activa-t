
import { LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
}

export function KPICard({ title, value, icon: Icon, trend, trendUp }: KPICardProps) {
    return (
        <div className="card flex items-center p-6 bg-white shadow-sm rounded-lg border border-gray-100">
            <div className="p-3 bg-blue-50 rounded-full mr-4">
                <Icon className="w-6 h-6 text-accent" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
                {trend && (
                    <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        {trend}
                    </p>
                )}
            </div>
        </div>
    );
}
