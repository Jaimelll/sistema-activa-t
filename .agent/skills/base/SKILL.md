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
    -   **Guardar**: Insertar ese ID en la tabla `proyectos_servicios`.
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

### B. Estándares de Interfaz
1.  **Sincronización Total**: El filtro de Modalidad afecta a Donas, Timeline y Programas.
2.  **Etiquetas de Gráficos (Ejes)**:
    -   **Regla de Nombre**: El formateador debe usar SIEMPRE el nombre proveniente de la **Tabla Maestra (DB)**, ignorando el texto del Excel si difiere.
    -   **Ejemplo Crítico**: Para el ID 2, el gráfico DEBE mostrar "**Lanzamiento**", independientemente de si el Excel dice "Actos Previos" u otro.
    -   **Formato**: `{eje_id}.- {eje_nombre_db} - Línea {linea_id}`.

---

## 3. Despliegue y Verificación
-   **Docker**: `docker compose down && docker compose up --build -d`.
-   **Verificación**:
    1.  [ ] Maestras actualizadas con UPSERT (incluye nuevos IDs).
    2.  [ ] Programa incluye meses fuera del rango estándar (2023, 2030...).
    3.  [ ] El Timeline muestra "Lanzamiento" (ID 2).
