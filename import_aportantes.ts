import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as dotenv from 'dotenv';

// Configure dotenv
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importAportantes() {
  console.log('--- Iniciando importación de Aportantes ---');
  const workbook = xlsx.readFile('Aportantes.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: any[] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Rows start at index 1 (skipping headers at index 0)
  const rows = data.slice(1).filter(row => row && row[3] && String(row[3]).trim() !== ''); // Filter out empty RUCs

  console.log(`Se encontraron ${rows.length} registros en el Excel.`);

  // 1. Process Sectores CIIU
  console.log('Procesando Sectores...');
  const uniqueSectoresMap = new Map();
  for (const row of rows) {
    const ciiu_codigo = String(row[12] || '').trim();
    if (!ciiu_codigo) continue;

    if (!uniqueSectoresMap.has(ciiu_codigo)) {
      uniqueSectoresMap.set(ciiu_codigo, {
        ciiu_codigo: ciiu_codigo,
        clase_desc: String(row[13] || '').trim(),
        grupo_desc: String(row[11] || '').trim(),
        division_desc: String(row[8] || '').trim(),
        seccion_desc: String(row[5] || '').trim()
      });
    }
  }

  const sectoresPayload = Array.from(uniqueSectoresMap.values());
  console.log(`Sectores únicos encontrados: ${sectoresPayload.length}`);

  // Fetch existing sectores to avoid duplicates if rerun
  const { data: existingSectores, error: fetchSectoresError } = await supabase.from('sectores_ciiu').select('id, ciiu_codigo');
  if (fetchSectoresError) throw fetchSectoresError;

  const existingSectoresSet = new Set(existingSectores?.map(s => s.ciiu_codigo));
  const sectoresToInsert = sectoresPayload.filter(s => !existingSectoresSet.has(s.ciiu_codigo));

  if (sectoresToInsert.length > 0) {
    console.log(`Insertando ${sectoresToInsert.length} nuevos sectores...`);
    // Insert in batches if necessary, but 100-200 is fine in one go
    const { error: insertSectoresError } = await supabase.from('sectores_ciiu').insert(sectoresToInsert);
    if (insertSectoresError) throw insertSectoresError;
  }

  // Reload sectores to build ID mapping
  const { data: allSectores, error: reloadSectoresError } = await supabase.from('sectores_ciiu').select('id, ciiu_codigo');
  if (reloadSectoresError) throw reloadSectoresError;
  const ciiuIdMap = new Map(allSectores?.map(s => [s.ciiu_codigo, s.id]));

  // 2. Process Empresas
  console.log('Procesando Empresas...');
  const uniqueEmpresasMap = new Map();
  for (const row of rows) {
    const ruc = String(row[3]).trim();
    const ciiu_codigo = String(row[12] || '').trim();
    
    if (!uniqueEmpresasMap.has(ruc)) {
      uniqueEmpresasMap.set(ruc, {
        ruc: ruc,
        razon_social: String(row[1] || '').trim(),
        ciiu_id: ciiuIdMap.get(ciiu_codigo) || null
      });
    }
  }

  const empresasPayload = Array.from(uniqueEmpresasMap.values());
  console.log(`Empresas únicas encontradas: ${empresasPayload.length}`);

  // Fetch existing empresas
  const { data: existingEmpresas, error: fetchEmpresasError } = await supabase.from('empresas').select('ruc');
  if (fetchEmpresasError) throw fetchEmpresasError;

  const existingEmpresasSet = new Set(existingEmpresas?.map(e => e.ruc));
  const empresasToInsert = empresasPayload.filter(e => !existingEmpresasSet.has(e.ruc));

  if (empresasToInsert.length > 0) {
    console.log(`Insertando ${empresasToInsert.length} nuevas empresas...`);
    // Upsert since RUC is PK
    const { error: insertEmpresasError } = await supabase.from('empresas').upsert(empresasToInsert, { onConflict: 'ruc' });
    if (insertEmpresasError) throw insertEmpresasError;
  }

  // 3. Process Aportes
  console.log('Procesando Aportes...');
  const aportesPayload = [];
  for (const row of rows) {
    const ruc = String(row[3]).trim();
    const anio = parseInt(row[2], 10);
    const monto = parseFloat(String(row[15]).replace(/[^0-9.-]+/g, ""));

    if (ruc && !isNaN(anio) && !isNaN(monto)) {
      aportesPayload.push({
        empresa_ruc: ruc,
        anio: anio,
        monto: monto
      });
    }
  }

  console.log(`Aportes válidos a insertar: ${aportesPayload.length}`);
  
  // Since we don't have a natural composite key on aportes, we might duplicate them if we rerun without deleting.
  // For a clean Setup Inicial, let's clear existing aportes... OR we can just insert them and assume it's run once.
  // Let's truncate/delete all aportes before inserting to be safe, assuming this is an initialization script.
  // We can ask the user if they want to clear first, but let's just clear to ensure idempotency for setup scripts.
  
  console.log('Eliminando aportes existentes para evitar duplicidad...');
  const { error: deleteAportesError } = await supabase.from('aportes').delete().neq('id', 0); // Hack to delete all lines
  if (deleteAportesError) {
    console.warn('Advertencia al eliminar aportes (pueden no existir):', deleteAportesError.message);
  }

  // Batch insert aportes (Supabase limit is usually around 10k per request, safe to batch by 1000)
  const batchSize = 1000;
  let insertedAportes = 0;
  for (let i = 0; i < aportesPayload.length; i += batchSize) {
    const batch = aportesPayload.slice(i, i + batchSize);
    const { error: insertAportesError } = await supabase.from('aportes').insert(batch);
    if (insertAportesError) throw insertAportesError;
    insertedAportes += batch.length;
    console.log(`Insertado ${insertedAportes}/${aportesPayload.length} aportes...`);
  }

  console.log('--- Importación Completa ---');
}

importAportantes().catch(err => {
  console.error('Error durante la importación:', err);
});
