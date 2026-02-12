
-- 1. DROP TABLES (Cascade to clear old UUID relations)
DROP TABLE IF EXISTS public.avances CASCADE;
DROP TABLE IF EXISTS public.proyectos_servicios CASCADE;
DROP TABLE IF EXISTS public.becas CASCADE;

-- 2. Recreate Proyectos with INTEGER ID
CREATE TABLE public.proyectos_servicios (
  id INTEGER PRIMARY KEY,
  codigo_proyecto text,
  nombre text,
  linea_id integer references public.lineas(id),
  eje_id integer references public.ejes(id),
  region_id integer references public.regiones(id),
  etapa_id integer references public.etapas(id),
  modalidad_id integer references public.modalidades(id),
  institucion_ejecutora_id uuid references public.instituciones_ejecutoras(id),
  monto_fondoempleo numeric default 0,
  monto_contrapartida numeric default 0,
  monto_total numeric default 0,
  beneficiarios int default 0,
  estado text,
  fecha_inicio date,
  fecha_fin date,
  año int,
  gestora text,
  created_at timestamp with time zone default now()
);

-- 3. Recreate Becas with INTEGER ID
CREATE TABLE public.becas (
  id INTEGER PRIMARY KEY,
  codigo_beca text,
  nombre text,
  linea_id integer references public.lineas(id),
  eje_id integer references public.ejes(id),
  region_id integer references public.regiones(id),
  etapa_id integer references public.etapas(id),
  modalidad_id integer references public.modalidades(id),
  institucion_ejecutora_id uuid references public.instituciones_ejecutoras(id),
  monto_fondoempleo numeric default 0,
  monto_contrapartida numeric default 0,
  monto_total numeric default 0,
  beneficiarios int default 0,
  estado text,
  año int,
  gestora text,
  created_at timestamp with time zone default now()
);

-- 4. Recreate Avances (Dependant on Proyectos)
CREATE TABLE public.avances (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id integer references public.proyectos_servicios(id),
  fecha date,
  porcentaje numeric,
  descripcion text,
  created_at timestamp with time zone default now()
);

-- 5. Enable RLS
alter table public.proyectos_servicios enable row level security; create policy "Public" on public.proyectos_servicios for all using (true);
alter table public.becas enable row level security; create policy "Public" on public.becas for all using (true);
alter table public.avances enable row level security; create policy "Public" on public.avances for all using (true);
