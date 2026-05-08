/**
 * generateIcons.js — Generate app icons and splash screens for Capacitor
 *
 * Requires: npm install -D canvas
 * Run: node scripts/generateIcons.js
 *
 * Outputs:
 *   resources/icon.png          (1024x1024 — master icon)
 *   resources/splash.png        (2732x2732 — master splash)
 *   android/app/src/main/res/   — mipmap folders with adaptive icons
 *
 * After running, use @capacitor/assets to resize for all densities:
 *   npm install -D @capacitor/assets
 *   npx capacitor-assets generate
 */

import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function savePNG(canvas, filePath) {
  ensureDir(path.dirname(filePath))
  const buf = canvas.toBuffer('image/png')
  fs.writeFileSync(filePath, buf)
  console.log('✓', path.relative(root, filePath))
}

// ─── Draw FieldFlow icon ──────────────────────────────────────────────────────

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const r = size * 0.18   // corner radius

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#185FA5')
  grad.addColorStop(1, '#2563eb')

  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()

  // "FF" text
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.38}px -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('FF', size / 2, size / 2 + size * 0.02)

  return canvas
}

// ─── Draw splash screen ───────────────────────────────────────────────────────

function drawSplash(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#185FA5'
  ctx.fillRect(0, 0, size, size)

  // Logo area
  const logoSize = size * 0.25
  const cx = size / 2
  const cy = size / 2 - logoSize * 0.2

  // Icon circle
  ctx.beginPath()
  ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff22'
  ctx.fill()

  // "FF"
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${logoSize * 0.5}px -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('FF', cx, cy)

  // App name
  ctx.font = `600 ${size * 0.035}px -apple-system, sans-serif`
  ctx.fillStyle = '#ffffffcc'
  ctx.fillText('FieldFlow CRM', cx, cy + logoSize * 0.7)

  return canvas
}

// ─── Generate ─────────────────────────────────────────────────────────────────

console.log('\n🎨 Generating FieldFlow CRM icons...\n')

const resourcesDir = path.join(root, 'resources')

// Master icon (1024x1024)
savePNG(drawIcon(1024), path.join(resourcesDir, 'icon.png'))

// Master splash (2732x2732 — largest needed)
savePNG(drawSplash(2732), path.join(resourcesDir, 'splash.png'))

// Common Android sizes
const androidSizes = [
  { name: 'mipmap-mdpi',    size: 48 },
  { name: 'mipmap-hdpi',    size: 72 },
  { name: 'mipmap-xhdpi',   size: 96 },
  { name: 'mipmap-xxhdpi',  size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
]

for (const { name, size } of androidSizes) {
  const outDir = path.join(root, 'android', 'app', 'src', 'main', 'res', name)
  savePNG(drawIcon(size), path.join(outDir, 'ic_launcher.png'))
  savePNG(drawIcon(size), path.join(outDir, 'ic_launcher_round.png'))
}

console.log('\n✅ Done! Run `npx capacitor-assets generate` for full density set.\n')
console.log('   Install first: npm install -D @capacitor/assets\n')
