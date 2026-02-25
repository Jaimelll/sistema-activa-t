import Image from 'next/image'

export function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
            <div className="container flex flex-col md:flex-row items-center justify-between">
                <div className="text-sm text-gray-500">
                    © {new Date().getFullYear()} FONDOEMPLEO. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    )
}
