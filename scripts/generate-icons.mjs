/**
 * Generates every Android launcher / notification / splash icon size, plus the
 * web icons, from the master source image at the repo root.
 *
 *   node scripts/generate-icons.mjs
 *   ICON_SOURCE=/path/to/icon.png node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodePNG,
  encodePNG,
  solid,
  onBackground,
  adaptiveForeground,
  whiteSilhouette,
} from './png-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SOURCE = process.env.ICON_SOURCE
  ? resolve(process.env.ICON_SOURCE)
  : join(root, 'Colorful Birthday Cake Icon.png');
const ANDROID_RES = join(root, 'android', 'app', 'src', 'main', 'res');
const PUBLIC_DIR = join(root, 'public');

const DENSITIES = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const BG = [255, 247, 245]; // #FFF7F5 — matches the app background

function write(path, img) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePNG(img.width, img.height, img.data));
  console.log(`  ${path.slice(root.length + 1)}  ${img.width}x${img.height}`);
}

function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Source icon not found: ${SOURCE}`);
    process.exit(1);
  }
  console.log(`Source: ${SOURCE}`);
  const img = decodePNG(readFileSync(SOURCE));
  console.log(`  decoded ${img.width}x${img.height}`);

  for (const [density, size] of Object.entries(DENSITIES)) {
    const dir = join(ANDROID_RES, `mipmap-${density}`);
    write(join(dir, 'ic_launcher.png'), onBackground(size, img, BG, 0.82));
    write(join(dir, 'ic_launcher_round.png'), onBackground(size, img, BG, 0.82));
    write(join(dir, 'ic_launcher_foreground.png'), adaptiveForeground(size, img, BG));
  }

  const anydpi = join(ANDROID_RES, 'mipmap-anydpi-v26');
  write(join(anydpi, 'ic_launcher_background.png'), solid(432, 432, BG));

  for (const [density, size] of Object.entries(DENSITIES)) {
    write(
      join(ANDROID_RES, `drawable-${density}`, 'ic_stat_birthday.png'),
      whiteSilhouette(Math.round(size * 0.5), img)
    );
  }

  for (const [density, size] of Object.entries(DENSITIES)) {
    write(
      join(ANDROID_RES, `drawable-${density}`, 'splash_logo.png'),
      onBackground(Math.round(size * 4), img, BG, 0.55)
    );
  }

  write(join(PUBLIC_DIR, 'icon-192.png'), onBackground(192, img, BG, 0.86));
  write(join(PUBLIC_DIR, 'icon-512.png'), onBackground(512, img, BG, 0.86));
  write(join(PUBLIC_DIR, 'icon-maskable-512.png'), onBackground(512, img, BG, 0.66));

  console.log('Icons generated.');
}

main();
