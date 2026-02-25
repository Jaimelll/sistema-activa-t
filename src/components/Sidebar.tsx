"use client";

import { LayoutDashboard, FolderOpen, Users, Settings, LogOut, Menu, ClipboardCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

import { createClient } from '@/utils/supabase/client';

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            } catch (err) {
                // Silently handle
            } finally {
                setIsLoading(false);
            }
        };
        getUser();
    }, [supabase.auth]);

    const allMenuItems = [
        { name: 'Proyectos', icon: LayoutDashboard, href: '/dashboard' },
        { name: 'Becas', icon: LayoutDashboard, href: '/dashboard/becas' },
        { name: 'Evaluación', icon: ClipboardCheck, href: '/dashboard/evaluacion' },
        { name: 'Proyectos y Servicios', icon: FolderOpen, href: '/dashboard/proyectos-y-servicios' },
        { name: 'Institución Ejecutora', icon: Users, href: '/dashboard/institucion-ejecutora' },
        { name: 'Configuración', icon: Settings, href: '/dashboard/settings' },
    ];

    // FUNCIÓN PURA DE NAVEGACIÓN: Aislamiento absoluto del arreglo de items
    const getMenuItems = (email: string | null | undefined) => {
        // Coincidencia robusta para rcabajal o rcarbajal
        if (email?.includes('cabajal@fondoempleo.com.pe')) {
            return [
                { name: 'Proyectos', icon: LayoutDashboard, href: '/dashboard' }
            ];
        }
        return allMenuItems;
    };

    return (
        <>
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className={clsx(
                "fixed inset-y-0 left-0 bg-primary w-72 text-white transition-transform duration-300 transform z-40 flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full",
                "lg:translate-x-0 lg:static"
            )}>
                {/* Identity Area */}
                <div className="p-6 border-b border-primary-light flex flex-col justify-center items-center h-24 bg-primary-dark/30">
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Autenticado como:</div>
                    <div className="text-sm font-bold text-white truncate w-full text-center px-2">
                        {user?.email || (isLoading ? 'Cargando sesión...' : 'Sesión no iniciada')}
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {(() => {
                        // BLOQUEO DE ÚLTIMO RECURSO: Validación forzada e infalible en el ciclo de render
                        // Maneja variantes: rcabajal / rcarbajal mediante coincidencia de 'bajal'
                        const isRestricted = user?.email?.toLowerCase().includes('bajal@fondoempleo.com.pe');
                        const itemsFinales = isRestricted
                            ? allMenuItems.filter(item => item.name === 'Proyectos')
                            : (user ? allMenuItems : []);

                        return itemsFinales.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-accent text-white"
                                            : "text-gray-300 hover:bg-primary-light hover:text-white"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        });
                    })()}
                </nav>

                <div className="p-4 border-t border-primary-light">
                    <form action="/auth/signout" method="post">
                        <button
                            type="submit"
                            className="w-full text-left flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-primary-light rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
