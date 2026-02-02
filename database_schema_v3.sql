-- Database Schema V3 (Reset & Strict Numeric Logic)

-- 1. DROP OLD TABLES (Hard Reset to avoid conflicts)
drop table if exists public.proyectos cascade;      -- Legacy table
drop table if exists public.metricas cascade;       -- Legacy table
drop table if exists public.logs_actualizacion cascade; -- Legacy table

-- Also drop V2 tables to ensure clean state if re-running
drop table if exists public.avances cascade;
drop table if exists public.proyectos_servicios cascade;
drop table if exists public.instituciones_ejecutoras cascade;
-- Catalogs usually safe to keep, but let's reset to match exact IDs if needed. 
-- Actually, let's keep catalogs if they are correct, but user asked for "Drop old table projects".
-- We will recreate everything to be safe and consistent with "Reset Logic".
drop table if exists public.ejes cascade;
drop table if exists public.lineas cascade;
drop table if exists public.regiones cascade;
drop table if exists public.etapas cascade;
drop table if exists public.modalidades cascade;
drop table if exists public.beneficiarios_tipos cascade;
drop table if exists public.modalidades_ejecucion cascade;

-- Enable extensions
create extension if not exists "uuid-ossp";

-- 2. Parametric Tables (Re-create)
create table public.ejes (
  id uuid primary key default uuid_generate_v4(),
  numero int unique, -- Vital for numeric matching
  descripcion text,
  fase text
);

create table public.lineas (
  id uuid primary key default uuid_generate_v4(),
  numero int unique, -- Vital for numeric matching
  descripcion text,
  fase text
);

create table public.regiones (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique
);

create table public.etapas (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

create table public.modalidades (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

create table public.beneficiarios_tipos (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

create table public.modalidades_ejecucion (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

-- 3. Master Tables
create table public.instituciones_ejecutoras (
  id uuid primary key default uuid_generate_v4(),
  nombre text unique,
  ruc text,
  correo text,
  created_at timestamp with time zone default now()
);

create table public.proyectos_servicios (
  id uuid primary key default uuid_generate_v4(),
  codigo_proyecto text unique,
  nombre text,
  
  -- Foreign Keys
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
  año int, -- Explicit integer column
  
  created_at timestamp with time zone default now()
);

create table public.avances (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos_servicios(id),
  fecha date,
  porcentaje numeric,
  descripcion text,
  created_at timestamp with time zone default now()
);

-- 4. RLS
alter table public.ejes enable row level security; create policy "Public" on public.ejes for all using (true);
alter table public.lineas enable row level security; create policy "Public" on public.lineas for all using (true);
alter table public.regiones enable row level security; create policy "Public" on public.regiones for all using (true);
alter table public.etapas enable row level security; create policy "Public" on public.etapas for all using (true);
alter table public.modalidades enable row level security; create policy "Public" on public.modalidades for all using (true);
alter table public.beneficiarios_tipos enable row level security; create policy "Public" on public.beneficiarios_tipos for all using (true);
alter table public.modalidades_ejecucion enable row level security; create policy "Public" on public.modalidades_ejecucion for all using (true);
alter table public.instituciones_ejecutoras enable row level security; create policy "Public" on public.instituciones_ejecutoras for all using (true);
alter table public.proyectos_servicios enable row level security; create policy "Public" on public.proyectos_servicios for all using (true);
alter table public.avances enable row level security; create policy "Public" on public.avances for all using (true);
