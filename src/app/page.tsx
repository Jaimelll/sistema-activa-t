import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Sistema FONDOEMPLEO</h1>

        <form action="/auth/login" method="post" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="********"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm text-center">
              {error === 'CredencialesInvalidas' ? 'Credenciales inválidas' : error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Iniciar Sesión
          </button>
        </form>

        {/* Demo access */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <form action="/auth/login" method="post">
            <input type="hidden" name="email" value="demo@demo.com" />
            <input type="hidden" name="password" value="demo123" />
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
            >
              Entrar como Demo (Solo Presentación)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
