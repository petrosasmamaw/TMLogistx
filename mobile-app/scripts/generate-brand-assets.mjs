/**
 * Renders TMLogistx brand SVGs into mobile + web PNG assets (run: npm run generate:brand).
 */
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const brandDir = path.join(root, 'brand');
const mobileAssets = path.join(__dirname, '..', 'assets');
const webPublic = path.join(root, 'web-app', 'public');

const readSvg = (name) => readFileSync(path.join(brandDir, name), 'utf8');

function svgToPngBuffer(svg, width, height) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width }
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  if (height && height !== width) {
    return sharp(png).resize(width, height).png().toBuffer();
  }
  return Promise.resolve(png);
}

async function writeLauncherPng(size, outPath) {
  const svg = readSvg('tmlogistx-icon.svg');
  let buf = await svgToPngBuffer(svg, size, size);
  const stats = await sharp(buf).stats();
  const mean = stats.channels[0]?.mean ?? 0;
  if (mean > 120) {
    throw new Error(`Generated ${outPath} looks wrong (mean R=${mean}).`);
  }
  await sharp(buf).png({ compressionLevel: 9 }).toFile(outPath);
  console.log('wrote', outPath, `(R≈${mean.toFixed(0)})`);
}

async function pngFromSvgFile(name, width, height, outPath) {
  const svg = readSvg(name);
  const buf = await svgToPngBuffer(svg, width, height);
  await sharp(buf).png({ compressionLevel: 9 }).toFile(outPath);
  console.log('wrote', outPath);
}

async function main() {
  mkdirSync(webPublic, { recursive: true });
  mkdirSync(mobileAssets, { recursive: true });

  await writeLauncherPng(1024, path.join(mobileAssets, 'icon.png'));
  await writeLauncherPng(1024, path.join(mobileAssets, 'adaptive-icon.png'));
  await writeLauncherPng(1024, path.join(mobileAssets, 'brand-mark.png'));
  await pngFromSvgFile('tmlogistx-splash.svg', 1284, 2778, path.join(mobileAssets, 'splash.png'));
  await writeLauncherPng(48, path.join(mobileAssets, 'favicon.png'));

  await writeLauncherPng(32, path.join(webPublic, 'favicon-32.png'));
  await writeLauncherPng(192, path.join(webPublic, 'favicon-192.png'));
  await writeLauncherPng(180, path.join(webPublic, 'apple-touch-icon.png'));
  await writeLauncherPng(256, path.join(webPublic, 'brand-mark.png'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
