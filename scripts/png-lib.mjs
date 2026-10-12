/**
 * Dependency-free PNG decode / resize / encode helpers used by the icon and
 * store-asset generators. Pure Node — no native image libraries.
 */
import zlib from 'node:zlib';

export function decodePNG(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG file');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) throw new Error(`Unsupported bit depth: ${bitDepth}`);
    } else if (type === 'PLTE') {
      palette = Buffer.from(data);
    } else if (type === 'tRNS') {
      transparency = Buffer.from(data);
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channelsFor = (ct) => {
    switch (ct) {
      case 0: return 1;
      case 2: return 3;
      case 3: return 1;
      case 4: return 2;
      case 6: return 4;
      default: throw new Error(`Unsupported color type: ${ct}`);
    }
  };
  const channels = channelsFor(colorType);
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  const prevLine = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  let rawPos = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[rawPos++];
    raw.copy(line, 0, rawPos, rawPos + stride);
    rawPos += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prevLine[x];
      const c = x >= channels ? prevLine[x - channels] : 0;
      let val = line[x];
      switch (filter) {
        case 0: break;
        case 1: val = (val + a) & 0xff; break;
        case 2: val = (val + b) & 0xff; break;
        case 3: val = (val + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          val = (val + pred) & 0xff;
          break;
        }
        default: throw new Error(`Unknown filter: ${filter}`);
      }
      line[x] = val;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const si = x * channels;
      if (colorType === 6) {
        out[o] = line[si]; out[o + 1] = line[si + 1]; out[o + 2] = line[si + 2]; out[o + 3] = line[si + 3];
      } else if (colorType === 2) {
        out[o] = line[si]; out[o + 1] = line[si + 1]; out[o + 2] = line[si + 2]; out[o + 3] = 255;
      } else if (colorType === 4) {
        out[o] = out[o + 1] = out[o + 2] = line[si]; out[o + 3] = line[si + 1];
      } else if (colorType === 0) {
        out[o] = out[o + 1] = out[o + 2] = line[si]; out[o + 3] = 255;
      } else if (colorType === 3) {
        const idx = line[si];
        out[o] = palette[idx * 3]; out[o + 1] = palette[idx * 3 + 1]; out[o + 2] = palette[idx * 3 + 2];
        out[o + 3] = transparency && idx < transparency.length ? transparency[idx] : 255;
      }
    }
    line.copy(prevLine);
  }
  return { width, height, data: out };
}

function crc32(buf) {
  let c;
  if (!crc32.table) {
    crc32.table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crc32.table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function resize(src, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4);
  const xRatio = src.width / dstW;
  const yRatio = src.height / dstH;
  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * yRatio);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * yRatio));
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * xRatio);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * xRatio));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * src.width + sx) * 4;
          const alpha = src.data[o + 3] / 255;
          r += src.data[o] * alpha;
          g += src.data[o + 1] * alpha;
          b += src.data[o + 2] * alpha;
          a += src.data[o + 3];
          n++;
        }
      }
      const o = (y * dstW + x) * 4;
      const alphaAvg = a / n / 255 || 0;
      out[o] = alphaAvg ? Math.min(255, Math.round(r / n / alphaAvg)) : 0;
      out[o + 1] = alphaAvg ? Math.min(255, Math.round(g / n / alphaAvg)) : 0;
      out[o + 2] = alphaAvg ? Math.min(255, Math.round(b / n / alphaAvg)) : 0;
      out[o + 3] = Math.round(a / n);
    }
  }
  return { width: dstW, height: dstH, data: out };
}

export function solid(width, height, bg) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = bg[0]; out[i * 4 + 1] = bg[1]; out[i * 4 + 2] = bg[2]; out[i * 4 + 3] = 255;
  }
  return { width, height, data: out };
}

/** Composites `img` (scaled by `scale`) over a solid background. */
export function onBackground(size, img, bg, scale) {
  const out = solid(size, size, bg).data;
  const dim = Math.round(size * scale);
  if (dim < 1) return { width: size, height: size, data: out };
  const scaled = resize(img, dim, dim);
  const off = Math.round((size - dim) / 2);
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const so = (y * dim + x) * 4;
      const dx = x + off;
      const dy = y + off;
      if (dx < 0 || dy < 0 || dx >= size || dy >= size) continue;
      const doff = (dy * size + dx) * 4;
      const a = scaled.data[so + 3] / 255;
      out[doff] = Math.round(scaled.data[so] * a + out[doff] * (1 - a));
      out[doff + 1] = Math.round(scaled.data[so + 1] * a + out[doff + 1] * (1 - a));
      out[doff + 2] = Math.round(scaled.data[so + 2] * a + out[doff + 2] * (1 - a));
      out[doff + 3] = 255;
    }
  }
  return { width: size, height: size, data: out };
}

/** Art placed inside the 66dp mask-safe zone of a 108dp adaptive foreground. */
export function adaptiveForeground(size, img, bg) {
  const out = Buffer.alloc(size * size * 4);
  const safeZone = Math.round((size * 66) / 108);
  const artDim = Math.round(safeZone * 1.08);
  const scaled = resize(img, artDim, artDim);
  const off = Math.round((size - artDim) / 2);
  for (let y = 0; y < artDim; y++) {
    for (let x = 0; x < artDim; x++) {
      const so = (y * artDim + x) * 4;
      const dx = x + off;
      const dy = y + off;
      if (dx < 0 || dy < 0 || dx >= size || dy >= size) continue;
      const doff = (dy * size + dx) * 4;
      const a = scaled.data[so + 3] / 255;
      out[doff] = Math.round(scaled.data[so] * a + bg[0] * (1 - a));
      out[doff + 1] = Math.round(scaled.data[so + 1] * a + bg[1] * (1 - a));
      out[doff + 2] = Math.round(scaled.data[so + 2] * a + bg[2] * (1 - a));
      out[doff + 3] = 255;
    }
  }
  return { width: size, height: size, data: out };
}

/** White silhouette — Android status-bar notification icon. */
export function whiteSilhouette(size, img) {
  const scaled = resize(img, size, size);
  for (let i = 0; i < size * size; i++) {
    const a = scaled.data[i * 4 + 3];
    scaled.data[i * 4] = 255;
    scaled.data[i * 4 + 1] = 255;
    scaled.data[i * 4 + 2] = 255;
    scaled.data[i * 4 + 3] = a;
  }
  return scaled;
}

/** Pastes `img` (scaled to `scale` of canvas height) centered on a canvas. */
export function pasteCentered(canvasW, canvasH, img, bg, scale) {
  const out = solid(canvasW, canvasH, bg).data;
  const dim = Math.round(canvasH * scale);
  const scaled = resize(img, dim, dim);
  const offX = Math.round((canvasW - dim) / 2);
  const offY = Math.round((canvasH - dim) / 2);
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const dx = x + offX;
      const dy = y + offY;
      if (dx < 0 || dy < 0 || dx >= canvasW || dy >= canvasH) continue;
      const so = (y * dim + x) * 4;
      const doff = (dy * canvasW + dx) * 4;
      const a = scaled.data[so + 3] / 255;
      out[doff] = Math.round(scaled.data[so] * a + out[doff] * (1 - a));
      out[doff + 1] = Math.round(scaled.data[so + 1] * a + out[doff + 1] * (1 - a));
      out[doff + 2] = Math.round(scaled.data[so + 2] * a + out[doff + 2] * (1 - a));
      out[doff + 3] = 255;
    }
  }
  return { width: canvasW, height: canvasH, data: out };
}
