import { createClient } from '@/utils/supabase/server';

export async function testData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', 294)
    .single();
  
  console.log('--- PROYECTO DATA ---');
  console.log(data);
  console.log('--- ERROR ---');
  console.log(error);
}
