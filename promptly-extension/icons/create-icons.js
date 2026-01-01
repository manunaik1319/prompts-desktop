const fs = require('fs');
const zlib = require('zlib');

function createPNG(size) {
  const width = size;
  const height = size;
  
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0;
    
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      
      const cornerRadius = size * 0.22;
      let inRoundedRect = true;
      
      if (x < cornerRadius && y < cornerRadius) {
        const dx = cornerRadius - x;
        const dy = cornerRadius - y;
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inRoundedRect = false;
      } else if (x >= width - cornerRadius && y < cornerRadius) {
        const dx = x - (width - cornerRadius);
        const dy = cornerRadius - y;
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inRoundedRect = false;
      } else if (x < cornerRadius && y >= height - cornerRadius) {
        const dx = cornerRadius - x;
        const dy = y - (height - cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inRoundedRect = false;
      } else if (x >= width - cornerRadius && y >= height - cornerRadius) {
        const dx = x - (width - cornerRadius);
        const dy = y - (height - cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inRoundedRect = false;
      }
      
      if (!inRoundedRect) {
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0;
        continue;
      }
      
      const t = (x + y) / (width + height);
      const r = Math.round(139 + (217 - 139) * t);
      const g = Math.round(92 + (70 - 92) * t);
      const b = Math.round(246 + (239 - 246) * t);
      
      const cx = width / 2;
      const cy = height / 2;
      const starSize = size * 0.32;
      const innerSize = starSize * 0.38;
      
      const px = x - cx;
      const py = y - cy;
      let angle = Math.atan2(py, px) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      
      const dist = Math.sqrt(px * px + py * py);
      const sector = Math.floor(angle / (Math.PI * 2 / 10));
      const sectorAngle = angle - sector * (Math.PI * 2 / 10);
      const normalizedAngle = sectorAngle / (Math.PI * 2 / 10);
      
      let maxDist;
      if (sector % 2 === 0) {
        maxDist = starSize - (starSize - innerSize) * normalizedAngle;
      } else {
        maxDist = innerSize + (starSize - innerSize) * normalizedAngle;
      }
      
      const inStar = dist <= maxDist;
      
      if (inStar) {
        rawData[offset] = 255;
        rawData[offset + 1] = 255;
        rawData[offset + 2] = 255;
        rawData[offset + 3] = 255;
      } else {
        rawData[offset] = r;
        rawData[offset + 1] = g;
        rawData[offset + 2] = b;
        rawData[offset + 3] = 255;
      }
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData));
    return Buffer.concat([length, typeBuffer, data, crc]);
  }
  
  function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(__dirname + '/icon' + size + '.png', png);
  console.log('Created icon' + size + '.png (' + png.length + ' bytes)');
});

console.log('All icons created!');
