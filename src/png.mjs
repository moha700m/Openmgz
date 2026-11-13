import zlib from 'node:zlib';

const table = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** A 1024×1024 app icon: dark rounded tile with a light "A"-free abstract mark. */
export function makeIcon(size = 1024) {
  const px = Buffer.alloc(size * size * 4);
  const r = size * 0.22;
  const smooth = (edge, soft, d) => Math.max(0, Math.min(1, (edge - d) / soft + 0.5));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = Math.max(r - x, 0) + Math.max(x - (size - 1 - r), 0);
      const dy = Math.max(r - y, 0) + Math.max(y - (size - 1 - r), 0);
      const inside = smooth(r, 3, Math.sqrt(dx * dx + dy * dy));

      const t = (x / size) * 0.5 + (y / size) * 0.5;
      let cr = Math.round(0x6d + (0x8b - 0x6d) * t);
      let cg = Math.round(0x5b + (0x3f - 0x5b) * t);
      let cb = Math.round(0xf0 + (0xd4 - 0xf0) * t);

      // rounded inner square outline
      const cx = x - size / 2;
      const cy = y - size / 2;
      const box = Math.max(Math.abs(cx), Math.abs(cy)) - size * 0.19;
      if (Math.abs(box) < size * 0.035) {
        const k = smooth(size * 0.035, 4, Math.abs(box));
        cr = Math.round(cr * (1 - k) + 255 * k);
        cg = Math.round(cg * (1 - k) + 255 * k);
        cb = Math.round(cb * (1 - k) + 255 * k);
      }

      px[i] = cr;
      px[i + 1] = cg;
      px[i + 2] = cb;
      px[i + 3] = Math.round(255 * inside);
    }
  }

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
