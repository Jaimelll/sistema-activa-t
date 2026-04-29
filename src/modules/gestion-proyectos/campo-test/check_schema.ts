import { createClient } from '@/utils/supabase/server';

export async function checkSchema() {
  const supabase = await createClient();
  
  const { data: region } = await supabase.from('regiones').select('*').limit(1);
  console.log('Regiones sample:', region);

  const { data: etapa } = await supabase.from('etapas').select('*').limit(1);
  console.log('Etapas sample:', etapa);

  const { data: proy } = await supabase.from('proyectos').select('*').eq('id', 294).single();
  console.log('Proyecto 294 keys:', Object.keys(proy || {}));
}
