/**
 * Importa los 43 proyectos aprobados Actíva-T 2026 (Eje1 L1-L4) desde
 * "ACTIVA-T 2026 13.07.26.xlsx" (hoja PROYECTOS + línea desde SELECCIONADOS)
 * replicando las mismas operaciones del formulario de Gestión de Proyectos:
 *   1. Alta en `proyectos`
 *   2. 3 avances en `avance_proyecto` (Bases 18/02, Lanzamiento 23/02, Aprobado 07/07)
 *   3. Sincronización de etapa/sustento/avance en el proyecto padre
 * Crea las instituciones ejecutoras faltantes y genera respaldo previo.
 *
 * Uso:
 *   node scripts/import_activa_2026.cjs --dry-run     # solo muestra el plan
 *   node scripts/import_activa_2026.cjs               # ejecuta la importación
 *   node scripts/import_activa_2026.cjs --delete-placeholders  # elimina ids 516-519
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const EXCEL = 'C:/Users/jduran/Desktop/Supervision/ACTIVA-T 2026 13.07.26.xlsx';
const DRY = process.argv.includes('--dry-run');
const DELETE_PLACEHOLDERS = process.argv.includes('--delete-placeholders');
const PLACEHOLDER_IDS = [516, 517, 518, 519];

const GRUPO_BY_LINEA = { 1: 29, 2: 31, 3: 34, 4: 36 };
const EJE_ID = 1; // Concurso Actíva-T
const ANIO = 2026;
const ETAPA_APROBADO = 3;
const SUSTENTO = 'Cargado desde Base7';
const AVANCES = [
  { etapa_id: 1, fecha: '2026-02-18' }, // Bases
  { etapa_id: 2, fecha: '2026-02-23' }, // Lanzamiento
  { etapa_id: 3, fecha: '2026-07-07' }, // Aprobado
];

const REGION_MAP = {
  'amazonas': 1, 'ayacucho': 5, 'cajamarca': 6, 'cusco': 7, 'huanuco': 9,
  'ica': 11, 'junin': 12, 'la libertad': 13, 'lambayeque': 14, 'lima': 15,
  'lima metropolitana': 16, 'madre de dios': 17, 'loreto': 28, 'piura': 20,
  'san martin': 22, 'tumbes': 24, 'tacna': 30, 'callao': 34,
  'amazonas san martin': 19, // "Amazonas, San Martín" -> Multirregional (norm() quita la coma)
};

// Alias entidad Excel -> nombre exacto en catálogo instituciones_ejecutoras
const INST_ALIAS = {
  'servicio nacional de adiestramiento en trabajo industrial - senati': 'SENATI',
  'ministerio de trabajo y promocion del empleo': 'MTPE',
  'chio lecca fashion sac': 'CHIO LECA FASHION SAC',
  'centro de servicios para la capacitacion laboral y el desarrollo- caplab': 'CAPLAB',
  'cooperativa agraria del peru - coopa peru': 'COOPERATIVA AGRARIA DEL PERÚ-COOPAPE PERÚ',
};

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => strip(s).toUpperCase().replace(/[.,;]/g, '').replace(/\s+/g, ' ').trim();
const normKey = (s) => norm(s).toLowerCase();

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split(/\r?\n/).forEach((l) => {
      const m = l.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    });
  return env;
}

function readProjects() {
  const wb = XLSX.readFile(EXCEL);
  const sel = XLSX.utils.sheet_to_json(wb.Sheets['SELECCIONADOS'], { header: 1, defval: '' });
  const lineaByReg = {};
  sel.slice(1).forEach((r) => {
    if (r[2]) {
      const m = String(r[3]).match(/Línea (\d)/);
      if (m) lineaByReg[norm(r[2])] = Number(m[1]);
    }
  });

  const rows = XLSX.utils.sheet_to_json(wb.Sheets['PROYECTOS'], { header: 1, defval: '' })
    .slice(4).filter((r) => r[0] !== '');

  return rows.map((r) => {
    const reg = norm(r[2]);
    const linea = lineaByReg[reg];
    if (!linea) throw new Error(`Sin línea para ${reg}`);
    const regionKey = normKey(r[23]);
    const region_id = REGION_MAP[regionKey];
    if (!region_id) throw new Error(`Región no mapeada: "${r[23]}" (${r[15]})`);
    const modalidad = normKey(r[22]);
    if (modalidad !== 'directa' && modalidad !== 'indirecta') {
      throw new Error(`Modalidad desconocida: "${r[22]}" (${r[15]})`);
    }
    const contacto = [
      `Código legal: ${String(r[1]).trim()}`,
      `Registro: ${String(r[2]).trim()}`,
      `RUC: ${String(r[4]).toString().trim()}`,
      `Rep. legal: ${String(r[10]).trim()}${r[9] ? ` (${String(r[9]).trim()})` : ''}`,
      `DNI: ${String(r[12]).toString().trim()}`,
      `Correo: ${String(r[11]).trim()}`,
    ].join('\n');
    return {
      codigo_proyecto: String(r[15]).trim(),
      nombre: String(r[16]).replace(/\s+/g, ' ').trim(),
      entidad: String(r[3]).replace(/\s+/g, ' ').trim(),
      provincia: String(r[8]).replace(/\s+/g, ' ').trim(),
      linea_id: linea,
      grupo_id: GRUPO_BY_LINEA[linea],
      region_id,
      modalidad_id: modalidad === 'directa' ? 1 : 2,
      monto_fondoempleo: Number(r[18]) || 0,
      contrapartida: Number(r[17]) || 0,
      beneficiarios: Number(r[24]) || 0,
      contacto,
    };
  });
}

(async () => {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const fail = (msg, error) => { console.error(msg, error); process.exit(1); };

  if (DELETE_PLACEHOLDERS) {
    const { data: existing } = await sb.from('proyectos')
      .select('id, nombre').in('id', PLACEHOLDER_IDS);
    console.log('Placeholders a eliminar:', JSON.stringify(existing));
    const onlyPlaceholders = (existing || []).every((p) => p.nombre.startsWith('Proyeccion Eje 1'));
    if (!onlyPlaceholders) fail('ABORTADO: algún id no es un placeholder "Proyeccion Eje 1..."');
    if (DRY) return console.log('(dry-run) no se eliminó nada');
    let r = await sb.from('avance_proyecto').delete().in('proyecto_id', PLACEHOLDER_IDS);
    if (r.error) fail('Error eliminando avances:', r.error);
    r = await sb.from('proyectos').delete().in('id', PLACEHOLDER_IDS);
    if (r.error) fail('Error eliminando proyectos:', r.error);
    console.log('Placeholders eliminados:', PLACEHOLDER_IDS.join(', '));
    return;
  }

  const projects = readProjects();
  console.log(`Proyectos leídos del Excel: ${projects.length}`);
  const porLinea = {};
  projects.forEach((p) => { porLinea[p.linea_id] = (porLinea[p.linea_id] || 0) + 1; });
  console.log('Por línea:', JSON.stringify(porLinea));

  // --- Respaldo previo ---
  const { data: prevProy, error: e1 } = await sb.from('proyectos')
    .select('*').in('grupo_id', Object.values(GRUPO_BY_LINEA));
  if (e1) fail('Error respaldo proyectos:', e1);
  const { data: prevAv, error: e2 } = await sb.from('avance_proyecto')
    .select('*').in('proyecto_id', prevProy.map((p) => p.id));
  if (e2) fail('Error respaldo avances:', e2);
  const { data: instAll, error: e3 } = await sb.from('instituciones_ejecutoras').select('id, nombre');
  if (e3) fail('Error leyendo instituciones:', e3);

  const backupFile = path.join(__dirname, `backup_pre_import_activa2026_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  if (!DRY) {
    fs.writeFileSync(backupFile, JSON.stringify({ proyectos: prevProy, avances: prevAv, instituciones: instAll }, null, 2));
    console.log('Respaldo escrito en', backupFile);
  }

  // --- Resolver instituciones ---
  const instByKey = new Map(instAll.map((i) => [normKey(i.nombre), i]));
  const resolved = new Map(); // entidad -> {id?, nombre, create}
  for (const p of projects) {
    if (resolved.has(p.entidad)) continue;
    const key = normKey(p.entidad);
    const alias = INST_ALIAS[key];
    const hit = alias
      ? instAll.find((i) => i.nombre === alias)
      : instByKey.get(key);
    resolved.set(p.entidad, hit
      ? { id: hit.id, nombre: hit.nombre, create: false }
      : { nombre: p.entidad, create: true });
  }
  const toCreate = [...resolved.values()].filter((v) => v.create);
  console.log(`\nInstituciones: ${resolved.size} únicas — ${resolved.size - toCreate.length} existentes, ${toCreate.length} por crear:`);
  [...resolved.entries()].forEach(([ent, v]) =>
    console.log(v.create ? `  [NUEVA]    ${ent}` : `  [id ${v.id}] ${ent} -> ${v.nombre}`));

  // --- Idempotencia: no duplicar códigos ya cargados ---
  const { data: dupes } = await sb.from('proyectos')
    .select('codigo_proyecto').in('codigo_proyecto', projects.map((p) => p.codigo_proyecto));
  const existingCodes = new Set((dupes || []).map((d) => d.codigo_proyecto));
  if (existingCodes.size) console.log('\nYa existen (se omiten):', [...existingCodes].join(', '));
  const pending = projects.filter((p) => !existingCodes.has(p.codigo_proyecto));

  if (DRY) {
    console.log(`\n(dry-run) Se insertarían ${pending.length} proyectos + ${pending.length * 3} avances. Ejemplo:`);
    console.log(JSON.stringify(pending[0], null, 2));
    return;
  }

  // --- Crear instituciones faltantes ---
  for (const v of toCreate) {
    const { data, error } = await sb.from('instituciones_ejecutoras')
      .insert({ nombre: v.nombre }).select('id').single();
    if (error) fail(`Error creando institución "${v.nombre}":`, error);
    v.id = data.id;
    console.log(`Institución creada id=${data.id}: ${v.nombre}`);
  }

  // --- Insertar proyectos + avances ---
  // proyectos.id no tiene default: se asigna manualmente a partir del máximo actual
  const { data: maxRow, error: eMax } = await sb.from('proyectos')
    .select('id').order('id', { ascending: false }).limit(1).single();
  if (eMax) fail('Error obteniendo máximo id:', eMax);
  let nextId = Number(maxRow.id) + 1;

  let ok = 0;
  for (const p of pending) {
    const inst = resolved.get(p.entidad);
    const row = {
      id: nextId++,
      nombre: p.nombre,
      codigo_proyecto: p.codigo_proyecto,
      provincia: p.provincia,
      especialista_id: null,
      eje_id: EJE_ID,
      linea_id: p.linea_id,
      region_id: p.region_id,
      etapa_id: ETAPA_APROBADO,
      monto_fondoempleo: p.monto_fondoempleo,
      avance: 0,
      contrapartida: p.contrapartida,
      beneficiarios: p.beneficiarios,
      gestora: '',
      avance_tecnico: 0,
      institucion_ejecutora_id: inst.id,
      modalidad_id: p.modalidad_id,
      grupo_id: p.grupo_id,
      sustento: SUSTENTO,
      contacto: p.contacto,
      ['año']: ANIO,
    };
    const { data: created, error } = await sb.from('proyectos').insert(row).select('id').single();
    if (error) fail(`Error insertando ${p.codigo_proyecto}:`, error);

    const avRows = AVANCES.map((a) => ({
      proyecto_id: created.id, etapa_id: a.etapa_id, fecha: a.fecha, sustento: SUSTENTO, monto: 0,
    }));
    const { error: eAv } = await sb.from('avance_proyecto').insert(avRows);
    if (eAv) fail(`Error insertando avances de ${p.codigo_proyecto} (id ${created.id}):`, eAv);
    ok++;
    console.log(`OK ${p.codigo_proyecto} id=${created.id} L${p.linea_id} grupo=${p.grupo_id} inst=${inst.id}`);
  }
  console.log(`\nImportados ${ok}/${pending.length} proyectos (${ok * 3} avances).`);
})();
