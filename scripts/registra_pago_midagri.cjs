/**
 * Registra el desembolso a MIDAGRI (S2601, proyecto 494): S/ 900,000 el 27-08-2026.
 *
 * Un pago se anota como un avance de etapa 5 (Ejecucion) con `monto` en soles:
 * es la convencion que ya siguen los 16 desembolsos cargados en la base
 * ("Desembolso ejecutado acumulado Jun-2026"). `proyectos.avance` es la suma de
 * esos montos y la recalcula la misma regla que recalculateProyectoAvance().
 *
 * Uso:  node scripts/registra_pago_midagri.cjs [--dry]
 */
const fs = require('fs'); const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const PROYECTO_ID = 494;
const FECHA = '2026-08-27';
const MONTO = 900000;
const ETAPA_EJECUCION = 5;
const SUSTENTO = 'Desembolso a MIDAGRI por S/ 900,000.00 con fecha 27-08-2026. Primer desembolso del proyecto, que inicio actividades el 21-07-2026.';

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)
    .forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); });
  return env;
}

(async () => {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: p, error: e0 } = await sb.from('proyectos')
    .select('id, codigo_proyecto, monto_fondoempleo, avance, etapa_id, avance_proyecto(id,etapa_id,fecha,monto,sustento)')
    .eq('id', PROYECTO_ID).single();
  if (e0) throw new Error(`Leyendo el proyecto: ${e0.message}`);

  console.log(`${p.codigo_proyecto} · financiamiento S/ ${Number(p.monto_fondoempleo).toLocaleString('es-PE')} · avance actual S/ ${Number(p.avance).toLocaleString('es-PE')}`);

  // No duplicar si ya se registro
  const ya = (p.avance_proyecto || []).find(a => a.fecha === FECHA && Number(a.monto) === MONTO);
  if (ya) { console.log(`Ya existe el avance ${ya.id} con esa fecha e importe. No se hace nada.`); return; }

  const fila = { proyecto_id: PROYECTO_ID, etapa_id: ETAPA_EJECUCION, fecha: FECHA, monto: MONTO, sustento: SUSTENTO };
  if (DRY) { console.log('SIMULACION, se insertaria:', JSON.stringify(fila)); return; }

  let { error } = await sb.from('avance_proyecto').insert(fila);
  if (error && /duplicate key|llave duplicada/i.test(error.message)) {
    const { data: mx } = await sb.from('avance_proyecto').select('id').order('id', { ascending: false }).limit(1);
    ({ error } = await sb.from('avance_proyecto').insert({ ...fila, id: Number(mx[0].id) + 1 }));
  }
  if (error) throw new Error(`Insertando el pago: ${error.message}`);

  // Derivados, con la misma regla que recalculateProyectoAvance()
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: todos } = await sb.from('avance_proyecto')
    .select('etapa_id, fecha, monto, sustento').eq('proyecto_id', PROYECTO_ID)
    .lte('fecha', hoy).order('fecha', { ascending: false }).order('id', { ascending: false });

  const avanceTotal = todos.reduce((s, a) => s + (Number(a.monto) || 0), 0);
  const { error: e2 } = await sb.from('proyectos').update({
    etapa_id: todos[0].etapa_id,
    sustento: (todos.find(a => a.sustento && a.sustento.trim()) || {}).sustento || '',
    avance: avanceTotal,
  }).eq('id', PROYECTO_ID);
  if (e2) throw new Error(`Sincronizando el proyecto: ${e2.message}`);

  const pct = (avanceTotal / Number(p.monto_fondoempleo)) * 100;
  console.log(`\nPago registrado: e${ETAPA_EJECUCION} @ ${FECHA} · S/ ${MONTO.toLocaleString('es-PE')}`);
  console.log(`Bitacora del proyecto:`);
  todos.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .forEach(a => console.log(`   e${a.etapa_id} @ ${a.fecha}   S/ ${Number(a.monto).toLocaleString('es-PE')}`));
  console.log(`\nEtapa: ${todos[0].etapa_id} · avance acumulado S/ ${avanceTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })} = ${pct.toFixed(2)} % del financiamiento`);
})().catch(e => { console.error('\nFALLO:', e.message); process.exit(1); });
