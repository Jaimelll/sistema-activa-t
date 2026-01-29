-- SISTEMA ACTIVA-T Database Schema
-- Generated scripts for Supabase

-- 1. Enable Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Create Tables

-- Instituciones
create table if not exists public.instituciones (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  correo text unique,
  created_at timestamp with time zone default now()
);

-- Proyectos
create table if not exists public.proyectos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  descripcion text,
  region text,
  estado text,
  created_at timestamp with time zone default now()
);

-- Metricas
create table if not exists public.metricas (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  monto_fondoempleo numeric default 0,
  monto_contrapartida numeric default 0,
  monto_total numeric generated always as (coalesce(monto_fondoempleo,0) + coalesce(monto_contrapartida,0)) stored,
  van numeric default 0,
  tir numeric default 0,
  beneficiarios int default 0,
  created_at timestamp with time zone default now()
);

-- Logs de Auditoría
create table if not exists public.logs_actualizacion (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid,
  proyecto_id uuid references public.proyectos(id),
  campo_modificado text,
  valor_anterior text,
  valor_nuevo text,
  fecha timestamp with time zone default now()
);

-- 3. Row Level Security (RLS)
alter table public.instituciones enable row level security;
alter table public.proyectos enable row level security;
alter table public.metricas enable row level security;
alter table public.logs_actualizacion enable row level security;

-- Policies
create policy "Enable all for authenticated" on public.instituciones for all to authenticated using (true);
create policy "Enable all for authenticated" on public.proyectos for all to authenticated using (true);
create policy "Enable all for authenticated" on public.metricas for all to authenticated using (true);
create policy "Enable insert logs" on public.logs_actualizacion for insert to authenticated with check (true);
create policy "Enable read logs" on public.logs_actualizacion for select to authenticated using (true);

-- 4. Triggers for Audit Logs

-- Function: log_proyecto_changes
create or replace function log_proyecto_changes()
returns trigger as $$
declare
    v_old_data jsonb;
    v_new_data jsonb;
    v_key text;
    v_old_value text;
    v_new_value text;
begin
    if (TG_OP = 'UPDATE') then
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        for v_key in select jsonb_object_keys(v_new_data)
        loop
            v_old_value := v_old_data->>v_key;
            v_new_value := v_new_data->>v_key;
            
            if (v_key not in ('updated_at', 'created_at')) and (v_old_value is distinct from v_new_value) then
                insert into public.logs_actualizacion (usuario_id, proyecto_id, campo_modificado, valor_anterior, valor_nuevo)
                values (auth.uid(), NEW.id, v_key, v_old_value, v_new_value);
            end if;
        end loop;
    end if;
    return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: Proyecto
drop trigger if exists trigger_log_proyecto_changes on public.proyectos;
create trigger trigger_log_proyecto_changes
after update on public.proyectos
for each row
execute function log_proyecto_changes();

-- Function: log_metricas_changes
create or replace function log_metricas_changes()
returns trigger as $$
declare
    v_old_data jsonb;
    v_new_data jsonb;
    v_key text;
    v_old_value text;
    v_new_value text;
begin
    if (TG_OP = 'UPDATE') then
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        for v_key in select jsonb_object_keys(v_new_data)
        loop
            v_old_value := v_old_data->>v_key;
            v_new_value := v_new_data->>v_key;
            
            if (v_key not in ('updated_at', 'created_at', 'monto_total')) and (v_old_value is distinct from v_new_value) then
                insert into public.logs_actualizacion (usuario_id, proyecto_id, campo_modificado, valor_anterior, valor_nuevo)
                values (auth.uid(), NEW.proyecto_id, 'METRICA: ' || v_key, v_old_value, v_new_value);
            end if;
        end loop;
    end if;
    return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: Metricas
drop trigger if exists trigger_log_metricas_changes on public.metricas;
create trigger trigger_log_metricas_changes
after update on public.metricas
for each row
execute function log_metricas_changes();

-- 5. User Creation (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jduran@fondoempleo.com.pe') THEN
    INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token, encrypted_password)
    VALUES (
      uuid_generate_v4(),
      'authenticated',
      'authenticated',
      'jduran@fondoempleo.com.pe',
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      crypt('pruebafondo', gen_salt('bf'))
    );
  END IF;
END $$;
