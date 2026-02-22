-- Migration: Add url_archivo_proyecto column to proyectos_servicios
-- Run this in Supabase SQL Editor

ALTER TABLE proyectos_servicios
ADD COLUMN IF NOT EXISTS url_archivo_proyecto TEXT;

COMMENT ON COLUMN proyectos_servicios.url_archivo_proyecto IS 'URL del PDF del proyecto postulante subido a Storage';
