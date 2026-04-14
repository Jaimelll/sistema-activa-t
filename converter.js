const fs = require('fs');

const data = fs.readFileSync('C:/Users/jduran/.gemini/antigravity/brain/f6102cb4-ddee-41b4-bd92-2d16d2fcc58f/.system_generated/steps/40/content.md', 'utf8');
const lines = data.split('\n');
let jsonStr = '';
for (let line of lines) {
  if (line.startsWith('{"title"')) {
    jsonStr = line;
    break;
  }
}

const geojson = JSON.parse(jsonStr);

let minLon = 1000, maxLon = -1000, minLat = 1000, maxLat = -1000;
geojson.features.forEach(f => {
  const geom = f.geometry;
  const coordsList = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map(p => p[0]);
  coordsList.forEach(coords => {
    coords.forEach(p => {
      // The coords are in local HC coordinates. x=lon, y=lat (but inverse?)
      // Actually HC json coords are just projected already!
      // Highcharts GeoJSON often uses pre-projected X/Y coordinates in integers! 
      if (p[0] < minLon) minLon = p[0];
      if (p[0] > maxLon) maxLon = p[0];
      if (p[1] < minLat) minLat = p[1];
      if (p[1] > maxLat) maxLat = p[1];
    });
  });
});

console.log("Highcharts bounds:", minLon, maxLon, minLat, maxLat);

// If HC map is pre-projected, we just map it to 600x850.
const vWidth = 600;
const vHeight = 850;
const padding = 15;

const bbWidth = maxLon - minLon;
const bbHeight = maxLat - minLat;

const scale = Math.min((vWidth - padding*2) / bbWidth, (vHeight - padding*2) / bbHeight);

const scaledWidth = bbWidth * scale;
const scaledHeight = bbHeight * scale;

const offX = (vWidth - scaledWidth) / 2;
const offY = (vHeight - scaledHeight) / 2;

const result = geojson.features.map(f => {
  const props = f.properties;
  const name = props.name || '';
  const geom = f.geometry;
  
  const coordsList = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map(p => p[0]);
  
  const paths = [];
  let cxSum = 0, cySum = 0, ptCount = 0;
  
  coordsList.forEach(coords => {
    const pts = [];
    coords.forEach((p, i) => {
      const hcX = p[0];
      const hcY = p[1];
      
      const sx = offX + (hcX - minLon) * scale;
      const sy = offY + (hcY - minLat) * scale; // invert Y not needed if HC y goes down
      
      if (i === 0) pts.push('M' + sx.toFixed(1) + ' ' + sy.toFixed(1));
      else pts.push('L' + sx.toFixed(1) + ' ' + sy.toFixed(1));
      
      cxSum += sx; cySum += sy; ptCount++;
    });
    pts.push('Z');
    paths.push(pts.join(' '));
  });

  let id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (id === 'lima province') id = 'callao'; // Wait, in the user's list: "lima province" was Callao? 
  // Let's standardise ids:
  if (id.includes('callao')) id = 'callao';
  else if (id.includes('lima province')) id = 'callao'; // Sometimes Lima metropolitan is split
  else if (id === 'lima') id = 'lima';

  return {
    id,
    name: name,
    path: paths.join(' '),
    centroid: ptCount > 0 ? [+(cxSum/ptCount).toFixed(1), +(cySum/ptCount).toFixed(1)] : [0,0]
  };
});

// Since the Highcharts GeoJSON splits Lima and Lima Province, we should merge or map it correctly.
// Also Callao and Lima.

const code = "export interface RegionMapData {\n  id: string;\n  name: string;\n  path: string;\n  centroid: [number, number];\n}\n\nexport const PERU_MAP_DATA: RegionMapData[] = " + JSON.stringify(result, null, 2) + ";\n";

fs.writeFileSync('C:/trabajo/fondo/sistema-activa-t/src/components/dashboard/charts/peruMapData.ts', code);
console.log('Update Complete!');
