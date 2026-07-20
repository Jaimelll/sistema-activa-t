-- =====================================================================
-- Rubros de CONTEO para los gráficos "Proyectos/Becas ejecutados 2024-2026"
-- (Inf. Gerencial · Sección II — Egresos).
--
-- Se guardan como rubros dentro de finanzas_anual (columna `monto` = cantidad),
-- escenario 'Real', para poder editarlos desde Catálogos → "Finanzas Anuales
-- (Rubros)". Se insertan en 0 para llenarlos manualmente.
--
-- Idempotente: no duplica si ya existen (rubro + año + escenario).
-- Ejecutar en el SQL Editor de Supabase.
-- =====================================================================

insert into public.finanzas_anual ("año", rubro, monto, escenario)
select y.anio, r.rubro, 0, 'Real'
from (values (2024), (2025), (2026)) as y(anio)
cross join (values ('Cantidad Proyectos'), ('Cantidad Becas')) as r(rubro)
where not exists (
    select 1 from public.finanzas_anual f
    where f."año" = y.anio
      and f.rubro = r.rubro
      and coalesce(f.escenario, 'Real') = 'Real'
);

-- Verificación
select "año", rubro, monto, escenario
from public.finanzas_anual
where rubro in ('Cantidad Proyectos', 'Cantidad Becas')
order by "año", rubro;
