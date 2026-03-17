import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

// CRC32 lookup table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const lenBuf = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.allocUnsafe(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  // Build raw image data: 1 filter byte + RGB per row
  const rowSize = 1 + width * 3;
  const raw = Buffer.allocUnsafe(height * rowSize);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    raw[offset] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      raw[offset + 1 + x * 3]     = r;
      raw[offset + 1 + x * 3 + 1] = g;
      raw[offset + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 파란 배경 #2563eb = rgb(37, 99, 235)
const R = 37, G = 99, B = 235;

mkdirSync('public/icons', { recursive: true });

writeFileSync('public/icons/icon-192x192.png',    makePNG(192, 192, R, G, B));
writeFileSync('public/icons/icon-512x512.png',    makePNG(512, 512, R, G, B));
writeFileSync('public/icons/apple-touch-icon.png', makePNG(180, 180, R, G, B));

console.log('아이콘 생성 완료:');
console.log('  public/icons/icon-192x192.png');
console.log('  public/icons/icon-512x512.png');
console.log('  public/icons/apple-touch-icon.png');
