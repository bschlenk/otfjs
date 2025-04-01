import { iterFonts } from '../lib/utils.js'

export async function run(args: string[]) {
  if (args.length < 1) {
    console.error('usage: panose [font-files]+')
    return 1
  }

  return printPanose(args)
}

async function printPanose(fonts: string[]) {
  for await (const { file, font } of iterFonts(fonts)) {
    const os2 = font.getTable('OS/2')

    let nonZero = false
    let panose = ''
    for (const val of os2.panose) {
      panose += toHex(val)
      nonZero ||= Boolean(val)
    }

    if (nonZero) {
      console.log(panose, file)
    }
  }
}

export function toHex(n: number, bytes = 2) {
  let h = n.toString(16)
  let neg = false
  if (h.startsWith('-')) {
    h = h.slice(1)
    neg = true
  }
  return h.padStart(bytes * 2, neg ? '1' : '0')
}
