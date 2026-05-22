---
name: fondoempleo-evaluacion
description: >
  Skill especializada para evaluar proyectos del Sistema de Evaluación FONDOEMPLEO (Eje 1 / Eje Concursal).
  Usar SIEMPRE que el usuario mencione: evaluar un proyecto FONDOEMPLEO, procesar un PDF de proyecto,
  revisar admisibilidad, elegibilidad, habilitación institucional, rúbricas técnicas o financieras,
  calcular puntajes de evaluación, generar JSON de evaluación, o cualquier tarea relacionada con
  proyectos de Línea 1, 2, 3 o 4 de FONDOEMPLEO. También activar cuando el usuario suba un PDF
  de proyecto y pida análisis, revisión o calificación.
---

# Skill: Evaluador de Proyectos FONDOEMPLEO — Eje 1

## Propósito
Evaluar proyectos presentados a FONDOEMPLEO según las Bases del Eje Concursal (Eje 1), siguiendo
el prompt oficial `prompt_eje_1_v9.4`. Produce un JSON estructurado con todos los resultados
y opcionalmente un reporte HTML para descarga.

---

## Flujo de trabajo obligatorio

```
1. LEER el PDF del proyecto
2. DETERMINAR la Línea (L1, L2, L3, L4)
3. EVALUAR Habilitación Institucional (criterios i–iii)
4. EVALUAR Elegibilidad (criterios 1–12)
5. EVALUAR Propuesta Técnica (criterios 1–9, ponderados)
6. EVALUAR Propuesta Financiera (criterios 1–6, ponderados)
7. CALCULAR puntaje final (60% técnico + 40% financiero)
8. DETERMINAR resultado: SELECCIONADO / OBSERVADO / NO SELECCIONADO
9. GENERAR JSON de salida
10. Si el usuario lo pide → generar reporte HTML
```

Antes de evaluar, leer el archivo de referencia correspondiente a la línea:
- `references/lineas_L1_L2.md` → para Línea 1 y Línea 2
- `references/lineas_L3_L4.md` → para Línea 3 y Línea 4
- `references/reglas_criticas.md` → SIEMPRE, para reglas de cálculo sin excepción

---

## Estructura del JSON de salida

```json
{
  "nombre_proyecto": "...",
  "codigo_proyecto": "...",
  "linea": "L1|L2|L3|L4",
  "institucion": "...",
  "monto_fondoempleo": 0,

  // HABILITACIÓN INSTITUCIONAL
  "cumple_institucional_1": "Cumple|No cumple",
  "obs_institucional_1": "...",
  "cumple_institucional_2": "Cumple|No cumple",
  "obs_institucional_2": "...",
  "cumple_institucional_3": "Cumple|No cumple",
  "obs_institucional_3": "...",
  "estado_habilidad": "HABILITADA|NO HABILITADA",

  // ELEGIBILIDAD (criterios 1–12)
  "cumple_1": "Cumple|No cumple", "obs_1": "...",
  "cumple_2": "Cumple|No cumple", "obs_2": "...",
  "cumple_3": "Cumple|No cumple", "obs_3": "...",
  "cumple_4": "Cumple|No cumple", "obs_4": "...",
  "cumple_5": "Cumple|No cumple", "obs_5": "...",
  "cumple_6": "Cumple|No cumple", "obs_6": "...",
  "cumple_7": "Cumple|No cumple", "obs_7": "...",
  "cumple_8": "Cumple|No cumple", "obs_8": "...",
  "cumple_9": "Cumple|No cumple", "obs_9": "...",
  "cumple_10": "Cumple|No cumple", "obs_10": "...",
  "cumple_11": "Cumple|No cumple", "obs_11": "...",
  "cumple_12": "Cumple|No cumple", "obs_12": "...",
  "estado_elegible": "ELEGIBLE|NO ELEGIBLE",

  // PROPUESTA TÉCNICA (9 criterios)
  "pte_calif_1": 0, "pte_resultado_1": 0.0, "sustento_1": "...",
  "pte_calif_2": 0, "pte_resultado_2": 0.0, "sustento_2": "...",
  "pte_calif_3": 0, "pte_resultado_3": 0.0, "sustento_3": "...",
  "pte_calif_4": 0, "pte_resultado_4": 0.0, "sustento_4": "...",
  "pte_calif_5": 0, "pte_resultado_5": 0.0, "sustento_5": "...",
  "pte_calif_6": 0, "pte_resultado_6": 0.0, "sustento_6": "...",
  "pte_calif_7": 0, "pte_resultado_7": 0.0, "sustento_7": "...",
  "pte_calif_8": 0, "pte_resultado_8": 0.0, "sustento_8": "...",
  "pte_calif_9": 0, "pte_resultado_9": 0.0, "sustento_9": "...",
  "pte_puntaje_final": 0.0,
  "pte_supera_60": false,
  "pte_supera_80": false,

  // PROPUESTA FINANCIERA (6 criterios)
  "pfe_calif_1": 0, "pfe_resultado_1": 0.0, "sustento_financiero_1": "...",
  "pfe_calif_2": 0, "pfe_resultado_2": 0.0, "sustento_financiero_2": "...",
  "pfe_calif_3": 0, "pfe_resultado_3": 0.0, "sustento_financiero_3": "...",
  "pfe_calif_4": 0, "pfe_resultado_4": 0.0, "sustento_financiero_4": "...",
  "pfe_calif_5": 0, "pfe_resultado_5": 0.0, "sustento_financiero_5": "...",
  "pfe_calif_6": 0, "pfe_resultado_6": 0.0, "sustento_financiero_6": "...",
  "pfe_puntaje_final": 0.0,
  "pfe_supera_60": false,
  "pfe_supera_80": false,

  // RESULTADO FINAL
  "puntaje_final_total": 0.0,
  "resultado_evaluacion": "SELECCIONADO|OBSERVADO|NO SELECCIONADO",
  "obs_subsanacion": []
}
```

