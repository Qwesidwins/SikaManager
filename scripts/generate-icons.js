import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePng(width, height, r, g, b) {
  // Raw scanlines: width * 3 bytes + 1 filter byte per row
  const rowLen = 1 + width * 3;
  const rawData = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Draw a subtle gold circle inside navy background
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.35;

      if (dist <= radius) {
        // Gold #C9962B
        rawData[pxOffset] = 201;
        rawData[pxOffset + 1] = 150;
        rawData[pxOffset + 2] = 43;
      } else {
        // Deep Navy #14213D
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = Buffer.alloc(4 + 4 + 13 + 4);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrData.copy(ihdrChunk, 8);
  const ihdrCrc = crc32(ihdrChunk.subarray(4, 21));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // IDAT
  const idatChunk = Buffer.alloc(4 + 4 + compressed.length + 4);
  idatChunk.writeUInt32BE(compressed.length, 0);
  idatChunk.write('IDAT', 4);
  compressed.copy(idatChunk, 8);
  const idatCrc = crc32(idatChunk.subarray(4, 8 + compressed.length));
  idatChunk.writeUInt32BE(idatCrc, 8 + compressed.length);

  // IEND
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0);
  iendChunk.write('IEND', 4);
  const iendCrc = crc32(Buffer.from('IEND'));
  iendChunk.writeUInt32BE(iendCrc, 8);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
const pwa192 = makePng(192, 192, 20, 33, 61);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

const pwa512 = makePng(512, 512, 20, 33, 61);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

const maskable512 = makePng(512, 512, 20, 33, 61);
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png'), maskable512);

const appleTouch = makePng(180, 180, 20, 33, 61);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

const favicon = makePng(32, 32, 20, 33, 61);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);

// Also generate SVG favicon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="24" fill="#14213D"/>
  <circle cx="50" cy="50" r="32" fill="#C9962B"/>
  <text x="50" y="58" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="28" fill="#14213D" text-anchor="middle">₵</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);

console.log('Successfully generated all PWA icons and favicons in public/');
