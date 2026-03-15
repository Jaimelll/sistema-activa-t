---
name: avance
description: Protocolo de actualización atómica para el campo 'avance' en el Sistema Activa-T.
---

# SKILL: Actualización Selectiva de Avance (Estándar 2026)

Este protocolo está diseñado para actualizar el progreso financiero (campo `avance`) sin comprometer la integridad de las tablas maestras.

## 1. Protocolo de Actualización Puntual

Este skill debe ejecutarse para procesar archivos de seguimiento de ejecución (ej. `avance0403.xlsx`).

### A. Restricciones Críticas de Seguridad
- **PROHIBICIÓN DE TRUNCATE**: Está estrictamente prohibido usar comandos `TRUNCATE` o `DELETE`.
- **PROTECCIÓN DE COLUMNAS**: No se debe modificar el `codigo_proyecto`, `nombre`, `gestora` ni claves foráneas.
- **INTEGRIDAD**: Este skill ahora escribe exclusivamente en la columna `avance`.

### B. Procedimiento ETL Atómico
1. **Origen**: Leer el archivo Excel definido por el usuario (ej. `avance0403.xlsx`).
2. **Identificación**: Localizar la columna `id` (Primary Key) y el valor numérico destinado al progreso.
3. **Ejecución en Supabase**:
   - Realizar un `UPDATE` en la tabla `public.proyectos`.
   - **Match**: `WHERE id = excel.id`.
   - **Set**: `avance = excel.nuevo_valor_del_excel`.
4. **Validación**: 
   - Ignorar filas donde el `id` no exista.
   - Si el Excel aún usa el encabezado "monto_contrapartida", mapearlo automáticamente hacia la columna `avance` en la base de datos.

## 2. Verificación de Despliegue
- **Reporte**: Informar al usuario el número exacto de filas procesadas y confirmar que los datos se reflejaron en la columna `avance`.