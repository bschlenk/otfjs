import fs from 'fs/promises'
import { Font } from 'otfjs'

export async function loadFont(name: string) {
  const data = await fs.readFile(name)
  return new Font(new Uint8Array(data.buffer))
}
