-- Database Schema based on Base.xlsx

-- Enable extensions
create extension if not exists "uuid-ossp";

-- 1. Catalogs
create table if not exists public.ejes (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

create table if not exists public.lineas (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

create table if not exists public.regiones (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique
);

create table if not exists public.etapas (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text,
  fase text
);

create table if not exists public.instituciones_ejecutoras (
  id uuid primary key default uuid_generate_v4(),
  nombre text unique
);

-- 2. Master Table
create table if not exists public.proyectos_servicios (
  id uuid primary key default uuid_generate_v4(),
  codigo_proyecto text unique,
  nombre text,
  linea_id uuid references public.lineas(id),
  eje_id uuid references public.ejes(id),
  region_id uuid references public.regiones(id),
  institucion_ejecutora_id uuid references public.instituciones_ejecutoras(id),
  monto_fondoempleo numeric,
  monto_contrapartida numeric,
  monto_total numeric,
  estado text,
  fecha_inicio date,
  fecha_fin date,
  beneficiarios int,
  created_at timestamp with time zone default now()
);

-- 3. Avances
create table if not exists public.avances (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos_servicios(id),
  fecha date,
  porcentaje numeric,
  descripcion text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.ejes enable row level security;
alter table public.lineas enable row level security;
alter table public.regiones enable row level security;
alter table public.etapas enable row level security;
alter table public.instituciones_ejecutoras enable row level security;
alter table public.proyectos_servicios enable row level security;
alter table public.avances enable row level security;

-- Simple Policy (Open for authenticated/anon for now as per dev mode)
create policy "Public Access" on public.ejes for all using (true);
create policy "Public Access" on public.lineas for all using (true);
create policy "Public Access" on public.regiones for all using (true);
create policy "Public Access" on public.etapas for all using (true);
create policy "Public Access" on public.instituciones_ejecutoras for all using (true);
create policy "Public Access" on public.proyectos_servicios for all using (true);
create policy "Public Access" on public.avances for all using (true);
