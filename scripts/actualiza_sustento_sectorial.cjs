/**
 * Deja el "Sustento Actual (Sincronizado)" de los 11 proyectos sectoriales con
 * el texto LITERAL del "Estado actual" / "Situación actual" de la ayuda memoria
 * "AM-Proyectos Sectoriales_Fechas de inicio.docx" (ago-2026).
 *
 * Corrige tres cosas de la carga anterior:
 *   1. El S2601 habia perdido su estado: al registrar el desembolso del
 *      27-08-2026, ese avance paso a ser el mas reciente y la app sincroniza el
 *      sustento del ultimo avance. Ahora el desembolso lleva tambien el estado.
 *   2. Cuatro proyectos arrastraban la nota "Etapa: Lanzamiento", que quedo
 *      desactualizada: en el Eje Sectorial esa posicion se llama "Por aprobar".
 *   3. Los textos eran parafrasis. Ahora van tal como los redacto el sector.
 *
 * El sustento se escribe en el ULTIMO avance de cada proyecto, que es de donde
 * la app lo sincroniza (ver recalculateProyectoAvance en app/dashboard/actions).
 *
 * Uso:  node scripts/actualiza_sustento_sectorial.cjs [--dry]
 */
const fs = require('fs'); const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const FUENTE = 'Ayuda memoria "Proyectos Sectoriales", ago-2026';

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)
    .forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); });
  return env;
}

// hito: lo que ocurrio en ese avance · estado: literal del Word · nota: aclaracion propia
const ESTADOS = {
  S2601: {
    hito: 'Desembolso a MIDAGRI por S/ 900,000.00 con fecha 27-08-2026',
    estado: 'Convenio entre MIDAGRI y FONDOEMPLEO suscrito el 02-06-2026, ha iniciado actividades el 21-07-2026.',
  },
  S2602: {
    hito: 'Suscripción del convenio con PRODUCE, en la ciudad de Puno',
    estado: 'El proyecto se aprobó en Consejo Directivo el 29-05-2026. Con fecha 10-07-2026 se suscribió en la ciudad de Puno el convenio con PRODUCE. Siguientes acciones: coordinaciones con PRODUCE para determinar la fecha de inicio de actividades del proyecto, el cual se estima que será durante la segunda quincena de agosto-2026.',
  },
  S2603: {
    hito: 'Aprobación en Consejo Directivo',
    estado: 'El proyecto se aprobó en Consejo Directivo el 07-07-2026. Siguientes acciones: se viene coordinando con el MTPE la suscripción del convenio de financiamiento.',
  },
  S2604: {
    hito: 'Primer contacto',
    estado: 'La última reunión sostenida con PRODUCE fue el 15-07-2026 donde el consultor presentó la subsanación de las observaciones. PRODUCE tiene pendiente de presentar formalmente el proyecto a FONDOEMPLEO.',
  },
  S2605: {
    hito: 'Primer contacto',
    estado: 'Proyecto en elaboración. Se ha sostenido reuniones con el consultor y equipo técnico del programa Compras MYPERU, para revisar la propuesta. A la fecha se ha enviado comentarios al proyecto para la revisión por parte del sector, se está a la espera de que nos convoquen a una nueva reunión para revisar la subsanación de los comentarios que se han realizado.',
    nota: 'Los 1,200 beneficiarios son MYPE (unidades productivas), no personas.',
  },
  S2606: {
    hito: 'Presentación formal del proyecto por el sector',
    estado: 'El proyecto fue presentado por el Secretario General del sector mediante oficio de fecha 03-07-2026. Con fecha 24-07-2026 se ha comunicado al MTPE, mediante correo electrónico, las observaciones al proyecto presentado para la subsanación correspondiente, a la fecha no se ha tenido respuesta por parte del sector.',
  },
  S2607: {
    hito: 'Primer contacto',
    estado: 'Proyecto en elaboración. El 05-08-2026 se sostuvo reunión con el personal del MIDIS y FONCODES para revisar el avance de la propuesta de proyecto. Se ha brindado comentarios para que lo revisen y se espera que el sector convoque a una nueva reunión para revisar la propuesta actualizada.',
    nota: 'Los 1,200 beneficiarios son emprendimientos rurales inclusivos (unidades), no personas.',
  },
  S2608: {
    hito: 'Presentación formal del proyecto por el sector',
    estado: 'El proyecto fue presentado por el Secretario General del sector mediante oficio de fecha 14-07-2026. Con fecha 17-07-2026 se envió al MIMP, vía correo electrónico, las observaciones al proyecto presentado de acuerdo con las Bases del Eje Sectorial para la subsanación correspondiente. Con fecha 03-08-2026 el MIMP, vía correo electrónico, ha presentado el proyecto con la subsanación de las observaciones identificadas, las mismas que a la fecha vienen siendo revisadas por FONDOEMPLEO.',
  },
  S2609: {
    hito: 'Presentación formal del proyecto por el sector',
    estado: 'Con fecha 28-07-2026 el MIMP ha presentado formalmente el proyecto a FONDOEMPLEO. A la fecha viene siendo evaluado de acuerdo con las Bases del Eje Sectorial, en caso se identifique observaciones al proyecto presentado, será comunicado al sector para la subsanación correspondiente.',
  },
  S2610: {
    hito: 'Presentación formal del proyecto por el sector',
    estado: 'Con fecha 28-07-2026 el MIMP ha presentado formalmente el proyecto a FONDOEMPLEO. A la fecha viene siendo evaluado de acuerdo con las Bases del Eje Sectorial, en caso se identifique observaciones al proyecto presentado, será comunicado al sector para la subsanación correspondiente.',
  },
  S2611: {
    hito: 'Primer contacto',
    estado: 'Proyecto en elaboración. El 05-08-2026 se sostuvo reunión con el personal del MIMP para revisar la propuesta de proyecto. Se ha brindado comentarios para que lo revisen y se espera que el MIMP convoque a una nueva reunión para revisar la propuesta actualizada.',
  },
};

