import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  const tables = ['sectores_ciiu', 'empresas', 'aportes'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`\n--- Schema for ${table} ---`);
    if (error) {
      console.error(error);
    } else {
      console.log(Object.keys(data[0] || {}));
    }
  }
}

checkSchema();
