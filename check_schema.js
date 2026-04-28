const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: p } = await supabase.from('proyectos').select('*').limit(1);
  console.log('proyectos columns:', p ? Object.keys(p[0] || {}) : 'No data or error');

  const { data: ps } = await supabase.from('plan_supervision').select('*').limit(1);
  console.log('plan_supervision columns:', ps ? Object.keys(ps[0] || {}) : 'No data or error');
  
  const { data: sr } = await supabase.from('supervisiones_registro').select('*').limit(1);
  console.log('supervisiones_registro columns:', sr ? Object.keys(sr[0] || {}) : 'No data or error');
}
check();
