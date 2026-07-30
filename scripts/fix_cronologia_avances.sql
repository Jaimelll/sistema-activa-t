-- ─────────────────────────────────────────────────────────────────────────────
-- Corrección de fechas fuera de orden en la bitácora de avances.
--
-- PROBLEMA
-- Las cargas desde Excel dejaron eventos con la fecha anterior a la de una etapa
-- previa: 345 "Aprobado" antes que "Bases", 314 "Ejecución" antes que "Firma",
-- 16 "Ejecutado" antes que "Ejecución", etc. — 683 eventos en 370 becas y 5
-- proyectos.
--
-- Además de ser incoherente en sí, distorsiona la etapa derivada: la etapa sale
-- del evento MÁS RECIENTE, así que una "Ejecución" mal fechada dejaba becas
-- paradas en "Firma".
--
-- REGLA
-- Recorrer cada registro en orden de etapa y, cuando una fecha es anterior a la
-- de la etapa previa, fijarla en esa fecha + 1 día. Se repite hasta que no
-- queden inversiones: corregir una etapa puede destapar la siguiente.
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente: una segunda corrida no
-- encuentra nada que corregir.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Corregir las fechas ───────────────────────────────────────────────────
do $$
declare n integer;
begin
  loop
    with ord as (
      select id, lag(fecha) over (partition by beca_id order by etapa_id, id) as prev
      from avance_beca
    )
    update avance_beca a set fecha = o.prev + 1
    from ord o
    where a.id = o.id and o.prev is not null and a.fecha < o.prev;
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;

  loop
    with ord as (
      select id, lag(fecha) over (partition by proyecto_id order by etapa_id, id) as prev
      from avance_proyecto
    )
    update avance_proyecto a set fecha = o.prev + 1
    from ord o
    where a.id = o.id and o.prev is not null and a.fecha < o.prev;
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

-- ── 2. Recalcular la etapa de lo que quedó desfasado ─────────────────────────
-- Mismo criterio que avanzar_etapas_vencidas(): SOLO AVANZA, nunca retrocede.
-- Hay registros cuya etapa guardada es mayor que la que deriva la bitácora
-- (sobre todo "Resuelto", que se fija en el registro y no deja evento); un
-- recálculo sin esa condición los degradaría.

with ultimo as (
  select distinct on (beca_id) beca_id, etapa_id
  from avance_beca where fecha <= current_date
  order by beca_id, fecha desc, id desc
),
totales as (
  select beca_id, sum(coalesce(monto, 0)) as total
  from avance_beca where fecha <= current_date group by beca_id
)
update becas_nueva b
set etapa_id = u.etapa_id, avance = t.total
from ultimo u join totales t on t.beca_id = u.beca_id
where b.id = u.beca_id and u.etapa_id > coalesce(b.etapa_id, 0);

with ultimo as (
  select distinct on (proyecto_id) proyecto_id, etapa_id
  from avance_proyecto where fecha <= current_date
  order by proyecto_id, fecha desc, id desc
),
totales as (
  select proyecto_id, sum(coalesce(monto, 0)) as total
  from avance_proyecto where fecha <= current_date group by proyecto_id
)
update proyectos p
set etapa_id = u.etapa_id, avance = t.total
from ultimo u join totales t on t.proyecto_id = u.proyecto_id
where p.id = u.proyecto_id and u.etapa_id > coalesce(p.etapa_id, 0);

-- ── 3. Verificar ─────────────────────────────────────────────────────────────
-- Debe devolver 0 en las dos filas.
select 'avance_beca' as tabla, count(*) as inversiones_restantes
from (select fecha, lag(fecha) over (partition by beca_id order by etapa_id, id) as prev
      from avance_beca) x
where prev is not null and fecha < prev
union all
select 'avance_proyecto', count(*)
from (select fecha, lag(fecha) over (partition by proyecto_id order by etapa_id, id) as prev
      from avance_proyecto) y
where prev is not null and fecha < prev;
