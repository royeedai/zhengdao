import { readFileSync, writeFileSync } from 'node:fs'

const [, , inputPath, outputPath] = process.argv

if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/assets/png-to-ico.mjs <input-png> <output-ico>')
}

const png = readFileSync(inputPath)
const iconDirSize = 6
const iconEntrySize = 16
const header = Buffer.alloc(iconDirSize + iconEntrySize)

header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)

header.writeUInt8(0, 6)
header.writeUInt8(0, 7)
header.writeUInt8(0, 8)
header.writeUInt8(0, 9)
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(png.length, 14)
header.writeUInt32LE(iconDirSize + iconEntrySize, 18)

writeFileSync(outputPath, Buffer.concat([header, png]))
