import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  const { data, error } = await supabase.from('procesos').select('*').limit(1);
  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('--- One row from procesos ---');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('-----------------------------');
  }
}

checkSchema();
