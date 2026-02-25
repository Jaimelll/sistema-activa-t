'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client' // Use client helper
import { LogOut, LayoutDashboard, Database, Edit, Menu, X } from 'lucide-react'

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="container flex items-center justify-between h-16">
                <div className="flex items-center">
                    <Link href="/dashboard" className="flex items-center mr-6">
                        <Image
                            src="/logo fondoempleo.jpg"
                            alt="Fondoempleo"
                            width={300} // Aspect ratio placeholder
                            height={85}
                            className="h-[85px] w-auto object-contain"
                            priority
                        />
                    </Link>                    <div className="hidden md:flex space-x-6">
                        <Link href="/dashboard" className={`flex items-center space-x-2 text-sm font-medium ${pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                            <LayoutDashboard size={18} />
                            <span>Dashboard</span>
                        </Link>
                        <Link href="/maestro" className={`flex items-center space-x-2 text-sm font-medium ${pathname === '/maestro' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                            <Database size={18} />
                            <span>Maestro</span>
                        </Link>
                        <Link href="/edicion" className={`flex items-center space-x-2 text-sm font-medium ${pathname === '/edicion' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                            <Edit size={18} />
                            <span>Edición</span>
                        </Link>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <form action="/auth/signout" method="post">
                        <button type="submit" className="hidden md:flex items-center space-x-2 text-sm text-gray-600 hover:text-red-600">
                            <LogOut size={18} />
                            <span>Salir</span>
                        </button>
                    </form>

                    {/* Mobile Menu Button */}
                    <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white">
                    <div className="container py-4 space-y-4 flex flex-col">
                        <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className={`flex items-center space-x-2 text-sm font-medium ${pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-600'}`}>
                            <LayoutDashboard size={18} />
                            <span>Dashboard</span>
                        </Link>
                        <Link href="/maestro" onClick={() => setIsMenuOpen(false)} className={`flex items-center space-x-2 text-sm font-medium ${pathname === '/maestro' ? 'text-blue-600' : 'text-gray-600'}`}>
                            <Database size={18} />
                            <span>Maestro</span>
                        </Link>
                        <Link href="/edicion" onClick={() => setIsMenuOpen(false)} className={`flex items-center space-x-2 text-sm font-medium ${pathname === '/edicion' ? 'text-blue-600' : 'text-gray-600'}`}>
                            <Edit size={18} />
                            <span>Edición</span>
                        </Link>
                        <form action="/auth/signout" method="post" className="border-t border-gray-100 pt-2">
                            <button type="submit" className="flex items-center space-x-2 text-sm text-red-600 font-medium w-full text-left">
                                <LogOut size={18} />
                                <span>Salir</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </nav>
    )
}
