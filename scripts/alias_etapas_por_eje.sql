-- ─────────────────────────────────────────────────────────────────────────────
-- OPCIONAL — mover a la base los rótulos de etapa por eje.
--
-- Hoy la regla vive en src/config/etapas.ts, que es suficiente mientras sean dos
-- ejes y una etapa. Si se quiere que la edite el usuario en vez de un
-- desarrollador, basta con ejecutar esto: el módulo Catálogos descubre las
-- columnas en tiempo de ejecución (ver el comentario de scripts/../tablas.ts),
-- y tanto `ejes` como `etapas` ya están en su lista blanca, así que las dos
-- columnas nuevas aparecen solas y editables SIN tocar código.
--
-- Después de correrlo hay que cambiar src/config/etapas.ts para que lea estas
-- columnas en vez de sus constantes.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

-- Un eje concursal tiene convocatoria (Bases, Lanzamiento). Uno que no la tiene
-- entra directo a Acciones Preparatorias.
alter table public.ejes
  add column if not exists concursal boolean not null default true;

comment on column public.ejes.concursal is
  'False en los ejes sin convocatoria (Sectorial, Empresas de Sectores Aportantes): sus proyectos no pasan por la fase Etapa Concursal.';

-- Rótulo y fase alternos de una etapa cuando el eje NO es concursal.
-- Nulo = se usa la descripción/fase de siempre.
alter table public.etapas
  add column if not exists descripcion_alterna text,
  add column if not exists fase_alterna        text;

comment on column public.etapas.descripcion_alterna is
  'Cómo se llama esta etapa en los ejes no concursales. Nulo = igual que descripcion.';
comment on column public.etapas.fase_alterna is
  'A qué fase pertenece esta etapa en los ejes no concursales. Nulo = igual que fase.';

-- 2 Sectorial · 4 Empresas de Sectores Aportantes
update public.ejes set concursal = false where id in (2, 4);

-- "Lanzamiento" no significa nada sin convocatoria: ahí esta posición es el
-- proyecto presentado por el sector, subsanando, aún sin aprobación del
-- Consejo Directivo — una acción preparatoria.
update public.etapas
   set descripcion_alterna = 'Por aprobar',
       fase_alterna        = 'Acciones Preparatorias'
 where id = 2;
