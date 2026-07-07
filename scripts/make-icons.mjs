// Genereert de PWA-icons (pure Node, geen dependencies).
// Tekent een rij oplopende staven (groei) op een navy ondergrond.
// Uitvoer: public/icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIcon(size, marginFrac) {
  const buf = Buffer.alloc(size * size * 4);
  const setPx = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
  };
  const fillRect = (x0, y0, w, h, c) => {
    const xs = Math.round(x0), ys = Math.round(y0);
    const xe = Math.round(x0 + w), ye = Math.round(y0 + h);
    for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) setPx(x, y, c);
  };

  const navy = [15, 22, 38];
  const gold = [244, 183, 64];
  const teal = [63, 182, 168];

  fillRect(0, 0, size, size, navy);

  const m = size * marginFrac;
  const innerW = size - 2 * m;
  const availH = size - 2 * m;
  const baseY = size - m;
  const bars = 4;
  const gap = innerW * 0.06;
  const barW = (innerW - gap * (bars - 1)) / bars;
  const heights = [0.32, 0.52, 0.72, 1.0];

  for (let b = 0; b < bars; b++) {
    const h = availH * heights[b] * 0.92;
    const x = m + b * (barW + gap);
    const y = baseY - h;
    const c = b === 0 ? teal : gold;
    fillRect(x, y, barW, h, c);
  }

  return encodePNG(size, buf);
}

const targets = [
  ["icon-192.png", 192, 0.16],
  ["icon-512.png", 512, 0.16],
  ["icon-512-maskable.png", 512, 0.26],
  ["apple-touch-icon.png", 180, 0.16],
];

for (const [name, size, margin] of targets) {
  writeFileSync(join(OUT, name), makeIcon(size, margin));
  console.log("  ✓", name);
}
console.log("Icons gegenereerd in public/");
