/**
 * Deja los proyectos del Eje Sectorial exactamente como los declaran los dos
 * informes de agosto-2026:
 *   - "AM-Proyectos Sectoriales_Fechas de inicio.docx"  (ayuda memoria)
 *   - "SECTORIALES Y LINEAS DE TIEMPO DESDE PRIMER CONTACTO (v1).xlsx", Hoja3
 *
 * Son 11 proyectos por S/ 138,707,546. Los 7 que hoy estan en el grupo 37 y no
 * figuran en los informes NO se tocan: se quedan ahi como propuestas que no
 * prosperaron, y el grupo 37 deja de dibujarse en la linea de tiempo (ver
 * GRUPOS_SIN_LINEA_DE_TIEMPO en src/app/dashboard/actions.ts).
 *
 * Mapeo columna del informe -> etapa (verificado contra las fechas ya cargadas):
 *   PRIMER CONTACTO ............ 1 Bases      (mes declarado; se asigna el dia 01)
 *   Presentacion formal (oficio) 2 Lanzamiento
 *   CONSEJO DIRECTIVO .......... 3 Aprobado
 *   Suscripcion del convenio ... 4 Firma
 *   INICIO DE EJECUCION ........ 5 Ejecucion
 *
 * Uso:  node scripts/actualiza_sectoriales_2026.cjs [--dry]
 */
const fs = require('fs'); const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const GRUPO_VIGENTE = 40;      // "Sectorial 2026"
const GRUPO_DESCARTADAS = 37;  // "Propuestas Sectorial - Eje2 L1, L3 y L4"
const FUENTE = 'Informes sectoriales ago-2026 (ayuda memoria + cuadro Hoja3)';

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)
    .forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); });
  return env;
}

