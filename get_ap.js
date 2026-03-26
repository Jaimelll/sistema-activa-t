require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('avance_proyecto').select('*').limit(1).then(r => {
    console.log(JSON.stringify(r.data, null, 2));
    process.exit(0);
});
