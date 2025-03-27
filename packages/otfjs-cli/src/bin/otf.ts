import fs from 'node:fs/promises'
import path from 'node:path'

const cmdDir = path.join(import.meta.dirname, '..', 'cmd')

interface Runnable {
  run(args: string[]): Promise<number>
}

export async function run() {
  const cmd = process.argv[2]
  if (!cmd) {
    console.error('A command is required')
    await printCommands()
    return 1
  }

  try {
    const mod = (await import(path.join(cmdDir, cmd + '.js'))) as Runnable
    return await mod.run(process.argv.slice(3))
  } catch (err: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.error(`Command not found: ${cmd}`)
      await printCommands()
    } else {
      console.error(err)
    }

    return 1
  }
}

export async function printCommands() {
  console.error('Available commands:')

  const cmds = await getCommands()
  for (const cmd of cmds) {
    console.error('\t' + cmd)
  }
}

export async function getCommands() {
  const cmds = await fs.readdir(cmdDir)
  return cmds
    .filter((cmd) => cmd.endsWith('.js'))
    .map((cmd) => cmd.replace(/\.[^.]+$/, ''))
    .sort()
}
