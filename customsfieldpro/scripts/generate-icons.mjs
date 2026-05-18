#!/usr/bin/env node
// Generates solid-color PNG icons for the CustomsFieldPro PWA.
// Pure Node.js — no extra dependencies needed.

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── PNG chunk builder ──────────────────────────────────────────────────────
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf    = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length)
  const crcInput  = Buffer.concat([typeBytes, data])
  const crcBuf    = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

// ── Build a solid-color RGBA PNG ──────────────────────────────────────────
// color: [R, G, B, A] each 0-255
function solidPNG(w, h, [r, g, b, a = 255]) {
  // PNG file signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, 8-bit depth, RGBA (color type 6)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA

  // Build one scanline: filter-byte(0) + RGBA per pixel
  const row = Buffer.alloc(1 + w * 4)
  row[0] = 0 // filter type: None
  for (let x = 0; x < w; x++) {
    row[1 + x * 4 + 0] = r
    row[1 + x * 4 + 1] = g
    row[1 + x * 4 + 2] = b
    row[1 + x * 4 + 3] = a
  }

  // Stack h identical rows
  const rows = []
  for (let y = 0; y < h; y++) rows.push(row)
  const raw        = Buffer.concat(rows)
  const compressed = deflateSync(raw, { level: 6 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Generate icons ─────────────────────────────────────────────────────────
const BLUE = [0x25, 0x63, 0xEB, 255]   // #2563eb (CustomsFieldPro brand blue)
const pub  = join(__dirname, '..', 'public')

const icons = [
  { name: 'pwa-192x192.png',      w: 192, h: 192 },
  { name: 'pwa-512x512.png',      w: 512, h: 512 },
  { name: 'apple-touch-icon.png', w: 180, h: 180 },
]

for (const { name, w, h } of icons) {
  const png  = solidPNG(w, h, BLUE)
  const dest = join(pub, name)
  writeFileSync(dest, png)
  console.log(`✓ ${name}  (${w}×${h}, ${(png.length / 1024).toFixed(1)} KB)`)
}
