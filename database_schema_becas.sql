-- Database Schema for Becas Module

-- Create Becas Table (Clone of proyectos_servicios)
create table if not exists public.becas (
  id uuid primary key default uuid_generate_v4(),
  codigo_beca text unique, -- Equivalent to codigo_proyecto
  nombre text,
  
  -- Foreign Keys (Same Catalogs)
  linea_id uuid references public.lineas(id),
  eje_id uuid references public.ejes(id),
  region_id uuid references public.regiones(id),
  etapa_id uuid references public.etapas(id),
  modalidad_id uuid references public.modalidades(id),
  institucion_ejecutora_id uuid references public.instituciones_ejecutoras(id),
  
  monto_fondoempleo numeric default 0,
  monto_contrapartida numeric default 0,
  monto_total numeric default 0,
  beneficiarios int default 0,
  
  estado text,
  fecha_inicio date,
  fecha_fin date,
  año int,
  
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.becas enable row level security;
create policy "Public" on public.becas for all using (true);

-- Indexes for performance (optional but good)
create index if not exists idx_becas_año on public.becas(año);
create index if not exists idx_becas_eje on public.becas(eje_id);
create index if not exists idx_becas_region on public.becas(region_id);
