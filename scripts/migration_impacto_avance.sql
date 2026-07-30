-- ─────────────────────────────────────────────────────────────────────────────
-- Vincula los eventos de etapa "Impacto" de avance_proyecto con el informe de
-- impacto (Catálogos) que los originó.
--
-- Sin esta columna no se puede distinguir un evento generado desde el informe
-- de uno cargado a mano, y por lo tanto no se puede revertir el borrado del
-- informe sin destruir datos ajenos.
--
-- ON DELETE CASCADE: al borrar el informe desaparecen sus eventos; el server
-- action recalcula después la etapa de los proyectos afectados (la etapa vuelve
-- sola a Pre-Impacto, que es el evento anterior en la bitácora).
--
-- Ejecutar UNA VEZ en el SQL Editor de Supabase. Es idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.avance_proyecto
  add column if not exists informe_impacto_id bigint
  references public.informe_impacto(id) on delete cascade;

comment on column public.avance_proyecto.informe_impacto_id is
  'Informe de impacto (Catálogos) que generó este evento. NULL = evento cargado manualmente en Gestión de Proyectos.';

-- Un proyecto no puede entrar dos veces a Impacto por el mismo informe.
create unique index if not exists avance_proyecto_informe_uq
  on public.avance_proyecto (proyecto_id, informe_impacto_id)
  where informe_impacto_id is not null;

-- La reconciliación busca los eventos de un informe y los eventos huérfanos de
-- etapa Impacto de un proyecto.
create index if not exists avance_proyecto_informe_idx
  on public.avance_proyecto (informe_impacto_id)
  where informe_impacto_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lo mismo para BECAS: un informe cuyo grupo es de tipo 1 se proyecta sobre
-- becas_nueva / avance_beca en vez de proyectos / avance_proyecto.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.avance_beca
  add column if not exists informe_impacto_id bigint
  references public.informe_impacto(id) on delete cascade;

comment on column public.avance_beca.informe_impacto_id is
  'Informe de impacto (Catálogos) que generó este evento. NULL = evento cargado manualmente en Gestión de Servicios.';

create unique index if not exists avance_beca_informe_uq
  on public.avance_beca (beca_id, informe_impacto_id)
  where informe_impacto_id is not null;

create index if not exists avance_beca_informe_idx
  on public.avance_beca (informe_impacto_id)
  where informe_impacto_id is not null;
