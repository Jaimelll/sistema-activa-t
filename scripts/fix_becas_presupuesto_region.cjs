/**
 * Corrección post-import Beca Supéra-T 2026 (ids 860-1132):
 *  - presupuesto <- consolidados col "FINANCIAMIENTO v2" (fallback "FINANCIAMIENTO")
 *  - region_id   <- consolidados col "30. Departamento donde se ubica la Institución Educativa"
 *    (antes se cargó el departamento de residencia del becario)
 * Solo actualiza los becarios que cruzan por nombre con los consolidados.
 * Uso: node scripts/fix_becas_presupuesto_region.cjs [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DIR = 'C:/Users/jduran/Desktop/Supervision/';
const DRY = process.argv.includes('--dry-run');

const REGION_MAP = {
  'ANCASH': 3, 'APURIMAC': 27, 'AREQUIPA': 4, 'AYACUCHO': 5, 'CAJAMARCA': 6,
  'CUSCO': 7, 'HUANCAVELICA': 8, 'HUANUCO': 9, 'ICA': 11, 'JUNIN': 12,
  'LA LIBERTAD': 13, 'LAMBAYEQUE': 14, 'LIMA': 15, 'LIMA METROPOLITANA': 16,
  'LIMA REGION': 15, 'LORETO': 28, 'MOQUEGUA': 18, 'PASCO': 29, 'PIURA': 20,
  'PROV CONST DEL CALLAO': 34, 'PUNO': 21, 'SAN MARTIN': 22, 'TACNA': 30,
  'TUMBES': 24, 'UCAYALI': 31,
};

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => strip(s).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  const env = {};
  fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); });
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const fail = (msg, e) => { console.error(msg, e); process.exit(1); };

  const persons = new Map();
  for (const [f, sheets] of [['consolidado_26.05.xlsx', ['Técnicos', 'Universitarios']], ['consolidado_28.05.xlsx', ['Técnica', 'Universitaria']]]) {
    const wb = XLSX.readFile(DIR + f);
    for (const s of sheets) {
      XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' }).slice(1).forEach((r) => {
        if (r[2] || r[3]) persons.set(norm(r[2]) + ', ' + norm(r[3]), {
          presupuesto: Number(r[60]) || Number(r[55]) || 0,   // FINANCIAMIENTO v2, fallback v1
          region_id: REGION_MAP[norm(r[32])] ?? null,          // departamento de la IE
        });
      });
    }
  }

  const { data: becas, error } = await sb.from('becas_nueva')
    .select('id,nombre,presupuesto,region_id').gte('id', 860).lte('id', 1132).order('id');
  if (error) fail('Error leyendo becas:', error);

  const bk = path.join(__dirname, `backup_pre_fix_becas_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  if (!DRY) fs.writeFileSync(bk, JSON.stringify(becas, null, 2));
  if (!DRY) console.log('Respaldo:', bk);

  let updated = 0, skipped = 0, sinRegion = [];
  let sumaPres = 0;
  for (const b of becas) {
    const parts = String(b.nombre).split(',');
    const p = persons.get(norm(parts[0]) + ', ' + norm(parts.slice(1).join(',')));
    if (!p) { skipped++; continue; }
    if (p.region_id === null) sinRegion.push(b.id);
    const payload = { presupuesto: p.presupuesto, region_id: p.region_id };
    sumaPres += p.presupuesto;
    if (!DRY) {
      const { error: eU } = await sb.from('becas_nueva').update(payload).eq('id', b.id);
      if (eU) fail(`Error actualizando beca ${b.id}:`, eU);
    }
    updated++;
  }
  console.log(`${DRY ? '(dry-run) ' : ''}Actualizadas: ${updated} | sin cruce (no tocadas): ${skipped}`);
  console.log('Suma presupuesto cargado: S/', sumaPres.toFixed(2));
  if (sinRegion.length) console.log('Con depto IE no mapeado (region null):', sinRegion.join(','));
})();
