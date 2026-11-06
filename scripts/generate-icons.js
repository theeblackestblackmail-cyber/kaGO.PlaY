import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA & Android icons...');

  // 1. PWA Icons
  await sharp(svgBuffer).resize(192, 192).png().toFile('public/pwa-192x192.png');
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/pwa-512x512.png');
  await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(svgBuffer).resize(64, 64).toFile('public/favicon.ico');

  // 2. Maskable Icon (safe zone padding: 10-15%)
  // 512x512 with 410x410 icon centered on #0c0c0e background
  const innerIcon = await sharp(svgBuffer).resize(410, 410).png().toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 12, g: 12, b: 14, alpha: 1 },
    },
  })
    .composite([{ input: innerIcon, gravity: 'center' }])
    .png()
    .toFile('public/pwa-maskable-512x512.png');

  // 3. Android mipmap densities
  const androidDensities = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const dirPrefix of ['android/app/src/main/res', 'app/src/main/res']) {
    for (const d of androidDensities) {
      const targetDir = path.resolve(dirPrefix, d.name);
      fs.mkdirSync(targetDir, { recursive: true });
      await sharp(svgBuffer).resize(d.size, d.size).png().toFile(path.join(targetDir, 'ic_launcher.png'));
      await sharp(svgBuffer).resize(d.size, d.size).png().toFile(path.join(targetDir, 'ic_launcher_round.png'));
    }
  }

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
