import Image from 'next/image'

export function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
            <div className="container flex flex-col md:flex-row items-center justify-between">
                <div className="text-sm text-gray-500">
                    © {new Date().getFullYear()} Sistema ACTIVA-T. Todos los derechos reservados.
                </div>
                <div className="mt-4 md:mt-0 relative h-10 w-32">
                    <Image src="/logo_fondoempleo.jpg" alt="Fondoempleo" fill style={{ objectFit: 'contain', objectPosition: 'right' }} />
                </div>
            </div>
        </footer>
    )
}
