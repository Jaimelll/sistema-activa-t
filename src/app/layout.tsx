import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sistema ACTIVA-T',
  description: 'Gestión de proyectos Fondoempleo',
}

import { BrowserCheck } from '@/components/BrowserCheck'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <BrowserCheck />
        {children}
      </body>
    </html>
  )
}
