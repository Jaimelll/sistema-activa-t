-- =============================================
-- MIGRACIÓN: Módulo de Evaluación de Proyectos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Tabla de Configuración de Evaluación
CREATE TABLE IF NOT EXISTS public.evaluacion_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  url_pdf_bases TEXT,
  url_pdf_formato TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FK en proyectos_servicios
ALTER TABLE public.proyectos_servicios
  ADD COLUMN IF NOT EXISTS evaluacion_config_id UUID
  REFERENCES public.evaluacion_config(id);

-- 3. Tabla de Resultados de Evaluación
CREATE TABLE IF NOT EXISTS public.evaluaciones_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id INTEGER NOT NULL REFERENCES public.proyectos_servicios(id),
  puntaje_total NUMERIC,
  mapeo_formato JSONB DEFAULT '{}',
  url_pdf_final TEXT,
  estado TEXT DEFAULT 'Pendiente'
    CHECK (estado IN ('Pendiente','Procesando','Completado')),
  fecha_evaluacion TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS (permisivo - el proyecto usa service role key)
ALTER TABLE public.evaluacion_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_evaluacion_config" ON public.evaluacion_config FOR ALL USING (true);
CREATE POLICY "allow_all_evaluaciones_resultados" ON public.evaluaciones_resultados FOR ALL USING (true);
