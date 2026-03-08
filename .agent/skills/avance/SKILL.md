---
name: avance
description: Protocolo de actualización atómica para montos de contrapartida en Sistema Activa-T.
---

# SKILL: Actualización Selectiva de Contrapartida (Estándar 2026)

Este protocolo está diseñado para actualizar datos financieros específicos sin comprometer la integridad de las tablas maestras ni la estructura general del proyecto.

## 1. Protocolo de Actualización Puntual (Fase 3)

Este skill debe ejecutarse de forma aislada para procesar archivos de avance (ej. `avance0403.xlsx`).

### A. Restricciones Críticas de Seguridad
- **PROHIBICIÓN DE TRUNCATE**: Está estrictamente prohibido usar comandos `TRUNCATE` o `DELETE` durante la ejecución de este skill.
- **PROTECCIÓN DE COLUMNAS**: No se debe modificar el `codigo_proyecto`, `nombre`, `gestora` ni ninguna clave foránea (`FK`).
- **AISLAMIENTO**: No ejecutar lógicas de "Skill Base" o "Fase 0/1" que impliquen recarga de tablas maestras.

### B. Procedimiento ETL Atómico
1. **Origen**: Leer el archivo Excel definido por el usuario (ej. `avance0403.xlsx`).
2. **Identificación**: Localizar la columna `id` (Primary Key) y la columna `monto_contrapartida`.
3. **Ejecución en Supabase**:
   - Realizar un `UPDATE` en la tabla `public.proyectos_servicios`.
   - **Match**: `WHERE id = excel.id`.
   - **Set**: `monto_contrapartida = excel.monto_contrapartida`.
4. **Validación**: Ignorar cualquier fila donde el `id` no exista en la base de datos o el monto sea nulo.

## 2. Verificación de Despliegue
- **Docker**: Ejecutar `docker compose up -d --build frontend` solo si el cambio requiere una actualización en el estado de los componentes del dashboard.
- **Reporte**: Informar al usuario el número exacto de filas procesadas (Ej: "56 registros actualizados exitosamente").