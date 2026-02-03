import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sistema ACTIVA-T',
  description: 'Gestión de proyectos Fondoempleo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning={true}>
      <body>
        {children}
      </body>
    </html>
  )
}
