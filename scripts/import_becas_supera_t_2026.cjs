/**
 * Importa los 273 becarios seleccionados de la Beca Supéra-T 2026 (grupo 48)
 * desde "Beca Supéra-T seleccionados (1).xlsx", completando datos del becario
 * con los consolidados 26.05 y 28.05 (cruce por nombre completo).
 *   1. Alta en `becas_nueva` con id = N° del Excel (860-1132)
 *   2. 3 avances en `avance_beca` (Bases 16/02, Lanzamiento 16/04, Aprobado 07/07)
 * Las IE que no están en el catálogo `institucion` quedan null (validación manual).
 * La secuencia de becas_nueva.id se adelanta antes de insertar para que la UI
 * siga funcionando después de la carga con ids explícitos.
 *
 * Uso:
 *   node scripts/import_becas_supera_t_2026.cjs --dry-run
 *   node scripts/import_becas_supera_t_2026.cjs
 *   node scripts/import_becas_supera_t_2026.cjs --delete-placeholder  # elimina id 840
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DIR = 'C:/Users/jduran/Desktop/Supervision/';
const SEL = DIR + 'Beca Supéra-T seleccionados (1).xlsx';
const DRY = process.argv.includes('--dry-run');
const DELETE_PLACEHOLDER = process.argv.includes('--delete-placeholder');
const PLACEHOLDER_ID = 840;

const GRUPO_ID = 48, EJE_ID = 5, LINEA_ID = 8, PERIODO = 2026;
const ETAPA_APROBADO = 3, CONDICION_ACTIVO = 1, MODALIDAD_ID = 1;
const AVANCES = [
  { etapa_id: 1, fecha: '2026-02-16' }, // Bases
  { etapa_id: 2, fecha: '2026-04-16' }, // Lanzamiento
  { etapa_id: 3, fecha: '2026-07-07' }, // Aprobado
];
const ID_MIN = 860, ID_MAX = 1132;

const REGION_MAP = {
  'ANCASH': 3, 'APURIMAC': 27, 'AREQUIPA': 4, 'AYACUCHO': 5, 'CAJAMARCA': 6,
  'CUSCO': 7, 'HUANCAVELICA': 8, 'HUANUCO': 9, 'ICA': 11, 'JUNIN': 12,
  'LA LIBERTAD': 13, 'LAMBAYEQUE': 14, 'LIMA METROPOLITANA': 16, 'LIMA REGION': 15,
  'LORETO': 28, 'MOQUEGUA': 18, 'PASCO': 29, 'PIURA': 20,
  'PROV CONST DEL CALLAO': 34, 'PUNO': 21, 'SAN MARTIN': 22, 'TACNA': 30,
  'TUMBES': 24, 'UCAYALI': 31,
};
const DURACION_MAP = {
  'Técnica (3 años)': 36, 'Universitaria (5 años)': 60, 'Universitaria (7 años)': 84,
};
const FORMATO_MAP = { 'Presencial': 1, 'Híbrido (semipresencial)': 2 };
const NATURALEZA_MAP = { 'Privada': 1, 'Pública': 2 };

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => strip(s).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function excelDate(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number' && v > 20000 && v < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().split('T')[0];
  }
  const m = String(v).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  return null;
}

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); });
  return env;
}

// --- consolidados: mapa por nombre normalizado (28.05 sobrescribe a 26.05) ---
function loadConsolidados() {
  const persons = new Map();
  const files = [
    ['consolidado_26.05.xlsx', { 'Técnicos': 6, 'Universitarios': 7 }],
    ['consolidado_28.05.xlsx', { 'Técnica': 6, 'Universitaria': 7 }],
  ];
  for (const [f, sheets] of files) {
    const wb = XLSX.readFile(DIR + f);
    for (const [s, tipoEstudio] of Object.entries(sheets)) {
      XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' }).slice(1).forEach((r) => {
        if (!r[2] && !r[3]) return;
        persons.set(norm(r[2]) + ', ' + norm(r[3]), {
          documento: String(r[6]).trim() || null,
          fecha_nacimiento: excelDate(r[7]),
          // check constraint becas_nueva_sexo_check: solo Masculino/Femenino
          sexo: ['Masculino', 'Femenino'].includes(String(r[8]).trim()) ? String(r[8]).trim() : null,
          region_id: REGION_MAP[norm(r[10])] ?? null,
          celular: String(r[11]).trim() || null,
          edad: Number(r[12]) || null,
          duracion_meses: DURACION_MAP[String(r[24]).trim()] ?? null,
          formato_id: FORMATO_MAP[String(r[25]).trim()] ?? null,
          naturaleza_ie_id: NATURALEZA_MAP[String(r[31]).trim()] ?? null,
          correo_electronico: String(r[1]).trim() || null,
          tipo_estudio_id: tipoEstudio,
        });
      });
    }
  }
  return persons;
}

// --- matcher de institución educativa contra catálogo ---
function buildIEMatcher(cat) {
  const full = new Map(), base = new Map(), acr = new Map(), acrCnt = {}, tokens = new Map();
  cat.forEach((c) => {
    const n = norm(c.descripcion);
    full.set(n, c.id);
    const parts = c.descripcion.split(' - ');
    if (parts.length > 1) {
      base.set(norm(parts.slice(0, -1).join(' - ')), c.id);
      const a = norm(parts[parts.length - 1]);
      acrCnt[a] = (acrCnt[a] || 0) + 1;
      acr.set(a, c.id);
    }
    n.split(' ').forEach((t) => { if (t.length >= 4) { if (!tokens.has(t)) tokens.set(t, new Set()); tokens.get(t).add(c.id); } });
  });
  Object.entries(acrCnt).forEach(([a, c]) => { if (c > 1) acr.delete(a); }); // siglas ambiguas fuera
  const SENATI = acr.get('SENATI'), SENCICO = base.size && [...full.entries()].find(([k]) => k.includes('SENCICO'))?.[1];
  return (raw) => {
    const nf = norm(raw);
    if (!nf) return null;
    if (nf.startsWith('SENATI')) return SENATI ?? null;
    if (nf.startsWith('SENCICO')) return SENCICO ?? null;
    const segs = String(raw).split(' - ');
    const nBase = norm(segs[0].replace(/\(.*?\)/g, ''));
    const nAcr = segs.length > 1 ? norm(segs[segs.length - 1].replace(/\(.*?\)/g, '')) : null;
    for (const m of [full, base, acr]) if (m.has(nf)) return m.get(nf);
    for (const m of [full, base, acr]) if (m.has(nBase)) return m.get(nBase);
    if (nAcr && acr.has(nAcr)) return acr.get(nAcr);
    if (nBase && !nBase.includes(' ')) { const s = tokens.get(nBase); if (s && s.size === 1) return [...s][0]; }
    return null;
  };
}

(async () => {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const fail = (msg, e) => { console.error(msg, e); process.exit(1); };

  if (DELETE_PLACEHOLDER) {
    const { data: ph } = await sb.from('becas_nueva').select('id,nombre,presupuesto,beneficiarios').eq('id', PLACEHOLDER_ID).single();
    console.log('Placeholder:', JSON.stringify(ph));
    if (!ph || ph.nombre !== '' || ph.beneficiarios !== 350) fail('ABORTADO: id 840 no luce como el placeholder esperado');
    if (DRY) return console.log('(dry-run) no se eliminó nada');
    let r = await sb.from('avance_beca').delete().eq('beca_id', PLACEHOLDER_ID);
    if (r.error) fail('Error eliminando avances:', r.error);
    r = await sb.from('becas_nueva').delete().eq('id', PLACEHOLDER_ID);
    if (r.error) fail('Error eliminando beca:', r.error);
    console.log('Placeholder 840 eliminado con sus avances.');
    return;
  }

  // --- leer seleccionados ---
  const sel = XLSX.utils.sheet_to_json(XLSX.readFile(SEL).Sheets['Hoja1'], { header: 1, defval: '' })
    .slice(1).filter((r) => r[0] !== '');
  if (sel.length !== ID_MAX - ID_MIN + 1) fail(`Se esperaban ${ID_MAX - ID_MIN + 1} filas, hay ${sel.length}`);
  const ids = sel.map((r) => Number(r[0]));
  if (Math.min(...ids) !== ID_MIN || Math.max(...ids) !== ID_MAX || new Set(ids).size !== sel.length) {
    fail('Los N° del Excel no son el rango continuo esperado');
  }

  const persons = loadConsolidados();
  const { data: cat, error: eCat } = await sb.from('institucion').select('id,descripcion');
  if (eCat) fail('Error leyendo catálogo institucion:', eCat);
  const matchIE = buildIEMatcher(cat);

  // --- construir registros ---
  let conCons = 0, conIE = 0;
  const pendIE = [];
  const rows = sel.map((r) => {
    const id = Number(r[0]);
    const nombre = String(r[5]).replace(/\s+/g, ' ').trim();
    const ieRaw = String(r[6]).replace(/\s+/g, ' ').trim();
    const carrera = String(r[115]).replace(/\s+/g, ' ').trim() || null;
    const parts = nombre.split(',');
    const p = persons.get(norm(parts[0]) + ', ' + norm(parts.slice(1).join(',')));
    if (p) conCons++;
    const institucion_id = matchIE(ieRaw);
    if (institucion_id) conIE++; else pendIE.push({ id, nombre, ie: ieRaw });
    return {
      id, nombre,
      periodo: PERIODO, eje_id: EJE_ID, linea_id: LINEA_ID, grupo_id: GRUPO_ID,
      etapa_id: ETAPA_APROBADO, condicion_id: CONDICION_ACTIVO, modalidad_id: MODALIDAD_ID,
      institucion_id, especialidad: carrera,
      presupuesto: 0, avance: 0, beneficiarios: 1,
      documento: p?.documento ?? null,
      fecha_nacimiento: p?.fecha_nacimiento ?? null,
      sexo: p?.sexo ?? null,
      edad: p?.edad ?? null,
      region_id: p?.region_id ?? null,
      celular: p?.celular ?? null,
      correo_electronico: p?.correo_electronico ?? null,
      tipo_estudio_id: p?.tipo_estudio_id ?? null,
      naturaleza_ie_id: p?.naturaleza_ie_id ?? null,
      formato_id: p?.formato_id ?? null,
      duracion_meses: p?.duracion_meses ?? null,
      empresa_id: null,
    };
  });
  console.log(`Becarios: ${rows.length} | con datos de consolidado: ${conCons} | con IE de catálogo: ${conIE} | IE pendiente manual: ${pendIE.length}`);

  // --- idempotencia ---
  const { data: existing } = await sb.from('becas_nueva').select('id').gte('id', ID_MIN).lte('id', ID_MAX);
  const existingIds = new Set((existing || []).map((x) => x.id));
  if (existingIds.size) console.log('Ya existen (se omiten):', [...existingIds].sort((a, b) => a - b).join(', '));
  const pending = rows.filter((x) => !existingIds.has(x.id));

  if (DRY) {
    console.log(`\n(dry-run) Se insertarían ${pending.length} becas + ${pending.length * 3} avances. Ejemplos:`);
    console.log(JSON.stringify(rows.find(x => x.documento), null, 1));
    console.log(JSON.stringify(rows.find(x => !x.documento), null, 1));
    console.log('\nIE pendientes de validación manual:', pendIE.length);
    pendIE.slice(0, 10).forEach(x => console.log(' ', x.id, x.nombre, '|', x.ie));
    return;
  }

  // --- respaldo ---
  const { data: prevBecas } = await sb.from('becas_nueva').select('*').eq('grupo_id', GRUPO_ID);
  const { data: prevAv } = await sb.from('avance_beca').select('*').in('beca_id', (prevBecas || []).map((b) => b.id));
  const bk = path.join(__dirname, `backup_pre_import_becas2026_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(bk, JSON.stringify({ becas: prevBecas, avances: prevAv }, null, 2));
  console.log('Respaldo:', bk);

  // --- adelantar la secuencia ANTES de insertar ids explícitos ---
  // (inserta dummies sin id hasta que la secuencia pase ID_MAX y luego los borra)
  const MARK = '__SEQ_ADVANCE_SUPERA_T__';
  for (let guard = 0; guard < 5; guard++) {
    const { data: probe, error: eP } = await sb.from('becas_nueva')
      .insert({ nombre: MARK, periodo: PERIODO }).select('id').single();
    if (eP) fail('Error sondeando secuencia:', eP);
    console.log('Secuencia en:', probe.id);
    if (probe.id > ID_MAX) { await sb.from('becas_nueva').delete().eq('id', probe.id); break; }
    const need = ID_MAX - probe.id + 1; // dummies para pasar ID_MAX (el próximo nextval quedará > ID_MAX)
    const batch = Array.from({ length: need }, () => ({ nombre: MARK, periodo: PERIODO }));
    const { error: eB } = await sb.from('becas_nueva').insert(batch);
    if (eB) fail('Error adelantando secuencia:', eB);
    const { error: eD } = await sb.from('becas_nueva').delete().eq('nombre', MARK);
    if (eD) fail('Error limpiando dummies:', eD);
  }
  const { count: leftovers } = await sb.from('becas_nueva').select('id', { count: 'exact', head: true }).eq('nombre', MARK);
  if (leftovers) fail(`Quedaron ${leftovers} dummies sin limpiar`);

  // --- insertar becas + avances ---
  let ok = 0;
  for (const row of pending) {
    const { error } = await sb.from('becas_nueva').insert(row);
    if (error) fail(`Error insertando beca ${row.id} (${row.nombre}):`, error);
    const avRows = AVANCES.map((a) => ({ beca_id: row.id, etapa_id: a.etapa_id, fecha: a.fecha, sustento: '', monto: 0 }));
    const { error: eAv } = await sb.from('avance_beca').insert(avRows);
    if (eAv) fail(`Error insertando avances de beca ${row.id}:`, eAv);
    ok++;
    if (ok % 25 === 0) console.log(`  ${ok}/${pending.length}...`);
  }
  console.log(`Importadas ${ok}/${pending.length} becas (${ok * 3} avances).`);

  // --- reporte de IE pendientes ---
  const wbOut = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbOut, XLSX.utils.json_to_sheet(pendIE.map(x => ({ ID: x.id, Becario: x.nombre, 'IE declarada': x.ie }))), 'IE pendientes');
  const outFile = DIR + 'IE_pendientes_validacion_manual.xlsx';
  XLSX.writeFile(wbOut, outFile);
  console.log('Reporte de IE pendientes:', outFile, `(${pendIE.length} becarios)`);
})();
