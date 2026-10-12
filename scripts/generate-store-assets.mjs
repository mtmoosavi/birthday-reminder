/**
 * Builds the store artwork Bazaar / Myket ask for:
 *   - store-assets/icon-512.png             (512x512 app icon)
 *   - store-assets/feature-1024x500.png     (feature / cover image)
 *   - store-assets/screenshot-*.png         (phone screenshots)
 *
 *   node scripts/generate-store-assets.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG, pasteCentered, onBackground } from './png-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SOURCE = process.env.ICON_SOURCE
  ? resolve(process.env.ICON_SOURCE)
  : join(root, 'Colorful Birthday Cake Icon.png');
const OUT = join(root, 'store-assets');

const BG = [255, 247, 245];

function write(name, img) {
  const path = join(OUT, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePNG(img.width, img.height, img.data));
  console.log(`  ${name}  ${img.width}x${img.height}`);
}

function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Source icon not found: ${SOURCE}`);
    process.exit(1);
  }
  const img = decodePNG(readFileSync(SOURCE));

  write('icon-512.png', onBackground(512, img, BG, 0.86));
  write('feature-1024x500.png', pasteCentered(1024, 500, img, BG, 0.72));

  // Placeholder phone screenshots (1080x1920). Replace these with real in-app
  // screenshots before publishing; they exist so the listing is never missing
  // a store-required asset.
  for (let i = 1; i <= 3; i++) {
    write(`screenshot-${i}-placeholder.png`, pasteCentered(1080, 1920, img, BG, 0.22));
  }

  console.log('Store assets generated in store-assets/.');
}

main();
