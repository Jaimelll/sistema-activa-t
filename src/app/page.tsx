'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
      {/* Logo Top-Right */}
      <div className="absolute top-4 right-4 h-12 w-40">
        <Image src="/logo_fondoempleo.jpg" alt="Fondoempleo" fill style={{ objectFit: 'contain', objectPosition: 'right' }} priority />
      </div>

      <div className="card w-full max-w-md p-8 space-y-6 z-10">
        <h2 className="text-2xl font-bold text-center text-gray-900">Iniciar Sesión</h2>
        <div className="text-center text-sm text-gray-500 -mt-4 mb-4">Sistema ACTIVA-T</div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative">
          <div>
            <label className="label">Correo Electrónico</label>
            <input
              type="email"
              required
              className="input relative z-20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@fondoempleo.com.pe"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              required
              className="input relative z-20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full justify-center relative z-20"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
