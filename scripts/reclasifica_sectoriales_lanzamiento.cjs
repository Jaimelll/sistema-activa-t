/**
 * El primer contacto de un proyecto sectorial es LANZAMIENTO (etapa 2), no
 * BASES (etapa 1).
 *
 * "Bases" pertenece a la fase "Etapa Concursal" y designa el documento que rige
 * la convocatoria, no un estado del proyecto. Las Bases del Eje Sectorial se
 * aprobaron una sola vez para todo el eje -la ayuda memoria evalua cada
 * propuesta "de acuerdo con las Bases del Eje Sectorial"-, asi que ningun
 * proyecto sectorial pasa por esa etapa: desde que entra al pipeline esta en
 * Lanzamiento, y ahi sigue hasta que el Consejo Directivo lo apruebe (etapa 3).
 *
 * Convierte los avances de etapa 1 a etapa 2 en el grupo 40, conservando fecha
 * y sustento, y recalcula los derivados con la regla de recalculateProyectoAvance().
 *
 * Uso:  node scripts/reclasifica_sectoriales_lanzamiento.cjs [--dry]
 */
const fs = require('fs'); const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const GRUPO = 40;
const NOTA = ' · Etapa: Lanzamiento — las Bases del Eje Sectorial ya estaban aprobadas, así que el proyecto no pasa por la etapa Bases.';

// Estado del VRAEM tal como lo redacto el usuario (1-sep-2026).
const SUSTENTO_VRAEM = 'Primer contacto. La última reunión sostenida con PRODUCE fue el 15-07-2026, donde el consultor presentó la subsanación de las observaciones. PRODUCE tiene pendiente de presentar formalmente el proyecto a FONDOEMPLEO. Financiamiento S/ 12,128,713.55 · 36 meses · 2,700 beneficiarios. — Informes sectoriales ago-2026 (ayuda memoria + cuadro Hoja3)';

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)
    .forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); });
  return env;
}

(async () => {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const say = (s) => console.log(s);

  say(DRY ? '-- SIMULACION (--dry) --' : '-- ESCRITURA EN BASE --');

  const { data: proys, error } = await sb.from('proyectos')
    .select('id, codigo_proyecto, etapa_id, monto_fondoempleo, avance_proyecto(id, etapa_id, fecha, monto, sustento)')
    .eq('grupo_id', GRUPO).order('codigo_proyecto');
  if (error) throw new Error(`Leyendo el grupo ${GRUPO}: ${error.message}`);

  const hoy = new Date().toISOString().slice(0, 10);

  for (const p of proys) {
    const enBases = (p.avance_proyecto || []).filter(a => Number(a.etapa_id) === 1);

    for (const a of enBases) {
      let sustento;
      if (p.id === 495) {
        sustento = SUSTENTO_VRAEM + NOTA;                       // texto entregado por el usuario
      } else {
        sustento = String(a.sustento || '').includes(NOTA.trim()) ? a.sustento : `${a.sustento || ''}${NOTA}`;
      }
      if (!DRY) {
        const { error: e1 } = await sb.from('avance_proyecto')
          .update({ etapa_id: 2, sustento }).eq('id', a.id);
        if (e1) throw new Error(`Reclasificando el avance ${a.id} de ${p.codigo_proyecto}: ${e1.message}`);
      }
    }

    // Derivados, con la misma regla que recalculateProyectoAvance()
    const bitacora = (p.avance_proyecto || [])
      .map(a => ({ ...a, etapa_id: Number(a.etapa_id) === 1 ? 2 : Number(a.etapa_id) }))
      .filter(a => a.fecha <= hoy)
      .sort((x, y) => (x.fecha === y.fecha ? y.id - x.id : (x.fecha < y.fecha ? 1 : -1)));

    if (bitacora.length && !DRY) {
      const { error: e2 } = await sb.from('proyectos').update({
        etapa_id: bitacora[0].etapa_id,
        avance: bitacora.reduce((s, a) => s + (Number(a.monto) || 0), 0),
      }).eq('id', p.id);
      if (e2) throw new Error(`Sincronizando ${p.codigo_proyecto}: ${e2.message}`);
    }

    const etapaNueva = bitacora.length ? bitacora[0].etapa_id : p.etapa_id;
    const cambio = Number(p.etapa_id) !== Number(etapaNueva) ? `  ${p.etapa_id} -> ${etapaNueva}  <<` : `  etapa ${etapaNueva}`;
    say(`  ${p.codigo_proyecto.padEnd(6)} id=${String(p.id).padEnd(4)} avances e1 convertidos: ${enBases.length}${cambio}`);
  }

  // Resumen final leido de la base
  if (!DRY) {
    const { data: fin } = await sb.from('proyectos')
      .select('codigo_proyecto, etapa_id, etapas(descripcion)').eq('grupo_id', GRUPO).order('etapa_id');
    const porEtapa = {};
    fin.forEach(f => {
      const k = `${f.etapa_id} ${f.etapas.descripcion}`;
      (porEtapa[k] = porEtapa[k] || []).push(f.codigo_proyecto);
    });
    say('\nEstado del grupo 40:');
    Object.keys(porEtapa).sort().forEach(k => say(`  ${k.padEnd(15)} ${porEtapa[k].length}  (${porEtapa[k].join(', ')})`));
  }
})().catch(e => { console.error('\nFALLO:', e.message); process.exit(1); });
