import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assets = {
  car: 'car.png',
  staff: 'staff-marker.png',
  dest: 'destination-marker.png',
};
const out = {};
for (const [key, file] of Object.entries(assets)) {
  const buf = fs.readFileSync(path.join(root, 'assets', file));
  out[key] = `data:image/png;base64,${buf.toString('base64')}`;
}
const header = '// Auto-generated — run: npm run embed:markers\n';
fs.writeFileSync(
  path.join(root, 'src/utils/mapMarkerBase64.js'),
  `${header}export default ${JSON.stringify(out)};\n`
);
console.log('mapMarkerBase64.js updated');
