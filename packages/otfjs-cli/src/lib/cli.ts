import path from 'path'

/**
 * Given a list of `args`, remove the first occurrence of the given `opt` and
 * return the value that follows it. If the option is not found, return the
 * given default value.
 *
 * @param args The list of args, usually from `process.argv`. It is assumed that
 *   the first element is the runtime (like 'node' or 'deno'), the second is
 *   the script name, and the rest are the arguments given on the command line.
 * @param opt The option to eat, must start with a dash ('-') or two ('--').
 * @param orElse The value to return if the option is not found.
 *
 * @returns The argument following `opt` if found, otherwise `orElse`.
 */
export function eat(args: string[], opt: string, orElse: string): string {
  // Positional args don't start with a dash and don't follow an option.
  let positionalArgCount = 0

  for (let i = 0; i < opt.length; ++i) {
    const arg = args[i]

    if (arg === opt) {
      // Found the opt - remove it and the following arg, then return said arg.
      return args.splice(i, 2)[1]
    }

    if (arg.charCodeAt(0) === 45 /* '-' */) {
      positionalArgCount = 0
    } else if (++positionalArgCount === 2) {
      // Positional arguments must always come after options, and options
      // can take at most one argument. So we know we can break if we've seen
      // two positional arguments in a row. This is the main reason we don't use
      // Array#findIndex - if we're looking for a single option in a humongus
      // list of files, we don't want to scan the whole list.
      break
    }
  }

  return orElse
}

export function usage(...args: string[]) {
  const { name, opts } =
    args.length === 1 ?
      { name: process.argv[1], opts: args[0] }
    : { name: args[0], opts: args[1] }

  console.error(`usage: ${name} ${opts}`)
}

export function stripExt(name: string): string {
  const ext = path.extname(name)
  return name.slice(0, -ext.length)
}

export function changeExt(name: string, ext: string): string {
  return `${stripExt(name)}${ext}`
}
