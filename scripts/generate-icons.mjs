import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Brand-colored icon SVG (teal background, white house)
const iconSvg = Buffer.from(`<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" rx="32" fill="#0A7B6E"/>
  <polygon points="100,50 150,95 50,95" fill="#FFFFFF"/>
  <rect x="60" y="95" width="80" height="60" fill="#FFFFFF"/>
  <rect x="88" y="115" width="24" height="40" rx="3" fill="#0A7B6E"/>
</svg>`);

// Foreground-only SVG for Android adaptive icons (white house on transparent)
const foregroundSvg = Buffer.from(`<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <polygon points="54,25 79,46.6 29,46.6" fill="#FFFFFF"/>
  <rect x="33.6" y="46.6" width="40.8" height="30.6" fill="#FFFFFF"/>
  <rect x="47.52" y="56.2" width="12.96" height="21" rx="1.5" fill="#0A7B6E"/>
</svg>`);

// Round icon SVG (circular clip)
const roundSvg = Buffer.from(`<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="c"><circle cx="100" cy="100" r="100"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="200" height="200" fill="#0A7B6E"/>
    <polygon points="100,50 150,95 50,95" fill="#FFFFFF"/>
    <rect x="60" y="95" width="80" height="60" fill="#FFFFFF"/>
    <rect x="88" y="115" width="24" height="40" rx="3" fill="#0A7B6E"/>
  </g>
</svg>`);

const pngOpts = { compressionLevel: 9 };

const androidRes = resolve(root, 'android/app/src/main/res');

const targets = [
  // PWA icons
  { svg: iconSvg, size: 192, out: 'public/icons/icon-192.png' },
  { svg: iconSvg, size: 512, out: 'public/icons/icon-512.png' },

  // Mobile (Expo) assets
  { svg: iconSvg, size: 1024, out: 'mobile/assets/icon.png' },
  { svg: iconSvg, size: 512, out: 'mobile/assets/splash-icon.png' },
  { svg: iconSvg, size: 1024, out: 'mobile/assets/adaptive-icon.png' },
  { svg: iconSvg, size: 48, out: 'mobile/assets/favicon.png' },

  // iOS
  { svg: iconSvg, size: 1024, out: 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png' },

  // Android mipmap — launcher (square with rounded corners)
  { svg: iconSvg, size: 48, out: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png' },
  { svg: iconSvg, size: 72, out: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png' },
  { svg: iconSvg, size: 96, out: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png' },
  { svg: iconSvg, size: 144, out: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png' },
  { svg: iconSvg, size: 192, out: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' },

  // Android mipmap — foreground (adaptive icon)
  { svg: foregroundSvg, size: 108, out: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png' },
  { svg: foregroundSvg, size: 162, out: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png' },
  { svg: foregroundSvg, size: 216, out: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png' },
  { svg: foregroundSvg, size: 324, out: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png' },
  { svg: foregroundSvg, size: 432, out: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png' },

  // Android mipmap — round
  { svg: roundSvg, size: 48, out: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png' },
  { svg: roundSvg, size: 72, out: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png' },
  { svg: roundSvg, size: 96, out: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png' },
  { svg: roundSvg, size: 144, out: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png' },
  { svg: roundSvg, size: 192, out: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png' },
];

console.log(`Generating ${targets.length} icons...\n`);

for (const { svg, size, out } of targets) {
  const outPath = resolve(root, out);
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(svg, { density: Math.max(72, Math.round(72 * size / 200)) })
    .resize(size, size)
    .png(pngOpts)
    .toFile(outPath);
  console.log(`  ${size}x${size}  ${out}`);
}

// Splash screens: teal background with centered house icon (~25% of short edge)
const splashSizes = {
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable': [480, 320],
};

console.log('\nGenerating splash screens...\n');

for (const [dir, [w, h]] of Object.entries(splashSizes)) {
  const iconSize = Math.round(Math.min(w, h) * 0.3);
  const iconPng = await sharp(iconSvg, { density: 400 })
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();
  const outPath = resolve(root, `android/app/src/main/res/${dir}/splash.png`);
  await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 10, g: 123, b: 110, alpha: 1 } },
  })
    .composite([{ input: iconPng, gravity: 'center' }])
    .png(pngOpts)
    .toFile(outPath);
  console.log(`  ${w}x${h}  android/app/src/main/res/${dir}/splash.png`);
}

console.log('\nDone! All icons and splash screens generated.');
