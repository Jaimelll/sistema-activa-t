const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars:", { supabaseUrl, supabaseServiceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: etapas, error } = await supabase.from('etapas').select('*');
  if (error) {
    console.error("Error fetching etapas:", error);
  } else {
    console.log("ETAPAS:", etapas);
  }

  const { data: proyectos, error: pError } = await supabase.from('proyectos').select('id, nombre, etapa_id, etapas(descripcion, fase)').limit(5);
  if (pError) {
    console.error("Error fetching proyectos sample:", pError);
  } else {
    console.log("PROYECTOS SAMPLE:", JSON.stringify(proyectos, null, 2));
  }
}

run();
