const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with row filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background (Sky blue to deep blue)
      const grad = Math.min(1, Math.max(0, (x + y) / (width + height)));
      let r = Math.round(2 + grad * 1);
      let g = Math.round(132 - grad * 30);
      let b = Math.round(199 - grad * 40);
      let a = 255;

      if (!isMaskable) {
        // Squircle / Rounded rectangle clipping
        const cornerR = 0.28;
        const qx = Math.max(0, Math.abs(dx) - (1 - cornerR));
        const qy = Math.max(0, Math.abs(dy) - (1 - cornerR));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerR) {
          a = 0; // Transparent outside rounded corner
        }
      }

      // Draw Heart Symbol in Center
      // Normalize to heart coordinates
      const hScale = isMaskable ? 0.45 : 0.55;
      const hx = (dx / hScale) * 1.2;
      const hy = ((dy + 0.05) / hScale) * 1.2;

      // Heart equation: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
      // Invert Y because screen Y goes down
      const hY = -hy;
      const heartEq = Math.pow(hx * hx + hY * hY - 1, 3) - hx * hx * Math.pow(hY, 3);

      if (a > 0) {
        if (heartEq <= 0) {
          // Inside heart
          r = 255;
          g = 255;
          b = 255;
        }

        // Draw ECG Pulse line across center
        const lineDistY = Math.abs(dy);
        if (lineDistY < 0.035 && Math.abs(dx) < 0.75) {
          // Pulse peaks
          let pulseY = 0;
          if (dx > -0.2 && dx < -0.1) pulseY = -0.18 * ((dx + 0.15) / 0.05);
          else if (dx >= -0.1 && dx < 0.05) pulseY = 0.28 * ((dx + 0.02) / 0.07);
          else if (dx >= 0.05 && dx < 0.18) pulseY = -0.12 * ((dx - 0.1) / 0.08);

          if (Math.abs(dy - pulseY) < 0.04) {
            r = 14;
            g = 165;
            b = 233; // Sky blue pulse
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pubDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('PWA PNG Icons successfully generated in /public!');
