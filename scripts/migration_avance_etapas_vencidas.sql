-- ─────────────────────────────────────────────────────────────────────────────
-- Avance automático de etapas con eventos vencidos.
--
-- PROBLEMA
-- La etapa de un proyecto/beca se deriva del evento más reciente de su bitácora
-- con fecha <= hoy (recalculateProyectoAvance / recalculateBecaAvance). Pero esas
-- funciones solo corren cuando alguien ESCRIBE un avance. Si el evento de
-- "Ejecutado" se cargó con fecha proyectada, al llegar esa fecha no hay nada que
-- dispare el recálculo y el registro se queda en "Ejecución" indefinidamente.
--
-- SOLO AVANZA, NUNCA RETROCEDE
-- La condición `u.etapa_id > x.etapa_id` no es un detalle: hay registros cuya
-- etapa guardada es MAYOR que la que derivaría la bitácora — sobre todo
-- "Resuelto" (7), que se fija en el registro y no deja evento. Un recálculo
-- ciego los degradaría. El paso del tiempo solo puede hacer avanzar; cualquier
-- retroceso legítimo (p. ej. borrar un avance) ya lo maneja el recálculo por
-- escritura de la app, que sí puede bajar la etapa.
--
-- ALCANCE
-- Esta función NO reconcilia los informes de impacto (esa regla vive en
-- src/app/dashboard/catalogos/impacto.ts y depende de la antigüedad del cierre).
-- Cuando una beca avanza a Ejecutado aquí, entra al informe que le toca en la
-- siguiente reconciliación desde Catálogos.
--
-- Ejecutar UNA VEZ en el SQL Editor de Supabase. Es idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.avanzar_etapas_vencidas()
returns table (entidad text, actualizados integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  n_proyectos integer := 0;
  n_becas     integer := 0;
begin
  -- ── PROYECTOS ──────────────────────────────────────────────────────────────
  with ultimo as (
    select distinct on (proyecto_id)
           proyecto_id, etapa_id
    from avance_proyecto
    where fecha <= current_date
    order by proyecto_id, fecha desc, id desc
  ),
  totales as (
    select proyecto_id, sum(coalesce(monto, 0)) as total
    from avance_proyecto
    where fecha <= current_date
    group by proyecto_id
  ),
  actualizados as (
    update proyectos p
    set etapa_id = u.etapa_id,
        avance   = t.total,
        sustento = coalesce((
          select a.sustento
          from avance_proyecto a
          where a.proyecto_id = p.id
            and a.fecha <= current_date
            and a.sustento is not null
            and btrim(a.sustento) <> ''
          order by a.fecha desc, a.id desc
          limit 1
        ), '')
    from ultimo u
    join totales t on t.proyecto_id = u.proyecto_id
    where p.id = u.proyecto_id
      and p.etapa_id is distinct from u.etapa_id
      and u.etapa_id > coalesce(p.etapa_id, 0)   -- solo avanzar
    returning 1
  )
  select count(*) into n_proyectos from actualizados;

  -- ── BECAS ──────────────────────────────────────────────────────────────────
  -- OJO: becas_nueva NO tiene columna `sustento` (ver gestion-servicios/actions.ts).
  with ultimo as (
    select distinct on (beca_id)
           beca_id, etapa_id
    from avance_beca
    where fecha <= current_date
    order by beca_id, fecha desc, id desc
  ),
  totales as (
    select beca_id, sum(coalesce(monto, 0)) as total
    from avance_beca
    where fecha <= current_date
    group by beca_id
  ),
  actualizados as (
    update becas_nueva b
    set etapa_id = u.etapa_id,
        avance   = t.total
    from ultimo u
    join totales t on t.beca_id = u.beca_id
    where b.id = u.beca_id
      and b.etapa_id is distinct from u.etapa_id
      and u.etapa_id > coalesce(b.etapa_id, 0)   -- solo avanzar
    returning 1
  )
  select count(*) into n_becas from actualizados;

  return query
    select 'proyectos'::text, n_proyectos
    union all
    select 'becas_nueva'::text, n_becas;
end;
$$;

comment on function public.avanzar_etapas_vencidas() is
  'Aplica los eventos de bitácora ya vencidos que nadie disparó. Solo avanza la etapa, nunca la retrocede. Programada con pg_cron.';

grant execute on function public.avanzar_etapas_vencidas() to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Programación diaria. 05:15 UTC = 00:15 en Perú (pg_cron corre en UTC).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'avanzar-etapas-vencidas') then
    perform cron.unschedule('avanzar-etapas-vencidas');
  end if;
end
$$;

select cron.schedule(
  'avanzar-etapas-vencidas',
  '15 5 * * *',
  $$select public.avanzar_etapas_vencidas()$$
);

-- Verificación:
--   select * from cron.job where jobname = 'avanzar-etapas-vencidas';
--   select * from public.avanzar_etapas_vencidas();     -- corrida manual
--   select * from cron.job_run_details order by start_time desc limit 5;
