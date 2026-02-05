"use client";

import { LayoutDashboard, FolderOpen, Users, Settings, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

import { createClient } from '@/utils/supabase/client';

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(true);
    const supabase = createClient();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { name: 'Proyectos y Servicios', icon: FolderOpen, href: '/dashboard/proyectos-y-servicios' },
        { name: 'Institución Ejecutora', icon: Users, href: '/dashboard/institucion-ejecutora' },
        { name: 'Configuración', icon: Settings, href: '/dashboard/settings' },
    ];

    return (
        <>
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className={clsx(
                "fixed inset-y-0 left-0 bg-primary w-64 text-white transition-transform duration-300 transform z-40 flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full",
                "lg:translate-x-0 lg:static"
            )}>
                <div className="p-6 border-b border-primary-light">
                    <h1 className="text-2xl font-bold tracking-tight">FONDOEMPLEO</h1>
                    <p className="text-xs text-gray-400 mt-1">Gestión Fondoempleo</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => {
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
                    })}
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
