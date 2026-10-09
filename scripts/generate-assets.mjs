// Generates the Faculty Flow app icon, adaptive icon layers, splash image and notification icon.
//
//   node scripts/generate-assets.mjs
//
// To tweak the brand, edit BRAND (colours) or MARK (shapes) below and run the script again.
// Everything is drawn from one SVG, so all sizes stay consistent. Output: assets/images/.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// ---- Brand: change colours here ----------------------------------------------------------------
const BRAND = {
  primary: '#0F766E', // deep teal; matches `primary` in src/theme/theme.ts
  splashDark: '#0B2F2C', // splash background in dark mode
  page: '#FFFFFF', // the book pages
};

// ---- Mark: an open book whose pages carry a flowing checkmark. Drawn on a 1024 canvas. ---------
// Page tops are gentle curves (the "flow"); the check sits across both pages.
const MARK = {
  leftPage: 'M 496 712 C 438 668 352 652 262 668 Q 240 672 240 650 L 240 392 Q 240 372 262 368 C 352 352 438 366 496 412 Z',
  rightPage: 'M 528 712 C 586 668 672 652 762 668 Q 784 672 784 650 L 784 392 Q 784 372 762 368 C 672 352 586 366 528 412 Z',
  check: 'M 372 548 L 466 632 L 664 444',
  checkWidth: 64,
};

const OUT = path.resolve('assets/images');

/**
 * The mark as SVG content. `scale` shrinks it around the centre (adaptive icons need padding).
 * mode 'color': white pages with a teal check. mode 'mono': one solid colour, check cut out.
 */
function mark({ scale = 1, mode = 'color', fill = BRAND.page }) {
  const t = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  const pages = `<path d="${MARK.leftPage}"/><path d="${MARK.rightPage}"/>`;
  const check = (color) =>
    `<path d="${MARK.check}" fill="none" stroke="${color}" stroke-width="${MARK.checkWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (mode === 'mono') {
    return `
      <defs><mask id="cut"><rect width="1024" height="1024" fill="#fff"/>${check('#000')}</mask></defs>
      <g transform="${t}" mask="url(#cut)" fill="${fill}">${pages}</g>`;
  }
  return `<g transform="${t}"><g fill="${fill}">${pages}</g>${check(BRAND.primary)}</g>`;
}

const svg = (body, size = 1024, bg = null) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">` +
  (bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : '') +
  body +
  `</svg>`;

async function render(name, content, size, { opaque = false } = {}) {
  const file = path.join(OUT, name);
  let img = sharp(Buffer.from(content), { density: 72 * (size / 1024) * 4 }).resize(size, size);
  if (opaque) img = img.flatten({ background: BRAND.primary }).removeAlpha();
  await img.png().toFile(file);
  return file;
}

await mkdir(OUT, { recursive: true });

const files = [
  // Main icon: full-bleed, no transparency.
  await render('icon.png', svg(mark({ scale: 1.0 }), 1024, BRAND.primary), 1024, { opaque: true }),
  // Adaptive icon foreground: transparent, kept inside the 66% safe zone (launchers crop the rest).
  await render('android-icon-foreground.png', svg(mark({ scale: 0.78 })), 1024),
  // Android 13+ themed icon: single colour silhouette, the system tints it.
  await render('android-icon-monochrome.png', svg(mark({ scale: 0.78, mode: 'mono' })), 1024),
  // Splash: the mark on a transparent background; the colour comes from app.json.
  await render('splash-icon.png', svg(mark({ scale: 1.0 })), 1024),
  // Notification small icon: white silhouette on transparent (Android requires this).
  await render('notification-icon.png', svg(mark({ scale: 1.12, mode: 'mono' })), 96),
];

// A preview sheet to review the set at a glance (not used by the app).
const preview = svg(
  `<rect width="1024" height="1024" fill="#E9EDF0"/>
   <g transform="translate(40 40) scale(0.44)"><rect width="1024" height="1024" rx="230" fill="${BRAND.primary}"/>${mark({})}</g>
   <g transform="translate(540 40) scale(0.44)"><circle cx="512" cy="512" r="512" fill="${BRAND.primary}"/>${mark({ scale: 0.78 })}</g>
   <g transform="translate(40 540) scale(0.44)"><rect width="1024" height="1024" fill="${BRAND.splashDark}"/><g transform="translate(312 312) scale(0.39)">${mark({})}</g></g>
   <g transform="translate(540 540) scale(0.44)"><rect width="1024" height="1024" rx="230" fill="#2B3238"/>${mark({ scale: 0.78, mode: 'mono', fill: '#C9F2EC' })}</g>`,
);
await sharp(Buffer.from(preview)).resize(1024, 1024).png().toFile(path.resolve('assets/brand-preview.png'));

console.log(['Generated:', ...files, path.resolve('assets/brand-preview.png')].join('\n  '));