// ── Los 11 proyectos del informe ────────────────────────────────────────────
// id: null = hay que crearlo.  avances: [etapa, fecha, nota]
const PROYECTOS = [
  {
    item: 1, id: 494, codigo: 'S2601', ie: 'MIDAGRI', linea: 4, region: 19,
    nombre: 'FORTALECIMIENTO DE LA ASOCIATIVIDAD EMPRESARIAL AGRARIA DE LOS PRODUCTORES ORGANIZADOS DE LA AGRICULTURA FAMILIAR EN 14 DEPARTAMENTOS DEL PERÚ PARA SU ACCESIBILIDAD AL MERCADO',
    monto: 44999814.27, beneficiarios: 8947,
    estado: 'Convenio MIDAGRI-FONDOEMPLEO suscrito el 02-06-2026. Inició actividades el 21-07-2026: ya está en ejecución. Duración 36 meses.',
    avances: [
      [1, '2024-11-01', 'Primer contacto'],
      [3, '2026-03-11', 'Aprobación en Consejo Directivo'],
      [4, '2026-06-02', 'Suscripción del convenio con MIDAGRI'],
      [5, '2026-07-21', 'Inicio de actividades del proyecto'],
    ],
  },
  {
    item: 2, id: 569, codigo: 'S2602', ie: 'PRODUCE', linea: 4, region: 19,
    nombre: 'FORTALECIMIENTO DE LA COMPETITIVIDAD E INCREMENTAR LOS INGRESOS DE LAS UNIDADES PRODUCTIVAS DE LA CADENA DE VALOR DE LA FIBRA DE ALPACA, EN LAS REGIONES DE CUSCO, PUNO Y AREQUIPA',
    monto: 14495239.10, beneficiarios: 2536,
    estado: 'Convenio con PRODUCE suscrito en Puno el 10-07-2026, en regularización. Pendiente definir la fecha de inicio de actividades (se estimó la 2.a quincena de agosto-2026). Duración 36 meses.',
    avances: [
      [1, '2025-10-01', 'Primer contacto'],
      [3, '2026-05-29', 'Aprobación en Consejo Directivo'],
      [4, '2026-07-10', 'Suscripción del convenio con PRODUCE, en la ciudad de Puno'],
    ],
  },
  {
    item: 3, id: 495, codigo: 'S2604', ie: 'PRODUCE', linea: 3, region: 23,
    nombre: 'FORTALECIMIENTO DE CAPACIDADES EMPRENDEDORAS DE LAS MYPE EN EL ÁMBITO DEL VRAEM – VRAEM PRODUCTIVO',
    monto: 12128713.55, beneficiarios: 2700,
    estado: '100 % revisado. Última reunión con PRODUCE el 15-07-2026, donde el consultor presentó la subsanación de observaciones. PRODUCE tiene pendiente presentar formalmente el proyecto a FONDOEMPLEO. Duración 36 meses.',
    avances: [
      [1, '2025-07-01', 'Primer contacto'],
    ],
  },
  {
    item: 4, id: null, codigo: 'S2605', ie: 'PRODUCE', linea: 3, region: 19,
    nombre: 'CAPACÍTATE MYPERÚ: FORTALECIMIENTO DE CAPACIDADES DE GESTIÓN Y TÉCNICAS PARA LA ALTA RECURRENCIA DE MYPE MANUFACTURERAS EN MERCADOS FORMALES',
    monto: 4534928, beneficiarios: 1200,
    estado: 'Proyecto en elaboración. Se enviaron comentarios al sector el 06-08-2026; se espera que convoquen a una nueva reunión para revisar la subsanación. Duración 24 meses. Beneficiarios: 1,200 MYPE (unidades, no personas).',
    avances: [
      [1, '2026-05-01', 'Primer contacto'],
    ],
  },
  {
    item: 5, id: 568, codigo: 'S2603', ie: 'MTPE', linea: 1, region: 19,
    nombre: 'INCLUSIÓN LABORAL CON EMPLEO CON APOYO PARA PERSONAS CON DISCAPACIDAD EN LIMA, CALLAO, ICA Y LA LIBERTAD',
    monto: 1635548.69, beneficiarios: 800,
    estado: 'Aprobado en Consejo Directivo el 07-07-2026. Se viene coordinando con el MTPE la suscripción del convenio de financiamiento. Duración 18 meses.',
    avances: [
      [1, '2026-02-01', 'Primer contacto'],
      [3, '2026-07-07', 'Aprobación en Consejo Directivo'],
    ],
  },
  {
    item: 6, id: null, codigo: 'S2606', ie: 'MTPE', linea: 1, region: 19,
    nombre: 'CAPACITACIÓN LABORAL PARA LA MEJORA DE LA EMPLEABILIDAD DE PERSONAS EN SITUACIÓN DE VULNERABILIDAD PARA INSERTARSE LABORALMENTE EN LAS OCUPACIONES DEMANDADAS POR LOS SECTORES ECONÓMICOS DE AGRICULTURA, COMERCIO, INDUSTRIA, CONSTRUCCIÓN Y TRANSPORTE, EN LAS REGIONES DE ÁNCASH, AREQUIPA, CALLAO, ICA, LAMBAYEQUE, LA LIBERTAD, LIMA METROPOLITANA, LIMA PROVINCIAS Y PIURA',
    monto: 41095655, beneficiarios: 11060,
    estado: 'Presentado por el Secretario General del MTPE mediante oficio del 03-07-2026. El 24-07-2026 se comunicaron las observaciones al sector para su subsanación; a la fecha sin respuesta. Duración 30 meses.',
    avances: [
      [1, '2026-02-01', 'Primer contacto'],
      [2, '2026-07-03', 'Presentación formal del proyecto por el sector (oficio del Secretario General)'],
    ],
  },
  {
    item: 7, id: null, codigo: 'S2607', ie: 'MIDIS', linea: 3, region: 19,
    nombre: 'FORTALECIMIENTO DE CAPACIDADES TÉCNICO-PRODUCTIVAS Y DE GESTIÓN EMPRESARIAL PARA LA ALTA RECURRENCIA DE EMPRENDIMIENTOS RURALES INCLUSIVOS EN MERCADOS FORMALES',
    monto: 6115329, beneficiarios: 1200,
    estado: 'Proyecto en elaboración. El 05-08-2026 se sostuvo reunión con MIDIS y FONCODES para revisar el avance de la propuesta; se brindaron comentarios y se espera que el sector convoque a una nueva reunión. Duración 33 meses. Beneficiarios: 1,200 emprendimientos rurales inclusivos (unidades, no personas).',
    avances: [
      [1, '2026-04-01', 'Primer contacto'],
    ],
  },
  {
    item: 8, id: null, codigo: 'S2608', ie: 'MIMP', linea: 3, region: 19,
    nombre: 'OPORTUNIDADES PARA TODAS: FORTALECIMIENTO DE UNIDADES ECONÓMICAS DE MUJERES PARA SU INSERCIÓN EN MERCADOS Y AUTONOMÍA ECONÓMICA',
    monto: 7680632.90, beneficiarios: 2000,
    estado: 'Presentado por el Secretario General del MIMP mediante oficio del 14-07-2026. El 17-07-2026 se enviaron las observaciones; el 03-08-2026 el MIMP presentó la subsanación, que viene siendo revisada por FONDOEMPLEO. Duración 30 meses.',
    avances: [
      [1, '2026-05-01', 'Primer contacto'],
      [2, '2026-07-14', 'Presentación formal del proyecto por el sector (oficio del Secretario General)'],
    ],
  },
  {
    item: 9, id: null, codigo: 'S2609', ie: 'MIMP', linea: 1, region: 19,
    nombre: 'DESARROLLO DE COMPETENCIAS LABORALES Y EMPRENDEDORAS EN RESIDENTES CON DISCAPACIDAD DE LOS CENTROS DE ACOGIDA RESIDENCIAL DEL CONADIS EN LIMA Y AREQUIPA',
    monto: 2936838, beneficiarios: 125,
    estado: 'El 28-07-2026 el MIMP presentó formalmente el proyecto a FONDOEMPLEO. Viene siendo evaluado según las Bases del Eje Sectorial. Duración 24 meses.',
    avances: [
      [1, '2026-05-01', 'Primer contacto'],
      [2, '2026-07-28', 'Presentación formal del proyecto por el sector'],
    ],
  },
  {
    item: 10, id: null, codigo: 'S2610', ie: 'MIMP', linea: 3, region: 16,
    nombre: 'FORTALECIMIENTO DE EMPRENDIMIENTOS SOSTENIBLES PARA LA INCLUSIÓN ECONÓMICA DE PERSONAS ADULTAS MAYORES DE LIMA METROPOLITANA – PLATEA PRODUCTIVA EMPRENDEDORA',
    monto: 1867736, beneficiarios: 430,
    estado: 'El 28-07-2026 el MIMP presentó formalmente el proyecto a FONDOEMPLEO. Viene siendo evaluado según las Bases del Eje Sectorial. Duración 24 meses.',
    avances: [
      [1, '2026-05-01', 'Primer contacto'],
      [2, '2026-07-28', 'Presentación formal del proyecto por el sector'],
    ],
  },
  {
    item: 11, id: null, codigo: 'S2611', ie: 'MIMP', linea: 1, region: 16,
    nombre: 'FORTALECIMIENTO DE LA EMPLEABILIDAD E INSERCIÓN LABORAL FORMAL DE JÓVENES EN SITUACIÓN DE VULNERABILIDAD QUE EGRESAN DEL ACOGIMIENTO FAMILIAR EN LIMA – IMPULSO JOVEN',
    monto: 1217112, beneficiarios: 270,
    estado: 'Proyecto en elaboración. El 05-08-2026 se sostuvo reunión con el MIMP para revisar la propuesta; se brindaron comentarios y se espera que el MIMP convoque a una nueva reunión. Duración 24 meses.',
    avances: [
      [1, '2026-05-01', 'Primer contacto'],
    ],
  },
];