(async () => {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: proys, error } = await sb.from('proyectos')
    .select('id, codigo_proyecto, sustento, avance_proyecto(id, etapa_id, fecha, sustento)')
    .eq('grupo_id', 40).order('codigo_proyecto');
  if (error) throw new Error(`Leyendo los proyectos: ${error.message}`);

  console.log(DRY ? '-- SIMULACION (--dry) --\n' : '-- ESCRITURA EN BASE --\n');

  for (const p of proys) {
    const cfg = ESTADOS[p.codigo_proyecto];
    if (!cfg) { console.log(`  ${p.codigo_proyecto}: sin texto declarado, se omite`); continue; }

    // El ultimo avance real es el que la app sincroniza al proyecto
    const ultimo = (p.avance_proyecto || [])
      .filter(a => a.fecha <= hoy)
      .sort((x, y) => (x.fecha === y.fecha ? y.id - x.id : (x.fecha < y.fecha ? 1 : -1)))[0];
    if (!ultimo) { console.log(`  ${p.codigo_proyecto}: sin avances, se omite`); continue; }

    const texto = `${cfg.hito}. Estado actual: ${cfg.estado}` +
                  (cfg.nota ? ` (${cfg.nota})` : '') +
                  ` — ${FUENTE}`;

    if (!DRY) {
      const { error: e1 } = await sb.from('avance_proyecto').update({ sustento: texto }).eq('id', ultimo.id);
      if (e1) throw new Error(`Avance ${ultimo.id} de ${p.codigo_proyecto}: ${e1.message}`);
      const { error: e2 } = await sb.from('proyectos').update({ sustento: texto }).eq('id', p.id);
      if (e2) throw new Error(`Proyecto ${p.codigo_proyecto}: ${e2.message}`);
    }

    const cambio = texto === p.sustento ? 'sin cambios' : 'ACTUALIZADO';
    console.log(`  ${p.codigo_proyecto}  e${ultimo.etapa_id}@${ultimo.fecha}  ${cambio}`);
  }

  // Control: que no quede rastro de la nota de etapa vieja
  const { data: fin } = await sb.from('proyectos').select('codigo_proyecto, sustento').eq('grupo_id', 40);
  const sucios = (fin || []).filter(f => /Etapa: Lanzamiento/i.test(f.sustento || ''));
  console.log(`\nProyectos con la nota "Etapa: Lanzamiento" obsoleta: ${sucios.length ? sucios.map(s => s.codigo_proyecto).join(', ') : 'ninguno'}`);
})().catch(e => { console.error('\nFALLO:', e.message); process.exit(1); });
