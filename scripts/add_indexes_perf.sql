-- ─────────────────────────────────────────────────────────────────────────────
-- Índices de performance para queries más comunes del dashboard
-- Ejecutar en Supabase Studio → SQL Editor → New query → paste → Run
--
-- Impacto: queries del dashboard con filtros (eje, línea, etapa, año, etc.)
-- pasan de scan secuencial a búsqueda indexada. Tablas grandes (proyectos,
-- avance_proyecto) deberían ver mejoras de 10-100x.
--
-- Reversible: cada índice se puede quitar con DROP INDEX idx_xxx;
--
-- ⚠ Supabase NO crea índices automáticos para foreign keys. Solo para PK.
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabla principal del dashboard: proyectos
CREATE INDEX IF NOT EXISTS idx_proyectos_linea_id        ON proyectos(linea_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_eje_id          ON proyectos(eje_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_modalidad_id    ON proyectos(modalidad_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_especialista_id ON proyectos(especialista_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_etapa_id        ON proyectos(etapa_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_region_id       ON proyectos(region_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_grupo_id        ON proyectos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_institucion_id  ON proyectos(institucion_ejecutora_id);

-- "año" tiene ñ — necesita comillas en SQL
CREATE INDEX IF NOT EXISTS idx_proyectos_anio            ON proyectos("año");

-- Tabla de avance: se hace join en cada fila del dashboard
CREATE INDEX IF NOT EXISTS idx_avance_proyecto_proyecto_id ON avance_proyecto(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_avance_proyecto_etapa_id    ON avance_proyecto(etapa_id);
CREATE INDEX IF NOT EXISTS idx_avance_proyecto_fecha       ON avance_proyecto(fecha);

-- Etapas: filtros por descripcion y fase
CREATE INDEX IF NOT EXISTS idx_etapas_descripcion ON etapas(descripcion);
CREATE INDEX IF NOT EXISTS idx_etapas_fase        ON etapas(fase);

-- Grupos asociados a proyectos
CREATE INDEX IF NOT EXISTS idx_grupo_tipo  ON grupo(tipo);
CREATE INDEX IF NOT EXISTS idx_grupo_orden ON grupo(orden);

-- ─────────────────────────────────────────────────────────────────────────────
-- Para medir el efecto, antes y después correr:
--
--   EXPLAIN ANALYZE
--   SELECT * FROM proyectos
--   WHERE linea_id = 1 AND "año" = 2025;
--
-- Buscar en el plan:
--   ✗ Seq Scan on proyectos     ← antes (lee toda la tabla)
--   ✓ Index Scan using idx_...  ← después (usa el índice)
-- ─────────────────────────────────────────────────────────────────────────────

-- Para listar todos los índices que tienes hoy:
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- Para borrar uno si causara problema:
-- DROP INDEX idx_proyectos_linea_id;
