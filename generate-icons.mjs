import fs from 'fs';
import { createCanvas } from 'canvas';

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4F46E5';
  ctx.fillRect(0, 0, size, size);
  
  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size/3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BCC', size/2, size/2);
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/icon-${size}x${size}.png`, buffer);
  console.log(`Generated icon-${size}x${size}.png`);
}

generateIcon(192);
generateIcon(512);
