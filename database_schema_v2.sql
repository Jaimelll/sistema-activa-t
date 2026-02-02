-- Database Schema V2 (Strict Alignment with Base.xlsx)

-- Enable extensions
create extension if not exists "uuid-ossp";

-- 1. Parametric Tables
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
  descripcion text unique,
  fase text
);

create table if not exists public.modalidades (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

create table if not exists public.beneficiarios_tipos (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

create table if not exists public.modalidades_ejecucion (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  descripcion text unique,
  fase text
);

-- 2. Master Tables
create table if not exists public.instituciones_ejecutoras (
  id uuid primary key default uuid_generate_v4(),
  nombre text unique,
  ruc text,
  correo text,
  created_at timestamp with time zone default now()
);

create table if not exists public.proyectos_servicios (
  id uuid primary key default uuid_generate_v4(),
  codigo_proyecto text unique,
  nombre text,
  
  -- Foreign Keys
  linea_id uuid references public.lineas(id),
  eje_id uuid references public.ejes(id),
  region_id uuid references public.regiones(id),
  etapa_id uuid references public.etapas(id),
  modalidad_id uuid references public.modalidades(id),
  beneficiario_tipo_id uuid references public.beneficiarios_tipos(id),
  modalidad_ejecucion_id uuid references public.modalidades_ejecucion(id),
  
  institucion_ejecutora_id uuid references public.instituciones_ejecutoras(id),
  
  -- Metrics
  monto_fondoempleo numeric default 0,
  monto_contrapartida numeric default 0,
  monto_total numeric default 0,
  beneficiarios int default 0,
  
  -- Dates & Status
  estado text,
  fecha_inicio date,
  fecha_fin date,
  año int,
  
  created_at timestamp with time zone default now()
);

create table if not exists public.avances (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos_servicios(id),
  fecha date,
  porcentaje numeric,
  descripcion text,
  created_at timestamp with time zone default now()
);

-- 3. RLS Policies (Enable Public Access for Dev)
alter table public.ejes enable row level security;
alter table public.lineas enable row level security;
alter table public.regiones enable row level security;
alter table public.etapas enable row level security;
alter table public.modalidades enable row level security;
alter table public.beneficiarios_tipos enable row level security;
alter table public.modalidades_ejecucion enable row level security;
alter table public.instituciones_ejecutoras enable row level security;
alter table public.proyectos_servicios enable row level security;
alter table public.avances enable row level security;

create policy "Public Access" on public.ejes for all using (true);
create policy "Public Access" on public.lineas for all using (true);
create policy "Public Access" on public.regiones for all using (true);
create policy "Public Access" on public.etapas for all using (true);
create policy "Public Access" on public.modalidades for all using (true);
create policy "Public Access" on public.beneficiarios_tipos for all using (true);
create policy "Public Access" on public.modalidades_ejecucion for all using (true);
create policy "Public Access" on public.instituciones_ejecutoras for all using (true);
create policy "Public Access" on public.proyectos_servicios for all using (true);
create policy "Public Access" on public.avances for all using (true);
