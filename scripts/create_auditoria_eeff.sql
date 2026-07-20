-- =====================================================================
-- Sección IV — ANÁLISIS / DIAGNÓSTICO: "Sustento Retorno Monitoreo Financiero"
-- Serie histórica de GASTOS DE PROYECTOS/SERVICIOS (EEFF) y CANTIDAD DE
-- COLABORADORES, 1999–2025 + 2026 proyectado.
--
-- Fuentes (carpeta auditoria):
--   - Gasto: "RELACION DE AUDITORIAS EEFF FONDOEMPLEO - HISTORICO - Version 02.xlsx"
--            columna EGRESOS → "GASTOS DE PROYECTOS/SERVICIOS"
--   - Colaboradores: "CANTIDAD COLABORADORES 1999 AL 2026.xlsx"
--   - 2026 proyectado (S/ 57.5 MM / 41 colab.): pptx "Sustento Retorno Monitoreo Financiero v2.1"
--
-- Ejecutar en el SQL Editor de Supabase.
-- =====================================================================

create table if not exists public.auditoria_eeff_historico (
    anio                        integer primary key,
    gasto_proyectos_servicios   numeric  not null default 0,
    colaboradores               integer  not null default 0,
    categoria                   text     not null,
    proyectado                  boolean  not null default false
);

-- Recarga idempotente
truncate table public.auditoria_eeff_historico;

insert into public.auditoria_eeff_historico
    (anio, gasto_proyectos_servicios, colaboradores, categoria, proyectado)
values
    (1999,  4877602,  2, 'Monitoreo Financiero en la UPS', false),
    (2000, 13262772,  3, 'Monitoreo Financiero en la UPS', false),
    (2001, 11343413,  3, 'Monitoreo Financiero en la UPS', false),
    (2002,  8692466,  3, 'Monitoreo Financiero en la UPS', false),
    (2003,  8539696,  4, 'Monitoreo Financiero en la UPS', false),
    (2004,  8334848,  6, 'Monitoreo Financiero en la UPS', false),
    (2005, 13096767,  6, 'Monitoreo Financiero en la UPS', false),
    (2006, 16725047,  7, 'Monitoreo Financiero en la UPS', false),
    (2007, 18018738, 10, 'Monitoreo Financiero en la UPS', false),
    (2008, 25986026, 18, 'Monitoreo Financiero en la UPS', false),
    (2009, 31556781, 18, 'Monitoreo Financiero en la UPS', false),
    (2010, 36903231, 24, 'Monitoreo Financiero en la UPS', false),
    (2011, 51254007, 25, 'Monitoreo Financiero en la UPS', false),
    (2012, 58710484, 32, 'Monitoreo Financiero en la UPS', false),
    (2013, 75490267, 42, 'Monitoreo Financiero en la UPS', false),
    (2014, 59233874, 43, 'Auditoría asume monit. financiero y auditoría', false),
    (2015, 41073262, 42, 'Auditoría asume monit. financiero y auditoría', false),
    (2016, 50566410, 41, 'Auditoría asume monit. financiero y auditoría', false),
    (2017, 46029872, 40, 'Auditoría asume monit. financiero y auditoría', false),
    (2018, 27597538, 40, 'Auditoría asume monit. financiero y auditoría', false),
    (2019, 13401185, 22, 'Auditoría asume monit. financiero y auditoría', false),
    (2020,  7888803, 16, 'Auditoría sin monitoreo financiero', false),
    (2021, 11403132, 17, 'Auditoría sin monitoreo financiero', false),
    (2022,  3016247, 18, 'Auditoría sin monitoreo financiero', false),
    (2023,  7498323, 21, 'Auditoría sin monitoreo financiero', false),
    (2024,  5885286, 27, 'Auditoría sin monitoreo financiero', false),
    (2025,  7150698, 32, 'Auditoría sin monitoreo financiero', false),
    (2026, 57500000, 41, '2026: retorno del Monitoreo Financiero a la UPS', true);

-- RLS deshabilitado en este proyecto (ver scripts/disable_rls.sql); si estuviera
-- habilitado, añadir política de lectura pública análoga a las demás tablas.
