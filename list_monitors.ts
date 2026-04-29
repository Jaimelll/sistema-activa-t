import { createClient } from './src/utils/supabase/server';

async function listMonitors() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('monitores')
        .select('id, nombre');
    
    if (error) {
        console.error('Error fetching monitors:', error);
        return;
    }
    
    console.log('--- MONITORES EN SUPABASE ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('-----------------------------');
}

listMonitors();
