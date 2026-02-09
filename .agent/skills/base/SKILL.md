---
name: base
description: Protocolo experto para la importación de datos, gestión de esquema y desarrollo de dashboards en Sistema Activa-T.
---

# SKILL: Protocolo Técnico Activa-T

Este documento define los estándares **OBLIGATORIOS** para la manipulación de datos, diseño de base de datos y lógica de frontend. Su objetivo es garantizar la integridad referencial (Cero Nulls), la precisión financiera y la funcionalidad de la UI.

## 1. Integridad de Datos e Importación (ETL)

Al importar datos desde Excel (`Base5.xlsx` u otros), se deben seguir estas reglas para evitar **valores NULL** y **montos en cero**:

### A. Normalización de Texto
- **Limpieza**: Todos los textos de búsqueda (regiones, etapas, modalidades) deben ser normalizados:
  - `trim()`
  - `toLowerCase()`
  - `normalize("NFC")` (Crucial para tildes y caracteres especiales).
- **Match Flexible**: La búsqueda de columnas en el Excel debe ser insensible a mayúsculas/minúsculas.

### B. Auto-Creación de Maestros (Cero Nulls)
- **Regla de Oro**: Si un valor (ej. "Region X") aparece en una tabla transaccional (`becas`, `proyectos`) pero NO existe en la tabla maestra:
  - **NO** dejar el ID en `null`.
  - **SÍ** crear automáticamente el registro en la tabla maestra con un nuevo ID secuencial.
  - Esto asegura que el 100% de los registros se importen.

### C. Parsing de Montos
- **Limpieza Estricta**: Al leer columnas de dinero (`monto_fondoempleo`, etc.):
  - Eliminar comas (`,`) y símbolos de moneda (`S/`, `$`).
  - Convertir cadenas vacías o inválidas a `0`.
  - Verificar: `monto > 0` si el proyecto está activo.

---

## 2. Esquema de Base de Datos (PostgreSQL/Supabase)

### A. Identificadores (IDs)
- **Tablas Maestras** (`regiones`, `etapas`, `modalidades`, `lineas`, `ejes`):
  - Usar **INTEGER** como Primary Key (`id`).
  - **EVITAR** columnas redundantes como `numero` si el `id` ya cumple esa función.
- **Relaciones**: Las Foreign Keys deben ser del mismo tipo (`integer`).

### B. Consultas (SQL)
- Al consultar tablas maestras para dropdowns o filtros:
  - **SELECT**: Usar siempre `id` y `descripcion`.
  - **NO** asumir la existencia de columnas auxiliares (`numero`, `codigo`) a menos que estén verificadas en el esquema actual (`database_schema_strict.sql`).

---

## 3. Lógica de Dashboard y Frontend (Next.js)

### A. Estrategia de Filtrado (Client-Side First)
- **Problema**: Conflictos entre filtros de servidor (URL) y estado local causan dashboards vacíos.
- **Solución**:
  1. **Cargar TODO**: El componente `page.tsx` debe recuperar el dataset completo inicial (sin filtros de servidor restrictivos).
  2. **Filtrar en Cliente**: Dejar que React (`useMemo`) maneje el filtrado dinámico en el navegador. Esto garantiza que los selectores de "Eje" y "Linea" siempre tengan datos sobre los cuales trabajar.

### B. Dropdowns y Opciones
- **Validación de Tipos**: Asegurar que los valores de los `option` (usualmente `number` por los ID enteros) coincidan estrictamente con los tipos de datos en el estado de React.
- **Opción "Todos"**: Siempre incluir una opción `{ value: 'all', label: 'Todos' }` por defecto.

---

## 4. Estándares Visuales (UI/UX)

- **Logo**: Altura fija de **85px**, filtros `contrast(1.1) saturate(1.2)`. Fondo blanco.
- **Gráficos**:
  - Eje X rotado (-45°) para etiquetas largas.
  - Formato de moneda en Millones (ej. "S/ 1.5M").
  - Leyendas siempre visibles (`height: auto`).
- **KPIs**: El indicador de dinero gastado debe llamarse **"Ejecutado"**.

---

## 5. Despliegue y Verificación

- **Puerto**: 8081.
- **Comando**: `docker compose up --build -d`.
- **Checklist de Verificación**:
  1. [ ] ¿Hay 0 valores NULL en `region_id`, `etapa_id`, `modalidad_id`?
  2. [ ] ¿Los filtros "Eje" y "Linea" muestran opciones desplegables?
  3. [ ] ¿Los montos totales coinciden con el Excel (sin ceros accidentales)?