(async () => {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const say = (s) => console.log(s);

  say(DRY ? '-- SIMULACION (--dry): no se escribe nada --' : '-- ESCRITURA EN BASE --');

  // 0 · Foto previa de los grupos 37 y 40
  const { data: antes, error: errAntes } = await sb.from('proyectos')
    .select('*, avance_proyecto(id,etapa_id,fecha,sustento,monto)')
    .in('grupo_id', [GRUPO_DESCARTADAS, GRUPO_VIGENTE]);
  if (errAntes) throw new Error(`Leyendo estado previo: ${errAntes.message}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snap = path.join(__dirname, `backup_pre_sectoriales_${stamp}.json`);
  if (!DRY) fs.writeFileSync(snap, JSON.stringify(antes, null, 1));
  say(`Foto previa: ${antes.length} proyectos -> ${DRY ? '(no escrita)' : path.basename(snap)}\n`);

  // 1 · Instituciones ejecutoras que faltan
  const { data: ies } = await sb.from('instituciones_ejecutoras').select('id, nombre');
  const ieByName = new Map(ies.map(i => [String(i.nombre).trim().toUpperCase(), i.id]));
  for (const nombre of ['MIMP', 'MIDIS']) {
    if (ieByName.has(nombre)) { say(`IE ${nombre}: ya existe`); continue; }
    if (DRY) { say(`IE ${nombre}: se crearia`); ieByName.set(nombre, '(nueva)'); continue; }
    const { data, error } = await sb.from('instituciones_ejecutoras').insert({ nombre }).select('id').single();
    if (error) throw new Error(`No se pudo crear la IE ${nombre}: ${error.message}`);
    ieByName.set(nombre, data.id);
    say(`IE ${nombre}: creada (${data.id})`);
  }
  say('');

  // 2 · Reservar ids para los nuevos (proyectos.id NO es autoincremental)
  const { data: maxRow } = await sb.from('proyectos').select('id').order('id', { ascending: false }).limit(1);
  let nextId = Number(maxRow[0].id) + 1;
  PROYECTOS.filter(p => p.id === null).forEach(p => { p.id = nextId++; p._nuevo = true; });

  // 3 · Escribir proyecto por proyecto
  const hoy = new Date().toISOString().slice(0, 10);
  for (const p of PROYECTOS) {
    const fila = {
      id: p.id, codigo_proyecto: p.codigo, nombre: p.nombre,
      linea_id: p.linea, eje_id: 2, region_id: p.region, modalidad_id: 2,
      institucion_ejecutora_id: ieByName.get(p.ie),
      monto_fondoempleo: p.monto, beneficiarios: p.beneficiarios,
      'año': 2026, grupo_id: GRUPO_VIGENTE,
    };
    if (p._nuevo) {
      fila.gestora = 'POR DEFINIR'; fila.contrapartida = 0;
      fila.avance = 0; fila.avance_tecnico = 0;
    }

    if (!DRY) {
      const { error } = p._nuevo
        ? await sb.from('proyectos').insert(fila)
        : await sb.from('proyectos').update(fila).eq('id', p.id);
      if (error) throw new Error(`Proyecto ${p.codigo}: ${error.message}`);
    }

    // 3b · La bitacora se reemplaza entera por la del informe
    const viejos = (antes.find(a => a.id === p.id) || {}).avance_proyecto || [];
    if (viejos.length && !DRY) {
      const { error } = await sb.from('avance_proyecto').delete().in('id', viejos.map(v => v.id));
      if (error) throw new Error(`Borrando avances de ${p.codigo}: ${error.message}`);
    }
    const filas = p.avances.map(([etapa, fecha, nota], i) => ({
      proyecto_id: p.id, etapa_id: etapa, fecha, monto: 0,
      sustento: (i === p.avances.length - 1)
        ? `${nota}. ${p.estado} — ${FUENTE}`
        : `${nota} — ${FUENTE}`,
    }));
    if (!DRY) {
      let { error } = await sb.from('avance_proyecto').insert(filas);
      if (error && /duplicate key|llave duplicada/i.test(error.message)) {
        // La secuencia identity quedo detras de los ids cargados a mano
        const { data: mx } = await sb.from('avance_proyecto').select('id').order('id', { ascending: false }).limit(1);
        let n = Number(mx[0].id) + 1;
        ({ error } = await sb.from('avance_proyecto').insert(filas.map(f => ({ ...f, id: n++ }))));
      }
      if (error) throw new Error(`Insertando avances de ${p.codigo}: ${error.message}`);
    }

    // 3c · Derivados con la MISMA regla que recalculateProyectoAvance():
    //      la etapa la fija el avance mas reciente con fecha <= hoy.
    const reales = filas.filter(f => f.fecha <= hoy).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    if (reales.length && !DRY) {
      const { error } = await sb.from('proyectos').update({
        etapa_id: reales[0].etapa_id,
        sustento: (reales.find(r => r.sustento && r.sustento.trim()) || {}).sustento || '',
        avance: reales.reduce((s, r) => s + (Number(r.monto) || 0), 0),
      }).eq('id', p.id);
      if (error) throw new Error(`Sincronizando ${p.codigo}: ${error.message}`);
    }

    const etapaFinal = reales.length ? reales[0].etapa_id : '-';
    say(`  ${p._nuevo ? 'NUEVO ' : 'ajuste'} ${p.codigo.padEnd(6)} id=${String(p.id).padEnd(4)} etapa=${etapaFinal}  ` +
        `${p.avances.map(a => 'e' + a[0] + '@' + a[1]).join(' ')}   S/ ${p.monto.toLocaleString('es-PE')}`);
  }

  // 4 · Resumen
  const total = PROYECTOS.reduce((s, p) => s + p.monto, 0);
  const benef = PROYECTOS.reduce((s, p) => s + p.beneficiarios, 0);
  say(`\n${PROYECTOS.length} proyectos en el grupo ${GRUPO_VIGENTE} · S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} · ${benef.toLocaleString('es-PE')} beneficiarios`);
  const quedan = antes.filter(a => a.grupo_id === GRUPO_DESCARTADAS && !PROYECTOS.some(p => p.id === a.id));
  say(`${quedan.length} propuestas no concretadas quedan en el grupo ${GRUPO_DESCARTADAS}, fuera de la linea de tiempo: ${quedan.map(q => q.id).join(', ')}`);
})().catch(e => { console.error('\nFALLO:', e.message); process.exit(1); });
