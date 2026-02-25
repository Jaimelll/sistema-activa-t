import type { Metadata } from 'next'
import './globals.css'
import SupabaseProvider from '@/components/SupabaseProvider'

export const metadata: Metadata = {
  title: 'Sistema FONDOEMPLEO',
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
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
