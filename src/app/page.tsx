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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div className="flex justify-center mb-4">
          {/* Logo display */}
          <div className="relative h-20 w-56">
            <Image src="/activate.jpg" alt="ACTIVA-T" fill style={{ objectFit: 'contain' }} priority />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900">Iniciar Sesión</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Correo Electrónico</label>
            <input
              type="email"
              required
              className="input"
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
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full justify-center"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="flex justify-center mt-6">
          <div className="relative h-10 w-32 opacity-80">
            <Image src="/logo_fondoempleo.jpg" alt="Fondoempleo" fill style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
