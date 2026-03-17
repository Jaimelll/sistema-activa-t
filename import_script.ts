import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importExcel() {
  const workbook = xlsx.readFile('registros.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: any[] = xlsx.utils.sheet_to_json(sheet);

  // Take the 4 new records
  const targetRecords = data.filter(r => r.id >= 521 && r.id <= 524);
  
  // Helper to map relational names to IDs
  async function getId(table: string, column: string, value: string): Promise<number | null> {
    if (!value) return null;
    const { data: results, error } = await supabase.from(table).select('id').ilike(column, `%${value}%`).limit(1);
    if (error) {
      console.error(`Error fetching ID for ${value} from ${table}:`, error);
      return null;
    }
    return results && results.length > 0 ? results[0].id : null;
  }

  const payload = [];

  for (const row of targetRecords) {
    const newVal: any = { ...row };

    // Clean numeric amounts
    // Remove if string and formatted
    if (typeof newVal.monto_fondoempleo === 'string') {
      newVal.monto_fondoempleo = Number(newVal.monto_fondoempleo.replace(/[^0-9.-]+/g,""));
    }

    // Map relationships
    if (row['instituciones_ejecurtoras.nombre']) {
      newVal.institucion_ejecutora_id = await getId('instituciones_ejecutoras', 'nombre', row['instituciones_ejecurtoras.nombre']);
      delete newVal['instituciones_ejecurtoras.nombre'];
    }

    if (row['modalidades.descripcion']) {
      newVal.modalidad_id = await getId('modalidades', 'descripcion', row['modalidades.descripcion']);
      delete newVal['modalidades.descripcion'];
    }

    if (row['regiones.descripcion']) {
      newVal.region_id = await getId('regiones', 'descripcion', row['regiones.descripcion']);
      delete newVal['regiones.descripcion'];
    }

    if (row['etapas.descripcion']) {
      newVal.etapa_id = await getId('etapas', 'descripcion', row['etapas.descripcion']);
      delete newVal['etapas.descripcion'];
    }

    // Format dates if any 'fecha' field exists
    for (const key of Object.keys(newVal)) {
      if (key.includes('fecha') && newVal[key]) {
        if (typeof newVal[key] === 'string' && newVal[key].includes('/')) {
           const parts = newVal[key].split('/');
           if (parts.length === 3) {
             // Assumes DD/MM/YYYY
             newVal[key] = `${parts[2]}-${parts[1]}-${parts[0]}`;
           }
        }
      }
    }

    // Assuming the table is "proyectos" as the codebase uses it extensively and matches columns.
    payload.push(newVal);
  }

  console.log('--- Prepared Payload for Supabase "proyectos" ---');
  console.log(JSON.stringify(payload, null, 2));
  
  console.log('\n--- Inserting into Supabase ---');
  const { data: insertedData, error: insertError } = await supabase
    .from('proyectos')
    .insert(payload)
    .select('id, nombre');

  if (insertError) {
    console.error('Insertion Error:', insertError);
  } else {
    console.log('Insertion Successful! Inserted IDs:', insertedData.map(d => d.id).join(', '));
  }
}

importExcel();