---

## Reglas de decisión para resultado final

```
SI técnica < 60 O financiera < 60  → NO SELECCIONADO (sin posibilidad de subsanación)
SI técnica ≥ 60 Y financiera ≥ 60
  Y (técnica < 80 O financiera < 80) → OBSERVADO (5 días hábiles para subsanar)
SI técnica ≥ 80 Y financiera ≥ 80
  Y estado_habilidad = HABILITADA
  Y estado_elegible = ELEGIBLE        → SELECCIONADO
```

**IMPORTANTE:** Un proyecto NO HABILITADO o NO ELEGIBLE nunca puede ser SELECCIONADO,
independientemente del puntaje técnico/financiero.

---

## Ponderaciones por Línea — Propuesta Técnica

| Crit. | Descripción                              | L1    | L2    | L3    | L4    |
|-------|------------------------------------------|-------|-------|-------|-------|
| 1     | Pertinencia y sustento del problema      | 21.5% | 21.5% | 21.5% | 21.5% |
| 2     | Coherencia del marco lógico              | 21.5% | 21.5% | 21.5% | 21.5% |
| 3     | Innovación y sostenibilidad              |  7.5% |  7.5% |  7.5% |  7.5% |
| 4     | Viabilidad de productos/servicios        |  8.0% |  8.0% |  8.0% |  8.0% |
| 5     | Gestión de riesgos y sostenibilidad      |  5.0% |  5.0% |  5.0% |  5.0% |
| 6     | Gestión del proyecto                     |  5.0% |  5.0% |  5.0% |  5.0% |
| 7     | Inclusión población vulnerable           |  5.0% |  5.0% | 10.0% | 10.0% |
| 8     | Inclusión generación plateada            |  5.0% |  5.0% |  —    |  —    |
| 9     | % beneficiarios mejoran ingresos (L3/L4) |  —    |  —    | 21.5% | 21.5% |
|       | % inserción por beneficiario (L1/L2)     | 21.5% | 21.5% |  —    |  —    |

> Ver `references/lineas_L1_L2.md` o `references/lineas_L3_L4.md` para parámetros detallados.

---

## Lectura del PDF del proyecto

1. Usar `bash_tool` para extraer texto con `pdftotext` o `pymupdf`.
2. Si el PDF es imagen (escaneado), usar OCR con `pytesseract`.
3. Extraer siempre: nombre del proyecto, código, institución, línea, monto FONDOEMPLEO,
   número de beneficiarios, contrapartidas (monetaria y total), presupuesto por rubro.
