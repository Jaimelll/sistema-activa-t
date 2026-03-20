const fs = require('fs');

try {
    const raw = fs.readFileSync('openapi_raw.json', 'utf8');
    const data = JSON.parse(raw);
    const defs = data.definitions;
    
    const targetTables = ['becas_nueva', 'institucion', 'regiones', 'etapas', 'modalidades', 'formato', 'condicion', 'naturaleza_ie', 'tipo_estudio', 'ejes', 'lineas'];
    
    targetTables.forEach(t => {
        if (defs[t]) {
            console.log(`--- Table: ${t} ---`);
            const props = defs[t].properties;
            Object.keys(props).forEach(p => {
                console.log(`${p}: ${props[p].type} ${props[p].format || ''}`);
            });
        } else {
            console.log(`--- Table: ${t} (NOT FOUND) ---`);
        }
    });
} catch (error) {
    console.error('Error parsing JSON:', error.message);
}
