const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getOpenApi() {
    try {
        const response = await axios.get(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        const paths = response.data.paths;
        console.log('--- DB PATHS ---');
        Object.keys(paths).forEach(p => {
            if (p.includes('becas_nueva') || p.includes('institucion') || p.includes('regiones') || p.includes('etapas')) {
                console.log(`Path: ${p}`);
                const post = paths[p].post;
                if (post && post.parameters) {
                    const schema = post.parameters.find(param => param.name === 'body');
                    if (schema && schema.schema) {
                        console.log(`Schema for ${p}:`, JSON.stringify(schema.schema, null, 2));
                    }
                }
            }
        });

        // Definitions
        console.log('--- DEFINITIONS ---');
        const defs = response.data.definitions;
        ['becas_nueva', 'institucion', 'regiones', 'etapas', 'modalidades', 'formato', 'condicion', 'naturaleza_ie', 'tipo_estudio'].forEach(d => {
            if (defs[d]) {
                console.log(`Definition ${d}:`, JSON.stringify(defs[d].properties, null, 2));
            }
        });

    } catch (error) {
        console.error('Error fetching OpenAPI:', error.message);
    }
}

getOpenApi();