4. Si no se puede determinar la línea del PDF, preguntar al usuario antes de continuar.

**REGLA CRÍTICA — Fuente primaria obligatoria:**
Siempre evaluar desde el PDF ORIGINAL del proyecto, NUNCA desde un informe de evaluación
previo. Si el usuario sube un informe ya procesado (ej. `evaluacion_REG_XX.pdf`), advertir
que se necesita el PDF original del proyecto para garantizar la evaluación correcta.
Si solo se dispone del informe previo, indicar explícitamente que la evaluación es una
revisión del informe, no una evaluación primaria.

---

## Validación cruzada de Línea — OBLIGATORIA

Después de leer la línea declarada en el documento, SIEMPRE validar contra el monto
solicitado a FONDOEMPLEO. Si hay contradicción, el monto prevalece sobre lo declarado
y se debe alertar al usuario.

```
Rangos de monto por Línea:
  L1: hasta S/ 500,000
  L2: hasta S/ 1,000,000
  L3: hasta S/ 1,500,000
  L4: hasta S/ 5,000,000

Validación:
  SI monto > 1,500,000 Y línea declarada = L3 → ERROR: debe ser L4
  SI monto > 1,000,000 Y línea declarada = L2 → ERROR: debe ser L3 o L4
  SI monto > 500,000   Y línea declarada = L1 → ERROR: debe ser L2, L3 o L4
  SI monto ≤ 500,000   Y línea declarada = L4 → ADVERTENCIA: verificar línea
```

Cuando se detecte contradicción, reportar:
> "⚠️ ALERTA DE LÍNEA: El documento declara [Línea X] pero el monto S/[monto]
> corresponde a [Línea Y]. Se procederá con [Línea Y] para la evaluación."

Consecuencias directas del cambio de línea:
- Cambiar valor de referencia costo/beneficiario (pfe_6)
- Cambiar límite equipo técnico (L4 = 17%, resto = 10%)
- Verificar si criterio 8 aplica (solo L1 y L2)
- Aplicar rúbrica correcta de las Bases
# Reglas Críticas de Cálculo — prompt_eje_1_v9.4

Este archivo contiene las correcciones y reglas absolutas que NO admiten excepción.
Leer SIEMPRE antes de emitir cualquier calificación.

---

## FIX 8 — Contrapartidas (ELIMINATORIO)

**Regla:** La suma de contrapartidas monetarias y no monetarias debe ser LITERALMENTE ≥ 20.00%
del monto FONDOEMPLEO. **No se admite redondeo.**

- 19.97% → **No cumple** (sin excepción)
- 20.00% exacto → Cumple
- La contrapartida monetaria mínima es 5.00% del monto FONDOEMPLEO
- Criterio eliminatorio: si no cumple → estado_elegible = NO ELEGIBLE

**Cálculo:**
```
pct_monetario = (contrapartida_monetaria / monto_fondoempleo) * 100
pct_total     = ((contrapartida_monetaria + contrapartida_no_monetaria) / monto_fondoempleo) * 100

incumple_monetario = pct_monetario < 5.00   (comparación exacta, sin redondeo)
incumple_total     = pct_total < 20.00       (comparación exacta, sin redondeo)
```

Si alguno incumple → "No cumple" con justificación numérica detallada.

---

## FIX 9 — Criterio 1: Pertinencia

**Eliminado:** La exigencia de "≥ 3 fuentes oficiales diferenciadas" NO está en las Bases.

**Regla correcta:** Las Bases solo exigen "evidencia estadística documentada (primaria o secundaria)
debidamente referenciada".

**Escala de calificación:**
- 0 pts: No emplea información estadística documentada
- 10–20 pts (Regular): Evidencia sustenta parcialmente ≤ 80% de los problemas/indicadores
- 30–70 pts (Bueno): Evidencia sustenta > 80% hasta 90% de los indicadores del marco lógico
- 80–100 pts (Muy bueno): Evidencia sustenta > 90% hasta 100% de los indicadores del marco lógico

La diferencia 70/100 se basa en la **congruencia indicadores-diagnóstico-soluciones** y la
**cadena causal del problema**, NO en el número de fuentes.

---

## FIX 10 — Criterio 6: Gestión del Proyecto

**Corregido:** Las Bases piden **"perfiles del personal"** (conocimientos y experiencias según
tipo de proyecto), NO "CVs completos".

