import { readFileSync } from 'fs'
import fs from 'fs/promises'
import { Font } from 'otfjs'

export async function loadFont(name: string) {
  const data = await fs.readFile(name)
  return new Font(new Uint8Array(data.buffer))
}

export function readJsonSync<T>(name: string): T {
  return JSON.parse(readFileSync(name, 'utf8')) as T
}

export async function fetchJson<T>(url: string | URL): Promise<T> {
  const res = await fetch(url)
  return res.json() as T
}

export async function* iterFonts(files: string[]) {
  for (const file of files) {
    const font = await loadFont(file)
    yield { font, file }
  }
}
