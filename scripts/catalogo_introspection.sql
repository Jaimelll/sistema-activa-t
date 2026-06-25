-- ─────────────────────────────────────────────────────────────────────────────
-- RPC de introspección para el módulo Catálogos.
--
-- El editor de catálogos descubre las columnas de cada tabla en tiempo de
-- ejecución. Este RPC le da metadatos precisos (tipo real, PK real, defaults)
-- y permite editar incluso tablas vacías. Sin él, el módulo cae a inferir las
-- columnas desde una fila de muestra (no funciona con tablas vacías y asume
-- PK = "id").
--
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.catalogo_columnas(p_tabla text)
returns table (
  column_name text,
  data_type   text,
  is_nullable boolean,
  is_pk       boolean,
  has_default boolean,
  ordinal     int
)
language sql
security definer
set search_path = public
as $$
  select
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES')                 as is_nullable,
    coalesce(pk.is_pk, false)               as is_pk,
    (c.column_default is not null)          as has_default,
    c.ordinal_position::int                 as ordinal
  from information_schema.columns c
  left join (
    select kcu.column_name, true as is_pk
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on  kcu.constraint_name = tc.constraint_name
      and kcu.table_schema    = tc.table_schema
    where tc.constraint_type = 'PRIMARY KEY'
      and tc.table_schema    = 'public'
      and tc.table_name      = p_tabla
  ) pk on pk.column_name = c.column_name
  where c.table_schema = 'public'
    and c.table_name   = p_tabla
  order by c.ordinal_position;
$$;

-- Permitir que el rol de servicio (y authenticated) la invoque.
grant execute on function public.catalogo_columnas(text) to service_role, authenticated;
