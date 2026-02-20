---
name: base
description: Protocolo experto para la importación de datos, gestión de esquema y desarrollo de dashboards en Sistema Activa-T.
---

# SKILL: Protocolo Técnico Activa-T (Estándar 2026)

Este documento define los estándares **OBLIGATORIOS** para la manipulación de datos, diseño de base de datos y lógica de frontend. Su objetivo es garantizar la integridad referencial, la precisión financiera y la consistencia de la UI.

## 1. Integridad de Datos e Importación (ETL)

### A. Fase 0: Prioridad de Carga (Tablas Maestras)
Antes de procesar cualquier proyecto o servicio, es **OBLIGATORIO** actualizar las tablas maestras desde `Base7.xlsx`.
-   **Tablas Objetivo**: `ejes`, `lineas`, `regiones`, `modalidades`, `etapas`, `instituciones_ejecutoras`.
-   **Estrategia UPSERT**:
    -   Al leer las hojas maestras, el script debe usar lógica `UPSERT` (Update or Insert):
    -   **Si el ID existe**: Actualizar la `descripcion`/`nombre`.
    -   **Si NO existe**: Insertar el nuevo registro.
    -   Esto asegura la incorporación correcta de nuevos registros (ej. IDs 498-515) sin duplicados.

### B. Fase 1: Carga de Proyectos (Lógica de Cruce/Join)
Al procesar la hoja `proyecto_servicio`:
1.  **Resolución de Relaciones (Foreign Keys)**:
    -   **Buscar**: Obtener el nombre desde el Excel (ej. "Cusco").
    -   **Normalizar**: Aplicar `trim().toLowerCase()` para buscar en la tabla maestra ya cargada.
    -   **Obtener ID**: Recuperar el `id` numérico de la maestra.
    -   **Etapa 4 (Convenio)**: Columna 'Firma convenio' o 'Convenio'.
    -   **Etapa 5 (Ejecución)**: Columna 'En ejecución' o 'Inicio obra'.
    -   **Etapa 6 (Ejecutado)**: Columna 'Ejecutado'.
    -   *Protocolo*: Insertar registro en `avance_proyecto` solo si la fecha es válida.
    -   **Guardar**: Insertar ese ID en la tabla `proyectos_servicios`.
    -   **Mapeo de Campos Críticos (Actualizado)**:
        -   `nombre` (DB) <== `nombre proyecto o servicio` (Excel).
        -   `beneficiarios` (DB) <== `cantidad de beneficiarios` (Excel).
        -   `estado` (DB) <== `etapa` (Excel). *Nota: Si es FK, buscar ID por nombre*.
        -   **Línea (Estricto)**: `linea_id` <== Buscar valor de columna 'Línea' en tabla maestra `lineas` (usar `trim().toLowerCase()`).
        -   **Modalidad (Estricto)**: `modalidad_id` <== Buscar valor de columna 'Modalidad de ejecución' en tabla maestra `modalidades` (usar `trim().toLowerCase()`).
2.  **Identidad del Proyecto (Regla de Oro)**:
    -   El registro del proyecto se guarda usando la columna `numero` del Excel como su `id` (Primary Key) en la BD.

### C. Fase 2: Reconstrucción de Avances y Programa

#### 1. Avances (`avance_proyecto`)
-   **Limpieza**: `TRUNCATE TABLE public.avance_proyecto RESTART IDENTITY;`
-   **Mapeo**: IDs 1-6 (1:Bases ... 2:**Lanzamiento** ... 6:Ejecutado).

#### 2. Programa de Inversión (`programa_proyecto`)
-   **Limpieza**: `TRUNCATE TABLE public.programa_proyecto RESTART IDENTITY;`
-   **Mapeo de Meses Universal**:
    -   **Patrón**: El script debe detectar CUALQUIER columna cuyo encabezado cumpla el formato `[Mes]-[Año]` (ej. `Ene-23`, `Ago-25`, `Dic-30`).
    -   **NO limitar** al rango 2025-2029. Debe capturar toda la historia y el futuro del proyecto.
    -   **Iteración**: Por cada coincidencia, insertar si `monto > 0`, vinculando por `proyecto_id` (`numero`).

---

## 2. Lógica de Visualización (Frontend)

### A. Timeline Chart (Lógica de Cascada)
-   **Salida Temprana**: Si no hay fecha siguiente, extender actual a "Hoy" y anular posteriores.
-   **Altura Dinámica**: `height = data.length * 40px`.
-   **Tooltip Administrativo**: El Tooltip debe priorizar datos administrativos (`codigo_proyecto`, `institucion_ejecutora`, `gestora`, `monto_fondoempleo`) sobre los datos cronológicos de etapas. Se muestra como mini-tabla con máximo 5 filas visibles y scroll si hay más.

### B. Estándares de Interfaz
1.  **Sincronización Total**: El filtro de Modalidad afecta a Donas, Timeline y Programas.
    -   **Regla de Nombre (Eje Y)**: El formateador debe seguir ESTRICTAMENTE el patrón: `Eje {eje_id} - Línea {linea_id}`.
    -   **Leyenda**: Debe ubicarse en la parte **Superior Derecha** (`verticalAlign="top"`, `align="right"`).
    -   **Nombrado de Ejes en Leyendas de Donas**: Prefijo obligatorio `E{id}`. Ejemplo: `E1 - Concursal Activate`, `E2 - ...`.
    -   **Ordenamiento Jerárquico**:
        1.  **Eje**: `eje_id` (Menor a Mayor).
        2.  **Línea**: `linea_id` (Menor a Mayor).
        3.  **Fecha Inicio**: `fecha_inicio` (Más antigua a más reciente).
    -   **Gráficos de Barras Regionales**: Orden alfabético (A-Z) en el eje X. El Tooltip debe incluir siempre: Región (título), `Proyectos: X` (conteo), y luego los valores monetarios (Fondoempleo, Ejecutado).

### C. Orden del Layout (Dashboard de Proyectos)
El orden **OBLIGATORIO** de componentes es:
1.  Filtros (Logo + Selectores)
2.  KPI Cards
3.  **Línea de Tiempo** (Timeline Chart) — elemento principal
4.  Gráficos de Dona (Estado, Eje, Línea)
5.  Funding Chart (Barras por Región)
6.  Gestora Chart (si aplica)

---

## 3. Despliegue y Verificación
-   **Docker**: `docker compose down && docker compose up --build -d`.
-   **Verificación**:
    1.  [ ] Maestras actualizadas con UPSERT (incluye nuevos IDs).
    2.  [ ] Programa incluye meses fuera del rango estándar (2023, 2030...).
    3.  [ ] El Timeline muestra "Lanzamiento" (ID 2).
