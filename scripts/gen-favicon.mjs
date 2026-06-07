import { chromium } from 'playwright';
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/mockoto-ui/public/favicon.ico');

const svg48 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <g stroke="#7070EC" stroke-width="2.6" stroke-linecap="round">
    <line x1="7" y1="7" x2="7" y2="41"/>
    <line x1="7" y1="7" x2="24" y2="28"/>
    <line x1="41" y1="7" x2="24" y2="28"/>
    <line x1="41" y1="7" x2="41" y2="41"/>
  </g>
  <line x1="7" y1="41" x2="41" y2="41" stroke="#7070EC" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.22"/>
  <circle cx="7" cy="7" r="3.5" fill="#7070EC"/>
  <circle cx="7" cy="41" r="3.5" fill="#7070EC"/>
  <circle cx="24" cy="28" r="5" fill="#9A9AFA"/>
  <circle cx="41" cy="7" r="3.5" fill="#7070EC"/>
  <circle cx="41" cy="41" r="3.5" fill="#7070EC"/>
</svg>`;

// Sizes to embed in the ICO (32 and 16)
const sizes = [32, 16];

const html = (size, svgStrokeW, circleR, hubR) => `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  html, body { width: ${size}px; height: ${size}px; background: transparent; }
  svg { width: ${size}px; height: ${size}px; display: block; }
</style></head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
    <g stroke="#7070EC" stroke-width="${svgStrokeW}" stroke-linecap="round">
      <line x1="7" y1="7" x2="7" y2="41"/>
      <line x1="7" y1="7" x2="24" y2="28"/>
      <line x1="41" y1="7" x2="24" y2="28"/>
      <line x1="41" y1="7" x2="41" y2="41"/>
    </g>
    <circle cx="7" cy="7" r="${circleR}" fill="#7070EC"/>
    <circle cx="7" cy="41" r="${circleR}" fill="#7070EC"/>
    <circle cx="24" cy="28" r="${hubR}" fill="#9A9AFA"/>
    <circle cx="41" cy="7" r="${circleR}" fill="#7070EC"/>
    <circle cx="41" cy="41" r="${circleR}" fill="#7070EC"/>
  </svg>
</body></html>`;

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * count;
  const imageOffset = headerSize + dirSize;

  const offsets = [];
  let offset = imageOffset;
  for (const buf of pngBuffers) {
    offsets.push(offset);
    offset += buf.length;
  }

  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);

  // ICO header
  ico.writeUInt16LE(0, 0);     // reserved
  ico.writeUInt16LE(1, 2);     // type: 1 = ICO
  ico.writeUInt16LE(count, 4); // image count

  // Directory entries
  for (let i = 0; i < count; i++) {
    const buf = pngBuffers[i];
    const base = headerSize + i * dirEntrySize;
    const size = sizes[i];
    ico.writeUInt8(size === 256 ? 0 : size, base);      // width
    ico.writeUInt8(size === 256 ? 0 : size, base + 1);  // height
    ico.writeUInt8(0, base + 2);   // color count
    ico.writeUInt8(0, base + 3);   // reserved
    ico.writeUInt16LE(1, base + 4); // color planes
    ico.writeUInt16LE(32, base + 6); // bits per pixel
    ico.writeUInt32LE(buf.length, base + 8);  // image size
    ico.writeUInt32LE(offsets[i], base + 12); // image offset
  }

  // Image data
  for (let i = 0; i < count; i++) {
    pngBuffers[i].copy(ico, offsets[i]);
  }

  return ico;
}

const browser = await chromium.launch();
const pngBuffers = [];

for (const [i, size] of sizes.entries()) {
  const strokeW = size === 16 ? 5.5 : 3.2;
  const circleR = size === 16 ? 7 : 4.5;
  const hubR = size === 16 ? 8 : 6;

  const page = await browser.newPage();
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html(size, strokeW, circleR, hubR), { waitUntil: 'load' });
  const png = await page.screenshot({ type: 'png', omitBackground: true });
  pngBuffers.push(png);
  await page.close();
}

await browser.close();

const ico = buildIco(pngBuffers);
writeFileSync(outPath, ico);
console.log(`Written ${ico.length} bytes → ${outPath}`);
