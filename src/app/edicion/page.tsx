'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function EdicionPage() {
    const supabase = createClient()
    const [projects, setProjects] = useState<any[]>([])
    const [selectedId, setSelectedId] = useState('')
    const [formData, setFormData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchProjects()
    }, [])

    useEffect(() => {
        if (selectedId) loadProjectDetails(selectedId)
        else setFormData(null)
    }, [selectedId, supabase])

    const fetchProjects = async () => {
        // const { data } = await supabase.from('proyectos').select('id, nombre')
        // const { data } = await supabase.from('proyectos').select('id, nombre')
        const data: any[] = [];
    }

    const loadProjectDetails = async (id: string) => {
        // const { data: p } = await supabase.from('proyectos').select('*').eq('id', id).single()
        // const { data: p } = await supabase.from('proyectos').select('*').eq('id', id).single()
        // const { data: m } = await supabase.from('metricas').select('*').eq('proyecto_id', id).single()
        const p: any = {};
        const m: any = {};

        setFormData({
            estado: p.estado || 'Registrado',
            monto_fondoempleo: m?.monto_fondoempleo || 0,
            monto_contrapartida: m?.monto_contrapartida || 0,
            metricas_id: m?.id
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        // Update Proyecto
        const { error: errP } = await supabase.from('proyectos').update({
            estado: formData.estado
        }).eq('id', selectedId)

        // Update Metricas - UPSERT logic manually
        let errM = null
        const metricUpdates = {
            proyecto_id: selectedId,
            monto_fondoempleo: parseFloat(formData.monto_fondoempleo),
            monto_contrapartida: parseFloat(formData.monto_contrapartida)
        }

        if (formData.metricas_id) {
            const { error } = await supabase.from('metricas').update(metricUpdates).eq('id', formData.metricas_id)
            errM = error
        } else {
            const { error } = await supabase.from('metricas').insert(metricUpdates)
            errM = error
        }

        if (!errP && !errM) {
            setMessage('Actualización exitosa. Registrado en auditoría.')
            // Reload to ensure sync
            loadProjectDetails(selectedId)
        } else {
            setMessage('Error al actualizar datos.')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="container py-8 flex-grow">
                <h1 className="text-2xl font-bold mb-6">Módulo de Edición</h1>

                <div className="card max-w-2xl mx-auto">
                    <div className="mb-6">
                        <label className="label">Seleccionar Proyecto para Editar</label>
                        <select
                            className="input bg-gray-50 mb-4"
                            value={selectedId}
                            onChange={(e) => { setSelectedId(e.target.value); setMessage(''); }}
                        >
                            <option value="">-- Seleccione un Proyecto --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>

                    {selectedId && formData && (
                        <form onSubmit={handleSubmit} className="space-y-6 border-t pt-6 border-gray-100">
                            <div>
                                <label className="label">Estado del Proyecto</label>
                                <select
                                    className="input"
                                    value={formData.estado || ''}
                                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                >
                                    <option value="Registrado">Registrado</option>
                                    <option value="En Evaluación">En Evaluación</option>
                                    <option value="Aprobado">Aprobado</option>
                                    <option value="Rechazado">Rechazado</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Monto Fondoempleo (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.monto_fondoempleo}
                                        onChange={(e) => setFormData({ ...formData, monto_fondoempleo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Monto Contrapartida (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.monto_contrapartida}
                                        onChange={(e) => setFormData({ ...formData, monto_contrapartida: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                            {message && (
                                <div className={`p-3 rounded text-sm text-center font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {message}
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