**Evaluar:**
- Estrategia de intervención técnica
- Gestión de recursos humanos (perfiles adecuados al tipo de proyecto)
- Bienes de capital y/o intermedios
- Recursos financieros
- Vinculación y estrategia de implementación de la Institución Ejecutora

---

## FIX 11 — Criterio 2: Coherencia Marco Lógico (L3 y L4)

**Solo para L3 y L4:** Verificar explícitamente la cadena causal:
```
capacitación → productividad → ingresos
```
Y que el marco lógico cuantifique los beneficiarios que mejoran ingresos.

**Sin esta cadena documentada, la coherencia NO puede ser 100 puntos.**

---

## FIX 12 — Criterio 4: Viabilidad (L3 y L4)

**Solo para L3 y L4:** Verificar que cada componente tenga actividades diferenciadas
de sus resultados. Si los componentes y resultados son idénticos o no hay diferenciación
clara → reducir puntaje.

---

## Límites presupuestarios por Línea

| Rubro                        | L1     | L2     | L3     | L4     |
|------------------------------|--------|--------|--------|--------|
| Equipo técnico               | ≤ 10%  | ≤ 10%  | ≤ 10%  | ≤ 17%  |
| Gastos de gestión/indirectos | ≤  0.5%| ≤  0.5%| ≤  0.5%| ≤  0.5%|
| Gastos bancarios             | ≤  0.15%|≤ 0.15%|≤ 0.15%|≤ 0.15%|

Exceder cualquier límite → calificación financiera reducida (criterio pfe_3).

---

## Valores de referencia Costo por Beneficiario

| Línea | Valor referencia |
|-------|-----------------|
| L1    | S/ 4,000        |
| L2    | S/ 5,000        |
| L3    | S/ 8,000        |
| L4    | S/ 12,000       |

**Escala de calificación (criterio pfe_6):**
- Diferencia ≤ 15% → 100 pts (Muy bueno)
- Diferencia 15–30% → 70 pts (Bueno)
- Diferencia > 30% → 0 pts (Insatisfactorio)
# Parámetros de Evaluación — Línea 1 y Línea 2

## Definición de Líneas

**Línea 1 (L1):** Proyectos de inserción laboral. Beneficiarios acceden a empleos decentes
mejorados o generados al término del proyecto.

**Línea 2 (L2):** Proyectos de mejora de empleabilidad. Similar a L1 pero con mayor
énfasis en formación y certificación de competencias.

---

## Criterio 9 (Técnico) — % de inserción por beneficiario (L1 y L2)

| Calificación | Puntos | Descripción |
|---|---|---|
| Insatisfactorio | 0 | < 30% de beneficiarios logra inserción |
| Regular | 10–20 | 30–50% de beneficiarios logra inserción |
| Bueno | 30–70 | 50–70% de beneficiarios logra inserción |
| Muy bueno | 80–100 | > 70% de beneficiarios logra inserción |

Ponderación: **21.5%**

---

## Criterio 7 (Técnico) — Inclusión población vulnerable (L1 y L2)

Ponderación: **5.0%**

Evaluar inclusión de personas en situación de vulnerabilidad vinculadas a cadenas
logísticas o productivas (personas con discapacidad, jóvenes en riesgo, mujeres
jefas de hogar, etc.)

---

## Criterio 8 (Técnico) — Inclusión generación plateada (L1 y L2)

Ponderación: **5.0%** (solo L1 y L2; L3 y L4 no tienen este criterio)

Evaluar inclusión de personas de la tercera edad (generación plateada) como
beneficiarios del proyecto.

---

## Habilitación Institucional — Montos L1/L2

- Monto mínimo solicitado: S/ 50,000
- Monto máximo solicitado (L1): S/ 500,000
- Monto máximo solicitado (L2): S/ 1,000,000
- El monto solicitado debe ser ≤ promedio ingresos brutos últimos 3 años (ejecución directa)

---

## Criterios de Elegibilidad específicos L1/L2

**Criterio 3 (Formato):** Presentar:
- Formato N°5: Propuesta técnica
- Formato N°6: Propuesta financiera
- Formato N°7: DJ aportes de instituciones (si aplica)
- Formato N°8: DJ aportes de beneficiarios (si aplica)

