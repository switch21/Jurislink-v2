import { createJiti } from 'jiti'
import path from 'node:path'

const jiti = createJiti(import.meta.url, {
  alias: { '@': path.resolve(process.cwd(), 'src') },
  interopDefault: true,
})

const target = process.argv[2]
if (!target) {
  console.error('Usage: node scripts/run-with-alias.mjs <script.ts>')
  process.exit(1)
}
await jiti.import(path.resolve(process.cwd(), target))
