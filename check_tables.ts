import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables'); // Or try to query postgres directly?
  // Supabase Studio provides pg_meta, but from client we can't easily query information_schema unless we have a view or rpc.
  // Let's just try to select from 'proyectos'
  const { data: dataProyectos, error: errProyectos } = await supabase.from('proyectos').select('*').limit(1);
  console.log('--- Proyectos Table ---');
  if (errProyectos) console.error(errProyectos);
  else console.log(Object.keys(dataProyectos[0] || {}));
  
  const { data: dataProcesos, error: errProcesos } = await supabase.from('procesos').select('*').limit(1);
  console.log('\n--- Procesos Table ---');
  if (errProcesos) console.error(errProcesos);
  else console.log(Object.keys(dataProcesos[0] || {}));
}

checkTables();
