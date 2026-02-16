-- Add table for project financial schedule (unpivoted from Excel columns Ago-25 to Abr-29)

CREATE TABLE IF NOT EXISTS public.programa_proyecto (
    id SERIAL PRIMARY KEY,
    proyecto_id INTEGER REFERENCES public.proyectos_servicios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    monto DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries by project and date
CREATE INDEX IF NOT EXISTS idx_programa_proyecto_proyecto_id ON public.programa_proyecto(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_programa_proyecto_fecha ON public.programa_proyecto(fecha);

-- Enable RLS (optional, consistent with other tables)
ALTER TABLE public.programa_proyecto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.programa_proyecto
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role only" ON public.programa_proyecto
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role only" ON public.programa_proyecto
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for service role only" ON public.programa_proyecto
    FOR DELETE USING (true);