**Criterio 12 (Contrapartidas):**
- Monetaria mínima: 5% del monto FONDOEMPLEO
- Total (monetaria + no monetaria) mínima: 20% del monto FONDOEMPLEO
- PROHIBIDO el redondeo (ver reglas_criticas.md FIX 8)

---

## Propuesta Financiera — Criterios L1/L2

| Crit. | Descripción                              | Ponderación |
|-------|------------------------------------------|-------------|
| pfe_1 | Coherencia presupuesto-actividades       | 21.5%       |
| pfe_2 | Justificación de costos                  | 10.0%       |
| pfe_3 | Límites por rubro (equipo técnico, etc.) | 15.5%       |
| pfe_4 | Contrapartidas                           | 21.5%       |
| pfe_5 | Sostenibilidad financiera                | 10.0%       |
| pfe_6 | Costo por beneficiario (ref. S/4,000 L1, S/5,000 L2) | 21.5% |
# Parámetros de Evaluación — Línea 3 y Línea 4

## Definición de Líneas

**Línea 3 (L3):** Proyectos de mejora de ingresos en actividades económicas existentes.
Beneficiarios desarrollan competencias hasta nivel 3 (Kirkpatrick: implementación
de lo aprendido) y mejoran sus ingresos formales.

**Línea 4 (L4):** Proyectos de mayor escala e impacto. Similar a L3 con mayor monto
y alcance. Equipo técnico puede llegar hasta 17% (vs 10% en otras líneas).

---

## Cadena causal obligatoria (L3 y L4) — FIX 11

Verificar que el proyecto documente explícitamente:
```
capacitación → productividad → incremento de ingresos
```
El marco lógico debe cuantificar beneficiarios que mejoran ingresos.
Sin esta cadena → Criterio 2 NO puede ser 100 puntos.

---

## Criterio 9 (Técnico) — % beneficiarios que mejoran ingresos (L3 y L4)

| Calificación | Puntos | Descripción |
|---|---|---|
| Insatisfactorio | 0 | No sustenta o < 20% mejora ingresos |
| Regular | 10–20 | 20–40% de beneficiarios mejora ingresos |
| Bueno | 30–70 | 40–60% de beneficiarios mejora ingresos |
| Muy bueno | 80–100 | > 60% de beneficiarios mejora ingresos |

Ponderación: **21.5%**

---

## Criterio 7 (Técnico) — Inclusión población vulnerable (L3 y L4)

Ponderación: **10.0%** (mayor que L1/L2 que es 5%)

---

## Criterio 8 — NO APLICA para L3 y L4

La generación plateada (criterio 8) **no existe** en L3 y L4.
No incluir en el JSON ni en el cálculo.

---

## Indicadores clave del Marco Lógico L3/L4

El proyecto debe especificar:
- N° beneficiarios que participan en actividades
- N° beneficiarios que desarrollan competencias nivel 3 (Kirkpatrick)
- N° beneficiarios que mejoran sus ingresos formales
- Horizonte de evaluación: mínimo 3 años, máximo 10 años

---

## Módulos de evaluación financiera L3/L4

El proyecto debe presentar:
- Módulo de Ingresos (con/sin proyecto, ingresos incrementales)
- Módulo de Inversión (FONDOEMPLEO + Institución + Aliados)
- Módulo de Costos (con/sin proyecto, costos incrementales)
- Flujos Netos: Tasa de descuento, VAN, TIR

---

## Montos L3/L4

- L3: Hasta S/ 2,000,000
- L4: Hasta S/ 5,000,000
- Equipo técnico L4: hasta 17% (vs 10% otras líneas)

---

## Propuesta Financiera — Criterios L3/L4

| Crit. | Descripción                              | Ponderación |
|-------|------------------------------------------|-------------|
| pfe_1 | Coherencia presupuesto-actividades       | 21.5%       |
| pfe_2 | Justificación de costos                  | 10.0%       |
| pfe_3 | Límites por rubro                        | 15.5%       |
| pfe_4 | Contrapartidas                           | 21.5%       |
| pfe_5 | Sostenibilidad (VAN/TIR positivos)       | 10.0%       |
| pfe_6 | Costo por beneficiario (ref. S/8,000 L3, S/12,000 L4) | 21.5% |
