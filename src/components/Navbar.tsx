'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client' // Use client helper
import { LogOut, LayoutDashboard, Database, Edit } from 'lucide-react'

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="container flex items-center justify-between h-16">
                <div className="flex items-center">
                    {/* Logo Removed as requested */}


                    <div className="hidden md:flex space-x-6">
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

                <div className="flex items-center space-x-6">
                    {/* Logo Removed as requested */}

                    <button onClick={handleSignOut} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-red-600">
                        <LogOut size={18} />
                        <span>Salir</span>
                    </button>
                </div>
            </div>
        </nav>
    )
}
